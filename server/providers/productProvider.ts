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

    const resolvedUrl = await this.resolveProductUrl(
      safety.cleanUrl
    );

    const parsed = new URL(resolvedUrl);

    console.log('RESOLVED URL:', resolvedUrl);

    const canonical = new URL(resolvedUrl);

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

    for (const key of trackingKeys) {
      canonical.searchParams.delete(key);
    }

    const canonicalUrl = canonical.toString();

    const ids = this.extractShopeeIds(parsed);

    console.log('SHOPEE SHOP ID:', ids.shopId);
    console.log('SHOPEE ITEM ID:', ids.itemId);

    let apiData: PublicPageData | undefined;

    if (ids.shopId && ids.itemId) {
      apiData = await this.fetchShopeeApi(
        ids.shopId,
        ids.itemId,
        resolvedUrl
      );
    }

    const htmlData = await this.extractFromPublicPage(
      resolvedUrl
    );

    const title =
      this.pickUsefulTitle(
        apiData?.title,
        htmlData.title,
        this.extractTitleFromSlug(parsed.pathname)
      ) || 'Produto Shopee';

    const images =
      apiData?.images?.length
        ? apiData.images
        : htmlData.images;

    const currentPrice =
      apiData?.currentPrice ??
      htmlData.currentPrice;

    const originalPrice =
      apiData?.originalPrice ??
      htmlData.originalPrice;

    if (
      currentPrice === undefined ||
      !Number.isFinite(currentPrice) ||
      currentPrice <= 0
    ) {
      console.warn(
        'PRICE NOT FOUND:',
        JSON.stringify(
          {
            resolvedUrl,
            shopId: ids.shopId,
            itemId: ids.itemId,
            apiPrice: apiData?.currentPrice,
            htmlPrice: htmlData.currentPrice,
          },
          null,
          2
        )
      );

      throw new Error(
        'Não consegui obter o preço real deste produto da Shopee. Tente gerar um novo link de compartilhamento do produto e tente novamente.'
      );
    }

    let discountPercentage: number | undefined;

    if (
      originalPrice !== undefined &&
      Number.isFinite(originalPrice) &&
      originalPrice > currentPrice
    ) {
      discountPercentage = Math.round(
        ((originalPrice - currentPrice) /
          originalPrice) *
          100
      );
    }

    const productId =
      ids.itemId ||
      apiData?.productId ||
      htmlData.productId;

    console.log(
      'FINAL PRODUCT:',
      JSON.stringify(
        {
          title,
          currentPrice,
          originalPrice,
          productId,
          images: images.length,
        },
        null,
        2
      )
    );

    return {
      source:
        apiData?.currentPrice !== undefined
          ? 'shopee_api'
          : 'shopee_resolver',

      productId,
      canonicalUrl,
      title,
      currentPrice,
      originalPrice,
      discountPercentage,
      currency: 'BRL',
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

      fetchedAt: new Date().toISOString(),
    };
  }

  // =========================================================
  // RESOLVE SHORT LINKS
  // =========================================================

  private async resolveProductUrl(
    initialUrl: string
  ): Promise<string> {
    let currentUrl = initialUrl;

    try {
      currentUrl = await followSafeRedirects(initialUrl);
    } catch (error) {
      console.warn(
        'followSafeRedirects failed, trying GET resolver:',
        error
      );
    }

    const firstCheck =
      validateSafeShopeeUrl(currentUrl);

    if (
      !firstCheck.isSafe ||
      !firstCheck.cleanUrl
    ) {
      throw new Error(
        firstCheck.error ||
          'URL resolvida não autorizada.'
      );
    }

    currentUrl = firstCheck.cleanUrl;

    if (!this.isShortShopeeHost(new URL(currentUrl).hostname)) {
      return currentUrl;
    }

    for (let hop = 0; hop < 6; hop++) {
      const safety =
        validateSafeShopeeUrl(currentUrl);

      if (
        !safety.isSafe ||
        !safety.cleanUrl
      ) {
        throw new Error(
          safety.error ||
            'Redirecionamento não autorizado.'
        );
      }

      currentUrl = safety.cleanUrl;

      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        10000
      );

      try {
        const response = await fetch(currentUrl, {
          method: 'GET',
          redirect: 'manual',
          signal: controller.signal,
          headers: this.browserHeaders(),
        });

        clearTimeout(timeoutId);

        console.log(
          'SHORTLINK STATUS:',
          response.status,
          currentUrl
        );

        if (
          response.status >= 300 &&
          response.status < 400
        ) {
          const location =
            response.headers.get('location');

          if (!location) {
            break;
          }

          const nextUrl = new URL(
            location,
            currentUrl
          ).toString();

          const nextCheck =
            validateSafeShopeeUrl(nextUrl);

          if (
            !nextCheck.isSafe ||
            !nextCheck.cleanUrl
          ) {
            throw new Error(
              nextCheck.error ||
                'Redirecionamento para domínio não autorizado.'
            );
          }

          currentUrl = nextCheck.cleanUrl;

          if (
            !this.isShortShopeeHost(
              new URL(currentUrl).hostname
            )
          ) {
            return currentUrl;
          }

          continue;
        }

        if (response.ok) {
          const html = await response.text();

          const extracted =
            this.extractProductUrlFromShortPage(
              html,
              currentUrl
            );

          if (extracted) {
            const extractedCheck =
              validateSafeShopeeUrl(extracted);

            if (
              extractedCheck.isSafe &&
              extractedCheck.cleanUrl
            ) {
              currentUrl =
                extractedCheck.cleanUrl;

              if (
                !this.isShortShopeeHost(
                  new URL(currentUrl).hostname
                )
              ) {
                return currentUrl;
              }

              continue;
            }
          }
        }

        break;
      } catch (error) {
        clearTimeout(timeoutId);

        console.warn(
          'SHORTLINK GET RESOLVER ERROR:',
          error
        );

        break;
      }
    }

    return currentUrl;
  }

  private isShortShopeeHost(
    hostname: string
  ): boolean {
    const host = hostname.toLowerCase();

    return (
      host === 's.shopee.com.br' ||
      host === 'shp.ee' ||
      host === 'br.shp.ee' ||
      host === 'shope.ee'
    );
  }

  private extractProductUrlFromShortPage(
    html: string,
    baseUrl: string
  ): string | undefined {
    const candidates: string[] = [];

    const canonical =
      html.match(
        /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i
      ) ||
      html.match(
        /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i
      );

    if (canonical?.[1]) {
      candidates.push(canonical[1]);
    }

    const ogUrl =
      html.match(
        /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i
      ) ||
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:url["']/i
      );

    if (ogUrl?.[1]) {
      candidates.push(ogUrl[1]);
    }

    const jsPatterns = [
      /(?:window\.)?location(?:\.href)?\s*=\s*["']([^"']+)["']/i,
      /location\.replace\(\s*["']([^"']+)["']\s*\)/i,
      /location\.assign\(\s*["']([^"']+)["']\s*\)/i,
      /"redirectUrl"\s*:\s*"([^"]+)"/i,
      /"redirect_url"\s*:\s*"([^"]+)"/i,
      /"targetUrl"\s*:\s*"([^"]+)"/i,
      /"target_url"\s*:\s*"([^"]+)"/i,
    ];

    for (const pattern of jsPatterns) {
      const match = html.match(pattern);

      if (match?.[1]) {
        candidates.push(
          match[1]
            .replace(/\\u002F/gi, '/')
            .replace(/\\\//g, '/')
            .replace(/&amp;/g, '&')
        );
      }
    }

    const directUrls =
      html.match(
        /https?:\\?\/\\?\/(?:www\.)?shopee\.com\.br\\?\/[^"'<>\\\s]+/gi
      ) || [];

    for (const url of directUrls) {
      candidates.push(
        url
          .replace(/\\u002F/gi, '/')
          .replace(/\\\//g, '/')
          .replace(/&amp;/g, '&')
      );
    }

    for (const candidate of candidates) {
      try {
        const absolute = new URL(
          candidate,
          baseUrl
        ).toString();

        const parsed = new URL(absolute);

        if (
          this.extractShopeeIds(parsed).itemId ||
          /-i\.\d+\.\d+/i.test(
            parsed.pathname
          )
        ) {
          return absolute;
        }
      } catch {
        // ignore invalid candidate
      }
    }

    return undefined;
  }

  // =========================================================
  // EXTRACT SHOP + ITEM ID
  // =========================================================

  private extractShopeeIds(
    parsed: URL
  ): ShopeeIds {
    const pathname =
      decodeURIComponent(parsed.pathname);

    const queryShopId =
      parsed.searchParams.get('shopid') ||
      parsed.searchParams.get('shop_id');

    const queryItemId =
      parsed.searchParams.get('itemid') ||
      parsed.searchParams.get('item_id');

    if (
      queryShopId &&
      queryItemId &&
      /^\d+$/.test(queryShopId) &&
      /^\d+$/.test(queryItemId)
    ) {
      return {
        shopId: queryShopId,
        itemId: queryItemId,
      };
    }

    const classicMatch =
      pathname.match(
        /-i\.(\d+)\.(\d+)/i
      );

    if (classicMatch) {
      return {
        shopId: classicMatch[1],
        itemId: classicMatch[2],
      };
    }

    const productRouteMatch =
      pathname.match(
        /\/product\/(\d+)\/(\d+)/i
      );

    if (productRouteMatch) {
      return {
        shopId: productRouteMatch[1],
        itemId: productRouteMatch[2],
      };
    }

    const numericSegments =
      pathname
        .split('/')
        .filter(Boolean)
        .filter((part) => /^\d+$/.test(part));

    if (numericSegments.length >= 2) {
      return {
        shopId:
          numericSegments[
            numericSegments.length - 2
          ],

        itemId:
          numericSegments[
            numericSegments.length - 1
          ],
      };
    }

    return {};
  }

  // =========================================================
  // SHOPEE API
  // =========================================================

  private async fetchShopeeApi(
    shopId: string,
    itemId: string,
    referer: string
  ): Promise<PublicPageData | undefined> {
    try {
      const apiUrl =
        `https://shopee.com.br/api/v4/item/get?itemid=${encodeURIComponent(
          itemId
        )}&shopid=${encodeURIComponent(
          shopId
        )}`;

      console.log(
        'TRYING SHOPEE API:',
        apiUrl
      );

      const controller =
        new AbortController();

      const timeoutId =
        setTimeout(
          () => controller.abort(),
          10000
        );

      const response = await fetch(apiUrl, {
        headers: {
          ...this.browserHeaders(),
          Accept:
            'application/json,text/plain,*/*',
          Referer: referer,
          'X-Requested-With':
            'XMLHttpRequest',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      console.log(
        'SHOPEE API STATUS:',
        response.status
      );

      if (!response.ok) {
        return undefined;
      }

      const json: any =
        await response.json();

      const item =
        json?.data?.item ||
        json?.data;

      if (!item) {
        console.log(
          'SHOPEE API: no item data'
        );

        return undefined;
      }

      const title =
        typeof item.name === 'string'
          ? this.cleanShopeeTitle(item.name)
          : undefined;

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

      const images: string[] = [];

      if (Array.isArray(item.images)) {
        for (const image of item.images) {
          const normalized =
            this.normalizeShopeeImage(image);

          if (
            normalized &&
            !images.includes(normalized)
          ) {
            images.push(normalized);
          }
        }
      }

      const singleImage =
        this.normalizeShopeeImage(
          item.image
        );

      if (
        images.length === 0 &&
        singleImage
      ) {
        images.push(singleImage);
      }

      const ratingValue =
        Number(
          item?.item_rating?.rating_star
        );

      const rating =
        Number.isFinite(ratingValue)
          ? ratingValue
          : undefined;

      const historicalSold =
        Number(item.historical_sold);

      const sold =
        Number(item.sold);

      const soldCount =
        Number.isFinite(historicalSold)
          ? historicalSold
          : Number.isFinite(sold)
            ? sold
            : undefined;

      let sellerName:
        | string
        | undefined;

      if (
        typeof item.shop_name === 'string'
      ) {
        sellerName = item.shop_name;
      } else if (
        typeof item.brand === 'string' &&
        item.brand
      ) {
        sellerName = item.brand;
      } else if (
        typeof item?.brand?.name ===
        'string'
      ) {
        sellerName = item.brand.name;
      }

      const stock =
        Number(item.stock);

      const availability =
        item.stock === undefined ||
        item.stock === null
          ? true
          : Number.isFinite(stock)
            ? stock > 0
            : true;

      console.log(
        'SHOPEE API PRODUCT:',
        JSON.stringify(
          {
            title,
            currentPrice,
            originalPrice,
            imageCount: images.length,
            rating,
            soldCount,
          },
          null,
          2
        )
      );

      return {
        title,
        images,
        currentPrice,
        originalPrice,
        sellerName,
        rating,
        soldCount,
        availability,
        productId: String(
          item.itemid ??
            item.item_id ??
            itemId
        ),
      };
    } catch (error) {
      console.warn(
        'SHOPEE API ERROR:',
        error
      );

      return undefined;
    }
  }

  // =========================================================
  // NORMALIZERS
  // =========================================================

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
      !Number.isFinite(numberValue) ||
      numberValue <= 0
    ) {
      return undefined;
    }

    if (numberValue >= 100000) {
      return (
        Math.round(
          (numberValue / 100000) * 100
        ) / 100
      );
    }

    return (
      Math.round(numberValue * 100) /
      100
    );
  }

  private normalizeShopeeImage(
    value: unknown
  ): string | undefined {
    if (
      typeof value !== 'string' ||
      !value.trim()
    ) {
      return undefined;
    }

    const image = value.trim();

    if (
      image.startsWith('http://') ||
      image.startsWith('https://')
    ) {
      return image;
    }

    return `https://down-br.img.susercontent.com/file/${image}`;
  }

  // =========================================================
  // TITLE
  // =========================================================

  private pickUsefulTitle(
    ...values: Array<
      string | undefined
    >
  ): string | undefined {
    for (const value of values) {
      const cleaned =
        this.cleanShopeeTitle(value);

      if (cleaned) {
        return cleaned;
      }
    }

    return undefined;
  }

  private cleanShopeeTitle(
    value: unknown
  ): string | undefined {
    if (
      typeof value !== 'string'
    ) {
      return undefined;
    }

    const cleaned =
      this.cleanHtmlEntities(value)
        .replace(
          /\s*\|\s*Shopee\s*Brasil.*$/i,
          ''
        )
        .replace(/\s+/g, ' ')
        .trim();

    if (!cleaned) {
      return undefined;
    }

    const lower =
      cleaned.toLowerCase();

    const genericTitles = [
      'shopee brasil',
      'ofertas incríveis',
      'melhores preços do mercado',
      'produto shopee',
      'opaanlp',
    ];

    if (
      genericTitles.some(
        (fragment) =>
          lower === fragment ||
          lower.includes(
            'shopee brasil | ofertas incríveis'
          ) ||
          lower.includes(
            'melhores preços do mercado'
          )
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
      const ignored = new Set([
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

      for (const segment of segments) {
        const decodedSegment =
          decodeURIComponent(segment);

        if (
          /^\d+$/.test(decodedSegment)
        ) {
          continue;
        }

        if (
          ignored.has(
            decodedSegment.toLowerCase()
          )
        ) {
          continue;
        }

        if (
          /^[a-z0-9_-]{4,12}$/i.test(
            decodedSegment
          ) &&
          !decodedSegment.includes('-i.')
        ) {
          continue;
        }

        const rawName =
          decodedSegment
            .split('-i.')[0]
            .replace(/-/g, ' ')
            .replace(/_/g, ' ')
            .trim();

        if (
          rawName.length < 6
        ) {
          continue;
        }

        return rawName;
      }
    } catch {
      // ignore
    }

    return undefined;
  }

  // =========================================================
  // PUBLIC HTML FALLBACK
  // =========================================================

  private async extractFromPublicPage(
    targetUrl: string
  ): Promise<PublicPageData> {
    const images: string[] = [];

    let title: string | undefined;
    let currentPrice: number | undefined;
    let originalPrice: number | undefined;
    let sellerName: string | undefined;
    let rating: number | undefined;
    let soldCount: number | undefined;
    let availability: boolean | undefined;
    let productId: string | undefined;

    const parsePrice = (
      input: unknown
    ): number | undefined => {
      if (
        input === undefined ||
        input === null
      ) {
        return undefined;
      }

      if (
        typeof input === 'number'
      ) {
        if (
          !Number.isFinite(input) ||
          input <= 0
        ) {
          return undefined;
        }

        if (input >= 100000) {
          return this.normalizeShopeePrice(
            input
          );
        }

        return (
          Math.round(input * 100) /
          100
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

      if (text.includes(',')) {
        text = text
          .replace(/\./g, '')
          .replace(',', '.');
      } else {
        const pieces =
          text.split('.');

        if (
          pieces.length > 2 ||
          (
            pieces.length === 2 &&
            pieces[1].length === 3
          )
        ) {
          text =
            text.replace(/\./g, '');
        }
      }

      const value =
        Number.parseFloat(text);

      if (
        !Number.isFinite(value) ||
        value <= 0
      ) {
        return undefined;
      }

      if (
        value >= 100000 &&
        !String(input).includes(',') &&
        !String(input).includes('.')
      ) {
        return this.normalizeShopeePrice(
          value
        );
      }

      return value;
    };

    try {
      const controller =
        new AbortController();

      const timeoutId =
        setTimeout(
          () => controller.abort(),
          10000
        );

      const res = await fetch(
        targetUrl,
        {
          headers:
            this.browserHeaders(),
          signal:
            controller.signal,
        }
      );

      clearTimeout(timeoutId);

      console.log(
        'SHOPEE STATUS:',
        res.status
      );

      console.log(
        'SHOPEE URL FINAL:',
        res.url
      );

      if (res.ok) {
        const html =
          await res.text();

        console.log(
          'HTML SIZE:',
          html.length
        );

        console.log(
          'HTML START:',
          html.substring(0, 150)
        );

        // -------------------------------
        // TITLE
        // -------------------------------

        const ogTitleMatch =
          html.match(
            /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i
          ) ||
          html.match(
            /<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i
          );

        title =
          this.cleanShopeeTitle(
            ogTitleMatch?.[1]
          );

        // -------------------------------
        // IMAGES
        // -------------------------------

        const imagePatterns = [
          /<meta\s+(?:property|name)=["']og:image(?::secure_url)?["']\s+content=["']([^"']+)["']/gi,
          /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:image(?::secure_url)?["']/gi,
        ];

        for (const regex of imagePatterns) {
          let match:
            RegExpExecArray | null;

          while (
            (match = regex.exec(html)) !==
            null
          ) {
            const image =
              this.cleanHtmlEntities(
                match[1]
              );

            if (
              image &&
              !images.includes(image)
            ) {
              images.push(image);
            }
          }
        }

        // -------------------------------
        // JSON-LD
        // -------------------------------

        const jsonLdRegex =
          /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

        let jsonMatch:
          RegExpExecArray | null;

        while (
          (
            jsonMatch =
              jsonLdRegex.exec(html)
          ) !== null
        ) {
          try {
            const rawData =
              JSON.parse(
                jsonMatch[1]
              );

            const candidates =
              Array.isArray(rawData)
                ? rawData
                : [rawData];

            for (
              const candidate of candidates
            ) {
              const product =
                candidate?.['@type'] ===
                'Product'
                  ? candidate
                  : candidate?.[
                      '@graph'
                    ]?.find?.(
                      (entry: any) =>
                        entry?.[
                          '@type'
                        ] ===
                        'Product'
                    );

              if (!product) {
                continue;
              }

              if (!title) {
                title =
                  this.cleanShopeeTitle(
                    product.name
                  );
              }

              if (product.image) {
                const jsonImages =
                  Array.isArray(
                    product.image
                  )
                    ? product.image
                    : [product.image];

                for (
                  const image of jsonImages
                ) {
                  const url =
                    typeof image ===
                    'string'
                      ? image
                      : image?.url;

                  if (
                    typeof url ===
                      'string' &&
                    url &&
                    !images.includes(url)
                  ) {
                    images.push(url);
                  }
                }
              }

              const offers =
                product.offers
                  ? Array.isArray(
                      product.offers
                    )
                    ? product.offers
                    : [product.offers]
                  : [];

              for (
                const offer of offers
              ) {
                if (
                  currentPrice ===
                  undefined
                ) {
                  currentPrice =
                    parsePrice(
                      offer?.price
                    ) ??
                    parsePrice(
                      offer?.lowPrice
                    );
                }

                if (
                  originalPrice ===
                  undefined
                ) {
                  originalPrice =
                    parsePrice(
                      offer?.highPrice
                    );
                }

                if (
                  offer?.availability
                ) {
                  availability =
                    !String(
                      offer.availability
                    )
                      .toLowerCase()
                      .includes(
                        'outofstock'
                      );
                }
              }

              if (
                rating === undefined &&
                product
                  ?.aggregateRating
                  ?.ratingValue
              ) {
                const value =
                  Number.parseFloat(
                    String(
                      product
                        .aggregateRating
                        .ratingValue
                    )
                  );

                if (
                  Number.isFinite(value)
                ) {
                  rating = value;
                }
              }

              if (
                !sellerName &&
                product.brand
              ) {
                sellerName =
                  typeof product.brand ===
                    'string'
                    ? product.brand
                    : product.brand?.name;
              }

              if (
                !productId &&
                product.sku
              ) {
                productId =
                  String(product.sku);
              }
            }
          } catch {
            // invalid JSON-LD
          }
        }

        // -------------------------------
        // META PRICE
        // -------------------------------

        if (
          currentPrice === undefined
        ) {
          const metaPrice =
            html.match(
              /<meta\s+(?:property|name)=["'](?:product:price:amount|og:price:amount)["']\s+content=["']([^"']+)["']/i
            ) ||
            html.match(
              /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["'](?:product:price:amount|og:price:amount)["']/i
            );

          currentPrice =
            parsePrice(
              metaPrice?.[1]
            );
        }

        // -------------------------------
        // EMBEDDED PRICES
        // -------------------------------

        if (
          currentPrice === undefined
        ) {
          const patterns = [
            /"currentPrice"\s*:\s*"?([\d.,]+)"?/i,
            /"salePrice"\s*:\s*"?([\d.,]+)"?/i,
            /"sale_price"\s*:\s*"?([\d.,]+)"?/i,
            /"price"\s*:\s*(\d{5,})/i,
            /"price"\s*:\s*"(\d+[.,]\d{2})"/i,
            /"price_min"\s*:\s*(\d{5,})/i,
          ];

          for (const pattern of patterns) {
            const match =
              html.match(pattern);

            if (!match?.[1]) {
              continue;
            }

            const value =
              parsePrice(match[1]);

            if (value !== undefined) {
              currentPrice = value;
              break;
            }
          }
        }

        // -------------------------------
        // VISIBLE R$ PRICE
        // -------------------------------

        if (
          currentPrice === undefined
        ) {
          const visible =
            html.match(
              /R\$\s*(\d{1,7}(?:\.\d{3})*(?:,\d{2}))/i
            );

          currentPrice =
            parsePrice(
              visible?.[1]
            );
        }

        // -------------------------------
        // ORIGINAL PRICE
        // -------------------------------

        if (
          originalPrice === undefined
        ) {
          const patterns = [
            /"originalPrice"\s*:\s*"?([\d.,]+)"?/i,
            /"original_price"\s*:\s*"?([\d.,]+)"?/i,
            /"priceBeforeDiscount"\s*:\s*"?([\d.,]+)"?/i,
            /"price_before_discount"\s*:\s*(\d{5,})/i,
            /"price_max_before_discount"\s*:\s*(\d{5,})/i,
          ];

          for (const pattern of patterns) {
            const match =
              html.match(pattern);

            if (!match?.[1]) {
              continue;
            }

            const value =
              parsePrice(match[1]);

            if (
              value !== undefined &&
              value !== currentPrice
            ) {
              originalPrice = value;
              break;
            }
          }
        }

        // -------------------------------
        // SELLER
        // -------------------------------

        if (!sellerName) {
          const patterns = [
            /"shopName"\s*:\s*"([^"]+)"/i,
            /"shop_name"\s*:\s*"([^"]+)"/i,
            /"sellerName"\s*:\s*"([^"]+)"/i,
          ];

          for (const pattern of patterns) {
            const match =
              html.match(pattern);

            if (match?.[1]) {
              sellerName =
                this.cleanHtmlEntities(
                  match[1]
                );

              break;
            }
          }
        }

        // -------------------------------
        // RATING
        // -------------------------------

        if (
          rating === undefined
        ) {
          const match =
            html.match(
              /"(?:rating|ratingStar|rating_star)"\s*:\s*([\d.]+)/i
            );

          if (match?.[1]) {
            const value =
              Number.parseFloat(
                match[1]
              );

            if (
              Number.isFinite(value) &&
              value >= 0 &&
              value <= 5
            ) {
              rating = value;
            }
          }
        }

        // -------------------------------
        // SOLD
        // -------------------------------

        if (
          soldCount === undefined
        ) {
          const match =
            html.match(
              /"(?:sold|soldCount|sold_count|historical_sold)"\s*:\s*(\d+)/i
            );

          if (match?.[1]) {
            const value =
              Number.parseInt(
                match[1],
                10
              );

            if (
              Number.isFinite(value)
            ) {
              soldCount = value;
            }
          }
        }

        // -------------------------------
        // PRODUCT ID
        // -------------------------------

        if (!productId) {
          const idMatch =
            html.match(
              /"(?:itemid|item_id|productId|product_id)"\s*:\s*"?(\d+)"?/i
            );

          if (idMatch?.[1]) {
            productId =
              idMatch[1];
          }
        }

        // -------------------------------
        // TITLE TAG
        // -------------------------------

        if (!title) {
          const titleTag =
            html.match(
              /<title>([^<]+)<\/title>/i
            );

          title =
            this.cleanShopeeTitle(
              titleTag?.[1]
            );
        }

        // -------------------------------
        // FINAL URL MAY HAVE IDS
        // -------------------------------

        if (
          res.url &&
          res.url !== targetUrl
        ) {
          try {
            const finalIds =
              this.extractShopeeIds(
                new URL(res.url)
              );

            if (
              !productId &&
              finalIds.itemId
            ) {
              productId =
                finalIds.itemId;
            }
          } catch {
            // ignore
          }
        }
      }
    } catch (error) {
      console.warn(
        'Could not fetch public page metadata:',
        error
      );
    }

    console.log(
      'HTML EXTRACTED:',
      JSON.stringify(
        {
          title,
          currentPrice,
          originalPrice,
          images: images.length,
          productId,
        },
        null,
        2
      )
    );

    return {
      title,
      images,
      currentPrice,
      originalPrice,
      sellerName,
      rating,
      soldCount,
      availability,
      productId,
    };
  }

  // =========================================================
  // HEADERS
  // =========================================================

  private browserHeaders(): Record<string, string> {
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
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/');
  }
}
