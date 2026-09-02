/**
 * Batch Mode Concurrency Processor Hook
 */
import { useState, useCallback, useRef } from 'react';
import { BatchItem, OfferPreferences } from '../types';
import { extractUrlsFromText, validateShopeeUrl } from '../utils/urlValidator';
import { apiClient } from '../services/apiClient';

export function useBatchProcessor(preferences?: Partial<OfferPreferences>) {
  const [rawText, setRawText] = useState<string>('');
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processedCount, setProcessedCount] = useState<number>(0);
  const [totalValid, setTotalValid] = useState<number>(0);
  const isCancelledRef = useRef<boolean>(false);

  /**
   * Analyzes lines in the textarea and prepares valid/invalid queues
   */
  const parseLinks = useCallback((text: string) => {
    setRawText(text);
    const urls = extractUrlsFromText(text);

    const parsedItems: BatchItem[] = urls.map((url, idx) => {
      const validation = validateShopeeUrl(url);
      return {
        id: `batch_${idx}_${Date.now()}`,
        url,
        status: validation.isValid ? 'pending' : 'error',
        isValid: validation.isValid,
        error: validation.error,
      };
    });

    setItems(parsedItems);
    setTotalValid(parsedItems.filter((i) => i.isValid).length);
  }, []);

  /**
   * Processes all valid items with a concurrency limit (2 concurrent tasks)
   */
  const startBatch = useCallback(
    async (concurrency = 2) => {
      if (isProcessing) return;
      setIsProcessing(true);
      isCancelledRef.current = false;
      setProcessedCount(0);

      const validIndexes = items
        .map((item, idx) => (item.isValid && item.status !== 'completed' ? idx : -1))
        .filter((idx) => idx !== -1);

      let currentIndex = 0;
      let completedCount = 0;

      const processSingle = async (itemIdx: number) => {
        if (isCancelledRef.current) return;
        const targetItem = items[itemIdx];

        setItems((prev) => {
          const next = [...prev];
          next[itemIdx] = { ...next[itemIdx], status: 'resolving' };
          return next;
        });

        try {
          // 1. Resolve Product
          const resolveRes = await apiClient.resolveProduct(targetItem.url, true);
          const product = resolveRes.product;

          setItems((prev) => {
            const next = [...prev];
            next[itemIdx] = { ...next[itemIdx], product, status: 'generating' };
            return next;
          });

          // 2. Convert Affiliate
          const affRes = await apiClient.convertAffiliateLink(product.canonicalUrl);
          const affiliateUrl = affRes.affiliateUrl || product.canonicalUrl;

          // 3. Generate Offer with Gemini
          const generatedOffer = await apiClient.generateOffer(product, affiliateUrl, preferences, 'initial');

          // 4. Save to history
          try {
            await apiClient.saveHistory({
              productId: product.productId,
              canonicalUrl: product.canonicalUrl,
              originalUrl: targetItem.url,
              affiliateUrl,
              title: product.title,
              currentPrice: product.currentPrice,
              originalPrice: product.originalPrice,
              discountPercentage: product.discountPercentage,
              image: product.images[0],
              images: product.images,
              generatedMessage: generatedOffer.fullMessage,
              isFavorite: false,
            });
          } catch (e) {
            console.warn('Batch auto-save history error:', e);
          }

          setItems((prev) => {
            const next = [...prev];
            next[itemIdx] = {
              ...next[itemIdx],
              status: 'completed',
              product,
              offer: generatedOffer,
            };
            return next;
          });
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : 'Erro ao processar item.';
          setItems((prev) => {
            const next = [...prev];
            next[itemIdx] = {
              ...next[itemIdx],
              status: 'error',
              error: msg,
            };
            return next;
          });
        } finally {
          completedCount++;
          setProcessedCount(completedCount);
        }
      };

      const worker = async () => {
        while (currentIndex < validIndexes.length && !isCancelledRef.current) {
          const nextIdx = validIndexes[currentIndex];
          currentIndex++;
          await processSingle(nextIdx);
        }
      };

      // Launch worker pool with concurrency limit
      const workers = Array.from({ length: Math.min(concurrency, validIndexes.length) }, () => worker());
      await Promise.all(workers);

      setIsProcessing(false);
    },
    [isProcessing, items, preferences]
  );

  const stopBatch = useCallback(() => {
    isCancelledRef.current = true;
    setIsProcessing(false);
  }, []);

  const clearBatch = useCallback(() => {
    setRawText('');
    setItems([]);
    setProcessedCount(0);
    setTotalValid(0);
  }, []);

  return {
    rawText,
    items,
    isProcessing,
    processedCount,
    totalValid,
    totalCount: items.length,
    invalidCount: items.length - totalValid,
    parseLinks,
    startBatch,
    stopBatch,
    clearBatch,
  };
}
