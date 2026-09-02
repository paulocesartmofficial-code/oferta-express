/**
 * Full-Stack Express Server for Oferta Express - Gerador de Ofertas Shopee
 */
import express, { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

import { ShopeeProductProvider } from './server/providers/productProvider';
import { ShopeeAffiliateProvider } from './server/providers/affiliateProvider';
import { GeminiOfferService } from './server/services/geminiService';
import { HistoryRepository } from './server/repositories/historyRepository';
import { SettingsRepository, DEFAULT_PREFERENCES } from './server/repositories/settingsRepository';
import { validateSafeShopeeUrl } from './server/security/urlGuard';
import { ProductData, OfferPreferences } from './src/types';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '2mb' }));

// Instantiate Providers & Services
const productProvider = new ShopeeProductProvider();
const affiliateProvider = new ShopeeAffiliateProvider();
const geminiService = new GeminiOfferService();
const historyRepo = new HistoryRepository();
const settingsRepo = new SettingsRepository();

// ==========================================
// API ROUTES FIRST
// ==========================================

// 1. Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    appName: 'Oferta Express',
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    affiliateConfigured: affiliateProvider.getStatus().isConfigured,
  });
});

// 2. Resolve Product Data
app.post('/api/product/resolve', async (req: Request, res: Response) => {
  try {
    const { url, force } = req.body;
    if (!url || typeof url !== 'string') {
      res.status(400).json({ error: 'URL não fornecida.' });
      return;
    }

    const safety = validateSafeShopeeUrl(url);
    if (!safety.isSafe) {
      res.status(400).json({ error: safety.error || 'URL inválida ou não autorizada.' });
      return;
    }

    const product = await productProvider.getProduct(url);

    // Duplicate detection check
    const duplicate = historyRepo.findDuplicate(product.productId, product.canonicalUrl);
    const isDuplicate = Boolean(duplicate && !force);

    res.json({
      product,
      isDuplicate,
      previousItem: duplicate || undefined,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Não conseguimos buscar os dados deste produto agora.';
    res.status(500).json({ error: msg });
  }
});

// 3. Convert or Verify Affiliate Link
app.post('/api/affiliate/convert', async (req: Request, res: Response) => {
  try {
    const { productUrl, customAffiliateUrl } = req.body;
    if (!productUrl || typeof productUrl !== 'string') {
      res.status(400).json({ error: 'URL do produto não fornecida.' });
      return;
    }

    const result = await affiliateProvider.convertProductLink(productUrl, customAffiliateUrl);
    res.json(result);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao processar link de afiliado.';
    res.status(500).json({ error: msg });
  }
});

// 3.1 Test Shopee Affiliate Integration Connection
app.post('/api/integrations/shopee/test', async (_req: Request, res: Response) => {
  try {
    const result = await affiliateProvider.testConnection();
    res.json(result);
  } catch {
    res.status(500).json({
      success: false,
      status: 'auth_error',
      message: 'Erro interno ao testar conexão com a API de Afiliados.',
    });
  }
});

// 4. Generate Promotional Offer Text with Gemini
app.post('/api/offer/generate', async (req: Request, res: Response) => {
  try {
    const { product, affiliateLink, preferences, action, previousMessage } = req.body;

    if (!product || !product.title) {
      res.status(400).json({ error: 'Dados factuais do produto são obrigatórios.' });
      return;
    }

    if (!affiliateLink) {
      res.status(400).json({ error: 'Link de afiliado/compra é obrigatório.' });
      return;
    }

    const currentSettings = settingsRepo.getSettings();
    const mergedPreferences: OfferPreferences = {
      ...currentSettings.defaultPreferences,
      ...(preferences || {}),
    };

    const offer = await geminiService.generateOfferText(
      product as ProductData,
      affiliateLink,
      mergedPreferences,
      action || 'initial',
      previousMessage
    );

    res.json(offer);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao gerar texto da oferta.';
    res.status(500).json({ error: msg });
  }
});

// 4.1 Unified Pipeline endpoint for Android and Web
app.post('/api/offer/pipeline', async (req: Request, res: Response) => {
  try {
    const { url, customAffiliate, preferences, saveToHistory } = req.body;

    if (!url || typeof url !== 'string') {
      res.status(400).json({ success: false, message: 'URL do produto não fornecida.' });
      return;
    }

    const safety = validateSafeShopeeUrl(url);
    if (!safety.isSafe) {
      res.status(400).json({ success: false, message: safety.error || 'URL inválida ou não autorizada.' });
      return;
    }

    // Step 1: Resolve Product
    const product = await productProvider.getProduct(url);

    // Step 2: Convert Affiliate
    const affiliate = await affiliateProvider.convertProductLink(url, customAffiliate);

    // Step 3: Generate Offer Text
    const currentSettings = settingsRepo.getSettings();
    const mergedPreferences: OfferPreferences = {
      ...currentSettings.defaultPreferences,
      ...(preferences || {}),
    };

    const offer = await geminiService.generateOfferText(
      product,
      affiliate.affiliateUrl,
      mergedPreferences,
      'initial'
    );

    // Step 4: Save to History if requested
    let historyItem = undefined;
    if (saveToHistory !== false) {
      const selectedImg = (product.images && product.images.length > 0)
        ? (product.images[offer.selectedImageIndex] || product.images[0])
        : undefined;

      historyItem = historyRepo.save({
        canonicalUrl: product.canonicalUrl,
        originalUrl: url,
        affiliateUrl: affiliate.affiliateUrl,
        title: product.title,
        currentPrice: product.currentPrice,
        originalPrice: product.originalPrice,
        discountPercentage: product.discountPercentage,
        image: selectedImg,
        images: product.images || [],
        generatedMessage: offer.fullMessage,
        isFavorite: false,
      });
    }

    res.json({
      success: true,
      product,
      affiliate,
      offer: {
  title: offer.headline || product.title || 'Oferta Shopee',
  formattedText:
    offer.fullMessage ||
    [offer.headline, offer.body, offer.cta].filter(Boolean).join('\n\n'),

  keyBenefits: [],

  currentPrice: product.currentPrice ?? 0,
  originalPrice: product.originalPrice ?? null,
  discountPercentage: product.discountPercentage ?? null,

  couponCode: null,

  affiliateLink: affiliate.affiliateUrl,

  selectedImage:
    product.images && product.images.length > 0
      ? (product.images[offer.selectedImageIndex] || product.images[0])
      : null,

  callToAction: offer.cta || null
},
      historyItem: historyItem
  ? {
      ...historyItem,
      currentPrice: historyItem.currentPrice ?? product.currentPrice ?? 0
    }
  : null,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erro ao executar pipeline de oferta.';
    res.status(500).json({ success: false, message: msg });
  }
});

// 4.2 Download Android project source archive
app.get('/api/download/android-source', async (_req: Request, res: Response) => {
  try {
    const zipPath = path.join(process.cwd(), 'public', 'downloads', 'oferta-express-android.zip');
    if (fs.existsSync(zipPath)) {
      res.download(zipPath, 'oferta-express-android.zip');
    } else {
      const archivePath = path.join(process.cwd(), 'public', 'downloads', 'oferta-express-android.tar.gz');
      if (fs.existsSync(archivePath)) {
        res.download(archivePath, 'oferta-express-android.tar.gz');
      } else {
        res.status(404).json({ error: 'Arquivo ainda não gerado.' });
      }
    }
  } catch {
    res.status(500).json({ error: 'Erro ao baixar código Android.' });
  }
});

// 4.3 Download Android APK if built
app.get('/api/download/apk', async (_req: Request, res: Response) => {
  try {
    const apkPath = path.join(process.cwd(), 'android', 'app', 'build', 'outputs', 'apk', 'debug', 'app-debug.apk');
    if (fs.existsSync(apkPath)) {
      res.download(apkPath, 'OfertaExpress-debug.apk');
    } else {
      res.status(404).json({ error: 'APK ainda não compilado.' });
    }
  } catch {
    res.status(500).json({ error: 'Erro ao baixar APK.' });
  }
});

// 5. History Endpoints
app.get('/api/history', (req: Request, res: Response) => {
  try {
    const range = req.query.range as 'today' | '7days' | '30days' | 'all' | undefined;
    const favoritesOnly = req.query.favoritesOnly === 'true';
    const search = req.query.search as string | undefined;

    const items = historyRepo.getAll({ range, favoritesOnly, search });
    res.json({ items });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Erro ao listar histórico.' });
  }
});

app.post('/api/history', (req: Request, res: Response) => {
  try {
    const item = req.body;
    if (!item || !item.title || !item.canonicalUrl) {
      res.status(400).json({ error: 'Item de histórico inválido.' });
      return;
    }

    const saved = historyRepo.save(item);
    res.json({ item: saved });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Erro ao salvar no histórico.' });
  }
});

app.post('/api/history/:id/favorite', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const isFavorite = historyRepo.toggleFavorite(id);
    res.json({ id, isFavorite });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Erro ao favoritar item.' });
  }
});

app.delete('/api/history/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const success = historyRepo.delete(id);
    res.json({ success });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Erro ao remover item.' });
  }
});

