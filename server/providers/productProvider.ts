import {
  validateSafeShopeeUrl,
  followSafeRedirects,
} from '../security/urlGuard';

import { ProductData } from '../../src/types';

export interface ProductProvider {
  getProduct(rawUrl: string): Promise<ProductData>;
}

type PublicPageData = {
  title?: string;
  images: string[];
  currentPrice?: number;
  originalPrice?: number;
  sellerName?: string;
  rating?: number;
  soldCount?: number;
  availability?: boolean;
  productId?: string;
};

type ShopeeIds = {
  shopId?: string;
  itemId?: string;
};

type BridgeProduct = {
  title?: string;
  currentPrice?: number;
  originalPrice?: number | null;
  image?: string | null;
  images?: string[];
  rating?: number | null;
  soldCount?: number | null;
  sellerName?: string | null;
  canonicalUrl?: string;
  source?: string;
};

type BridgeResponse = {
  ok?: boolean;
  product?: BridgeProduct;
  error?: string;
  message?: string;
};

export class ShopeeProductProvider implements ProductProvider {

  // =========================================================
  // GET PRODUCT
  // =========================================================

  public async getProduct(rawUrl: string): Promise<ProductData> {

    const safety = validateSafeShopeeUrl(rawUrl);

    if (!safety.isSafe || !safety.cleanUrl) {
      throw new Error(
        safety.error || 'URL inválida ou não autorizada.'
      );
    }

    /*
     * =========================================================
     * 1. PRIMEIRA OPÇÃO: PC BRIDGE
     * =========================================================
     *
     * Render -> Cloudflare -> Seu PC -> Playwright -> Shopee
     */

    try {

      const bridgeProduct =
        await this.fetchFromPcBridge(safety.cleanUrl);

      if (
        bridgeProduct &&
        bridgeProduct.currentPrice !== undefined &&
        Number.isFinite(bridgeProduct.currentPrice) &&
        bridgeProduct.currentPrice > 0
      ) {

        console.log(
          'PC BRIDGE SUCCESS:',
          JSON.stringify(
            {
              title: bridgeProduct.title,
              currentPrice: bridgeProduct.currentPrice,
              originalPrice: bridgeProduct.originalPrice,
              images: bridgeProduct.images.length,
              canonicalUrl: bridgeProduct.canonicalUrl,
            },
            null,
            2
          )
        );

        return bridgeProduct;
      }

    } catch (error) {

      console.warn(
        'PC BRIDGE FAILED - tentando fallback:',
        error
      );
    }

    /*
     * =========================================================
     * 2. FALLBACK ANTIGO
     * =========================================================
     *
     * Só será usado se o PC estiver desligado,
     * Cloudflare cair ou Bridge não responder.
     */

    return this.getProductDirect(safety.cleanUrl);
  }

  // =========================================================
  // PC BRIDGE
  // =========================================================

  private async fetchFromPcBridge(
    productUrl: string
  ): Promise<ProductData | undefined> {

    const bridgeBaseUrl =
      String(process.env.PC_BRIDGE_URL || '')
        .trim()
        .replace(/\/+$/, '');

    const bridgeToken =
      String(process.env.PC_BRIDGE_TOKEN || '')
        .trim();

    if (!bridgeBaseUrl) {

      console.log(
        'PC BRIDGE: PC_BRIDGE_URL não configurada.'
      );

      return undefined;
    }

    if (!bridgeToken) {

      console.log(
        'PC BRIDGE: PC_BRIDGE_TOKEN não configurado.'
      );

      return undefined;
    }

    const endpoint =
      `${bridgeBaseUrl}/resolve`;

    console.log(
      'PC BRIDGE REQUEST:',
      endpoint
    );


    /*
     * Sem timeout imposto pelo Oferta Express.
     * Esta requisição aguardará o Bridge terminar, pelo tempo que for necessário.
     */


    try {

      const response =
        await fetch(
          endpoint,
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',

              Authorization:
                `Bearer ${bridgeToken}`,
            },

            body: JSON.stringify({
              url: productUrl,
            }),
          }
        );

      const responseText =
        await response.text();

