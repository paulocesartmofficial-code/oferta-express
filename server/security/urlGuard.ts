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
 * Valida URLs da Shopee e bloqueia tentativas de SSRF,
 * localhost, redes privadas, metadata etc.
 */
export function validateSafeShopeeUrl(rawUrl: string): SafeUrlResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return {
      isSafe: false,
      error: 'URL não fornecida ou inválida.',
    };
  }

  const trimmed = rawUrl.trim();

  const lower = trimmed.toLowerCase();

  if (
    lower.startsWith('javascript:') ||
    lower.startsWith('data:') ||
    lower.startsWith('file:') ||
    lower.startsWith('vbscript:') ||
    lower.startsWith('ftp:') ||
    lower.startsWith('about:')
  ) {
    return {
      isSafe: false,
      error: 'Esquema de URL inseguro bloqueado.',
    };
  }

  let parsed: URL;

  try {
    const withProtocol =
      trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? trimmed
        : `https://${trimmed}`;

    parsed = new URL(withProtocol);
  } catch {
    return {
      isSafe: false,
      error: 'Formato de URL inválido.',
    };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      isSafe: false,
      error: 'Apenas protocolos HTTP/HTTPS são autorizados.',
    };
  }

  const host = parsed.hostname.toLowerCase();

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
    return {
      isSafe: false,
      error:
        'Acesso a endereços de rede privada ou metadata é estritamente proibido.',
    };
  }

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

/**
 * Detecta IPv4s privados.
 */
function isPrivateIpv4(host: string): boolean {
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;

  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(host)) return true;

  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/.test(host)) {
    return true;
  }

  if (/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true;

  if (/^169\.254\.\d{1,3}\.\d{1,3}$/.test(host)) return true;

  return false;
}

/**
 * Limpa caracteres escapados e entidades HTML
 * encontradas dentro do HTML/JavaScript.
 */
