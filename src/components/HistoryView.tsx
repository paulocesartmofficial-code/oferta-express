/**
 * History & Saved Offers View Component - Vibrant Palette Theme
 */
import React, { useState, useEffect } from 'react';
import {
  History,
  Star,
  Search,
  Copy,
  Check,
  Trash2,
  Share2,
  ExternalLink,
  Edit,
  Tag,
  Clock,
  Sparkles,
} from 'lucide-react';
import { HistoryItem, GeneratedOffer } from '../types';
import { apiClient } from '../services/apiClient';
import { formatBRL, formatDateBR } from '../utils/formatters';

interface HistoryViewProps {
  onLoadOffer: (offer: GeneratedOffer) => void;
  favoritesOnly?: boolean;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  onLoadOffer,
  favoritesOnly = false,
}) => {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [range, setRange] = useState<'today' | '7days' | '30days' | 'all'>('all');
  const [onlyFavs, setOnlyFavs] = useState(favoritesOnly);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    setOnlyFavs(favoritesOnly);
  }, [favoritesOnly]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getHistory({
        range,
        favoritesOnly: onlyFavs,
        search: search.trim() || undefined,
      });
      setItems(data);
    } catch (err) {
      console.warn('Error loading history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [range, onlyFavs, search]);

  const handleToggleFavorite = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const isFav = await apiClient.toggleFavorite(id);
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, isFavorite: isFav } : item))
      );
    } catch (err) {
      console.warn('Toggle favorite failed:', err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await apiClient.deleteHistory(id);
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.warn('Delete history item failed:', err);
    }
  };

  const handleCopy = async (item: HistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(item.generatedMessage);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleLoadItem = (item: HistoryItem) => {
    const offer: GeneratedOffer = {
      headline: '🔥 Oferta Carregada do Histórico',
      body: item.title,
      cta: `🛒 Comprar: ${item.affiliateUrl}`,
      fullMessage: item.generatedMessage,
      selectedImageIndex: 0,
      product: {
        source: 'shopee_resolver',
        productId: item.productId,
        canonicalUrl: item.canonicalUrl,
        title: item.title,
        currentPrice: item.currentPrice,
        originalPrice: item.originalPrice,
        discountPercentage: item.discountPercentage,
        currency: 'BRL',
        images: item.images && item.images.length > 0 ? item.images : [item.image || ''],
        fetchedAt: item.lastProcessedAt,
      },
      affiliateLink: item.affiliateUrl,
      generatedAt: item.lastProcessedAt,
      version: 1,
      historyText: [item.generatedMessage],
    };

    onLoadOffer(offer);
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Header */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            {onlyFavs ? (
              <>
                <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                <span>Ofertas Favoritas</span>
              </>
            ) : (
              <>
                <History className="w-5 h-5 text-orange-600" />
                <span>Histórico de Divulgações</span>
              </>
            )}
          </h2>

          <button
            type="button"
            onClick={() => setOnlyFavs(!onlyFavs)}
            className={`text-xs font-bold px-3.5 py-1.5 rounded-2xl border transition-all flex items-center gap-1.5 cursor-pointer ${
              onlyFavs
                ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-800 dark:text-amber-300 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${onlyFavs ? 'fill-amber-500 text-amber-500' : ''}`} />
            <span>Favoritos</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por título ou link..."
            className="w-full rounded-2xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 pl-11 pr-4 py-3 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500 outline-none"
          />
        </div>

        {/* Range filter buttons */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'today', label: 'Hoje' },
            { id: '7days', label: 'Últimos 7 dias' },
            { id: '30days', label: '30 dias' },
          ].map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id as any)}
              className={`px-3.5 py-1.5 rounded-full transition-all whitespace-nowrap cursor-pointer ${
                range === r.id
                  ? 'bg-orange-600 text-white font-black shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Items List */}
      {loading ? (
        <div className="py-12 text-center text-slate-400">
          <div className="w-7 h-7 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <span className="text-xs font-medium">Carregando histórico...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 text-center text-slate-400 space-y-2 shadow-sm">
          <History className="w-10 h-10 mx-auto opacity-40 text-slate-400" />
          <p className="font-extrabold text-sm text-slate-700 dark:text-slate-300">
            Nenhuma oferta encontrada
          </p>
          <p className="text-xs text-slate-500">
            {onlyFavs
              ? 'Marque uma oferta como favorita tocando na estrela para vê-la aqui.'
              : 'Gere novas ofertas na aba Início e elas ficarão salvas automaticamente.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              onClick={() => handleLoadItem(item)}
              className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs hover:border-orange-400 dark:hover:border-orange-500 transition-all cursor-pointer group"
            >
              <div className="flex items-start gap-3.5">
                {/* Thumbnail */}
                {item.image && (
                  <img
                    src={item.image}
                    alt=""
                    className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-contain bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shrink-0 p-1"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-slate-100 line-clamp-2 leading-snug">
                      {item.title}
                    </h3>

                    <button
                      type="button"
                      onClick={(e) => handleToggleFavorite(item.id, e)}
                      className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 cursor-pointer"
                      title="Favoritar"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          item.isFavorite
                            ? 'fill-amber-400 text-amber-400'
                            : 'text-slate-400 hover:text-amber-400'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Price and Date */}
                  <div className="flex items-center gap-2 mt-1">
                    {item.currentPrice && (
                      <span className="font-black text-sm sm:text-base text-orange-600 dark:text-orange-400">
                        {formatBRL(item.currentPrice)}
                      </span>
                    )}
                    {item.discountPercentage && (
                      <span className="bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 text-[10px] font-black px-2 py-0.5 rounded-full">
                        {item.discountPercentage}% OFF
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2.5">
                    <span className="flex items-center gap-1 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      {formatDateBR(item.lastProcessedAt)}
                    </span>

                    {/* Quick Item Actions */}
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => handleCopy(item, e)}
                        className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                          copiedId === item.id
                            ? 'bg-green-600 text-white shadow-xs'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                        title="Copiar mensagem"
                      >
                        {copiedId === item.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span className="text-[10px] hidden sm:inline">
                          {copiedId === item.id ? 'Copiado' : 'Copiar'}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleDelete(item.id, e)}
                        className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 cursor-pointer transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