      console.log(
        'PC BRIDGE STATUS:',
        response.status
      );

      if (!response.ok) {

        console.warn(
          'PC BRIDGE HTTP ERROR:',
          response.status,
          responseText.substring(0, 1000)
        );

        return undefined;
      }

      let data: BridgeResponse;

      try {

        data =
          JSON.parse(responseText);

      } catch {

        console.warn(
          'PC BRIDGE retornou JSON inválido:',
          responseText.substring(0, 500)
        );

        return undefined;
      }

      if (
        data.ok !== true ||
        !data.product
      ) {

        console.warn(
          'PC BRIDGE RESPONSE ERROR:',
          data.error ||
          data.message ||
          'Resposta sem produto.'
        );

        return undefined;
      }

      const product =
        data.product;

      const currentPrice =
        this.normalizePrice(
          product.currentPrice
        );

      if (
        currentPrice === undefined ||
        currentPrice <= 0
      ) {

        console.warn(
          'PC BRIDGE retornou produto sem preço válido:',
          JSON.stringify(product, null, 2)
        );

        return undefined;
      }

      const originalPrice =
        this.normalizePrice(
          product.originalPrice
        );

      let discountPercentage:
        number | undefined;

      if (
        originalPrice !== undefined &&
        originalPrice > currentPrice
      ) {

        discountPercentage =
          Math.round(
            (
              (
                originalPrice -
                currentPrice
              ) /
              originalPrice
            ) * 100
          );
      }

      const images =
        this.collectBridgeImages(
          product
        );

      const canonicalUrl =
        product.canonicalUrl ||
        productUrl;

      const ids =
        this.extractShopeeIdsSafe(
          canonicalUrl
        );

      const title =
        this.cleanShopeeTitle(
          product.title
        ) ||
        'Produto Shopee';

