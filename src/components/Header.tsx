/**
 * App Header Component - Oferta Express (Permanent Dark Mode)
 */
import React from 'react';
import { Flame, Sparkles, WifiOff } from 'lucide-react';

interface HeaderProps {
  geminiReady?: boolean;
  isOnline?: boolean;
  affiliateConfigured?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  geminiReady = true,
  isOnline = true,
  affiliateConfigured = false,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 sm:px-6 py-3.5 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <div className="bg-orange-600 p-2.5 rounded-2xl text-white shadow-md shadow-orange-500/25 flex items-center justify-center">
            <Flame className="w-5 h-5 fill-white stroke-[2.5]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-black tracking-tighter text-white leading-none">
                OFERTA EXPRESS
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 bg-orange-950/80 text-orange-300 text-[10px] font-black uppercase tracking-wider rounded-md border border-orange-800/60">
                SHOPEE
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-orange-400 font-bold uppercase tracking-wider mt-0.5">
              Gerador de Ofertas Shopee
            </p>
          </div>
        </div>

        {/* Right Status Badges */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {!isOnline && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-950/80 text-red-300 border border-red-800 rounded-full text-xs font-bold shadow-xs">
              <WifiOff className="w-3.5 h-3.5 text-red-400" />
              <span>Offline</span>
            </div>
          )}

          {/* Affiliate Status Badge */}
          <div
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-xs border ${
              affiliateConfigured
                ? 'bg-green-950/60 text-green-300 border-green-800'
                : 'bg-slate-800 text-slate-300 border-slate-700'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                affiliateConfigured ? 'bg-green-500 animate-pulse' : 'bg-amber-400'
              }`}
            ></span>
            <span className="hidden xs:inline">
              {affiliateConfigured ? 'Afiliado Ativo' : 'Manual / Pronto'}
            </span>
            <span className="xs:hidden">
              {affiliateConfigured ? 'Ativo' : 'Pronto'}
            </span>
          </div>

          {geminiReady && (
            <div
              title="IA Gemini Ativa para Redação"
              className="hidden md:flex items-center gap-1 text-[11px] font-bold text-blue-300 bg-blue-950/60 px-2.5 py-1 rounded-full border border-blue-800"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400 fill-blue-400/20" />
              <span>IA Pronta</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

