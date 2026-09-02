/**
 * Shopee URL Validation & Normalization Utility
 * Supports SSRF protection checks on client and server.
 */

// Allowlist of legitimate Shopee hostnames
export const SHOPEE_DOMAINS = [
  'shopee.com.br',
  'www.shopee.com.br',
  'shp.ee',
  's.shopee.com.br',
  'shope.ee',
  'br.shp.ee',
  'shopee.com',
  'www.shopee.com',
];

export interface UrlValidationResult {
  isValid: boolean;
  isShopee: boolean;
  cleanUrl?: string;
  error?: string;
  productId?: string;
  shopId?: string;
}

/**
 * Validates whether a given URL is a legitimate Shopee URL
 * and sanitizes it against unsafe schemes (javascript:, data:, file:) and SSRF threats.
 */
export function validateShopeeUrl(rawUrl: string): UrlValidationResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isValid: false, isShopee: false, error: 'URL vazia ou inválida' };
  }

  const trimmed = rawUrl.trim();

  // Block dangerous schemes
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('file:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('about:')
  ) {
    return { isValid: false, isShopee: false, error: 'Protocolo de URL não permitido por segurança' };
  }

  let parsed: URL;
  try {
    // Add https:// if missing scheme
    const urlToParse = trimmed.startsWith('http://') || trimmed.startsWith('https://') 
      ? trimmed 
      : `https://${trimmed}`;
    parsed = new URL(urlToParse);
  } catch {
    return { isValid: false, isShopee: false, error: 'Formato de URL inválido' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { isValid: false, isShopee: false, error: 'Apenas conexões HTTP e HTTPS são aceitas' };
  }

  const hostname = parsed.hostname.toLowerCase();

  // SSRF & loopback protection check
  if (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0' ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.local') ||
    hostname === '169.254.169.254' ||
    hostname.startsWith('10.') ||
    hostname.startsWith('192.168.') ||
    (hostname.startsWith('172.') && isPrivate172(hostname))
  ) {
    return { isValid: false, isShopee: false, error: 'Endereço de rede privada ou interno não autorizado' };
  }

  // Check domain against Shopee allowlist
  const isShopeeHost = SHOPEE_DOMAINS.some(
    (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
  );

  if (!isShopeeHost) {
    return {
      isValid: false,
      isShopee: false,
      error: 'O link informado não pertence a um domínio oficial da Shopee (ex: shopee.com.br ou s.shopee.com.br)',
    };
  }

  // Extract ID if pattern matches standard product link:
  // e.g. /product/12345/67890 or /nome-do-produto-i.12345.67890
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

  // Clean non-essential tracking parameters
  const cleanParsed = new URL(parsed.toString());
  const trackingParams = ['sp_atk', 'xptdk', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'];
  trackingParams.forEach((param) => cleanParsed.searchParams.delete(param));

  return {
    isValid: true,
    isShopee: true,
    cleanUrl: cleanParsed.toString(),
    productId,
    shopId,
  };
}

function isPrivate172(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length >= 2) {
    const secondOctet = parseInt(parts[1], 10);
    return secondOctet >= 16 && secondOctet <= 31;
  }
  return false;
}

/**
 * Extracts multiple links from multiline text
 */
export function extractUrlsFromText(text: string): string[] {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const urls: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Check if line contains a URL
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    const matches = trimmed.match(urlRegex);
    if (matches && matches.length > 0) {
      urls.push(matches[0]);
    } else if (trimmed.includes('shopee') || trimmed.includes('shp.ee')) {
      // Possible URL without protocol
      urls.push(trimmed);
    }
  }

  return urls;
}
