/**
 * Complete Product Offer Card Component - Vibrant Palette Theme
 */
import React, { useState } from 'react';
import {
  Share2,
  Copy,
  Check,
  ExternalLink,
  MessageCircle,
  Tag,
  Star,
  ShoppingBag,
  Sparkles,
  RotateCcw,
  CheckCircle2,
  ShieldCheck,
  Flame,
} from 'lucide-react';
import { GeneratedOffer } from '../types';
import { ImageGallery } from './ImageGallery';
import { OfferEditor } from './OfferEditor';
import { WhatsAppPreview } from './WhatsAppPreview';
import { formatBRL, formatSoldCount } from '../utils/formatters';
import { apiClient } from '../services/apiClient';

interface OfferCardProps {
  offer: GeneratedOffer;
  onUpdateText: (newText: string) => void;
  onRewrite: (action: 'regenerate' | 'shorten' | 'catchy' | 'less_emojis') => void;
  onUndo: () => void;
  canUndo: boolean;
  onSelectImage: (index: number) => void;
  onReset: () => void;
  isRewriting?: boolean;
}

export const OfferCard: React.FC<OfferCardProps> = ({
  offer,
  onUpdateText,
  onRewrite,
  onUndo,
  canUndo,
  onSelectImage,
  onReset,
  isRewriting = false,
}) => {
  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const product = offer.product;
  const currentImage = product.images[offer.selectedImageIndex] || product.images[0];

  // Copy only the affiliate link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(offer.affiliateLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Copy full offer text
  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(offer.fullMessage);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    } catch {
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 2000);
    }
  };

  // Open direct WhatsApp chat with encoded text
  const handleOpenWhatsApp = () => {
    const encoded = encodeURIComponent(offer.fullMessage);
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  // Web Share API with image + text or text fallback
  const handleNativeShare = async () => {
    setShareStatus('Preparando compartilhamento...');

    if (navigator.share) {
      try {
        let imageFile: File | null = null;
        if (currentImage) {
          imageFile = await apiClient.fetchImageFile(currentImage, 'oferta-shopee.jpg');
        }

        // Test if browser supports sharing files
        if (imageFile && navigator.canShare && navigator.canShare({ files: [imageFile] })) {
          await navigator.share({
            title: product.title,
            text: offer.fullMessage,
            files: [imageFile],
          });
          setShareStatus('Compartilhado com sucesso!');
          setTimeout(() => setShareStatus(null), 2500);
          return;
        }

        // Fallback to text + URL sharing
        await navigator.share({
          title: product.title,
          text: offer.fullMessage,
          url: offer.affiliateLink,
        });
        setShareStatus('Compartilhado com sucesso!');
        setTimeout(() => setShareStatus(null), 2500);
        return;
      } catch (err: unknown) {
        // User cancelled or browser rejected
        if (err instanceof Error && err.name === 'AbortError') {
          setShareStatus(null);
          return;
        }
      }
    }

    // Fallback: copy text and open WhatsApp
    await handleCopyAll();
    handleOpenWhatsApp();
    setShareStatus('Texto copiado! Abrindo WhatsApp...');
    setTimeout(() => setShareStatus(null), 3000);
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-300">
      {/* Top Banner Status */}
      <div className="bg-orange-600 text-white px-5 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider">
          <Flame className="w-4 h-4 fill-white stroke-[2.5]" />
          <span>Oferta Pronta para Publicar</span>
        </div>

        <button
          type="button"
          onClick={onReset}
          className="text-xs font-bold bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded-full flex items-center gap-1.5 transition-colors cursor-pointer active:scale-95"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Nova Oferta</span>
        </button>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* 1. Real Image Gallery */}
        <ImageGallery
          images={product.images}
          selectedIndex={offer.selectedImageIndex}
          onSelectImage={onSelectImage}
          productTitle={product.title}
        />

        {/* 2. Confirmed Factual Product Card */}
        <div className="bg-slate-50 dark:bg-slate-950/70 rounded-3xl p-5 border border-slate-200 dark:border-slate-800/80 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-extrabold text-slate-900 dark:text-slate-100 text-base sm:text-lg leading-snug line-clamp-2">
              {product.title}
            </h2>
            {product.discountPercentage && product.discountPercentage > 0 && (
              <span className="shrink-0 bg-red-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-xs">
                {product.discountPercentage}% OFF
              </span>
            )}
          </div>

          {/* Pricing Row */}
          <div className="flex flex-wrap items-baseline gap-3 pt-0.5">
            {product.currentPrice && product.currentPrice > 0 ? (
              <div className="text-2xl sm:text-3xl font-black text-orange-600 dark:text-orange-400 tracking-tight">
                {formatBRL(product.currentPrice)}
              </div>
            ) : null}

            {product.originalPrice && product.originalPrice > (product.currentPrice || 0) && (
              <div className="text-sm font-semibold text-slate-400 dark:text-slate-500 line-through">
                De: {formatBRL(product.originalPrice)}
              </div>
            )}
          </div>

          {/* Metadata Badges */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-600 dark:text-slate-300">
            {product.rating && (
              <span className="inline-flex items-center gap-1 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 px-2.5 py-1 rounded-full font-bold border border-amber-200/60 dark:border-amber-900/40">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                {product.rating.toFixed(1)}
              </span>
            )}

            {product.soldCount && (
              <span className="inline-flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800 px-2.5 py-1 rounded-full font-bold text-slate-700 dark:text-slate-300">
                <ShoppingBag className="w-3.5 h-3.5" />
                {formatSoldCount(product.soldCount)}
              </span>
            )}

            {product.sellerName && (
              <span className="truncate max-w-[180px] text-slate-500 dark:text-slate-400 font-medium">
                Loja: <strong className="font-bold text-slate-700 dark:text-slate-200">{product.sellerName}</strong>
              </span>
            )}
          </div>

          {/* Verified Affiliate Link Row */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 truncate">
              <ShieldCheck className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
              <span className="truncate font-mono text-[11px]">{offer.affiliateLink}</span>
            </div>
            <button
              type="button"
              onClick={handleCopyLink}
              className="shrink-0 text-xs font-bold text-orange-600 dark:text-orange-400 hover:text-orange-700 p-1.5 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-950/40 flex items-center gap-1 transition-colors cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copiado' : 'Copiar link'}</span>
            </button>
          </div>
        </div>

        {/* 3. View Switcher (Editor vs WhatsApp Preview) */}
        <div className="flex rounded-2xl bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200/80 dark:border-slate-700/80">
          <button
            type="button"
            onClick={() => setViewMode('editor')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
              viewMode === 'editor'
                ? 'bg-white dark:bg-slate-900 text-orange-600 dark:text-orange-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            ✏️ Editor do Texto
          </button>
          <button
            type="button"
            onClick={() => setViewMode('preview')}
            className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
              viewMode === 'preview'
                ? 'bg-white dark:bg-slate-900 text-green-600 dark:text-green-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            📱 Prévia WhatsApp
          </button>
        </div>

        {/* View Contents */}
        {viewMode === 'editor' ? (
          <OfferEditor
            text={offer.fullMessage}
            onChangeText={onUpdateText}
            onRewrite={onRewrite}
            onUndo={onUndo}
            canUndo={canUndo}
            isRewriting={isRewriting}
          />
        ) : (
          <WhatsAppPreview
            message={offer.fullMessage}
            image={currentImage}
            affiliateUrl={offer.affiliateLink}
          />
        )}

        {/* 4. Primary Actions (Vibrant Green & Secondary Buttons) */}
        <div className="space-y-3 pt-2">
          {/* Main WhatsApp Share Button */}
          <button
            type="button"
            onClick={handleNativeShare}
            className="w-full bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-black text-sm sm:text-base py-4 px-6 rounded-2xl shadow-lg shadow-green-600/20 flex items-center justify-center gap-2.5 active:scale-95 transition-all cursor-pointer uppercase tracking-wider"
          >
            <Share2 className="w-5 h-5 fill-white/20 stroke-[2.5]" />
            <span>Compartilhar no WhatsApp</span>
          </button>

          {shareStatus && (
            <p className="text-center text-xs font-bold text-green-600 dark:text-green-400 animate-in fade-in">
              {shareStatus}
            </p>
          )}

          {/* Secondary Quick Action Row */}
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleCopyAll}
              className={`py-3.5 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 border transition-all cursor-pointer ${
                copiedAll
                  ? 'bg-green-50 border-green-300 text-green-700 dark:bg-green-950/60 dark:border-green-800 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {copiedAll ? <Check className="w-4 h-4 text-green-600 stroke-[3]" /> : <Copy className="w-4 h-4" />}
              <span>{copiedAll ? 'Texto Copiado!' : 'Copiar Mensagem'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="py-3.5 px-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 bg-[#25D366]/15 text-[#128C7E] dark:text-[#25D366] border border-[#25D366]/30 hover:bg-[#25D366]/25 transition-all cursor-pointer"
            >
              <MessageCircle className="w-4 h-4" />
              <span>Abrir no WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

