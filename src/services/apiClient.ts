/**
 * Client-Side API Service
 */
import {
  ProductData,
  AffiliateLinkResult,
  GeneratedOffer,
  OfferPreferences,
  HistoryItem,
  AppSettings,
} from '../types';

export interface ResolveProductResponse {
  product: ProductData;
  isDuplicate: boolean;
  previousItem?: HistoryItem;
}

export const apiClient = {
  /**
   * Resolves factual product data from Shopee link
   */
  async resolveProduct(url: string, force = false): Promise<ResolveProductResponse> {
    const res = await fetch('/api/product/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, force }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Não conseguimos buscar os dados deste produto agora.');
    }

    return res.json();
  },

  /**
   * Converts or verifies affiliate link
   */
  async convertAffiliateLink(productUrl: string, customAffiliateUrl?: string): Promise<AffiliateLinkResult> {
    const res = await fetch('/api/affiliate/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productUrl, customAffiliateUrl }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Erro ao processar link de afiliado.');
    }

    return res.json();
  },

  /**
   * Generates promotional offer text via server-side Gemini
   */
  async generateOffer(
    product: ProductData,
    affiliateLink: string,
    preferences?: Partial<OfferPreferences>,
    action: 'initial' | 'regenerate' | 'shorten' | 'catchy' | 'less_emojis' = 'initial',
    previousMessage?: string
  ): Promise<GeneratedOffer> {
    const res = await fetch('/api/offer/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product,
        affiliateLink,
        preferences,
        action,
        previousMessage,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || 'Erro ao gerar o texto promocional.');
    }

    return res.json();
  },

  /**
   * Fetches history items
   */
  async getHistory(filter?: { range?: string; favoritesOnly?: boolean; search?: string }): Promise<HistoryItem[]> {
    const params = new URLSearchParams();
    if (filter?.range) params.set('range', filter.range);
    if (filter?.favoritesOnly) params.set('favoritesOnly', 'true');
    if (filter?.search) params.set('search', filter.search);

    const res = await fetch(`/api/history?${params.toString()}`);
    if (!res.ok) throw new Error('Erro ao carregar histórico.');
    const data = await res.json();
    return data.items || [];
  },

  /**
   * Saves or updates an item in history
   */
  async saveHistory(item: Omit<HistoryItem, 'id' | 'createdAt' | 'lastProcessedAt'> & { id?: string }): Promise<HistoryItem> {
    const res = await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });

    if (!res.ok) throw new Error('Erro ao salvar item no histórico.');
    const data = await res.json();
    return data.item;
  },

  /**
   * Toggles favorite status of an item
   */
  async toggleFavorite(id: string): Promise<boolean> {
    const res = await fetch(`/api/history/${id}/favorite`, { method: 'POST' });
    if (!res.ok) throw new Error('Erro ao favoritar item.');
    const data = await res.json();
    return data.isFavorite;
  },

  /**
   * Deletes an item from history
   */
  async deleteHistory(id: string): Promise<boolean> {
    const res = await fetch(`/api/history/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Erro ao excluir item do histórico.');
    const data = await res.json();
    return data.success;
  },

  /**
   * Fetches settings
   */
  async getSettings(): Promise<{ settings: AppSettings; affiliateStatus: { isConfigured: boolean; providerType: string; description: string } }> {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('Erro ao buscar configurações.');
    return res.json();
  },

  /**
   * Updates settings
   */
  async updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error('Erro ao salvar configurações.');
    const data = await res.json();
    return data.settings;
  },

  /**
   * Tests Shopee Affiliate API integration connectivity
   */
  async testShopeeIntegration(): Promise<{ success: boolean; status: 'ok' | 'integration_not_configured' | 'auth_error'; message: string }> {
    const res = await fetch('/api/integrations/shopee/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return {
        success: false,
        status: errorData.status || 'auth_error',
        message: errorData.message || 'Erro ao conectar à API.',
      };
    }
    return res.json();
  },

  /**
   * Downloads image safely via backend proxy into a browser File object for Web Share API
   */
  async fetchImageFile(imageUrl: string, filename = 'oferta-shopee.jpg'): Promise<File | null> {
    try {
      const proxyUrl = `/api/image-proxy?url=${encodeURIComponent(imageUrl)}`;
      const res = await fetch(proxyUrl);
      if (!res.ok) return null;
      const blob = await res.blob();
      const mimeType = blob.type || 'image/jpeg';
      return new File([blob], filename, { type: mimeType });
    } catch {
      return null;
    }
  },
};
