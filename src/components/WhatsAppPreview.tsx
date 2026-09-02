/**
 * Realistic WhatsApp Message Preview Component - Vibrant Palette Theme
 */
import React from 'react';
import { MessageSquare, ExternalLink, Sparkles } from 'lucide-react';

interface WhatsAppPreviewProps {
  message: string;
  image?: string;
  affiliateUrl?: string;
  timeString?: string;
}

export const WhatsAppPreview: React.FC<WhatsAppPreviewProps> = ({
  message,
  image,
  affiliateUrl,
  timeString = '14:20',
}) => {
  // Format WhatsApp markdown syntax: *bold*, _italic_, ~strikethrough~
  const renderFormattedText = (text: string) => {
    if (!text) return null;

    const lines = text.split('\n');
    return lines.map((line, lineIdx) => {
      // Process bold: *text*
      // Process italic: _text_
      // Process strikethrough: ~text~
      // Process links: https://...
      const parts = line.split(/(https?:\/\/[^\s]+|\*[^*]+\*|_[^_]+_|~[^~]+~)/g);

      return (
        <div key={lineIdx} className={line.trim() === '' ? 'h-2.5' : 'min-h-[1.25rem]'}>
          {parts.map((part, partIdx) => {
            if (!part) return null;

            if (part.startsWith('http://') || part.startsWith('https://')) {
              return (
                <a
                  key={partIdx}
                  href={part}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 dark:text-sky-300 underline underline-offset-2 break-all font-medium hover:text-blue-700"
                >
                  {part}
                </a>
              );
            }

            if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
              return (
                <strong key={partIdx} className="font-extrabold text-slate-900 dark:text-slate-100">
                  {part.slice(1, -1)}
                </strong>
              );
            }

            if (part.startsWith('_') && part.endsWith('_') && part.length > 2) {
              return (
                <em key={partIdx} className="italic text-slate-700 dark:text-slate-300">
                  {part.slice(1, -1)}
                </em>
              );
            }

            if (part.startsWith('~') && part.endsWith('~') && part.length > 2) {
              return (
                <span key={partIdx} className="line-through text-red-500 font-medium">
                  {part.slice(1, -1)}
                </span>
              );
            }

            return <span key={partIdx}>{part}</span>;
          })}
        </div>
      );
    });
  };

  return (
    <div className="rounded-3xl bg-[#ECE5DD] dark:bg-[#0b141a] overflow-hidden border border-slate-300 dark:border-slate-800 shadow-md">
      {/* WhatsApp Header bar */}
      <div className="bg-[#075E54] dark:bg-[#1f2c34] px-4 py-2.5 flex items-center gap-3 shrink-0 text-white">
        <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-black text-xs shadow-xs">
          🔥
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white text-xs sm:text-sm font-bold leading-tight truncate">
            Meus Achadinhos Shopee
          </p>
          <p className="text-white/80 text-[10px] flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
            <span>online</span>
          </p>
        </div>
        <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">
          WhatsApp
        </span>
      </div>

      {/* Chat Area */}
      <div className="p-3.5 sm:p-4 bg-[#ECE5DD] dark:bg-[#0b141a] bg-opacity-95">
        {/* WhatsApp Message Bubble */}
        <div className="relative max-w-[95%] sm:max-w-md ml-auto bg-white dark:bg-[#1f2c34] text-slate-800 dark:text-slate-100 rounded-2xl rounded-tr-xs p-3 shadow-sm border-b-2 border-slate-300/60 dark:border-black/30 text-[13px] leading-relaxed select-text">
          {/* Product Image in Bubble */}
          {image && (
            <div className="mb-2.5 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-900/60 aspect-video max-h-52 flex items-center justify-center border border-slate-200 dark:border-slate-800">
              <img
                src={image}
                alt="Prévia do produto"
                className="w-full h-full object-contain p-1"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </div>
          )}

          {/* Message Body */}
          <div className="whitespace-pre-wrap break-words space-y-0.5">
            {renderFormattedText(message)}
          </div>

          {/* Bubble Timestamp and Read checkmarks */}
          <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400 dark:text-slate-400 font-medium">
            <span>{timeString}</span>
            <svg className="w-3.5 h-3.5 text-sky-500 inline" viewBox="0 0 16 15" fill="none">
              <path
                d="M15.01 3.316l-7.79 7.79-4.22-4.22.71-.71 3.51 3.51 7.08-7.08.71.71zm-4.24 0l-7.08 7.08-3.51-3.51-.71.71 4.22 4.22 7.79-7.79-.71-.71z"
                fill="currentColor"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

