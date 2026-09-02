/**
 * Product Provider Architecture for Shopee
 * Follows the strict rule: "DADOS REAIS + IA SOMENTE PARA REDAÇÃO"
 * Never invents mock or hallucinated prices/discounts.
 */
import { ProductData } from '../../src/types';
import { validateSafeShopeeUrl, followSafeRedirects } from '../security/urlGuard';

export interface ProductProvider {
  getProduct(rawUrl: string): Promise<ProductData>;
}

export class ShopeeProductProvider implements ProductProvider {
  private partnerId?: string;
  private partnerKey?: string;

  constructor() {
    this.partnerId = process.env.SHOPEE_PARTNER_ID;
    this.partnerKey = process.env.SHOPEE_PARTNER_KEY;
  }

  public isOfficialApiConfigured(): boolean {
    return Boolean(this.partnerId && this.partnerKey);
  }

  public async getProduct(rawUrl: string): Promise<ProductData> {
    const safety = validateSafeShopeeUrl(rawUrl);
    if (!safety.isSafe || !safety.cleanUrl) {
      throw new Error(safety.error || 'URL inválida ou não autorizada');
    }

    // 1. Resolve shortlinks safely (e.g. shp.ee or s.shopee.com.br)
    const resolvedUrl = await followSafeRedirects(safety.cleanUrl);
    const parsed = new URL(resolvedUrl);

    // 2. Extract IDs if present
    let productId: string | undefined;
    let shopId: string | undefined;

    const productMatch1 = parsed.pathname.match(/\/product\/(\d+)\/(\d+)/i);
    if (productMatch1) {
      shopId = productMatch1[1];
      productId = productMatch1[2];
    } else {
      const productMatch2 = parsed.pathname.match(/-i\.(\d+)\.(\d+)/i);
      if (productMatch2) {
        shopId = productMatch2[1];
        productId = productMatch2[2];
      }
    }

    // Clean tracking query parameters for canonical URL
    const canonical = new URL(resolvedUrl);
    const trackingKeys = ['sp_atk', 'xptdk', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'gclid', 'fbclid'];
    trackingKeys.forEach(k => canonical.searchParams.delete(k));
    const canonicalUrl = canonical.toString();

    // 3. Extract factual data from safe HTTP request / OpenGraph / Microdata
    const htmlData = await this.extractFromPublicPage(resolvedUrl);

    const title = htmlData.title || this.extractTitleFromSlug(parsed.pathname) || 'Produto Shopee';
    const images = htmlData.images.length > 0 ? htmlData.images : [];
    const currentPrice = htmlData.currentPrice ?? 0;
    const originalPrice = htmlData.originalPrice;

    // Mathematical discount calculation only if real data exists
    let discountPercentage: number | undefined;
    if (currentPrice && originalPrice && originalPrice > currentPrice && originalPrice > 0) {
      discountPercentage = Math.round(((originalPrice - currentPrice) / originalPrice) * 100);
    }

    return {
      source: this.isOfficialApiConfigured() ? 'shopee_api' : 'shopee_resolver',
      productId: productId || (htmlData.productId ?? undefined),
      canonicalUrl,
      title,
      currentPrice,
      originalPrice,
      discountPercentage,
      currency: 'BRL',
      images,
      sellerName: htmlData.sellerName,
      rating: htmlData.rating,
      soldCount: htmlData.soldCount,
      availability: htmlData.availability !== false,
      fetchedAt: new Date().toISOString(),
    };
  }

  private extractTitleFromSlug(pathname: string): string | undefined {
    try {
      const segments = pathname.split('/').filter(Boolean);
      for (const seg of segments) {
        if (seg.includes('-i.')) {
          const rawName = seg.split('-i.')[0];
          return decodeURIComponent(rawName.replace(/-/g, ' '));
        }
      }
    } catch {
      // ignore
    }
    return undefined;
  }
private async extractFromPublicPage(targetUrl: string): Promise<{
  title?: string;
  images: string[];
  currentPrice?: number;
  originalPrice?: number;
  sellerName?: string;
  rating?: number;
  soldCount?: number;
  availability?: boolean;
  productId?: string;
}> {
  const images: string[] = [];

  let title: string | undefined;
  let currentPrice: number | undefined;
  let originalPrice: number | undefined;
  let sellerName: string | undefined;
  let rating: number | undefined;
  let soldCount: number | undefined;
  let availability: boolean | undefined;
  let productId: string | undefined;

  const parsePrice = (value: unknown): number | undefined => {
    if (value === null || value === undefined) {
      return undefined;
    }

    let raw = String(value)
      .trim()
      .replace(/[^\d.,]/g, '');

    if (!raw) {
      return undefined;
    }

    // Formato brasileiro: 1.299,90
    if (raw.includes(',')) {
      raw = raw
        .replace(/\./g, '')
        .replace(',', '.');
    } else {
      // Evita tratar separador de milhar como decimal
      const parts = raw.split('.');

      if (
        parts.length > 2 ||
        (parts.length === 2 && parts[1].length === 3)
      ) {
        raw = raw.replace(/\./g, '');
      }
    }

    const parsed = Number.parseFloat(raw);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return undefined;
    }

    return parsed;
  };