function cleanExtractedUrl(value: string): string {
  return value
    .replace(/\\u002F/gi, '/')
    .replace(/\\\//g, '/')
    .replace(/&amp;/gi, '&')
    .replace(/&#38;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .trim();
}

/**
 * Tenta encontrar dentro do HTML uma URL para a qual
 * a página curta da Shopee pretende redirecionar.
 *
 * Alguns links curtos retornam HTTP 200 em vez de 301/302
 * e fazem o redirecionamento através do próprio HTML/JS.
 */
function extractRedirectFromHtml(
  html: string,
  currentUrl: string
): string | undefined {
  const candidates: string[] = [];

  /*
   * META refresh:
   *
   * <meta http-equiv="refresh"
   * content="0;url=https://shopee.com.br/...">
   */
  const metaRefreshPatterns = [
    /<meta[^>]+http-equiv=["']?refresh["']?[^>]+content=["'][^"']*url\s*=\s*([^"'>\s]+)[^"']*["']/i,
    /<meta[^>]+content=["'][^"']*url\s*=\s*([^"'>\s]+)[^"']*["'][^>]+http-equiv=["']?refresh["']?/i,
  ];

  for (const pattern of metaRefreshPatterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      candidates.push(match[1]);
    }
  }

  /*
   * canonical
   */
  const canonicalMatch = html.match(
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i
  );

  if (canonicalMatch?.[1]) {
    candidates.push(canonicalMatch[1]);
  }

  /*
   * canonical com atributos em ordem diferente
   */
  const canonicalMatch2 = html.match(
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i
  );

  if (canonicalMatch2?.[1]) {
    candidates.push(canonicalMatch2[1]);
  }

  /*
   * og:url
   */
  const ogUrlPatterns = [
    /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:url["']/i,
  ];

  for (const pattern of ogUrlPatterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      candidates.push(match[1]);
    }
  }

  /*
   * JavaScript:
   *
   * window.location = "..."
   * window.location.href = "..."
   * location.href = "..."
   */
  const jsLocationPatterns = [
    /window\.location\.href\s*=\s*["']([^"']+)["']/i,
    /window\.location\s*=\s*["']([^"']+)["']/i,
    /location\.href\s*=\s*["']([^"']+)["']/i,
    /location\s*=\s*["']([^"']+)["']/i,
    /window\.location\.replace\(\s*["']([^"']+)["']\s*\)/i,
    /window\.location\.assign\(\s*["']([^"']+)["']\s*\)/i,
    /location\.replace\(\s*["']([^"']+)["']\s*\)/i,
    /location\.assign\(\s*["']([^"']+)["']\s*\)/i,
  ];

  for (const pattern of jsLocationPatterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      candidates.push(match[1]);
    }
  }

  /*
   * URLs absolutas da Shopee que possam estar
   * embutidas em JSON ou JavaScript.
   */
  const absoluteShopeeUrls =
    html.match(
      /https?:\\?\/\\?\/(?:www\.)?shopee\.com\.br\\?\/[^"'<>\\\s]+/gi
    ) || [];

  candidates.push(...absoluteShopeeUrls);

  /*
   * Algumas páginas incluem a URL como JSON:
   *
   * "url":"https:\/\/shopee.com.br\/..."
   */
  const jsonUrlPatterns = [
    /["']url["']\s*:\s*["'](https?:\\\/\\\/[^"']+)["']/gi,
    /["']redirect_url["']\s*:\s*["']([^"']+)["']/gi,
    /["']redirectUrl["']\s*:\s*["']([^"']+)["']/gi,
    /["']target_url["']\s*:\s*["']([^"']+)["']/gi,
    /["']targetUrl["']\s*:\s*["']([^"']+)["']/gi,
  ];

  for (const pattern of jsonUrlPatterns) {
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(html)) !== null) {
      if (match[1]) {
        candidates.push(match[1]);
      }
    }
  }

  /*
   * Analisa todos os candidatos encontrados.
   */
  for (const rawCandidate of candidates) {
    try {
      const cleaned = cleanExtractedUrl(rawCandidate);

      const absolute = new URL(cleaned, currentUrl).toString();

      /*
       * Não aceita retornar para a própria URL.
       */
      if (absolute === currentUrl) {
        continue;
      }

      const safety = validateSafeShopeeUrl(absolute);

      if (!safety.isSafe || !safety.cleanUrl) {
        continue;
      }

      /*
       * Priorizamos página real de produto Shopee.
       */
      const parsed = new URL(safety.cleanUrl);

      const pathname = parsed.pathname;

      const looksLikeProduct =
        /\/product\/\d+\/\d+/i.test(pathname) ||
        /-i\.\d+\.\d+/i.test(pathname) ||
        /\/opaanlp\/\d+\/\d+/i.test(pathname) ||
        /\/.+-i\.\d+\.\d+/i.test(pathname);

      if (looksLikeProduct) {
        return safety.cleanUrl;
      }
    } catch {
      // ignora candidato inválido
    }
  }

  /*
   * Segunda tentativa:
   * aceita qualquer URL Shopee segura diferente da atual.
   */
  for (const rawCandidate of candidates) {
    try {
      const cleaned = cleanExtractedUrl(rawCandidate);

      const absolute = new URL(cleaned, currentUrl).toString();

      if (absolute === currentUrl) {
        continue;
      }

      const safety = validateSafeShopeeUrl(absolute);

      if (safety.isSafe && safety.cleanUrl) {
        return safety.cleanUrl;
      }
    } catch {
      // ignora
    }
  }

  return undefined;
}

/**
 * Resolve links curtos da Shopee com segurança.
 *
 * Estratégia:
 *
 * 1. Valida a URL.
 * 2. Faz GET com redirect manual.
 * 3. Segue HTTP 301/302/303/307/308.
 * 4. Caso a Shopee responda 200, analisa HTML/JS.
 * 5. Revalida cada novo endereço contra SSRF/allowlist.
 */
export async function followSafeRedirects(
  initialUrl: string,
  maxHops = 8
): Promise<string> {
  const initialSafety = validateSafeShopeeUrl(initialUrl);

  if (!initialSafety.isSafe || !initialSafety.cleanUrl) {
    throw new Error(
      initialSafety.error || 'URL inicial bloqueada por segurança.'
    );
  }

  let currentUrl = initialSafety.cleanUrl;
  let hops = 0;

  const visited = new Set<string>();

  while (hops < maxHops) {
    const safetyCheck = validateSafeShopeeUrl(currentUrl);

    if (!safetyCheck.isSafe || !safetyCheck.cleanUrl) {
      throw new Error(
        safetyCheck.error || 'Redirecionamento bloqueado por segurança.'
      );
    }

    currentUrl = safetyCheck.cleanUrl;

    /*
     * Evita loop infinito.
     */
    if (visited.has(currentUrl)) {
      console.warn(
        '[followSafeRedirects] Loop de redirecionamento detectado:',
        currentUrl
      );

      break;
    }

    visited.add(currentUrl);

    console.log(
      `[followSafeRedirects] Tentativa ${hops + 1}:`,
      currentUrl
    );

    const controller = new AbortController();

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 10000);

    try {
      /*
       * IMPORTANTE:
       *
       * Agora usamos GET em vez de HEAD.
       *
       * O s.shopee.com.br pode responder 200 para HEAD,
       * mesmo quando o navegador seria direcionado para
       * outra página.
       */
      const res = await fetch(currentUrl, {
        method: 'GET',

        /*
         * Manual é necessário para verificarmos cada
         * redirecionamento antes de acessá-lo.
         */
        redirect: 'manual',

        signal: controller.signal,

        headers: {
          'User-Agent':
            'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36',

          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',

          'Accept-Language':
            'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',

          'Cache-Control': 'no-cache',

          Pragma: 'no-cache',
        },
      });

      console.log(
        '[followSafeRedirects] HTTP:',
        res.status,
        currentUrl
      );

      /*
       * Redirecionamento HTTP tradicional.
       */
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');

        if (!location) {
          console.warn(
            '[followSafeRedirects] Redirect sem Location.'
          );

          break;
        }

        const resolvedLocation = new URL(
          location,
          currentUrl
        ).toString();

        const hopCheck =
          validateSafeShopeeUrl(resolvedLocation);

        if (!hopCheck.isSafe || !hopCheck.cleanUrl) {
          throw new Error(
            `Redirecionamento bloqueado: ${
              hopCheck.error || 'domínio não autorizado'
            }`
          );
        }

        console.log(
          '[followSafeRedirects] HTTP redirect:',
          hopCheck.cleanUrl
        );

        currentUrl = hopCheck.cleanUrl;

        hops++;

        continue;
      }

      /*
       * Shopee frequentemente responde HTTP 200
       * para links curtos.
       *
       * Nesse caso analisamos a própria página.
       */
      if (res.ok) {
        const html = await res.text();

        console.log(
          '[followSafeRedirects] HTML recebido:',
          html.length,
          'bytes'
        );

        const htmlRedirect = extractRedirectFromHtml(
          html,
          currentUrl
        );

        if (htmlRedirect) {
          const hopCheck =
            validateSafeShopeeUrl(htmlRedirect);

          if (!hopCheck.isSafe || !hopCheck.cleanUrl) {
            throw new Error(
              'Destino encontrado no HTML foi bloqueado por segurança.'
            );
          }

          console.log(
            '[followSafeRedirects] HTML/JS redirect:',
            hopCheck.cleanUrl
          );

          currentUrl = hopCheck.cleanUrl;

          hops++;

          continue;
        }

        console.log(
          '[followSafeRedirects] Nenhum novo destino encontrado no HTML.'
        );

        break;
      }

      /*
       * Qualquer resposta diferente de sucesso/redirecionamento
       * interrompe a resolução.
       */
      console.warn(
        '[followSafeRedirects] HTTP inesperado:',
        res.status
      );

      break;
    } catch (err: unknown) {
      if (err instanceof Error) {
        console.warn(
          '[followSafeRedirects] Erro:',
          err.message
        );
      } else {
        console.warn(
          '[followSafeRedirects] Erro desconhecido.'
        );
      }

      break;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  const finalSafety = validateSafeShopeeUrl(currentUrl);

  if (!finalSafety.isSafe || !finalSafety.cleanUrl) {
    throw new Error(
      finalSafety.error || 'URL final considerada insegura.'
    );
  }

  console.log(
    '[followSafeRedirects] URL FINAL:',
    finalSafety.cleanUrl
  );

  return finalSafety.cleanUrl;
}
