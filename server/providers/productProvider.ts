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
        safety.error || 'URL inválida ou não autorizada'
      );
    }

    // Resolve links curtos como s.shopee.com.br
    const resolvedUrl =
      await followSafeRedirects(safety.cleanUrl);

    const parsed = new URL(resolvedUrl);

    console.log('RESOLVED URL:', resolvedUrl);

    // Remove parâmetros de rastreamento
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
    ];

    trackingKeys.forEach((key) => {
      canonical.searchParams.delete(key);
    });

    const canonicalUrl = canonical.toString();

    // Tenta descobrir shopId e itemId
    const ids = this.extractShopeeIds(parsed);

    console.log('SHOPEE SHOP ID:', ids.shopId);
    console.log('SHOPEE ITEM ID:', ids.itemId);

    let apiData: PublicPageData | undefined;

    // Primeiro tenta dados estruturados da Shopee
    if (ids.shopId && ids.itemId) {
      apiData = await this.fetchShopeeApi(
        ids.shopId,
        ids.itemId,
        resolvedUrl
      );
    }

    // Depois tenta HTML como fallback
    const htmlData =
      await this.extractFromPublicPage(resolvedUrl);

    const title =
      apiData?.title ||
      htmlData.title ||
      this.extractTitleFromSlug(parsed.pathname) ||
      'Produto Shopee';

    const images =
      apiData?.images?.length
        ? apiData.images
        : htmlData.images;

    const currentPrice =
      apiData?.currentPrice ??
      htmlData.currentPrice ??
      0;

    const originalPrice =
      apiData?.originalPrice ??
      htmlData.originalPrice;

    let discountPercentage:
      | number
      | undefined;

    if (
      currentPrice > 0 &&
      originalPrice &&
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
  // EXTRACT SHOP + ITEM ID
  // =========================================================

  private extractShopeeIds(
    parsed: URL
  ): ShopeeIds {

    let shopId: string | undefined;
    let itemId: string | undefined;

    const pathname = parsed.pathname;

    /*
      Formato comum:

      /nome-produto-i.123456.987654

      ou:

      /slug/123456/987654

      No seu log apareceu algo semelhante a:

      /opaanlp/1180886499/22398055454
    */

    const classicMatch =
      pathname.match(
        /-i\.(\d+)\.(\d+)/i
      );

    if (classicMatch) {
      shopId = classicMatch[1];
      itemId = classicMatch[2];

      return {
        shopId,
        itemId,
      };
    }

    const numericSegments =
      pathname
        .split('/')
        .filter(Boolean)
        .filter((part) => /^\d+$/.test(part));

    if (numericSegments.length >= 2) {
      shopId =
        numericSegments[
          numericSegments.length - 2
        ];

      itemId =
        numericSegments[
          numericSegments.length - 1
        ];
    }

    return {
      shopId,
      itemId,
    };
  }


  // =========================================================
  // SHOPEE STRUCTURED API
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
        setTimeout(() => {
          controller.abort();
        }, 10000);

      const response =
        await fetch(apiUrl, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',

            Accept:
              'application/json,text/plain,*/*',

            'Accept-Language':
              'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',

            Referer: referer,

            'X-Requested-With':
              'XMLHttpRequest',
          },

          signal:
            controller.signal,
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
        json?.data;

      if (!item) {
        console.log(
          'SHOPEE API: no data'
        );

        return undefined;
      }

      const title =
        typeof item.name === 'string'
          ? item.name
          : undefined;

      const currentPrice =
        this.normalizeShopeePrice(
          item.price
        );

      const originalPrice =
        this.normalizeShopeePrice(
          item.price_before_discount
        );

      const images: string[] = [];

      if (Array.isArray(item.images)) {
        for (
          const image of item.images
        ) {

          if (
            typeof image !== 'string' ||
            !image
          ) {
            continue;
          }

          if (
            image.startsWith('http://') ||
            image.startsWith('https://')
          ) {
            images.push(image);
          } else {
            images.push(
              `https://down-br.img.susercontent.com/file/${image}`
            );
          }
        }
      }

      if (
        images.length === 0 &&
        typeof item.image === 'string'
      ) {
        images.push(
          item.image.startsWith('http')
            ? item.image
            : `https://down-br.img.susercontent.com/file/${item.image}`
        );
      }

      let rating:
        | number
        | undefined;

      const ratingValue =
        item?.item_rating?.rating_star;

      if (
        typeof ratingValue === 'number'
      ) {
        rating = ratingValue;
      }

      let soldCount:
        | number
        | undefined;

      if (
        typeof item.historical_sold ===
        'number'
      ) {
        soldCount =
          item.historical_sold;
      } else if (
        typeof item.sold === 'number'
      ) {
        soldCount =
          item.sold;
      }

      let sellerName:
        | string
        | undefined;

      if (
        typeof item.shop_name ===
        'string'
      ) {
        sellerName =
          item.shop_name;
      } else if (
        typeof item.brand ===
          'string' &&
        item.brand
      ) {
        sellerName =
          item.brand;
      }

      const availability =
        item.stock === undefined
          ? true
          : Number(item.stock) > 0;

      console.log(
        'SHOPEE API PRODUCT:',
        JSON.stringify(
          {
            title,
            currentPrice,
            originalPrice,
            imageCount:
              images.length,
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
        productId:
          String(
            item.itemid ??
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
  // NORMALIZE SHOPEE PRICE
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
      !Number.isFinite(
        numberValue
      ) ||
      numberValue <= 0
    ) {
      return undefined;
    }

    /*
      A Shopee frequentemente retorna
      preços multiplicados por 100000.

      Exemplo:

      8990000 -> R$ 89,90
    */

    if (numberValue >= 100000) {
      return (
        Math.round(
          (numberValue / 100000) *
            100
        ) / 100
      );
    }

    return (
      Math.round(
        numberValue * 100
      ) / 100
    );
  }


  // =========================================================
  // TITLE FROM URL
  // =========================================================

  private extractTitleFromSlug(
    pathname: string
  ): string | undefined {

    try {

      const segments =
        pathname
          .split('/')
          .filter(Boolean);

      for (
        const segment of segments
      ) {

        /*
          Não usa segmentos que
          sejam somente números
        */

        if (
          /^\d+$/.test(segment)
        ) {
          continue;
        }

        /*
          Ignora códigos muito curtos
        */

        if (
          segment.length < 4
        ) {
          continue;
        }

        const rawName =
          segment
            .split('-i.')[0]
            .replace(/-/g, ' ');

        const decoded =
          decodeURIComponent(
            rawName
          ).trim();

        if (
          decoded.length >= 4
        ) {
          return decoded;
        }
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

    let title:
      | string
      | undefined;

    let currentPrice:
      | number
      | undefined;

    let originalPrice:
      | number
      | undefined;

    let sellerName:
      | string
      | undefined;

    let rating:
      | number
      | undefined;

    let soldCount:
      | number
      | undefined;

    let availability:
      | boolean
      | undefined;

    let productId:
      | string
      | undefined;


    const parsePrice = (
      input: unknown
    ): number | undefined => {

      if (
        input === undefined ||
        input === null
      ) {
        return undefined;
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

      /*
        Brasileiro:

        1.299,90
      */

      if (
        text.includes(',')
      ) {

        text =
          text
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
            text.replace(
              /\./g,
              ''
            );
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

      return value;
    };


    try {

      const controller =
        new AbortController();

      const timeoutId =
        setTimeout(() => {
          controller.abort();
        }, 10000);


      const res =
        await fetch(
          targetUrl,
          {

            headers: {

              'User-Agent':
                'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',

              Accept:
                'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',

              'Accept-Language':
                'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',

              'Cache-Control':
                'no-cache',

            },

            signal:
              controller.signal,

          }
        );


      clearTimeout(
        timeoutId
      );


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


        /*
          Não imprimimos mais
          1000 caracteres inteiros
          para evitar poluir o Render.
        */

        console.log(
          'HTML START:',
          html.substring(
            0,
            150
          )
        );


        // =====================================================
        // OPEN GRAPH TITLE
        // =====================================================

        const ogTitleMatch =
          html.match(
            /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i
          ) ||
          html.match(
            /<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i
          );


        if (
          ogTitleMatch?.[1]
        ) {

          title =
            this.cleanHtmlEntities(
              ogTitleMatch[1]
                .replace(
                  /\s*\|\s*Shopee\s*Brasil.*$/i,
                  ''
                )
                .trim()
            );
        }


        // =====================================================
        // OPEN GRAPH IMAGES
        // =====================================================

        const imagePatterns = [

          /<meta\s+(?:property|name)=["']og:image(?::secure_url)?["']\s+content=["']([^"']+)["']/gi,

          /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:image(?::secure_url)?["']/gi,

        ];


        for (
          const regex of
          imagePatterns
        ) {

          let match:
            RegExpExecArray |
            null;

          while (
            (
              match =
                regex.exec(html)
            ) !== null
          ) {

            const image =
              match[1];

            if (
              image &&
              !images.includes(
                image
              )
            ) {
              images.push(
                image
              );
            }
          }
        }


        // =====================================================
        // JSON-LD
        // =====================================================

        const jsonLdRegex =
          /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;


        let jsonMatch:
          RegExpExecArray |
          null;


        while (
          (
            jsonMatch =
              jsonLdRegex.exec(
                html
              )
          ) !== null
        ) {

          try {

            const rawData =
              JSON.parse(
                jsonMatch[1]
              );


            const candidates =
              Array.isArray(
                rawData
              )
                ? rawData
                : [rawData];


            for (
              const candidate of
              candidates
            ) {

              const product =
                candidate?.[
                  '@type'
                ] ===
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


              if (
                !title &&
                product.name
              ) {

                title =
                  this.cleanHtmlEntities(
                    String(
                      product.name
                    )
                  );
              }


              if (
                product.image
              ) {

                const jsonImages =
                  Array.isArray(
                    product.image
                  )
                    ? product.image
                    : [
                        product.image,
                      ];


                for (
                  const image of
                  jsonImages
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
                    !images.includes(
                      url
                    )
                  ) {

                    images.push(
                      url
                    );
                  }
                }
              }


              const offers =
                product.offers
                  ? Array.isArray(
                      product.offers
                    )

                    ? product.offers

                    : [
                        product.offers,
                      ]

                  : [];


              for (
                const offer of
                offers
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

                const parsedRating =
                  Number.parseFloat(
                    String(
                      product
                        .aggregateRating
                        .ratingValue
                    )
                  );


                if (
                  Number.isFinite(
                    parsedRating
                  )
                ) {
                  rating =
                    parsedRating;
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

                    : product.brand
                        ?.name;
              }


              if (
                !productId &&
                product.sku
              ) {

                productId =
                  String(
                    product.sku
                  );
              }
            }

          } catch {
            // JSON-LD inválido
          }
        }


        // =====================================================
        // META PRICE
        // =====================================================

        if (
          currentPrice ===
          undefined
        ) {

          const metaPrice =
            html.match(
              /<meta\s+(?:property|name)=["'](?:product:price:amount|og:price:amount)["']\s+content=["']([^"']+)["']/i
            ) ||
            html.match(
              /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["'](?:product:price:amount|og:price:amount)["']/i
            );


          if (
            metaPrice?.[1]
          ) {

            currentPrice =
              parsePrice(
                metaPrice[1]
              );
          }
        }


        // =====================================================
        // EMBEDDED PRICE FIELDS
        // =====================================================

        if (
          currentPrice ===
          undefined
        ) {

          const patterns = [

            /"currentPrice"\s*:\s*"?([\d.,]+)"?/i,

            /"salePrice"\s*:\s*"?([\d.,]+)"?/i,

            /"sale_price"\s*:\s*"?([\d.,]+)"?/i,

            /"price"\s*:\s*"(\d+[.,]\d{2})"/i,

          ];


          for (
            const pattern of
            patterns
          ) {

            const match =
              html.match(
                pattern
              );


            if (
              match?.[1]
            ) {

              const value =
                parsePrice(
                  match[1]
                );


              if (
                value !==
                undefined
              ) {

                currentPrice =
                  value;

                break;
              }
            }
          }
        }


        // =====================================================
        // VISIBLE R$ PRICE
        // =====================================================

        if (
          currentPrice ===
          undefined
        ) {

          const visible =
            html.match(
              /R\$\s*(\d{1,7}(?:\.\d{3})*(?:,\d{2}))/i
            );


          if (
            visible?.[1]
          ) {

            currentPrice =
              parsePrice(
                visible[1]
              );
          }
        }


        // =====================================================
        // ORIGINAL PRICE
        // =====================================================

        if (
          originalPrice ===
          undefined
        ) {

          const originalPatterns =
            [

              /"originalPrice"\s*:\s*"?([\d.,]+)"?/i,

              /"original_price"\s*:\s*"?([\d.,]+)"?/i,

              /"priceBeforeDiscount"\s*:\s*"?([\d.,]+)"?/i,

              /"price_before_discount"\s*:\s*"?([\d.,]+)"?/i,

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
              match?.[1]
            ) {

              const value =
                parsePrice(
                  match[1]
                );


              if (
                value !==
                  undefined &&
                value !==
                  currentPrice
              ) {

                originalPrice =
                  value;

                break;
              }
            }
          }
        }


        // =====================================================
        // SELLER
        // =====================================================

        if (!sellerName) {

          const sellers = [

            /"shopName"\s*:\s*"([^"]+)"/i,

            /"shop_name"\s*:\s*"([^"]+)"/i,

            /"sellerName"\s*:\s*"([^"]+)"/i,

          ];


          for (
            const pattern of
            sellers
          ) {

            const match =
              html.match(
                pattern
              );


            if (
              match?.[1]
            ) {

              sellerName =
                this.cleanHtmlEntities(
                  match[1]
                );

              break;
            }
          }
        }


        // =====================================================
        // RATING
        // =====================================================

        if (
          rating ===
          undefined
        ) {

          const match =
            html.match(
              /"(?:rating|ratingStar|rating_star)"\s*:\s*([\d.]+)/i
            );


          if (
            match?.[1]
          ) {

            const value =
              Number.parseFloat(
                match[1]
              );


            if (
              Number.isFinite(
                value
              ) &&
              value >= 0 &&
              value <= 5
            ) {

              rating =
                value;
            }
          }
        }


        // =====================================================
        // SOLD
        // =====================================================

        if (
          soldCount ===
          undefined
        ) {

          const match =
            html.match(
              /"(?:sold|soldCount|sold_count|historical_sold)"\s*:\s*(\d+)/i
            );


          if (
            match?.[1]
          ) {

            const value =
              Number.parseInt(
                match[1],
                10
              );


            if (
              Number.isFinite(
                value
              )
            ) {

              soldCount =
                value;
            }
          }
        }


        // =====================================================
        // PRODUCT ID
        // =====================================================

        if (!productId) {

          const idMatch =
            html.match(
              /"(?:itemid|item_id|productId|product_id)"\s*:\s*"?(\d+)"?/i
            );


          if (
            idMatch?.[1]
          ) {

            productId =
              idMatch[1];
          }
        }


        // =====================================================
        // TITLE FALLBACK
        // =====================================================

        if (!title) {

          const titleTag =
            html.match(
              /<title>([^<]+)<\/title>/i
            );


          if (
            titleTag?.[1]
          ) {

            title =
              this.cleanHtmlEntities(
                titleTag[1]
                  .replace(
                    /\s*\|\s*Shopee\s*Brasil.*$/i,
                    ''
                  )
                  .trim()
              );
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
          images:
            images.length,
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