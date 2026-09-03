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

  const pushCandidate = (value?: string) => {
    if (!value) return;

    const cleaned = cleanExtractedUrl(value)
      .replace(/\\u003D/gi, '=')
      .replace(/\\u0026/gi, '&')
      .replace(/\\x2F/gi, '/')
      .replace(/%2F/gi, '/')
      .replace(/%3A/gi, ':');

    if (cleaned) {
      candidates.push(cleaned);
    }
  };

  /*
   * 1) Prioridade máxima: rotas reais de produto que a Shopee
   *    coloca no HTML do shortlink. Em muitos casos o destino
   *    aparece como rota RELATIVA:
   *
   *    /opaanlp/SHOP_ID/ITEM_ID
   */
  const relativeProductPatterns = [
    /(?:https?:\\?\/\\?\/(?:www\.)?shopee\.com\.br)?\\?\/opaanlp\\?\/(\d+)\\?\/(\d+)(?:[^"'<>\\\s]*)?/gi,
    /(?:https?:\/\/(?:www\.)?shopee\.com\.br)?\/opaanlp\/(\d+)\/(\d+)(?:[^"'<>\\\s]*)?/gi,
    /(?:https?:\\?\/\\?\/(?:www\.)?shopee\.com\.br)?\\?\/product\\?\/(\d+)\\?\/(\d+)(?:[^"'<>\\\s]*)?/gi,
    /(?:https?:\/\/(?:www\.)?shopee\.com\.br)?\/product\/(\d+)\/(\d+)(?:[^"'<>\\\s]*)?/gi,
    /(?:https?:\\?\/\\?\/(?:www\.)?shopee\.com\.br)?\\?\/[^"'<>\\\s]*-i\.(\d+)\.(\d+)(?:[^"'<>\\\s]*)?/gi,
  ];

  for (const pattern of relativeProductPatterns) {
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(html)) !== null) {
      pushCandidate(match[0]);
    }
  }

  /*
   * 2) META refresh.
   */
  const metaRefreshPatterns = [
    /<meta[^>]+http-equiv=["']?refresh["']?[^>]+content=["'][^"']*url\s*=\s*([^"'>\s]+)[^"']*["']/i,
    /<meta[^>]+content=["'][^"']*url\s*=\s*([^"'>\s]+)[^"']*["'][^>]+http-equiv=["']?refresh["']?/i,
  ];

  for (const pattern of metaRefreshPatterns) {
    const match = html.match(pattern);
    pushCandidate(match?.[1]);
  }

  /*
   * 3) Campos JSON/JS usados pela página curta.
   */
  const jsonUrlPatterns = [
    /["'](?:url|redirect_url|redirectUrl|target_url|targetUrl|destination_url|destinationUrl|landing_url|landingUrl|deeplink|deep_link)["']\s*:\s*["']([^"']+)["']/gi,
    /(?:window\.)?location(?:\.href)?\s*=\s*["']([^"']+)["']/gi,
    /(?:window\.)?location\.replace\(\s*["']([^"']+)["']\s*\)/gi,
    /(?:window\.)?location\.assign\(\s*["']([^"']+)["']\s*\)/gi,
  ];

  for (const pattern of jsonUrlPatterns) {
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(html)) !== null) {
      pushCandidate(match[1]);
    }
  }

  /*
   * 4) canonical / og:url ficam por último porque páginas de
   *    shortlink da Shopee podem apontar genericamente para
   *    /opaanlp, que NÃO é o produto.
   */
  const canonicalPatterns = [
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i,
  ];

  for (const pattern of canonicalPatterns) {
    const match = html.match(pattern);
    pushCandidate(match?.[1]);
  }

  const ogUrlPatterns = [
    /<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:url["']/i,
  ];

  for (const pattern of ogUrlPatterns) {
    const match = html.match(pattern);
    pushCandidate(match?.[1]);
  }

  /*
   * 5) URLs absolutas da Shopee embutidas no HTML.
   */
  const absoluteShopeeUrls =
    html.match(
      /https?:\\?\/\\?\/(?:www\.)?shopee\.com\.br\\?\/[^"'<>\\\s]+/gi
    ) || [];

  for (const url of absoluteShopeeUrls) {
    pushCandidate(url);
  }

  /*
   * Primeiro passe: SOMENTE destino que realmente contém IDs
   * de produto. Isso impede o bug que transformava o shortlink em
   * https://shopee.com.br/opaanlp e perdia shopId/itemId.
   */
  for (const rawCandidate of candidates) {
    try {
      const cleaned = cleanExtractedUrl(rawCandidate);
      const absolute = new URL(cleaned, currentUrl).toString();

      if (absolute === currentUrl) {
        continue;
      }

      const safety = validateSafeShopeeUrl(absolute);

      if (!safety.isSafe || !safety.cleanUrl) {
        continue;
      }

      const parsed = new URL(safety.cleanUrl);
      const pathname = decodeURIComponent(parsed.pathname);

      const looksLikeRealProduct =
        /\/product\/\d+\/\d+/i.test(pathname) ||
        /-i\.\d+\.\d+/i.test(pathname) ||
        /\/opaanlp\/\d+\/\d+/i.test(pathname) ||
        /\/\d+\/\d+(?:\/)?$/i.test(pathname) ||
        (
          /^\d+$/.test(parsed.searchParams.get('shopid') || '') &&
          /^\d+$/.test(parsed.searchParams.get('itemid') || '')
        );

      if (looksLikeRealProduct) {
        console.log(
          '[followSafeRedirects] Produto encontrado no HTML:',
          safety.cleanUrl
        );

        return safety.cleanUrl;
      }
    } catch {
      // ignora candidato inválido
    }
  }

  /*
   * Segundo passe: só aceita um redirecionamento "genérico"
   * se ele NÃO for a página falsa /opaanlp sem IDs.
   */
  for (const rawCandidate of candidates) {
    try {
      const cleaned = cleanExtractedUrl(rawCandidate);
      const absolute = new URL(cleaned, currentUrl).toString();

      if (absolute === currentUrl) {
        continue;
      }

      const safety = validateSafeShopeeUrl(absolute);

      if (!safety.isSafe || !safety.cleanUrl) {
        continue;
      }

      const parsed = new URL(safety.cleanUrl);
      const pathname = parsed.pathname.replace(/\/+$/, '').toLowerCase();

      const isGenericDeadEnd =
        pathname === '' ||
        pathname === '/' ||
        pathname === '/opaanlp' ||
        pathname === '/product' ||
        pathname === '/shop';

      if (isGenericDeadEnd) {
        continue;
      }

      return safety.cleanUrl;
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
