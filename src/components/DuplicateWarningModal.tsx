/**
 * Duplicate Offer Warning Modal - Vibrant Palette Theme
 */
import React from 'react';
import { AlertTriangle, RotateCcw, X, Eye } from 'lucide-react';
import { HistoryItem } from '../types';
import { formatDateBR, formatBRL } from '../utils/formatters';

interface DuplicateWarningModalProps {
  isOpen: boolean;
  duplicateItem: HistoryItem | null;
  onProceedAnyway: () => void;
  onViewPrevious: () => void;
  onCancel: () => void;
}

export const DuplicateWarningModal: React.FC<DuplicateWarningModalProps> = ({
  isOpen,
  duplicateItem,
  onProceedAnyway,
  onViewPrevious,
  onCancel,
}) => {
  if (!isOpen || !duplicateItem) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="bg-amber-500 text-white p-5 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-6 h-6 stroke-[2.5]" />
            <h3 className="font-black text-base">Produto Repetido Detectado</h3>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-xl hover:bg-amber-600/50 text-white cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
            Você já preparou uma divulgação para este mesmo anúncio anteriormente:
          </p>

          {/* Product Preview Snippet */}
          <div className="bg-slate-50 dark:bg-slate-950/70 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800 flex items-center gap-3">
            {duplicateItem.image && (
              <img
                src={duplicateItem.image}
                alt=""
                className="w-16 h-16 rounded-xl object-contain bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shrink-0 p-1"
              />
            )}
            <div className="min-w-0 flex-1">
              <h4 className="font-black text-xs text-slate-900 dark:text-slate-100 truncate">
                {duplicateItem.title}
              </h4>
              {duplicateItem.currentPrice && (
                <div className="text-xs font-black text-orange-600 dark:text-orange-400 mt-0.5">
                  {formatBRL(duplicateItem.currentPrice)}
                </div>
              )}
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                Última vez:{' '}
                <strong className="font-bold text-slate-700 dark:text-slate-300">
                  {formatDateBR(duplicateItem.lastProcessedAt)}
                </strong>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2.5 pt-2">
            <button
              type="button"
              onClick={onProceedAnyway}
              className="w-full py-3.5 px-4 rounded-2xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white font-black text-xs shadow-md shadow-orange-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer uppercase tracking-wider"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Gerar Novamente (Nova Redação)</span>
            </button>

            <button
              type="button"
              onClick={onViewPrevious}
              className="w-full py-3 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>Usar Oferta Salva Anteriormente</span>
            </button>

            <button
              type="button"
              onClick={onCancel}
              className="w-full py-2 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

