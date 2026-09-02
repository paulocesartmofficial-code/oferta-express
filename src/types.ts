/**
 * Shared Types for Oferta Express - Gerador de Ofertas Shopee
 */

export interface ProductData {
  source: 'shopee_api' | 'shopee_resolver' | 'manual';
  productId?: string;
  canonicalUrl: string;
  title: string;
  currentPrice?: number;
  originalPrice?: number;
  discountPercentage?: number; // Calculated mathematically from currentPrice & originalPrice
  currency: string; // 'BRL'
  images: string[];
  sellerName?: string;
  rating?: number; // 0 to 5
  soldCount?: number;
  availability?: boolean;
  couponCode?: string;
  fetchedAt: string; // ISO timestamp
}

export type AffiliateStatus = 'CONFIGURED' | 'ALREADY_AFFILIATE' | 'NOT_CONFIGURED';

export interface AffiliateLinkResult {
  status: AffiliateStatus;
  originalUrl: string;
  affiliateUrl: string;
  providerName: string;
  message?: string;
}

export type OfferStyle = 'chamativo' | 'economico' | 'clean' | 'descontraido' | 'rapida';
export type OfferLength = 'curto' | 'normal' | 'detalhado';
export type EmojiDensity = 'poucos' | 'normal' | 'muitos';

export interface OfferPreferences {
  style: OfferStyle;
  length: OfferLength;
  emojis: EmojiDensity;
  showOriginalPrice: boolean;
  showDiscountPercent: boolean;
  showRating: boolean;
  showSoldCount: boolean;
  showCoupon: boolean;
  customSignature?: string; // e.g. "🔥 Entre no nosso grupo VIP de ofertas no WhatsApp: https://..."
}

export interface GeneratedOffer {
  headline: string;
  body: string;
  cta: string;
  fullMessage: string;
  selectedImageIndex: number;
  product: ProductData;
  affiliateLink: string;
  generatedAt: string;
  version: number;
  historyText?: string[]; // For undo/redo
}

export interface HistoryItem {
  id: string;
  productId?: string;
  canonicalUrl: string;
  originalUrl: string;
  affiliateUrl: string;
  title: string;
  currentPrice?: number;
  originalPrice?: number;
  discountPercentage?: number;
  image?: string;
  images: string[];
  generatedMessage: string;
  isFavorite?: boolean;
  createdAt: string;
  lastProcessedAt: string;
}

export interface AppSettings {
  defaultPreferences: OfferPreferences;
  affiliateConfigured: boolean;
  affiliateIntegrationType: 'official_api' | 'manual_universal_tag' | 'unconfigured';
  shopeeAppIdPreview?: string;
  hasGeminiKey: boolean;
}

export interface BatchItem {
  id: string;
  url: string;
  status: 'pending' | 'resolving' | 'generating' | 'completed' | 'error';
  isValid: boolean;
  error?: string;
  product?: ProductData;
  offer?: GeneratedOffer;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}
