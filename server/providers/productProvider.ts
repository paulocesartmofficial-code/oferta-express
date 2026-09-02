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

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const res = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'no-cache',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const html = await res.text();

        // 1. OpenGraph Title
        const ogTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i) ||
                             html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:title["']/i);
        if (ogTitleMatch && ogTitleMatch[1]) {
          title = this.cleanHtmlEntities(ogTitleMatch[1].replace(/\s*\|\s*Shopee\s*Brasil.*$/i, '').trim());
        }

        // 2. OpenGraph Image
        const ogImageMatches = html.matchAll(/<meta\s+(?:property|name)=["']og:image(?::secure_url)?["']\s+content=["']([^"']+)["']/gi);
        for (const match of ogImageMatches) {
          if (match[1] && !images.includes(match[1])) {
            images.push(match[1]);
          }
        }

        // 3. JSON-LD Structured Data
        const jsonLdMatches = html.matchAll(/<script\s+type=["']application\/ld\+json["']>([^<]+)<\/script>/gi);
        for (const jMatch of jsonLdMatches) {
          try {
            const data = JSON.parse(jMatch[1]);
            if (data['@type'] === 'Product' || data.name) {
              if (data.name && !title) {
                title = this.cleanHtmlEntities(data.name);
              }
              if (data.image) {
                const imgArray = Array.isArray(data.image) ? data.image : [data.image];
                imgArray.forEach((im: string) => {
                  if (typeof im === 'string' && !images.includes(im)) images.push(im);
                });
              }
              if (data.offers) {
                const offer = Array.isArray(data.offers) ? data.offers[0] : data.offers;
                if (offer && offer.price) {
                  const num = parseFloat(offer.price);
                  if (!isNaN(num) && num > 0) currentPrice = num;
                }
              }
              if (data.aggregateRating && data.aggregateRating.ratingValue) {
                const r = parseFloat(data.aggregateRating.ratingValue);
                if (!isNaN(r)) rating = r;
              }
              if (data.brand && data.brand.name) {
                sellerName = data.brand.name;
              }
              if (data.sku) {
                productId = String(data.sku);
              }
            }
          } catch {
            // ignore invalid json-ld block
          }
        }

        // 4. PRICE FALLBACKS
// Tenta Meta Tags, JSON embutido e preço visível em R$

if (currentPrice === undefined) {

    // 4.1 Meta tags padrão
    const metaPriceMatch =
        html.match(
            /<meta\s+(?:property|name)=["'](?:product:price:amount|og:price:amount)["']\s+content=["']([^"']+)["']/i
        ) ||
        html.match(
            /<meta\s+content=["']([^"']+)["']\s+(?:property|name)=["'](?:product:price:amount|og:price:amount)["']/i
        );

    if (metaPriceMatch && metaPriceMatch[1]) {
        const raw = metaPriceMatch[1]
            .replace(/[^\d.,]/g, '')
            .replace(/\.(?=\d{3}(?:\D|$))/g, '')
            .replace(',', '.');

        const value = parseFloat(raw);

        if (!isNaN(value) && value > 0) {
            currentPrice = value;
        }
    }
}


// 4.2 JSON / scripts internos da página
if (currentPrice === undefined) {

    const jsonPricePatterns = [
        /"currentPrice"\s*:\s*"?([\d.,]+)"?/i,
        /"salePrice"\s*:\s*"?([\d.,]+)"?/i,
        /"price"\s*:\s*"([\d]+[.,]\d{2})"/i,
        /"price"\s*:\s*([\d]+\.\d{2})/i
    ];

    for (const pattern of jsonPricePatterns) {

        const match = html.match(pattern);

        if (match && match[1]) {

            const raw = match[1]
                .replace(/\.(?=\d{3}(?:\D|$))/g, '')
                .replace(',', '.');

            const value = parseFloat(raw);

            if (!isNaN(value) && value > 0) {
                currentPrice = value;
                break;
            }
        }
    }
}


// 4.3 Preço visível brasileiro: R$ 59,90
if (currentPrice === undefined) {

    const brPriceMatch = html.match(
        /R\$\s*(\d{1,6}(?:\.\d{3})*(?:,\d{2}))/i
    );

    if (brPriceMatch && brPriceMatch[1]) {

        const raw = brPriceMatch[1]
            .replace(/\./g, '')
            .replace(',', '.');

        const value = parseFloat(raw);

        if (!isNaN(value) && value > 0) {
            currentPrice = value;
        }
    }
}


// 4.4 Procura preço antigo/original
if (originalPrice === undefined) {

    const originalPatterns = [
        /"originalPrice"\s*:\s*"?([\d.,]+)"?/i,
        /"priceBeforeDiscount"\s*:\s*"?([\d.,]+)"?/i,
        /"original_price"\s*:\s*"?([\d.,]+)"?/i
    ];

    for (const pattern of originalPatterns) {

        const match = html.match(pattern);

        if (match && match[1]) {

            const raw = match[1]
                .replace(/\.(?=\d{3}(?:\D|$))/g, '')
                .replace(',', '.');

            const value = parseFloat(raw);

            if (
                !isNaN(value) &&
                value > 0 &&
                value !== currentPrice
            ) {
                originalPrice = value;
                break;
            }
        }
    }
}
        }

        // 5. Fallback HTML title
        if (!title) {
          const titleTagMatch = html.match(/<title>([^<]+)<\/title>/i);
          if (titleTagMatch && titleTagMatch[1]) {
            title = this.cleanHtmlEntities(titleTagMatch[1].replace(/\s*\|\s*Shopee\s*Brasil.*$/i, '').trim());
          }
        }
      }
    } catch (e) {
      // Network fetch error - graceful fallback without crashing
      console.warn('Could not fetch public page metadata:', e);
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
