/**
 * Server-side Security & SSRF Protection
 */

export const ALLOWED_SHOPEE_HOSTS = [
  'shopee.com.br',
  'www.shopee.com.br',
  'shp.ee',
  's.shopee.com.br',
  'shope.ee',
  'br.shp.ee',
  'shopee.com',
  'www.shopee.com',
  'cf.shopee.com.br',
  'down-br.img.susercontent.com',
  'down-tx-br.img.susercontent.com',
  'down-bs-br.img.susercontent.com',
  'down-ws-br.img.susercontent.com',
];

export interface SafeUrlResult {
  isSafe: boolean;
  cleanUrl?: string;
  error?: string;
  hostname?: string;
}

/**
 * Validates a target URL against SSRF vulnerabilities, internal networks,
 * localhost, cloud metadata, and ensures host is strictly in the allowed Shopee list.
 */
export function validateSafeShopeeUrl(rawUrl: string): SafeUrlResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { isSafe: false, error: 'URL não fornecida ou inválida.' };
  }

  const trimmed = rawUrl.trim();

  // Block dangerous schemes
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('file:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('ftp:') ||
    lower.startsWith('about:')
  ) {
    return { isSafe: false, error: 'Esquema de URL inseguro bloqueado.' };
  }

  let parsed: URL;
  try {
    const withProtocol = trimmed.startsWith('http://') || trimmed.startsWith('https://')
      ? trimmed
      : `https://${trimmed}`;
    parsed = new URL(withProtocol);
  } catch {
    return { isSafe: false, error: 'Formato de URL inválido.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { isSafe: false, error: 'Apenas protocolos HTTP/HTTPS são autorizados.' };
  }

  const host = parsed.hostname.toLowerCase();

  // Block IP literals & SSRF vectors
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host === '169.254.169.254' ||
    host === 'metadata.google.internal' ||
    host.endsWith('.internal') ||
    host.endsWith('.local') ||
    host.endsWith('.localhost') ||
    isPrivateIpv4(host)
  ) {
    return { isSafe: false, error: 'Acesso a endereços de rede privada ou metadata é estritamente proibido.' };
  }

  // Allowlist match
  const isAllowed = ALLOWED_SHOPEE_HOSTS.some(
    (allowed) => host === allowed || host.endsWith(`.${allowed}`)
  );

  if (!isAllowed) {
    return {
      isSafe: false,
      error: `Domínio não autorizado (${host}). Apenas links oficiais da Shopee são permitidos.`,
    };
  }

  return {
    isSafe: true,
    cleanUrl: parsed.toString(),
    hostname: host,
  };
}

function isPrivateIpv4(host: string): boolean {
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  if (/^169\.254\.\d{1,3}\.\d{1,3}$/.test(host)) return true;
  return false;
}

/**
 * Safely resolves shortlinks (like shp.ee or s.shopee.com.br) by following HTTP redirects
 * while re-verifying every hop against SSRF and allowlists.
 */
export async function followSafeRedirects(initialUrl: string, maxHops = 4): Promise<string> {
  let currentUrl = initialUrl;
  let hops = 0;

  while (hops < maxHops) {
    const safetyCheck = validateSafeShopeeUrl(currentUrl);
    if (!safetyCheck.isSafe) {
      throw new Error(safetyCheck.error || 'Redirecionamento bloqueado por segurança.');
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const res = await fetch(currentUrl, {
        method: 'HEAD',
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });
      clearTimeout(timeoutId);

      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) break;

        const resolvedLocation = new URL(location, currentUrl).toString();
        const hopCheck = validateSafeShopeeUrl(resolvedLocation);
        if (!hopCheck.isSafe) {
          throw new Error('Redirecionamento para domínio não autorizado.');
        }

        currentUrl = resolvedLocation;
        hops++;
      } else {
        break;
      }
    } catch (err: unknown) {
      // If HEAD is disallowed or fails, return last safe verified URL
      break;
    }
  }

  return currentUrl;
}
