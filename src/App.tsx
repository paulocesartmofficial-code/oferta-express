/**
 * Main Application Root - Oferta Express (Dark Mode Only)
 */
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { BottomNavigation, TabType } from './components/BottomNavigation';
import { SingleOfferForm } from './components/SingleOfferForm';
import { BatchOfferForm } from './components/BatchOfferForm';
import { OfferCard } from './components/OfferCard';
import { HistoryView } from './components/HistoryView';
import { SettingsView } from './components/SettingsView';
import { AssistedManualModal } from './components/AssistedManualModal';
import { DuplicateWarningModal } from './components/DuplicateWarningModal';
import { TestsRunner } from './components/TestsRunner';
import { useOfferGenerator } from './hooks/useOfferGenerator';
import { OfferPreferences, GeneratedOffer } from './types';
import { apiClient } from './services/apiClient';

export function App() {
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [userPreferences, setUserPreferences] = useState<OfferPreferences | undefined>();
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [manualInitialUrl, setManualInitialUrl] = useState('');
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [geminiReady, setGeminiReady] = useState(true);
  const [affiliateConfigured, setAffiliateConfigured] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Hook for offer pipeline
  const {
    state: generatorState,
    statusMessage,
    errorMessage,
    currentUrl,
    resolvedData,
    affiliateLink,
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
    reset: resetGenerator,
  } = useOfferGenerator(userPreferences);

  // Online / Offline Detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Initial Health & Preferences Fetch
  useEffect(() => {
    apiClient
      .getSettings()
      .then((data) => {
        if (data.settings.defaultPreferences) {
          setUserPreferences(data.settings.defaultPreferences);
        }
        setGeminiReady(data.settings.hasGeminiKey);
        setAffiliateConfigured(Boolean(data.settings.affiliateConfigured));
      })
      .catch(() => {});

    apiClient
      .getHistory({ favoritesOnly: true })
      .then((favs) => setFavoritesCount(favs.length))
      .catch(() => {});
  }, []);

  const handleOpenManual = (url?: string) => {
    setManualInitialUrl(url || '');
    setIsManualModalOpen(true);
  };

  const handleLoadOfferFromHistory = (loadedOffer: GeneratedOffer) => {
    // Switch to Home tab and display loaded offer card
    setActiveTab('home');
    setMode('single');
    // Emulate loaded offer in generator
    updateMessageText(loadedOffer.fullMessage);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* App Header */}
      <Header
        geminiReady={geminiReady}
        isOnline={isOnline}
        affiliateConfigured={affiliateConfigured}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-xl w-full mx-auto px-4 pt-4 pb-28 space-y-5">
        {/* Tab 1: HOME */}
        {activeTab === 'home' && (
          <div className="space-y-5">
            {mode === 'single' ? (
              <>
                {/* When offer is generated and ready */}
                {offer ? (
                  <OfferCard
                    offer={offer}
                    onUpdateText={updateMessageText}
                    onRewrite={rewriteOffer}
                    onUndo={undoLastChange}
                    canUndo={undoStack.length > 1}
                    onSelectImage={selectImage}
                    onReset={resetGenerator}
                    isRewriting={isRewriting}
                  />
                ) : (
                  /* Link Input Form */
                  <SingleOfferForm
                    onGenerate={(url, customAff) => processLink(url, false, customAff)}
                    onOpenManual={handleOpenManual}
                    onSwitchToBatch={() => setMode('batch')}
                    isLoading={
                      generatorState === 'validating' ||
                      generatorState === 'resolving' ||
                      generatorState === 'converting_affiliate' ||
                      generatorState === 'generating_text'
                    }
                    loadingMessage={statusMessage}
                  />
                )}

                {/* Error Banner */}
                {generatorState === 'error' && errorMessage && (
                  <div className="p-4 rounded-2xl bg-red-950/70 border border-red-900 text-red-200 text-xs font-semibold flex items-center justify-between gap-2 animate-in fade-in">
                    <span>⚠️ {errorMessage}</span>
                    <button
                      type="button"
                      onClick={() => handleOpenManual(currentUrl)}
                      className="shrink-0 underline font-bold text-orange-400 hover:text-orange-300 cursor-pointer"
                    >
                      Preencher Manualmente
                    </button>
                  </div>
                )}
              </>
            ) : (
              /* Batch Processor View */
              <BatchOfferForm
                onBackToSingle={() => setMode('single')}
                preferences={userPreferences}
              />
            )}

            {/* Test Suite Card on Home */}
            <TestsRunner />
          </div>
        )}

        {/* Tab 2: HISTORY */}
        {activeTab === 'history' && (
          <HistoryView
            onLoadOffer={handleLoadOfferFromHistory}
            favoritesOnly={false}
          />
        )}

        {/* Tab 3: FAVORITES */}
        {activeTab === 'favorites' && (
          <HistoryView
            onLoadOffer={handleLoadOfferFromHistory}
            favoritesOnly={true}
          />
        )}

        {/* Tab 4: SETTINGS */}
        {activeTab === 'settings' && (
          <SettingsView
            onSavePreferences={(prefs) => setUserPreferences(prefs)}
          />
        )}
      </main>

      {/* Duplicate Warning Modal */}
      <DuplicateWarningModal
        isOpen={generatorState === 'duplicate_prompt'}
        duplicateItem={duplicateItem}
        onProceedAnyway={() => {
          if (currentUrl) processLink(currentUrl, true);
        }}
        onViewPrevious={() => {
          if (duplicateItem) {
            handleLoadOfferFromHistory({
              headline: '🔥 Oferta Salva Anteriormente',
              body: duplicateItem.title,
              cta: `🛒 Comprar: ${duplicateItem.affiliateUrl}`,
              fullMessage: duplicateItem.generatedMessage,
              selectedImageIndex: 0,
              product: {
                source: 'shopee_resolver',
                productId: duplicateItem.productId,
                canonicalUrl: duplicateItem.canonicalUrl,
                title: duplicateItem.title,
                currentPrice: duplicateItem.currentPrice,
                originalPrice: duplicateItem.originalPrice,
                discountPercentage: duplicateItem.discountPercentage,
                currency: 'BRL',
                images: duplicateItem.images || [duplicateItem.image || ''],
                fetchedAt: duplicateItem.lastProcessedAt,
              },
              affiliateLink: duplicateItem.affiliateUrl,
              generatedAt: duplicateItem.lastProcessedAt,
              version: 1,
              historyText: [duplicateItem.generatedMessage],
            });
          }
        }}
        onCancel={resetGenerator}
      />

      {/* Assisted Manual Mode Modal */}
      <AssistedManualModal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        onSubmit={processManualProduct}
        initialUrl={manualInitialUrl}
      />

      {/* Bottom Navigation */}
      <BottomNavigation
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          // Refresh favorites count when switching tabs
          apiClient
            .getHistory({ favoritesOnly: true })
            .then((favs) => setFavoritesCount(favs.length))
            .catch(() => {});
        }}
        favoritesCount={favoritesCount}
      />
    </div>
  );
}

export default App;