  try {
    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 10000);

    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',

        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',

        'Accept-Language':
          'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',

        'Cache-Control': 'no-cache',
      },

      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    console.log('SHOPEE STATUS:', res.status);
    console.log('SHOPEE URL FINAL:', res.url);

    if (res.ok) {
      const html = await res.text();

      console.log('HTML SIZE:', html.length);
      console.log('HTML START:', html.substring(0, 1000));

      // =====================================================
      // 1. TÍTULO - OPEN GRAPH
      // =====================================================

      const ogTitleMatch =
        html.match(
          /<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i
        ) ||
        html.match(
          /<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i
        );

      if (ogTitleMatch && ogTitleMatch[1]) {
        title = this.cleanHtmlEntities(
          ogTitleMatch[1]
            .replace(/\s*\|\s*Shopee\s*Brasil.*$/i, '')
            .trim()
        );
      }

      // =====================================================
      // 2. IMAGENS OPEN GRAPH
      // =====================================================

      const ogImageRegex =
        /<meta\s+(?:property|name)=["']og:image(?::secure_url)?["']\s+content=["']([^"']+)["']/gi;

      let imageMatch: RegExpExecArray | null;

      while ((imageMatch = ogImageRegex.exec(html)) !== null) {
        const imageUrl = imageMatch[1];

        if (
          imageUrl &&
          !images.includes(imageUrl)
        ) {
          images.push(imageUrl);
        }
      }

      // Também suporta atributos invertidos
      const ogImageReverseRegex =
        /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["']og:image(?::secure_url)?["']/gi;

      while ((imageMatch = ogImageReverseRegex.exec(html)) !== null) {
        const imageUrl = imageMatch[1];

        if (
          imageUrl &&
          !images.includes(imageUrl)
        ) {
          images.push(imageUrl);
        }
      }

      // =====================================================
      // 3. JSON-LD
      // =====================================================

      const jsonLdRegex =
        /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

      let jsonMatch: RegExpExecArray | null;

      while ((jsonMatch = jsonLdRegex.exec(html)) !== null) {
        try {
          const data = JSON.parse(jsonMatch[1]);

          const candidates = Array.isArray(data)
            ? data
            : [data];

          for (const item of candidates) {
            if (!item) {
              continue;
            }

            const product =
              item['@type'] === 'Product'
                ? item
                : item['@graph']?.find?.(
                    (x: any) => x?.['@type'] === 'Product'
                  );

            if (!product) {
              continue;
            }

            if (!title && product.name) {
              title = this.cleanHtmlEntities(
                String(product.name)
              );
            }

            if (product.image) {
              const productImages = Array.isArray(product.image)
                ? product.image
                : [product.image];

              for (const img of productImages) {
                const imgUrl =
                  typeof img === 'string'
                    ? img
                    : img?.url;

                if (
                  imgUrl &&
                  typeof imgUrl === 'string' &&
                  !images.includes(imgUrl)
                ) {
                  images.push(imgUrl);
                }
              }
            }

            if (product.offers) {
              const offers = Array.isArray(product.offers)
                ? product.offers
                : [product.offers];

              for (const offer of offers) {
                if (!offer) {
                  continue;
                }

                if (currentPrice === undefined) {
                  currentPrice =
                    parsePrice(offer.price) ??
                    parsePrice(offer.lowPrice);
                }

                if (originalPrice === undefined) {
                  originalPrice =
                    parsePrice(offer.highPrice);
                }

                if (
                  availability === undefined &&
                  offer.availability
                ) {
                  const availabilityText =
                    String(offer.availability).toLowerCase();

                  availability =
                    !availabilityText.includes('outofstock') &&
                    !availabilityText.includes('soldout');
                }
              }
            }

            if (
              rating === undefined &&
              product.aggregateRating?.ratingValue
            ) {
              const parsedRating = Number.parseFloat(
                String(product.aggregateRating.ratingValue)
              );

              if (Number.isFinite(parsedRating)) {
                rating = parsedRating;
              }
            }

            if (
              product.aggregateRating?.reviewCount &&
              soldCount === undefined
            ) {
              const parsedReviews = Number.parseInt(
                String(product.aggregateRating.reviewCount),
                10
              );

              if (Number.isFinite(parsedReviews)) {
                soldCount = parsedReviews;
              }
            }

            if (
              !sellerName &&
              product.brand
            ) {
              sellerName =
                typeof product.brand === 'string'
                  ? product.brand
                  : product.brand?.name;
            }

            if (
              !productId &&
              product.sku
            ) {
              productId = String(product.sku);
            }
          }
        } catch {
          // ignora JSON-LD inválido
        }
      }

      // =====================================================
      // 4. META TAG DE PREÇO
      // =====================================================

      if (currentPrice === undefined) {
        const metaPriceMatch =
          html.match(
            /<meta\s+(?:property|name)=["'](?:product:price:amount|og:price:amount)["']\s+content=["']([^"']+)["']/i
          ) ||
          html.match(
            /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["'](?:product:price:amount|og:price:amount)["']/i
          );

        if (
          metaPriceMatch &&
          metaPriceMatch[1]
        ) {
          currentPrice =
            parsePrice(metaPriceMatch[1]);
        }
      }

      // =====================================================
      // 5. JSON INTERNO DA PÁGINA
      // =====================================================

      if (currentPrice === undefined) {
        const pricePatterns = [
          /"currentPrice"\s*:\s*"?([\d.,]+)"?/i,
          /"salePrice"\s*:\s*"?([\d.,]+)"?/i,
          /"sale_price"\s*:\s*"?([\d.,]+)"?/i,
          /"price"\s*:\s*"([\d]+[.,]\d{2})"/i,
          /"price"\s*:\s*([\d]+\.\d{2})/i,
        ];

        for (const pattern of pricePatterns) {
          const match = html.match(pattern);

          if (
            match &&
            match[1]
          ) {
            const value = parsePrice(match[1]);

            if (value !== undefined) {
              currentPrice = value;
              break;
            }
          }
        }
      }

      // =====================================================
      // 6. PREÇO VISÍVEL R$ 99,90
      // =====================================================

      if (currentPrice === undefined) {
        const visiblePriceMatch =
          html.match(
            /R\$\s*(\d{1,6}(?:\.\d{3})*(?:,\d{2}))/i
          );

        if (
          visiblePriceMatch &&
          visiblePriceMatch[1]
        ) {
          currentPrice =
            parsePrice(visiblePriceMatch[1]);
        }
      }

      // =====================================================
      // 7. PREÇO ORIGINAL
      // =====================================================

      if (originalPrice === undefined) {
        const originalPatterns = [
          /"originalPrice"\s*:\s*"?([\d.,]+)"?/i,
          /"original_price"\s*:\s*"?([\d.,]+)"?/i,
          /"priceBeforeDiscount"\s*:\s*"?([\d.,]+)"?/i,
          /"price_before_discount"\s*:\s*"?([\d.,]+)"?/i,
        ];

        for (const pattern of originalPatterns) {
          const match = html.match(pattern);

          if (
            match &&
            match[1]
          ) {
            const value = parsePrice(match[1]);

            if (
              value !== undefined &&
              value !== currentPrice
            ) {
              originalPrice = value;
              break;
            }
          }
        }
      }

      // =====================================================
      // 8. SELLER
      // =====================================================

      if (!sellerName) {
        const sellerPatterns = [
          /"shopName"\s*:\s*"([^"]+)"/i,
          /"shop_name"\s*:\s*"([^"]+)"/i,
          /"sellerName"\s*:\s*"([^"]+)"/i,
        ];

        for (const pattern of sellerPatterns) {
          const match = html.match(pattern);

          if (
            match &&
            match[1]
          ) {
            sellerName =
              this.cleanHtmlEntities(match[1]);

            break;
          }
        }
      }

      // =====================================================
      // 9. RATING
      // =====================================================

      if (rating === undefined) {
        const ratingMatch =
          html.match(
            /"(?:rating|ratingStar|rating_star)"\s*:\s*([\d.]+)/i
          );

        if (
          ratingMatch &&
          ratingMatch[1]
        ) {
          const parsedRating =
            Number.parseFloat(ratingMatch[1]);

          if (
            Number.isFinite(parsedRating) &&
            parsedRating >= 0 &&
            parsedRating <= 5
          ) {
            rating = parsedRating;
          }
        }
      }

      // =====================================================
      // 10. VENDIDOS
      // =====================================================

      if (soldCount === undefined) {
        const soldMatch =
          html.match(
            /"(?:sold|soldCount|sold_count|historical_sold)"\s*:\s*(\d+)/i
          );

        if (
          soldMatch &&
          soldMatch[1]
        ) {
          const parsedSold =
            Number.parseInt(soldMatch[1], 10);

          if (Number.isFinite(parsedSold)) {
            soldCount = parsedSold;
          }
        }
      }

      // =====================================================
      // 11. ID DO PRODUTO
      // =====================================================

      if (!productId) {
        const productIdMatch =
          html.match(
            /"(?:itemid|item_id|productId|product_id)"\s*:\s*"?(\d+)"?/i
          );

        if (
          productIdMatch &&
          productIdMatch[1]
        ) {
          productId =
            productIdMatch[1];
        }
      }

      // =====================================================
      // 12. FALLBACK DO TITLE
      // =====================================================

      if (!title) {
        const titleTagMatch =
          html.match(
            /<title>([^<]+)<\/title>/i
          );

        if (
          titleTagMatch &&
          titleTagMatch[1]
        ) {
          title = this.cleanHtmlEntities(
            titleTagMatch[1]
              .replace(/\s*\|\s*Shopee\s*Brasil.*$/i, '')
              .trim()
          );
        }
      }
    }
  } catch (e) {
    console.warn(
      'Could not fetch public page metadata:',
      e
    );
  }

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
  private cleanHtmlEntities(str: string): string {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ');
  }
}
