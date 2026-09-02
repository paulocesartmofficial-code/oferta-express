/**
 * User Settings Repository
 */
import { AppSettings, OfferPreferences } from '../../src/types';

export const DEFAULT_PREFERENCES: OfferPreferences = {
  style: 'chamativo',
  length: 'curto',
  emojis: 'normal',
  showOriginalPrice: true,
  showDiscountPercent: true,
  showRating: true,
  showSoldCount: true,
  showCoupon: true,
  customSignature: '',
};

export class SettingsRepository {
  private settings: AppSettings;

  constructor() {
    const appId = process.env.SHOPEE_AFFILIATE_APP_ID;
    this.settings = {
      defaultPreferences: { ...DEFAULT_PREFERENCES },
      affiliateConfigured: Boolean(process.env.SHOPEE_AFFILIATE_APP_ID && process.env.SHOPEE_AFFILIATE_SECRET),
      affiliateIntegrationType: (process.env.SHOPEE_AFFILIATE_APP_ID && process.env.SHOPEE_AFFILIATE_SECRET)
        ? 'official_api'
        : 'unconfigured',
      shopeeAppIdPreview: appId ? `${appId.slice(0, 3)}••••` : undefined,
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    };
  }

  public getSettings(): AppSettings {
    const appId = process.env.SHOPEE_AFFILIATE_APP_ID;
    const hasShopee = Boolean(process.env.SHOPEE_AFFILIATE_APP_ID && process.env.SHOPEE_AFFILIATE_SECRET);
    
    this.settings.affiliateConfigured = hasShopee;
    this.settings.affiliateIntegrationType = hasShopee ? 'official_api' : 'unconfigured';
    this.settings.shopeeAppIdPreview = appId ? `${appId.slice(0, 3)}••••` : undefined;
    this.settings.hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);

    return { ...this.settings };
  }

  public updateSettings(partial: Partial<AppSettings>): AppSettings {
    if (partial.defaultPreferences) {
      this.settings.defaultPreferences = {
        ...this.settings.defaultPreferences,
        ...partial.defaultPreferences,
      };
    }
    return this.getSettings();
  }
}