      return {

        /*
         * Mantemos shopee_resolver porque este valor
         * já existe no ProductData atual do projeto.
         */
        source:
          'shopee_resolver',

        productId:
          ids.itemId,

        canonicalUrl,

        title,

        currentPrice,

        originalPrice,

        discountPercentage,

        currency:
          'BRL',

        images,

        sellerName:
          product.sellerName ||
          undefined,

        rating:
          typeof product.rating ===
            'number' &&
          Number.isFinite(product.rating)
            ? product.rating
            : undefined,

        soldCount:
          typeof product.soldCount ===
            'number' &&
          Number.isFinite(product.soldCount)
            ? product.soldCount
            : undefined,

        availability:
          true,

        fetchedAt:
          new Date().toISOString(),
      };

    } catch (error) {

      console.warn(
        'PC BRIDGE FETCH ERROR:',
        error
      );

      return undefined;
    }
  }

  // =========================================================
  // COLLECT BRIDGE IMAGES
  // =========================================================

  private collectBridgeImages(
    product: BridgeProduct
  ): string[] {

    const images:
      string[] = [];

    const push =
      (value: unknown) => {

        if (
          typeof value !== 'string'
        ) {
          return;
        }

        const trimmed =
          value.trim();

        if (!trimmed) {
          return;
        }

        const normalized =
          this.normalizeShopeeImage(
            trimmed
          );

        if (
          normalized &&
          !images.includes(normalized)
        ) {
          images.push(normalized);
        }
      };

    if (
      Array.isArray(
        product.images
      )
    ) {

      for (
        const image of
        product.images
      ) {
        push(image);
      }
    }

    push(product.image);

    return images;
  }

  // =========================================================
  // FALLBACK DIRETO
  // =========================================================

  private async getProductDirect(
    initialUrl: string
  ): Promise<ProductData> {

    console.log(
      'USING DIRECT SHOPEE FALLBACK'
    );

    let resolvedUrl =
      initialUrl;

    try {

      resolvedUrl =
        await followSafeRedirects(
          initialUrl
        );

    } catch (error) {

      console.warn(
        'DIRECT RESOLVE ERROR:',
        error
      );
    }

    const finalCheck =
      validateSafeShopeeUrl(
        resolvedUrl
      );

    if (
      !finalCheck.isSafe ||
      !finalCheck.cleanUrl
    ) {

      throw new Error(
        finalCheck.error ||
        'URL resolvida não autorizada.'
      );
    }

    resolvedUrl =
      finalCheck.cleanUrl;

    console.log(
      'DIRECT RESOLVED URL:',
      resolvedUrl
    );

    const parsed =
      new URL(resolvedUrl);

    const ids =
      this.extractShopeeIds(
        parsed
      );

    console.log(
      'DIRECT SHOP ID:',
      ids.shopId
    );

    console.log(
      'DIRECT ITEM ID:',
      ids.itemId
    );

    let apiData:
      PublicPageData |
      undefined;

    if (
      ids.shopId &&
      ids.itemId
    ) {

      apiData =
        await this.fetchShopeeApi(
          ids.shopId,
          ids.itemId,
          resolvedUrl
        );
    }

    const htmlData =
      await this.extractFromPublicPage(
        resolvedUrl
      );

    const currentPrice =
      apiData?.currentPrice ??
      htmlData.currentPrice;

    if (
      currentPrice === undefined ||
      !Number.isFinite(
        currentPrice
      ) ||
      currentPrice <= 0
    ) {

      console.warn(
        'DIRECT PRICE NOT FOUND:',
        JSON.stringify(
          {
            resolvedUrl,
            shopId:
              ids.shopId,
            itemId:
              ids.itemId,
            apiPrice:
              apiData?.currentPrice,
            htmlPrice:
              htmlData.currentPrice,
          },
          null,
          2
        )
      );

      throw new Error(
        'Não consegui obter o preço real deste produto da Shopee.'
      );
    }

    const originalPrice =
      apiData?.originalPrice ??
      htmlData.originalPrice;

    let discountPercentage:
      number | undefined;

    if (
      originalPrice !== undefined &&
      originalPrice > currentPrice
    ) {

      discountPercentage =
        Math.round(
          (
            (
              originalPrice -
              currentPrice
            ) /
            originalPrice
          ) * 100
        );
    }

    const images =
      apiData?.images?.length
        ? apiData.images
        : htmlData.images;

    const title =
      this.cleanShopeeTitle(
        apiData?.title
      ) ||
      this.cleanShopeeTitle(
        htmlData.title
      ) ||
      this.extractTitleFromSlug(
        parsed.pathname
      ) ||
      'Produto Shopee';

    const canonicalUrl =
      this.cleanCanonicalUrl(
        resolvedUrl
      );

    return {

      source:
        apiData?.currentPrice !==
          undefined
          ? 'shopee_api'
          : 'shopee_resolver',

      productId:
        ids.itemId ||
        apiData?.productId ||
        htmlData.productId,

      canonicalUrl,

      title,

      currentPrice,

      originalPrice,

      discountPercentage,

      currency:
        'BRL',

      images,

      sellerName:
        apiData?.sellerName ||
        htmlData.sellerName,

      rating:
        apiData?.rating ??
        htmlData.rating,

      soldCount:
        apiData?.soldCount ??
        htmlData.soldCount,

      availability:
        apiData?.availability ??
        htmlData.availability ??
        true,

      fetchedAt:
        new Date().toISOString(),
    };
  }

  // =========================================================
  // SHOPEE API FALLBACK
  // =========================================================

  private async fetchShopeeApi(
    shopId: string,
    itemId: string,
    referer: string
  ): Promise<
    PublicPageData |
    undefined
  > {

    try {

      const apiUrl =
        `https://shopee.com.br/api/v4/item/get?itemid=${encodeURIComponent(
          itemId
        )}&shopid=${encodeURIComponent(
          shopId
        )}`;

      console.log(
        'TRYING DIRECT SHOPEE API:',
        apiUrl
      );

      const controller =
        new AbortController();

      const timeoutId =
        setTimeout(
          () =>
            controller.abort(),
          10000
        );

      try {

        const response =
          await fetch(
            apiUrl,
            {
              headers: {
                ...this.browserHeaders(),

                Accept:
                  'application/json,text/plain,*/*',

                Referer:
                  referer,

                'X-Requested-With':
                  'XMLHttpRequest',
              },

              signal:
                controller.signal,
            }
          );

        console.log(
          'DIRECT SHOPEE API STATUS:',
          response.status
        );

        if (
          !response.ok
        ) {

          return undefined;
        }

        const json:
          any =
          await response.json();

        const item =
          json?.data?.item ||
          json?.data;

        if (!item) {

          return undefined;
        }

        const currentPrice =
          this.normalizeShopeePrice(
            item.price
          ) ??
          this.normalizeShopeePrice(
            item.price_min
          );

        const originalPrice =
          this.normalizeShopeePrice(
            item.price_before_discount
          ) ??
          this.normalizeShopeePrice(
            item.price_max_before_discount
          );

        const images:
          string[] = [];

        if (
          Array.isArray(
            item.images
          )
        ) {

          for (
            const image of
            item.images
          ) {

            const normalized =
              this.normalizeShopeeImage(
                image
              );

            if (
              normalized &&
              !images.includes(
                normalized
              )
            ) {

              images.push(
                normalized
              );
            }
          }
        }

        if (
          images.length === 0
        ) {

          const single =
            this.normalizeShopeeImage(
              item.image
            );

          if (single) {
            images.push(single);
          }
        }

        const ratingRaw =
          Number(
            item?.item_rating
              ?.rating_star
          );

        const soldRaw =
          Number(
            item.historical_sold ??
            item.sold
          );

        let sellerName:
          string |
          undefined;

        if (
          typeof item.shop_name ===
          'string'
        ) {

          sellerName =
            item.shop_name;

        } else if (
          typeof item.brand ===
          'string'
        ) {

          sellerName =
            item.brand;

        } else if (
          typeof item?.brand?.name ===
          'string'
        ) {

          sellerName =
            item.brand.name;
        }

        return {

          title:
            this.cleanShopeeTitle(
              item.name
            ),

          images,

          currentPrice,

          originalPrice,

          sellerName,

          rating:
            Number.isFinite(
              ratingRaw
            )
              ? ratingRaw
              : undefined,

          soldCount:
            Number.isFinite(
              soldRaw
            )
              ? soldRaw
              : undefined,

          availability:
            item.stock ===
              undefined ||
            item.stock ===
              null
              ? true
              : Number(
                  item.stock
                ) > 0,

          productId:
            String(
              item.itemid ??
              item.item_id ??
              itemId
            ),
        };

      } finally {

        clearTimeout(
          timeoutId
        );
      }

    } catch (error) {

      console.warn(
        'DIRECT SHOPEE API ERROR:',
        error
      );

      return undefined;
    }
  }

  // =========================================================
  // PUBLIC PAGE FALLBACK
  // =========================================================

  private async extractFromPublicPage(
    targetUrl: string
  ): Promise<PublicPageData> {

    const result:
      PublicPageData = {
        images: [],
      };

    const controller =
      new AbortController();

    const timeoutId =
      setTimeout(
        () =>
          controller.abort(),
        10000
      );

    try {

      const response =
        await fetch(
          targetUrl,
          {
            headers:
              this.browserHeaders(),

            signal:
              controller.signal,
          }
        );

      console.log(
        'DIRECT HTML STATUS:',
        response.status
      );

      if (
        !response.ok
      ) {
        return result;
      }

      const html =
        await response.text();

      console.log(
        'DIRECT HTML SIZE:',
        html.length
      );

      // =====================================================
      // TITLE
      // =====================================================

      const ogTitle =
        html.match(
          /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i
        ) ||
        html.match(
          /<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i
        );

      result.title =
        this.cleanShopeeTitle(
          ogTitle?.[1]
        );

      if (
        !result.title
      ) {

        const titleTag =
          html.match(
            /<title>([^<]+)<\/title>/i
          );

        result.title =
          this.cleanShopeeTitle(
            titleTag?.[1]
          );
      }

      // =====================================================
      // IMAGE
      // =====================================================

      const imageRegex =
        /<meta\s+(?:property|name)=["']og:image(?::secure_url)?["']\s+content=["']([^"']+)["']/gi;

      let imageMatch:
        RegExpExecArray |
        null;

      while (
        (
          imageMatch =
            imageRegex.exec(
              html
            )
        ) !== null
      ) {

        const image =
          this.cleanHtmlEntities(
            imageMatch[1]
          );

        if (
          image &&
          !result.images.includes(
            image
          )
        ) {

          result.images.push(
            image
          );
        }
      }

      // =====================================================
      // PRICE
      // =====================================================

      const pricePatterns = [

        /"currentPrice"\s*:\s*"?([\d.,]+)"?/i,

        /"salePrice"\s*:\s*"?([\d.,]+)"?/i,

        /"sale_price"\s*:\s*"?([\d.,]+)"?/i,

        /"price"\s*:\s*(\d{5,})/i,

        /"price_min"\s*:\s*(\d{5,})/i,

        /R\$\s*(\d{1,7}(?:\.\d{3})*(?:,\d{2}))/i,
      ];

      for (
        const pattern of
        pricePatterns
      ) {

        const match =
          html.match(
            pattern
          );

        if (
          !match?.[1]
        ) {
          continue;
        }

        const price =
          this.parseLoosePrice(
            match[1]
          );

        if (
          price !== undefined &&
          price > 0
        ) {

          result.currentPrice =
            price;

          break;
        }
      }

      // =====================================================
      // ORIGINAL PRICE
      // =====================================================

      const originalPatterns = [

        /"originalPrice"\s*:\s*"?([\d.,]+)"?/i,

        /"original_price"\s*:\s*"?([\d.,]+)"?/i,

        /"price_before_discount"\s*:\s*(\d{5,})/i,

        /"price_max_before_discount"\s*:\s*(\d{5,})/i,
      ];

      for (
        const pattern of
        originalPatterns
      ) {

        const match =
          html.match(
            pattern
          );

        if (
          !match?.[1]
        ) {
          continue;
        }

        const value =
          this.parseLoosePrice(
            match[1]
          );

        if (
          value !== undefined &&
          value >
            (
              result.currentPrice ??
              0
            )
        ) {

          result.originalPrice =
            value;

          break;
        }
      }

      // =====================================================
      // PRODUCT ID
      // =====================================================

      const idMatch =
        html.match(
          /"(?:itemid|item_id|productId|product_id)"\s*:\s*"?(\d+)"?/i
        );

      if (
        idMatch?.[1]
      ) {

        result.productId =
          idMatch[1];
      }

      // =====================================================
      // RATING
      // =====================================================

      const ratingMatch =
        html.match(
          /"(?:rating|ratingStar|rating_star)"\s*:\s*([\d.]+)/i
        );

      if (
        ratingMatch?.[1]
      ) {

        const rating =
          Number.parseFloat(
            ratingMatch[1]
          );

        if (
          Number.isFinite(
            rating
          ) &&
          rating >= 0 &&
          rating <= 5
        ) {

          result.rating =
            rating;
        }
      }

      // =====================================================
      // SOLD
      // =====================================================

      const soldMatch =
        html.match(
          /"(?:sold|soldCount|sold_count|historical_sold)"\s*:\s*(\d+)/i
        );

      if (
        soldMatch?.[1]
      ) {

        const sold =
          Number.parseInt(
            soldMatch[1],
            10
          );

        if (
          Number.isFinite(
            sold
          )
        ) {

          result.soldCount =
            sold;
        }
      }

      console.log(
        'DIRECT HTML EXTRACTED:',
        JSON.stringify(
          {
            title:
              result.title,

            currentPrice:
              result.currentPrice,

            originalPrice:
              result.originalPrice,

            images:
              result.images.length,

            productId:
              result.productId,
          },
          null,
          2
        )
      );

      return result;

    } catch (error) {

      console.warn(
        'DIRECT HTML ERROR:',
        error
      );

      return result;

    } finally {

      clearTimeout(
        timeoutId
      );
    }
  }

  // =========================================================
  // EXTRACT IDS
  // =========================================================

  private extractShopeeIdsSafe(
    value: string
  ): ShopeeIds {

    try {

      return this.extractShopeeIds(
        new URL(value)
      );

    } catch {

      return {};
    }
  }

  private extractShopeeIds(
    parsed: URL
  ): ShopeeIds {

    const pathname =
      decodeURIComponent(
        parsed.pathname
      );

    const queryShopId =
      parsed.searchParams.get(
        'shopid'
      ) ||
      parsed.searchParams.get(
        'shop_id'
      );

    const queryItemId =
      parsed.searchParams.get(
        'itemid'
      ) ||
      parsed.searchParams.get(
        'item_id'
      );

    if (
      queryShopId &&
      queryItemId &&
      /^\d+$/.test(
        queryShopId
      ) &&
      /^\d+$/.test(
        queryItemId
      )
    ) {

      return {

        shopId:
          queryShopId,

        itemId:
          queryItemId,
      };
    }

    const classic =
      pathname.match(
        /-i\.(\d+)\.(\d+)/i
      );

    if (classic) {

      return {

        shopId:
          classic[1],

        itemId:
          classic[2],
      };
    }

    const productRoute =
      pathname.match(
        /\/product\/(\d+)\/(\d+)/i
      );

    if (productRoute) {

      return {

        shopId:
          productRoute[1],

        itemId:
          productRoute[2],
      };
    }

    const opaanlp =
      pathname.match(
        /\/opaanlp\/(\d+)\/(\d+)/i
      );

    if (opaanlp) {

      return {

        shopId:
          opaanlp[1],

        itemId:
          opaanlp[2],
      };
    }

    const numeric =
      pathname
        .split('/')
        .filter(Boolean)
        .filter(
          (
            value
          ) =>
            /^\d+$/.test(
              value
            )
        );

    if (
      numeric.length >= 2
    ) {

      return {

        shopId:
          numeric[
            numeric.length -
            2
          ],

        itemId:
          numeric[
            numeric.length -
            1
          ],
      };
    }

    return {};
  }

  // =========================================================
  // CANONICAL
  // =========================================================

  private cleanCanonicalUrl(
    input: string
  ): string {

    try {

      const url =
        new URL(input);

      const trackingKeys = [

        'sp_atk',
        'xptdk',
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_content',
        'utm_term',
        'uls_trackid',
        'gads_t_sig',
        'is_from_login',
        'from',
        'share_channel_code',
        'affiliate_id',
        'affiliateid',
        'utm_source_id',
        'smtt',
      ];

      for (
        const key of
        trackingKeys
      ) {

        url.searchParams.delete(
          key
        );
      }

      return url.toString();

    } catch {

      return input;
    }
  }

  // =========================================================
  // PRICE
  // =========================================================

  private normalizePrice(
    value: unknown
  ): number | undefined {

    if (
      value === null ||
      value === undefined
    ) {

      return undefined;
    }

    const number =
      Number(value);

    if (
      !Number.isFinite(
        number
      ) ||
      number <= 0
    ) {

      return undefined;
    }

    return (
      Math.round(
        number * 100
      ) / 100
    );
  }

  private normalizeShopeePrice(
    value: unknown
  ): number | undefined {

    if (
      value === undefined ||
      value === null
    ) {

      return undefined;
    }

    const numberValue =
      Number(value);

    if (
      !Number.isFinite(
        numberValue
      ) ||
      numberValue <= 0
    ) {

      return undefined;
    }

    if (
      numberValue >= 100000
    ) {

      return (
        Math.round(
          (
            numberValue /
            100000
          ) * 100
        ) / 100
      );
    }

    return (
      Math.round(
        numberValue * 100
      ) / 100
    );
  }

  private parseLoosePrice(
    input: unknown
  ): number | undefined {

    if (
      input === undefined ||
      input === null
    ) {

      return undefined;
    }

    if (
      typeof input ===
      'number'
    ) {

      return this.normalizeShopeePrice(
        input
      );
    }

    let text =
      String(input)
        .trim()
        .replace(
          /[^\d.,]/g,
          ''
        );

    if (!text) {

      return undefined;
    }

    if (
      text.includes(',')
    ) {

      text =
        text
          .replace(
            /\./g,
            ''
          )
          .replace(
            ',',
            '.'
          );

    } else {

      const parts =
        text.split('.');

      if (
        parts.length > 2 ||
        (
          parts.length === 2 &&
          parts[1].length === 3
        )
      ) {

        text =
          text.replace(
            /\./g,
            ''
          );
      }
    }

    const value =
      Number.parseFloat(
        text
      );

    if (
      !Number.isFinite(
        value
      ) ||
      value <= 0
    ) {

      return undefined;
    }

    if (
      value >= 100000 &&
      !String(input)
        .includes(',') &&
      !String(input)
        .includes('.')
    ) {

      return this.normalizeShopeePrice(
        value
      );
    }

    return value;
  }

  // =========================================================
  // IMAGE
  // =========================================================

  private normalizeShopeeImage(
    value: unknown
  ): string | undefined {

    if (
      typeof value !==
        'string' ||
      !value.trim()
    ) {

      return undefined;
    }

    const image =
      value.trim();

    if (
      image.startsWith(
        'http://'
      ) ||
      image.startsWith(
        'https://'
      )
    ) {

      return image;
    }

    return (
      'https://down-br.img.susercontent.com/file/' +
      image
    );
  }

  // =========================================================
  // TITLE
  // =========================================================

  private cleanShopeeTitle(
    value: unknown
  ): string | undefined {

    if (
      typeof value !==
      'string'
    ) {

      return undefined;
    }

    const cleaned =
      this.cleanHtmlEntities(
        value
      )
        .replace(
          /\s*\|\s*Shopee\s*Brasil.*$/i,
          ''
        )
        .replace(
          /\s+/g,
          ' '
        )
        .trim();

    if (!cleaned) {

      return undefined;
    }

    const lower =
      cleaned.toLowerCase();

    if (
      lower ===
        'shopee brasil' ||

      lower ===
        'produto shopee' ||

      lower ===
        'opaanlp' ||

      lower.includes(
        'shopee brasil | ofertas incríveis'
      ) ||

      lower.includes(
        'melhores preços do mercado'
      )
    ) {

      return undefined;
    }

    return cleaned;
  }

  private extractTitleFromSlug(
    pathname: string
  ): string | undefined {

    try {

      const ignored =
        new Set([
          'opaanlp',
          'product',
          'products',
          'shop',
          'item',
          'universal-link',
          'universal_link',
        ]);

      const segments =
        pathname
          .split('/')
          .filter(Boolean);

      for (
        const segment of
        segments
      ) {

        const decoded =
          decodeURIComponent(
            segment
          );

        if (
          /^\d+$/.test(
            decoded
          )
        ) {

          continue;
        }

        if (
          ignored.has(
            decoded.toLowerCase()
          )
        ) {

          continue;
        }

        const rawName =
          decoded
            .split('-i.')[0]
            .replace(
              /-/g,
              ' '
            )
            .replace(
              /_/g,
              ' '
            )
            .trim();

        if (
          rawName.length >= 6
        ) {

          return rawName;
        }
      }

    } catch {

      // ignore
    }

    return undefined;
  }

  // =========================================================
  // HEADERS
  // =========================================================

  private browserHeaders():
    Record<
      string,
      string
    > {

    return {

      'User-Agent':
        'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',

      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',

      'Accept-Language':
        'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',

      'Cache-Control':
        'no-cache',

      Pragma:
        'no-cache',
    };
  }

  // =========================================================
  // HTML ENTITIES
  // =========================================================

  private cleanHtmlEntities(
    str: string
  ): string {

    return str

      .replace(
        /&amp;/g,
        '&'
      )

      .replace(
        /&lt;/g,
        '<'
      )

      .replace(
        /&gt;/g,
        '>'
      )

      .replace(
        /&quot;/g,
        '"'
      )

      .replace(
        /&#39;/g,
        "'"
      )

      .replace(
        /&nbsp;/g,
        ' '
      )

      .replace(
        /&#x27;/g,
        "'"
      )

      .replace(
        /&#x2F;/g,
        '/'
      );
  }
}
