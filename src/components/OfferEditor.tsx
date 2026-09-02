/**
 * Offer Text Editor & AI Transformation Controls - Vibrant Palette Theme
 */
import React, { useState } from 'react';
import {
  Sparkles,
  Scissors,
  Flame,
  Smile,
  Undo2,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';

interface OfferEditorProps {
  text: string;
  onChangeText: (newText: string) => void;
  onRewrite: (action: 'regenerate' | 'shorten' | 'catchy' | 'less_emojis') => void;
  onUndo: () => void;
  canUndo: boolean;
  isRewriting?: boolean;
}

export const OfferEditor: React.FC<OfferEditorProps> = ({
  text,
  onChangeText,
  onRewrite,
  onUndo,
  canUndo,
  isRewriting = false,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          Texto da Mensagem
        </label>

        <div className="flex items-center gap-2">
          {canUndo && (
            <button
              type="button"
              onClick={onUndo}
              disabled={isRewriting}
              className="text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 transition-colors cursor-pointer"
              title="Desfazer última alteração de texto"
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Desfazer</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            className={`text-xs font-bold flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
              copied
                ? 'bg-green-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar texto</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Textarea */}
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => onChangeText(e.target.value)}
          rows={9}
          className="w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 p-4 text-xs sm:text-sm leading-relaxed text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-shadow outline-none resize-y font-mono"
          placeholder="Texto da oferta..."
          disabled={isRewriting}
        />

        {isRewriting && (
          <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs rounded-2xl flex items-center justify-center gap-2 text-orange-600 dark:text-orange-400 font-bold text-sm">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Ajustando redação com IA...</span>
          </div>
        )}
      </div>

      {/* Quick AI Action Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => onRewrite('regenerate')}
          disabled={isRewriting}
          className="whitespace-nowrap text-xs font-bold bg-orange-50 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-900/60 px-3.5 py-2 rounded-full hover:bg-orange-100 active:scale-95 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-orange-600 fill-orange-600/20" />
          <span>Gerar novamente</span>
        </button>

        <button
          type="button"
          onClick={() => onRewrite('catchy')}
          disabled={isRewriting}
          className="whitespace-nowrap text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
          <span>Mais chamativo</span>
        </button>

        <button
          type="button"
          onClick={() => onRewrite('shorten')}
          disabled={isRewriting}
          className="whitespace-nowrap text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Scissors className="w-3.5 h-3.5" />
          <span>Encurtar</span>
        </button>

        <button
          type="button"
          onClick={() => onRewrite('less_emojis')}
          disabled={isRewriting}
          className="whitespace-nowrap text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-3.5 py-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Smile className="w-3.5 h-3.5" />
          <span>Menos emojis</span>
        </button>
      </div>
    </div>
  );
};

