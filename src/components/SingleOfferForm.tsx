/**
 * Single Offer Link Input Form Component - Dark Mode Only
 * No mock or demo links. Clean and focused on real Shopee generation.
 */
import React, { useState } from 'react';
import {
  Link as LinkIcon,
  Clipboard,
  X,
  Layers,
  Edit3,
  CheckCircle2,
  ShieldCheck,
  Flame,
  ChevronDown,
  ChevronUp,
  Tag,
} from 'lucide-react';
import { validateShopeeUrl } from '../utils/urlValidator';

interface SingleOfferFormProps {
  onGenerate: (url: string, customAffiliate?: string) => void;
  onOpenManual: (initialUrl?: string) => void;
  onSwitchToBatch: () => void;
  isLoading: boolean;
  loadingMessage?: string;
}

export const SingleOfferForm: React.FC<SingleOfferFormProps> = ({
  onGenerate,
  onOpenManual,
  onSwitchToBatch,
  isLoading,
  loadingMessage = 'Processando...',
}) => {
  const [url, setUrl] = useState('');
  const [customAffiliate, setCustomAffiliate] = useState('');
  const [showCustomAffiliate, setShowCustomAffiliate] = useState(false);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setUrl(text.trim());
        setErrorFeedback(null);
      }
    } catch {
      setPasteNotice('Toque e segure no campo para colar.');
      setTimeout(() => setPasteNotice(null), 3000);
    }
  };

  const handleInputChange = (val: string) => {
    setUrl(val);
    if (val.trim()) {
      const validation = validateShopeeUrl(val.trim());
      setErrorFeedback(validation.isValid ? null : validation.error || null);
    } else {
      setErrorFeedback(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || isLoading) return;

    const validation = validateShopeeUrl(url.trim());
    if (!validation.isValid) {
      setErrorFeedback(validation.error || 'Link inválido.');
      return;
    }

    onGenerate(url.trim(), showCustomAffiliate && customAffiliate.trim() ? customAffiliate.trim() : undefined);
  };

  return (
    <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-sm p-5 sm:p-7 space-y-5">
      {/* Header with Title & Batch Switcher */}
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-xs sm:text-sm font-black text-slate-300 uppercase tracking-wider">
            Cole o link do produto Shopee
          </label>
          <p className="text-xs text-slate-400 mt-0.5">
            Links normais ou de afiliado (ex: shopee.com.br ou s.shopee.com.br)
          </p>
        </div>

        <button
          type="button"
          onClick={onSwitchToBatch}
          className="text-xs font-bold text-orange-400 hover:text-orange-300 bg-orange-950/50 hover:bg-orange-900/60 px-3.5 py-2 rounded-2xl transition-all flex items-center gap-1.5 border border-orange-800/80 active:scale-95 cursor-pointer shadow-xs"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Modo Lote</span>
        </button>
      </div>

      {/* Main Input Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              <LinkIcon className="w-4 h-4" />
            </div>

            <input
              type="text"
              value={url}
              onChange={(e) => handleInputChange(e.target.value)}
              disabled={isLoading}
              placeholder="https://shopee.com.br/..."
              className="w-full bg-slate-800/90 border border-slate-700 rounded-2xl pl-11 pr-24 py-4 text-slate-100 focus:ring-2 focus:ring-orange-500 placeholder:text-slate-400 font-medium text-sm transition-all outline-none"
            />

            {/* In-field clear & paste buttons */}
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {url && (
                <button
                  type="button"
                  onClick={() => {
                    setUrl('');
                    setErrorFeedback(null);
                  }}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
                  title="Limpar link"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                onClick={handlePaste}
                className="px-2.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-bold flex items-center gap-1 shadow-xs active:scale-95 transition-all border border-slate-600 cursor-pointer"
                title="Colar da área de transferência"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Colar</span>
              </button>
            </div>
          </div>

          {/* Big Orange Generate Button */}
          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="bg-orange-600 hover:bg-orange-500 active:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black px-7 py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-orange-500/20 active:scale-95 cursor-pointer text-sm sm:text-base shrink-0 uppercase tracking-wider"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span className="whitespace-nowrap font-bold text-xs sm:text-sm">
                  {loadingMessage || 'Preparando oferta...'}
                </span>
              </>
            ) : (
              <>
                <Flame className="w-5 h-5 fill-white stroke-[2.5]" />
                <span className="whitespace-nowrap">🔥 GERAR OFERTA</span>
              </>
            )}
          </button>
        </div>

        {/* Paste Notice Toast */}
        {pasteNotice && (
          <p className="text-xs font-semibold text-amber-400 px-1">
            ℹ️ {pasteNotice}
          </p>
        )}

        {/* Error Feedback */}
        {errorFeedback && (
          <p className="text-xs font-semibold text-red-400 px-1">
            ⚠️ {errorFeedback}
          </p>
        )}

        {/* Optional Manual Affiliate Link Accordion */}
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setShowCustomAffiliate(!showCustomAffiliate)}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 font-bold cursor-pointer transition-colors"
          >
            <Tag className="w-3.5 h-3.5 text-orange-400" />
            <span>Já tenho um link de afiliado específico</span>
            {showCustomAffiliate ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {showCustomAffiliate && (
            <div className="mt-2 p-3 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-1.5 animate-in fade-in">
              <label className="block text-[11px] font-bold text-slate-300">
                Seu link de afiliado para este produto:
              </label>
              <input
                type="text"
                value={customAffiliate}
                onChange={(e) => setCustomAffiliate(e.target.value)}
                placeholder="https://s.shopee.com.br/..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:ring-2 focus:ring-orange-500 font-mono outline-none"
              />
              <p className="text-[10px] text-slate-400">
                A oferta utilizará exatamente este link para a chamada de compra.
              </p>
            </div>
          )}
        </div>

        {/* Feature Indicators & Manual Mode */}
        <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onOpenManual(url)}
            className="text-orange-400 hover:text-orange-300 font-bold text-xs sm:text-sm flex items-center gap-1.5 hover:underline cursor-pointer"
          >
            <Edit3 className="w-4 h-4" />
            <span>Preenchimento Manual Assistido</span>
          </button>

          <div className="flex items-center gap-3 text-xs font-bold text-slate-400">
            <span className="flex items-center gap-1 text-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              <span>Link Seguro</span>
            </span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              <span>Detector Ativo</span>
            </span>
          </div>
        </div>
      </form>
    </div>
  );
};

