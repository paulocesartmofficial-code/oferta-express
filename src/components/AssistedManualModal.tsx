/**
 * Assisted Manual Mode Modal - Vibrant Palette Theme
 * Allows user to provide factual product data manually when automatic integration is unavailable.
 */
import React, { useState } from 'react';
import { X, Sparkles, Plus, Trash2, Tag, Info, Flame } from 'lucide-react';
import { ProductData } from '../types';
import { calculateDiscount, formatBRL } from '../utils/formatters';

interface AssistedManualModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (product: ProductData, customAffiliate: string) => void;
  initialUrl?: string;
}

export const AssistedManualModal: React.FC<AssistedManualModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialUrl = '',
}) => {
  const [title, setTitle] = useState('');
  const [currentPrice, setCurrentPrice] = useState<string>('');
  const [originalPrice, setOriginalPrice] = useState<string>('');
  const [coupon, setCoupon] = useState('');
  const [affiliateLink, setAffiliateLink] = useState(initialUrl);
  const [images, setImages] = useState<string[]>([
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80',
  ]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [sellerName, setSellerName] = useState('');

  if (!isOpen) return null;

  const curPriceNum = currentPrice ? parseFloat(currentPrice.replace(',', '.')) : undefined;
  const origPriceNum = originalPrice ? parseFloat(originalPrice.replace(',', '.')) : undefined;
  const calculatedDiscount = calculateDiscount(curPriceNum, origPriceNum);

  const handleAddImage = () => {
    if (newImageUrl.trim() && !images.includes(newImageUrl.trim())) {
      setImages([...images, newImageUrl.trim()]);
      setNewImageUrl('');
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, idx) => idx !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const product: ProductData = {
      source: 'manual',
      canonicalUrl: affiliateLink.trim() || 'https://shopee.com.br',
      title: title.trim(),
      currentPrice: curPriceNum,
      originalPrice: origPriceNum,
      discountPercentage: calculatedDiscount,
      currency: 'BRL',
      images: images.length > 0 ? images : ['https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80'],
      sellerName: sellerName.trim() || undefined,
      couponCode: coupon.trim() || undefined,
      fetchedAt: new Date().toISOString(),
    };

    onSubmit(product, affiliateLink.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-auto animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-slate-50 dark:bg-slate-950 px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400 flex items-center justify-center">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base">
                Modo Manual Assistido
              </h3>
              <p className="text-xs text-slate-500">
                Preencha apenas os dados reais que você possuir
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 dark:border-amber-900/60 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-200 font-medium">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <span>
              A IA utilizará estritamente estes dados para redigir a oferta. Campos em branco não serão inventados.
            </span>
          </div>

          {/* Nome do Produto */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Nome do Produto <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Fone de Ouvido Bluetooth Sem Fio TWS"
              className="w-full rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>

          {/* Preços */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Preço Atual (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={currentPrice}
                onChange={(e) => setCurrentPrice(e.target.value)}
                placeholder="Ex: 49.90"
                className="w-full rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Preço Anterior (Opcional)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(e.target.value)}
                placeholder="Ex: 99.90"
                className="w-full rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
          </div>

          {calculatedDiscount && (
            <div className="bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-300 text-xs font-bold px-3.5 py-2 rounded-xl border border-green-200 dark:border-green-900">
              🏷️ Desconto calculado matematicamente: {calculatedDiscount}% OFF
            </div>
          )}

          {/* Link Afiliado */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Link de Afiliado / Compra <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={affiliateLink}
              onChange={(e) => setAffiliateLink(e.target.value)}
              placeholder="https://s.shopee.com.br/..."
              className="w-full rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 outline-none font-mono"
            />
          </div>

          {/* Cupom & Loja */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Cupom (Opcional)
              </label>
              <input
                type="text"
                value={coupon}
                onChange={(e) => setCoupon(e.target.value)}
                placeholder="Ex: SHOPEE10"
                className="w-full rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Nome da Loja (Opcional)
              </label>
              <input
                type="text"
                value={sellerName}
                onChange={(e) => setSellerName(e.target.value)}
                placeholder="Ex: Loja Oficial"
                className="w-full rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 text-xs sm:text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
          </div>

          {/* Imagens */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
              Imagens do Produto (URLs)
            </label>
            <div className="flex gap-2 mb-2.5">
              <input
                type="url"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="https://..."
                className="flex-1 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5 text-xs text-slate-900 dark:text-slate-100 outline-none"
              />
              <button
                type="button"
                onClick={handleAddImage}
                className="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-4 py-2.5 rounded-2xl text-xs font-bold hover:bg-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Adicionar</span>
              </button>
            </div>

            {images.length > 0 && (
              <div className="flex items-center gap-2.5 overflow-x-auto p-1">
                {images.map((img, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0 group">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute inset-0 bg-red-600/85 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3.5 rounded-2xl border border-slate-300 dark:border-slate-700 font-bold text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!title.trim() || !affiliateLink.trim()}
              className="flex-2 py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-700 active:bg-orange-800 disabled:opacity-50 text-white font-black text-xs shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 uppercase tracking-wider"
            >
              <Flame className="w-4 h-4 fill-white stroke-[2.5]" />
              <span>Gerar Oferta com estes dados</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

