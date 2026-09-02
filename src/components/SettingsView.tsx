/**
 * Settings & Preferences View Component - Oferta Express (Dark Mode Only)
 */
import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Sparkles,
  Check,
  Key,
  Info,
  Save,
  Wrench,
  Activity,
  AlertCircle,
  CheckCircle2,
  X,
  Lock,
} from 'lucide-react';
import { AppSettings, OfferPreferences } from '../types';
import { apiClient } from '../services/apiClient';

interface SettingsViewProps {
  onSavePreferences: (prefs: OfferPreferences) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onSavePreferences }) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [affiliateStatus, setAffiliateStatus] = useState<any>(null);
  const [prefs, setPrefs] = useState<OfferPreferences>({
    style: 'chamativo',
    length: 'curto',
    emojis: 'normal',
    showOriginalPrice: true,
    showDiscountPercent: true,
    showRating: true,
    showSoldCount: true,
    showCoupon: true,
    customSignature: '',
  });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Test Connection State
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{
    status: 'ok' | 'integration_not_configured' | 'auth_error' | null;
    message: string;
  }>({ status: null, message: '' });

  useEffect(() => {
    apiClient.getSettings().then((data) => {
      setSettings(data.settings);
      setAffiliateStatus(data.affiliateStatus);
      if (data.settings.defaultPreferences) {
        setPrefs(data.settings.defaultPreferences);
      }
    });
  }, []);

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    setTestResult({ status: null, message: '' });
    try {
      const res = await apiClient.testShopeeIntegration();
      setTestResult({
        status: res.status,
        message: res.message,
      });
    } catch {
      setTestResult({
        status: 'auth_error',
        message: 'Não foi possível conectar ou validar os servidores de integração.',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await apiClient.updateSettings({ defaultPreferences: prefs });
      setSettings(updated);
      onSavePreferences(prefs);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.warn('Save settings failed:', err);
    }
  };

  const isConfigured = Boolean(settings?.affiliateConfigured);

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* 1. Shopee Affiliate Integration Card */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 p-5 sm:p-7 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-orange-950 text-orange-400 flex items-center justify-center border border-orange-800/60">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <span>🔐 Integração Shopee Afiliados</span>
              </h2>
              <p className="text-xs text-slate-400">
                Credenciais de afiliado oficiais (Segurança no Servidor)
              </p>
            </div>
          </div>

          <span
            className={`font-black px-3 py-1 rounded-full text-xs flex items-center gap-1.5 border ${
              isConfigured
                ? 'bg-green-950/80 text-green-300 border-green-800'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConfigured ? 'bg-green-400 animate-pulse' : 'bg-amber-400'
              }`}
            ></span>
            <span>{isConfigured ? 'Configurado' : 'Não configurado'}</span>
          </span>
        </div>

        {/* Credentials Overview Display */}
        <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 text-xs space-y-3">
          <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
            <span className="text-slate-400 font-bold">App ID de Afiliado:</span>
            <span className="font-mono text-slate-200 font-bold">
              {settings?.shopeeAppIdPreview || (isConfigured ? 'Ativo no Servidor' : 'Não configurado')}
            </span>
          </div>

          <div className="flex items-center justify-between py-1 border-b border-slate-800/80">
            <span className="text-slate-400 font-bold">App Secret de Afiliado:</span>
            <span className="font-mono text-slate-400">
              {isConfigured ? '•••••••••••••••• (Oculto)' : 'Não configurado'}
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed pt-1">
            {affiliateStatus?.description ||
              'Links normais podem ser convertidos automaticamente via API Oficial, e links que já possuem tag de afiliado são sempre mantidos intactos.'}
          </p>

          {/* Test feedback box */}
          {testResult.status && (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold flex items-start gap-2 animate-in fade-in ${
                testResult.status === 'ok'
                  ? 'bg-green-950/60 text-green-300 border-green-800'
                  : testResult.status === 'integration_not_configured'
                  ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                  : 'bg-red-950/60 text-red-300 border-red-800'
              }`}
            >
              {testResult.status === 'ok' ? (
                <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <div>
                <strong className="block font-black">
                  {testResult.status === 'ok'
                    ? '✅ Integração funcionando'
                    : testResult.status === 'integration_not_configured'
                    ? '⚠️ Credenciais não configuradas'
                    : '❌ Não foi possível autenticar'}
                </strong>
                <span>{testResult.message}</span>
              </div>
            </div>
          )}

          {/* Integration Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTestingConnection}
              className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
            >
              <Activity className="w-3.5 h-3.5 text-orange-400" />
              <span>{isTestingConnection ? 'Testando conexão...' : '🧪 Testar Conexão'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsConfigModalOpen(true)}
              className="flex-1 py-2.5 px-3 rounded-xl bg-orange-950/60 hover:bg-orange-900/60 text-orange-300 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-orange-800/80"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>⚙️ Configurar Integração</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Redaction & AI Preferences */}
      <div className="bg-slate-900 rounded-3xl border border-slate-800 p-5 sm:p-7 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-orange-950 text-orange-400 flex items-center justify-center border border-orange-800/60">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-white">
              Padrões de Redação para WhatsApp
            </h2>
            <p className="text-xs text-slate-400">Personalize o tom e emojis gerados pela IA</p>
          </div>
        </div>

        {/* Estilo */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-2">
            Estilo Padrão do Texto
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { id: 'chamativo', label: '🔥 Chamativo' },
              { id: 'economico', label: '💰 Econômico' },
              { id: 'clean', label: '✨ Clean' },
              { id: 'descontraido', label: '👀 Descontraído' },
              { id: 'rapida', label: '⚡ Oferta Relâmpago' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setPrefs({ ...prefs, style: st.id as any })}
                className={`py-2.5 px-3 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                  prefs.style === st.id
                    ? 'bg-orange-950/80 border-orange-600 text-orange-300 shadow-xs'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {/* Quantidade de Emojis */}
        <div>
          <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-2">
            Quantidade de Emojis
          </label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'poucos', label: 'Discreto (poucos)' },
              { id: 'normal', label: 'Equilibrado' },
              { id: 'muitos', label: 'Intenso (muitos)' },
            ].map((em) => (
              <button
                key={em.id}
                type="button"
                onClick={() => setPrefs({ ...prefs, emojis: em.id as any })}
                className={`py-2.5 px-2 rounded-2xl text-xs font-bold border transition-all text-center cursor-pointer ${
                  prefs.emojis === em.id
                    ? 'bg-orange-950/80 border-orange-600 text-orange-300 shadow-xs'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {em.label}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="pt-3 border-t border-slate-800 space-y-2">
          <span className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1">
            Elementos Incluídos na Mensagem
          </span>

          {[
            { key: 'showOriginalPrice', label: 'Incluir preço anterior riscado (quando houver)' },
            { key: 'showDiscountPercent', label: 'Incluir porcentagem de desconto (% OFF)' },
            { key: 'showRating', label: 'Incluir estrelas de avaliação' },
            { key: 'showSoldCount', label: 'Incluir quantidade de vendas' },
            { key: 'showCoupon', label: 'Incluir código de cupom (quando informado)' },
          ].map((item) => (
            <label
              key={item.key}
              className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-slate-800/50 cursor-pointer text-xs font-semibold text-slate-200"
            >
              <span>{item.label}</span>
              <input
                type="checkbox"
                checked={(prefs as any)[item.key]}
                onChange={(e) => setPrefs({ ...prefs, [item.key]: e.target.checked })}
                className="w-4 h-4 accent-orange-600 rounded cursor-pointer"
              />
            </label>
          ))}
        </div>

        {/* Custom Group Signature */}
        <div className="pt-3 border-t border-slate-800">
          <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
            Assinatura ou Rodapé Personalizado (Opcional)
          </label>
          <input
            type="text"
            value={prefs.customSignature || ''}
            onChange={(e) => setPrefs({ ...prefs, customSignature: e.target.value })}
            placeholder="Ex: 👥 Entre no nosso grupo VIP: https://chat.whatsapp.com/..."
            className="w-full rounded-2xl bg-slate-800 border border-slate-700 px-4 py-3 text-xs text-slate-100 outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Save Button */}
      <button
        type="submit"
        className="w-full bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white font-black text-sm py-4 px-6 rounded-2xl shadow-lg shadow-orange-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95 uppercase tracking-wider"
      >
        {savedSuccess ? (
          <>
            <Check className="w-5 h-5 stroke-[3]" />
            <span>Configurações Salvas!</span>
          </>
        ) : (
          <>
            <Save className="w-5 h-5" />
            <span>Salvar Preferências</span>
          </>
        )}
      </button>

      {/* Integration Configuration Guidance Modal */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-white font-black text-base">
                <Lock className="w-5 h-5 text-orange-400" />
                <span>Configurar Integração Shopee</span>
              </div>
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-300 leading-relaxed">
              <div className="bg-orange-950/50 border border-orange-900/80 rounded-2xl p-4 flex items-start gap-3 text-orange-200">
                <ShieldCheck className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
                <span>
                  Por diretriz estrita de segurança, suas chaves de API secretas <strong>nunca</strong> devem ser inseridas no navegador ou salvas em LocalStorage. Elas pertencem exclusivamente ao servidor.
                </span>
              </div>

              <div className="space-y-2">
                <h4 className="font-black text-white text-sm">Como configurar no servidor:</h4>
                <p>
                  Acesse as <strong>Configurações de Ambiente / Secrets</strong> do projeto no painel de administração e defina as seguintes variáveis:
                </p>

                <div className="space-y-2 bg-slate-950 p-4 rounded-2xl font-mono text-[11px] border border-slate-800">
                  <div>
                    <span className="text-orange-400 font-bold">SHOPEE_AFFILIATE_APP_ID</span>
                    <p className="text-slate-400 text-[10px] font-sans">Seu App ID da plataforma de Afiliados Shopee</p>
                  </div>
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-orange-400 font-bold">SHOPEE_AFFILIATE_SECRET</span>
                    <p className="text-slate-400 text-[10px] font-sans">Sua chave secreta Shopee Open API</p>
                  </div>
                  <div className="pt-2 border-t border-slate-800">
                    <span className="text-orange-400 font-bold">GEMINI_API_KEY</span>
                    <p className="text-slate-400 text-[10px] font-sans">Chave da Google AI Studio para geração de textos</p>
                  </div>
                </div>
              </div>

              <p className="text-slate-400">
                Após adicionar os valores nas variáveis de ambiente do servidor, clique em <strong>Testar Conexão</strong> para validar.
              </p>

              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="w-full py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-wider cursor-pointer"
              >
                Entendi
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
};

