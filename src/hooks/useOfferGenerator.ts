/**
 * Custom Hook for Offer Generation Pipeline
 */
import { useState, useCallback } from 'react';
import { ProductData, GeneratedOffer, OfferPreferences, HistoryItem } from '../types';
import { apiClient, ResolveProductResponse } from '../services/apiClient';
import { validateShopeeUrl } from '../utils/urlValidator';

export type GeneratorState =
  | 'idle'
  | 'validating'
  | 'resolving'
  | 'duplicate_prompt'
  | 'converting_affiliate'
  | 'generating_text'
  | 'ready'
  | 'error';

export function useOfferGenerator(preferences?: Partial<OfferPreferences>) {
  const [state, setState] = useState<GeneratorState>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [currentUrl, setCurrentUrl] = useState<string>('');
  const [resolvedData, setResolvedData] = useState<ProductData | null>(null);
  const [affiliateLink, setAffiliateLink] = useState<string>('');
  const [affiliateStatus, setAffiliateStatus] = useState<string>('');
  const [duplicateItem, setDuplicateItem] = useState<HistoryItem | null>(null);
  const [offer, setOffer] = useState<GeneratedOffer | null>(null);
  const [undoStack, setUndoStack] = useState<string[]>([]);
  const [isRewriting, setIsRewriting] = useState<boolean>(false);

  /**
   * Starts full automated pipeline from a Shopee link
   */
  const processLink = useCallback(
    async (rawUrl: string, force = false, customAffiliate?: string) => {
      setErrorMessage(null);
      setCurrentUrl(rawUrl);

      // 1. Validation
      setState('validating');
      setStatusMessage('Validando link da Shopee…');

      const validation = validateShopeeUrl(rawUrl);
      if (!validation.isValid) {
        setState('error');
        setErrorMessage(validation.error || 'Link inválido.');
        return;
      }

      try {
        // 2. Resolve factual product data
        setState('resolving');
        setStatusMessage('Buscando dados reais do produto…');

        const resolveRes: ResolveProductResponse = await apiClient.resolveProduct(rawUrl, force);
        const product = resolveRes.product;
        setResolvedData(product);

        // Check duplicate
        if (resolveRes.isDuplicate && resolveRes.previousItem && !force) {
          setDuplicateItem(resolveRes.previousItem);
          setState('duplicate_prompt');
          return;
        }

        // 3. Convert or check affiliate link
        setState('converting_affiliate');
        setStatusMessage('Preparando link de afiliado…');

        const affRes = await apiClient.convertAffiliateLink(product.canonicalUrl, customAffiliate);
        const finalAffiliateUrl = affRes.affiliateUrl || product.canonicalUrl;
        setAffiliateLink(finalAffiliateUrl);
        setAffiliateStatus(affRes.status);

        // 4. Generate AI Promotional text
        setState('generating_text');
        setStatusMessage('Criando redação de oferta com IA…');

        const generated = await apiClient.generateOffer(product, finalAffiliateUrl, preferences, 'initial');
        setOffer(generated);
        setUndoStack([generated.fullMessage]);

        // 5. Persist in History
        try {
          await apiClient.saveHistory({
            productId: product.productId,
            canonicalUrl: product.canonicalUrl,
            originalUrl: rawUrl,
            affiliateUrl: finalAffiliateUrl,
            title: product.title,
            currentPrice: product.currentPrice,
            originalPrice: product.originalPrice,
            discountPercentage: product.discountPercentage,
            image: product.images[0],
            images: product.images,
            generatedMessage: generated.fullMessage,
            isFavorite: false,
          });
        } catch (e) {
          console.warn('Could not auto-save to history:', e);
        }

        setState('ready');
        setStatusMessage('');
      } catch (err: unknown) {
        setState('error');
        const msg = err instanceof Error ? err.message : 'Não conseguimos buscar este produto agora.';
        setErrorMessage(msg);
      }
    },
    [preferences]
  );

  /**
   * Process an assisted manual product
   */
  const processManualProduct = useCallback(
    async (manualProduct: ProductData, customAffiliate: string) => {
      setErrorMessage(null);
      setResolvedData(manualProduct);
      setAffiliateLink(customAffiliate || manualProduct.canonicalUrl);

      try {
        setState('generating_text');
        setStatusMessage('Criando oferta com dados fornecidos…');

        const generated = await apiClient.generateOffer(
          manualProduct,
          customAffiliate || manualProduct.canonicalUrl,
          preferences,
          'initial'
        );

        setOffer(generated);
        setUndoStack([generated.fullMessage]);

        await apiClient.saveHistory({
          productId: manualProduct.productId,
          canonicalUrl: manualProduct.canonicalUrl,
          originalUrl: manualProduct.canonicalUrl,
          affiliateUrl: customAffiliate || manualProduct.canonicalUrl,
          title: manualProduct.title,
          currentPrice: manualProduct.currentPrice,
          originalPrice: manualProduct.originalPrice,
          discountPercentage: manualProduct.discountPercentage,
          image: manualProduct.images[0],
          images: manualProduct.images,
          generatedMessage: generated.fullMessage,
          isFavorite: false,
        });

        setState('ready');
      } catch (err: unknown) {
        setState('error');
        setErrorMessage(err instanceof Error ? err.message : 'Erro ao processar oferta.');
      }
    },
    [preferences]
  );

  /**
   * Rewrites current offer text (regenerate, shorten, catchy, less_emojis)
   */
  const rewriteOffer = useCallback(
    async (action: 'regenerate' | 'shorten' | 'catchy' | 'less_emojis') => {
      if (!offer || !resolvedData) return;

      setIsRewriting(true);
      try {
        const updated = await apiClient.generateOffer(
          resolvedData,
          affiliateLink,
          preferences,
          action,
          offer.fullMessage
        );

        setUndoStack((prev) => [...prev, updated.fullMessage]);
        setOffer((prev) => (prev ? { ...prev, fullMessage: updated.fullMessage, version: prev.version + 1 } : updated));
      } catch (err) {
        console.warn('Rewrite failed:', err);
      } finally {
        setIsRewriting(false);
      }
    },
    [offer, resolvedData, affiliateLink, preferences]
  );

  /**
   * Manual text edit with history tracking
   */
  const updateMessageText = useCallback((newText: string) => {
    setOffer((prev) => {
      if (!prev) return null;
      return { ...prev, fullMessage: newText };
    });
  }, []);

  /**
   * Undo text change
   */
  const undoLastChange = useCallback(() => {
    setUndoStack((prev) => {
      if (prev.length <= 1) return prev;
      const newStack = [...prev];
      newStack.pop(); // Remove current
      const previousText = newStack[newStack.length - 1];

      setOffer((currentOffer) => {
        if (!currentOffer) return null;
        return { ...currentOffer, fullMessage: previousText };
      });

      return newStack;
    });
  }, []);

  /**
   * Change selected image in gallery
   */
  const selectImage = useCallback((index: number) => {
    setOffer((prev) => {
      if (!prev) return null;
      return { ...prev, selectedImageIndex: index };
    });
  }, []);

  /**
   * Reset to initial state
   */
  const reset = useCallback(() => {
    setState('idle');
    setStatusMessage('');
    setErrorMessage(null);
    setCurrentUrl('');
    setResolvedData(null);
    setOffer(null);
    setDuplicateItem(null);
    setUndoStack([]);
  }, []);

  return {
    state,
    statusMessage,
    errorMessage,
    currentUrl,
    resolvedData,
    affiliateLink,
    affiliateStatus,
    duplicateItem,
    offer,
    undoStack,
    isRewriting,
    processLink,
    processManualProduct,
    rewriteOffer,
    updateMessageText,
    undoLastChange,
    selectImage,
    reset,
  };
}
