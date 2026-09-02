/**
 * Gemini AI Promotional Text Generator Service
 * Adheres strictly to: "DADOS REAIS + IA SOMENTE PARA REDAÇÃO"
 * Never invents facts, prices, discounts, or modifies affiliate links.
 */
import { GoogleGenAI, Type } from '@google/genai';
import { ProductData, OfferPreferences, GeneratedOffer } from '../../src/types';
import { formatBRL } from '../../src/utils/formatters';

export class GeminiOfferService {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }

  public async generateOfferText(
    product: ProductData,
    affiliateLink: string,
    preferences: OfferPreferences,
    action: 'initial' | 'regenerate' | 'shorten' | 'catchy' | 'less_emojis' = 'initial',
    previousMessage?: string
  ): Promise<GeneratedOffer> {
    // 1. Prepare strictly confirmed factual data lines
    const confirmedData: Record<string, unknown> = {
      nome_produto: product.title,
      link_afiliado: affiliateLink,
      moeda: 'BRL',
    };

    if (product.currentPrice !== undefined && product.currentPrice > 0) {
      confirmedData.preco_atual = formatBRL(product.currentPrice);
    }

    if (preferences.showOriginalPrice && product.originalPrice !== undefined && product.originalPrice > 0) {
      confirmedData.preco_anterior = formatBRL(product.originalPrice);
    }

    if (
      preferences.showDiscountPercent &&
      product.discountPercentage !== undefined &&
      product.discountPercentage > 0
    ) {
      confirmedData.desconto_percentual = `${product.discountPercentage}% OFF`;
    }

    if (preferences.showRating && product.rating !== undefined && product.rating > 0) {
      confirmedData.avaliacao = `${product.rating.toFixed(1)} / 5`;
    }

    if (preferences.showSoldCount && product.soldCount !== undefined && product.soldCount > 0) {
      confirmedData.quantidade_vendida = `${product.soldCount} unidades`;
    }

    if (product.sellerName) {
      confirmedData.vendedor = product.sellerName;
    }

    if (preferences.showCoupon && product.couponCode) {
      confirmedData.cupom = product.couponCode;
    }

    if (preferences.customSignature && preferences.customSignature.trim().length > 0) {
      confirmedData.assinatura_comunidade = preferences.customSignature.trim();
    }

    // 2. Build system instruction based on constraints and requested action
    const actionInstructions = {
      initial: 'Crie a mensagem de oferta padrão seguindo as preferências.',
      regenerate: 'Crie uma nova versão diferente da mensagem de oferta, mantendo o estilo.',
      shorten: 'Encurte a mensagem para o formato mais rápido e direto possível (modo relâmpago).',
      catchy: 'Deixe o início da mensagem mais chamativo, mantendo a autenticidade dos dados.',
      less_emojis: 'Use o mínimo possível de emojis, mantendo um visual limpo e profissional.',
    }[action];

    const systemInstruction = `Você é um redator especializado em ofertas para WhatsApp no Brasil.
Crie uma mensagem curta, chamativa e natural utilizando EXCLUSIVAMENTE os dados fornecidos no JSON de entrada.

DIRETRIZES FUNDAMENTAIS:
- É expressamente PROIBIDO inventar: preços, preços anteriores, descontos, cupons, frete grátis, benefícios, estoque, avaliações, vendas, características ou especificações.
- Se um dado não existir no objeto de dados, simplesmente OMITA. Nunca escreva frases como "Preço não informado" ou "Sem avaliação".
- Não faça afirmações técnicas sobre o produto que não estejam presentes nos dados recebidos.
- Use português brasileiro fluente e engajador para WhatsApp.
- Estilo solicitado: ${preferences.style}
- Tamanho solicitado: ${preferences.length}
- Quantidade de emojis: ${preferences.emojis}
- Ação específica: ${actionInstructions}
- O LINK DE AFILIADO fornecido ("link_afiliado") DEVE PERMANECER EXATAMENTE IGUAL. Nunca altere nenhum caractere do link.
- Coloque o link de afiliado uma única vez no final da mensagem após o CTA ou indicação de compra (ex: 🛒 Compre aqui: [link]).
- Se houver "assinatura_comunidade", inclua-a no final da mensagem.
- Inclua sempre o aviso amigável de contingência de ofertas: "⚠️ Preço e disponibilidade sujeitos a alteração."

${previousMessage ? `Mensagem anterior que está sendo modificada: "${previousMessage}"` : ''}
`;

    // 3. Call Gemini with Structured JSON Output
    try {
      if (!process.env.GEMINI_API_KEY) {
        return this.generateDeterministicFallback(product, affiliateLink, preferences);
      }

      const prompt = `Gere a oferta para o seguinte produto com dados reais confirmados:
${JSON.stringify(confirmedData, null, 2)}`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: prompt,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              headline: {
                type: Type.STRING,
                description: 'Linha de título ou chamada inicial curta com emoji',
              },
              body: {
                type: Type.STRING,
                description: 'Corpo da mensagem com o nome do produto e dados reais confirmados',
              },
              cta: {
                type: Type.STRING,
                description: 'Chamada para ação com o link de afiliado exato',
              },
              fullMessage: {
                type: Type.STRING,
                description: 'A mensagem completa formatada pronta para enviar no WhatsApp',
              },
            },
            required: ['headline', 'body', 'cta', 'fullMessage'],
          },
        },
      });

      const text = response.text ? response.text.trim() : '';
      if (!text) {
        return this.generateDeterministicFallback(product, affiliateLink, preferences);
      }

      const parsed = JSON.parse(text);

      // Ensure the exact affiliate link is in fullMessage
      let fullMessage = parsed.fullMessage || '';
      if (!fullMessage.includes(affiliateLink)) {
        fullMessage += `\n\n🛒 Compre aqui:\n${affiliateLink}`;
      }

      return {
        headline: parsed.headline || '🔥 OFERTA ENCONTRADA!',
        body: parsed.body || product.title,
        cta: parsed.cta || `🛒 Comprar: ${affiliateLink}`,
        fullMessage,
        selectedImageIndex: 0,
        product,
        affiliateLink,
        generatedAt: new Date().toISOString(),
        version: 1,
        historyText: [fullMessage],
      };
    } catch (err) {
      console.warn('Gemini API call failed or schema parsing error, using deterministic engine:', err);
      return this.generateDeterministicFallback(product, affiliateLink, preferences);
    }
  }

  /**
   * Deterministic builder ensuring guaranteed functionality even when offline or during testing
   */
  public generateDeterministicFallback(
    product: ProductData,
    affiliateLink: string,
    preferences: OfferPreferences
  ): GeneratedOffer {
    const lines: string[] = [];

    // Headline
    const headlines: Record<string, string> = {
      chamativo: '🔥 *OFERTA ENCONTRADA NA SHOPEE!*',
      economico: '💰 *ECONOMIZE AGORA NA SHOPEE!*',
      clean: '*Oferta Shopee*',
      descontraido: '👀 *Olha esse achadinho que achei!*',
      rapida: '⚡ *OFERTA RELÂMPAGO!*',
    };
    const headline = headlines[preferences.style] || '🔥 *OFERTA ENCONTRADA!*';
    lines.push(headline);
    lines.push('');

    // Product Title
    lines.push(`📦 *${product.title}*`);
    lines.push('');

    // Price section strictly if exists
    if (preferences.showOriginalPrice && product.originalPrice && product.originalPrice > 0) {
      lines.push(`❌ De: ~${formatBRL(product.originalPrice)}~`);
    }

    if (product.currentPrice && product.currentPrice > 0) {
      lines.push(`💰 *Por: ${formatBRL(product.currentPrice)}*`);
    }

    if (
      preferences.showDiscountPercent &&
      product.discountPercentage &&
      product.discountPercentage > 0
    ) {
      lines.push(`🏷️ *${product.discountPercentage}% OFF*`);
    }

    if (preferences.showCoupon && product.couponCode) {
      lines.push(`🎟️ Cupom: *${product.couponCode}*`);
    }

    if (preferences.showRating && product.rating) {
      lines.push(`⭐ Avaliação: ${product.rating.toFixed(1)}/5`);
    }

    lines.push('');
    lines.push('🛒 *Compre com segurança aqui:*');
    lines.push(affiliateLink);

    lines.push('');
    lines.push('⚠️ _Preço e disponibilidade sujeitos a alteração._');

    if (preferences.customSignature && preferences.customSignature.trim().length > 0) {
      lines.push('');
      lines.push(preferences.customSignature.trim());
    }

    const fullMessage = lines.join('\n');

    return {
      headline,
      body: `📦 ${product.title}`,
      cta: `🛒 Comprar: ${affiliateLink}`,
      fullMessage,
      selectedImageIndex: 0,
      product,
      affiliateLink,
      generatedAt: new Date().toISOString(),
      version: 1,
      historyText: [fullMessage],
    };
  }
}
