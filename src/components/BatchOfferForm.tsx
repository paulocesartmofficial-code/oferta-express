/**
 * Batch Mode Offer Processor Component - Vibrant Palette Theme
 */
import React, { useState } from 'react';
import {
  Layers,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  Copy,
  Check,
  RotateCcw,
  Share2,
  Trash2,
  Flame,
} from 'lucide-react';
import { useBatchProcessor } from '../hooks/useBatchProcessor';
import { OfferPreferences } from '../types';
import { OfferCard } from './OfferCard';
import { formatBRL } from '../utils/formatters';

interface BatchOfferFormProps {
  onBackToSingle: () => void;
  preferences?: Partial<OfferPreferences>;
}

export const BatchOfferForm: React.FC<BatchOfferFormProps> = ({
  onBackToSingle,
  preferences,
}) => {
  const {
    rawText,
    items,
    isProcessing,
    processedCount,
    totalValid,
    totalCount,
    invalidCount,
    parseLinks,
    startBatch,
    stopBatch,
    clearBatch,
  } = useBatchProcessor(preferences);

  const [copiedAll, setCopiedAll] = useState(false);

  const completedItems = items.filter((i) => i.status === 'completed' && i.offer);

  const handleCopyAllOffers = async () => {
    if (completedItems.length === 0) return;
    const combined = completedItems
      .map((item, idx) => `--- OFERTA ${idx + 1} ---\n${item.offer?.fullMessage}`)
      .join('\n\n');

    try {
      await navigator.clipboard.writeText(combined);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    } catch {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 sm:p-7 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToSingle}
              className="p-2.5 rounded-2xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-slate-200 dark:border-slate-700 cursor-pointer"
              title="Voltar ao modo individual"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-orange-600" />
                <span>Modo Lote (Vários Links)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Cole vários links da Shopee (1 por linha) para gerar em sequência
              </p>
            </div>
          </div>

          {items.length > 0 && !isProcessing && (
            <button
              type="button"
              onClick={clearBatch}
              className="text-xs font-bold text-slate-500 hover:text-red-600 flex items-center gap-1 p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              <span>Limpar</span>
            </button>
          )}
        </div>

        {/* Textarea for Multi-links */}
        <div>
          <textarea
            rows={5}
            value={rawText}
            onChange={(e) => parseLinks(e.target.value)}
            disabled={isProcessing}
            placeholder="Cole os links da Shopee aqui (1 link por linha)...&#10;https://shopee.com.br/product/...&#10;https://s.shopee.com.br/...&#10;https://shopee.com.br/product/..."
            className="w-full rounded-2xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 p-4 text-xs font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500 outline-none resize-y"
          />
        </div>

        {/* Live Link Validation Counter Badge */}
        {totalCount > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3">
              <span className="text-slate-700 dark:text-slate-300">
                Total: <strong>{totalCount}</strong>
              </span>
              <span className="text-green-700 dark:text-green-400 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <strong>{totalValid}</strong> válidos
              </span>
              {invalidCount > 0 && (
                <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" />
                  <strong>{invalidCount}</strong> inválidos
                </span>
              )}
            </div>

            {completedItems.length > 0 && (
              <span className="text-orange-600 dark:text-orange-400 font-extrabold">
                {completedItems.length} prontos
              </span>
            )}
          </div>
        )}

        {/* Progress Bar when Processing */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-black text-orange-600 dark:text-orange-400">
              <span>Processando fila em segundo plano...</span>
              <span>{processedCount} de {totalValid}</span>
            </div>
            <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-600 to-amber-500 transition-all duration-300 rounded-full"
                style={{ width: `${totalValid > 0 ? (processedCount / totalValid) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Start / Stop Action Buttons */}
        <div className="flex gap-2.5">
          {!isProcessing ? (
            <button
              type="button"
              onClick={() => startBatch(2)}
              disabled={totalValid === 0}
              className="flex-1 py-4 px-6 rounded-2xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 disabled:opacity-50 text-white font-black text-sm shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 uppercase tracking-wider"
            >
              <Flame className="w-4 h-4 fill-white stroke-[2.5]" />
              <span>
                {totalValid > 0
                  ? `GERAR ${totalValid} OFERTAS EM LOTE`
                  : 'Cole links válidos acima'}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopBatch}
              className="flex-1 py-4 px-6 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <span>Parar Processamento</span>
            </button>
          )}

          {completedItems.length > 1 && (
            <button
              type="button"
              onClick={handleCopyAllOffers}
              className={`px-5 rounded-2xl font-bold text-xs flex items-center gap-1.5 border transition-all cursor-pointer ${
                copiedAll
                  ? 'bg-green-600 text-white border-green-600 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-300 dark:border-slate-700 hover:bg-slate-200'
              }`}
            >
              {copiedAll ? <Check className="w-4 h-4 text-white stroke-[3]" /> : <Copy className="w-4 h-4" />}
              <span>{copiedAll ? 'Todas Copiadas!' : 'Copiar Todas'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Generated Batch Offer Cards */}
      {items.length > 0 && (
        <div className="space-y-6">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 px-1">
            Resultados do Lote ({completedItems.length} concluídos)
          </h3>

          <div className="space-y-6">
            {items.map((item, idx) => {
              if (item.status === 'completed' && item.offer) {
                return (
                  <div key={item.id} className="relative">
                    <div className="absolute -top-3 left-4 z-10 bg-slate-900 text-white text-[10px] font-black px-3 py-0.5 rounded-full shadow-md">
                      OFERTA {idx + 1}
                    </div>
                    <OfferCard
                      offer={item.offer}
                      onUpdateText={(newText) => {
                        // local text update
                      }}
                      onRewrite={() => {}}
                      onUndo={() => {}}
                      canUndo={false}
                      onSelectImage={() => {}}
                      onReset={() => {}}
                    />
                  </div>
                );
              }

              // Loading or Error card
              return (
                <div
                  key={item.id}
                  className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 flex items-center justify-between gap-3 text-xs shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {item.status === 'resolving' || item.status === 'generating' ? (
                      <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin shrink-0" />
                    ) : item.status === 'error' ? (
                      <AlertCircle className="w-6 h-6 text-red-500 shrink-0" />
                    ) : (
                      <Clock className="w-6 h-6 text-slate-400 shrink-0" />
                    )}

                    <div className="min-w-0">
                      <div className="font-mono text-[11px] truncate text-slate-700 dark:text-slate-300 font-medium">
                        {item.url}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5 font-medium">
                        {item.status === 'resolving'
                          ? 'Buscando dados...'
                          : item.status === 'generating'
                          ? 'Gerando redação...'
                          : item.status === 'error'
                          ? item.error || 'Erro'
                          : 'Na fila'}
                      </div>
                    </div>
                  </div>

                  <span className="shrink-0 text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                    Item {idx + 1}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