// 6. Settings Endpoints
app.get('/api/settings', (_req: Request, res: Response) => {
  try {
    const settings = settingsRepo.getSettings();
    const affiliateStatus = affiliateProvider.getStatus();
    res.json({
      settings,
      affiliateStatus,
    });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Erro ao buscar configurações.' });
  }
});

app.post('/api/settings', (req: Request, res: Response) => {
  try {
    const updated = settingsRepo.updateSettings(req.body);
    res.json({ settings: updated });
  } catch (error: unknown) {
    res.status(500).json({ error: 'Erro ao salvar configurações.' });
  }
});

// 7. Secure Image Proxy for CORS & Web Share API
app.get('/api/image-proxy', async (req: Request, res: Response) => {
  try {
    const imageUrl = req.query.url as string;
    if (!imageUrl) {
      res.status(400).send('URL da imagem não fornecida.');
      return;
    }

    const safety = validateSafeShopeeUrl(imageUrl);
    // Allow verified Shopee CDN and unsplash image sources for demo
    const isImageAllowed = safety.isSafe || imageUrl.includes('images.unsplash.com');

    if (!isImageAllowed) {
      res.status(403).send('Origem da imagem não autorizada.');
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const imageRes = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!imageRes.ok) {
      res.status(imageRes.status).send('Não foi possível obter a imagem da origem.');
      return;
    }

    const contentType = imageRes.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');

    const buffer = Buffer.from(await imageRes.arrayBuffer());
    res.send(buffer);
  } catch (error: unknown) {
    res.status(500).send('Erro ao processar imagem proxy.');
  }
});

// ==========================================
// VITE MIDDLEWARE & STATIC SERVER
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
