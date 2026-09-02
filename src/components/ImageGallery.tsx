/**
 * Horizontal Real Image Gallery Component - Vibrant Palette Theme
 */
import React, { useState } from 'react';
import { Check, Download, ExternalLink, Image as ImageIcon } from 'lucide-react';
import { apiClient } from '../services/apiClient';

interface ImageGalleryProps {
  images: string[];
  selectedIndex: number;
  onSelectImage: (index: number) => void;
  productTitle: string;
}

export const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  selectedIndex,
  onSelectImage,
  productTitle,
}) => {
  const [downloading, setDownloading] = useState(false);

  if (!images || images.length === 0) {
    return (
      <div className="w-full bg-slate-100 dark:bg-slate-800/60 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-700">
        <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
        <span className="text-xs font-medium">Nenhuma foto direta do anúncio disponível</span>
      </div>
    );
  }

  const selectedImage = images[selectedIndex] || images[0];

  const handleDownload = async (imgUrl: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setDownloading(true);
      const file = await apiClient.fetchImageFile(imgUrl, `shopee-${Date.now()}.jpg`);
      if (file) {
        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = `oferta-${productTitle.slice(0, 20).replace(/[^a-z0-9]/gi, '_')}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Fallback open in new tab
        window.open(imgUrl, '_blank', 'noopener,noreferrer');
      }
    } catch {
      window.open(imgUrl, '_blank', 'noopener,noreferrer');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Featured Preview Box */}
      <div className="relative aspect-square max-h-72 w-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex items-center justify-center group shadow-xs">
        <img
          src={selectedImage}
          alt={productTitle}
          className="w-full h-full object-contain p-2"
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={(e) => {
            // Graceful fallback for broken image links
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80';
          }}
        />

        {/* Badges and Quick Tools */}
        <div className="absolute top-2.5 left-2.5 bg-slate-900/80 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
          <Check className="w-3.5 h-3.5 text-green-400" />
          Imagem {selectedIndex + 1} de {images.length}
        </div>

        <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5 opacity-90 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={(e) => handleDownload(selectedImage, e)}
            disabled={downloading}
            className="bg-white/95 dark:bg-slate-800/95 hover:bg-white text-slate-700 dark:text-slate-200 p-2 rounded-xl text-xs font-bold shadow-md backdrop-blur-xs flex items-center gap-1 border border-slate-200 dark:border-slate-700 active:scale-95 transition-transform cursor-pointer"
            title="Baixar imagem"
          >
            <Download className="w-4 h-4" />
            <span className="text-[11px] font-bold hidden sm:inline">Baixar</span>
          </button>
          <a
            href={selectedImage}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white/95 dark:bg-slate-800/95 hover:bg-white text-slate-700 dark:text-slate-200 p-2 rounded-xl text-xs font-bold shadow-md backdrop-blur-xs flex items-center gap-1 border border-slate-200 dark:border-slate-700 active:scale-95 transition-transform"
            title="Abrir imagem original"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Horizontal Thumbnails Carousel */}
      {images.length > 1 && (
        <div>
          <div className="flex items-center justify-between mb-1.5 px-0.5">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              Escolher foto do anúncio:
            </span>
            <span className="text-[11px] text-slate-400">
              Toque para selecionar
            </span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-300">
            {images.map((img, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onSelectImage(idx)}
                  className={`relative flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all p-1 bg-white dark:bg-slate-900 cursor-pointer ${
                    isSelected
                      ? 'border-orange-600 scale-105 shadow-md shadow-orange-500/20 ring-2 ring-orange-500/30'
                      : 'border-slate-200 dark:border-slate-800 opacity-70 hover:opacity-100'
                  }`}
                  aria-label={`Selecionar foto ${idx + 1}`}
                >
                  <img
                    src={img}
                    alt={`Opção ${idx + 1}`}
                    className="w-full h-full object-contain"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  {isSelected && (
                    <div className="absolute top-1 right-1 bg-orange-600 text-white rounded-full p-0.5 shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

