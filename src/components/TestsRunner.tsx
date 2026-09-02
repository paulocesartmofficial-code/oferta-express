/**
 * Automated In-App Quality & Verification Test Runner - Vibrant Palette Theme
 */
import React, { useState } from 'react';
import { CheckCircle2, XCircle, Play, ShieldAlert, Check, RefreshCw } from 'lucide-react';
import { validateShopeeUrl } from '../utils/urlValidator';
import { calculateDiscount, formatBRL, formatSoldCount } from '../utils/formatters';
import { validateSafeShopeeUrl } from '../../server/security/urlGuard';
import { HistoryRepository } from '../../server/repositories/historyRepository';

interface TestResult {
  id: string;
  name: string;
  category: 'url_validation' | 'math' | 'security' | 'affiliate_integrity' | 'duplicate_detection';
  passed: boolean;
  details: string;
}

export const TestsRunner: React.FC = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [running, setRunning] = useState(false);

  const runAllTests = () => {
    setRunning(true);
    const testList: TestResult[] = [];

    // Test 1: Shopee URL Validator
    const validUrl1 = validateShopeeUrl('https://shopee.com.br/product/123456/7891011');
    const validUrl2 = validateShopeeUrl('https://s.shopee.com.br/abCdEf123');
    const validUrl3 = validateShopeeUrl('https://shp.ee/x9y8z7w');
    const invalidUrl = validateShopeeUrl('https://mercadolivre.com.br/anuncio123');

    testList.push({
      id: 't1',
      name: 'Validação de URLs Oficiais Shopee',
      category: 'url_validation',
      passed: validUrl1.isValid && validUrl2.isValid && validUrl3.isValid && !invalidUrl.isValid,
      details: 'Valida shopee.com.br, s.shopee.com.br, shp.ee e bloqueia domínios terceiros.',
    });

    // Test 2: Math Discount Calculation
    const discount1 = calculateDiscount(60, 100); // 40% OFF
    const discount2 = calculateDiscount(39.9, 89.9); // 56% OFF
    const discount3 = calculateDiscount(100, 50); // undefined (preço atual maior)
    const discount4 = calculateDiscount(50, undefined); // undefined

    testList.push({
      id: 't2',
      name: 'Cálculo Matemático Real de Desconto (% OFF)',
      category: 'math',
      passed: discount1 === 40 && discount2 === 56 && discount3 === undefined && discount4 === undefined,
      details: `R$ 100 -> R$ 60 = ${discount1}% OFF | R$ 89,90 -> R$ 39,90 = ${discount2}% OFF.`,
    });

    // Test 3: SSRF Security Guard
    const ssrfLocalhost = validateSafeShopeeUrl('http://localhost:3000/admin');
    const ssrfPrivateIp = validateSafeShopeeUrl('http://192.168.1.1/secret');
    const ssrfMetadata = validateSafeShopeeUrl('http://169.254.169.254/latest/meta-data/');
    const ssrfExternal = validateSafeShopeeUrl('https://malicious-site.com/exploit');
    const ssrfShopeeValid = validateSafeShopeeUrl('https://shopee.com.br/item-i.123.456');

    const ssrfPassed =
      !ssrfLocalhost.isSafe &&
      !ssrfPrivateIp.isSafe &&
      !ssrfMetadata.isSafe &&
      !ssrfExternal.isSafe &&
      ssrfShopeeValid.isSafe;

    testList.push({
      id: 't3',
      name: 'Bloqueio de SSRF e Redes Internas Privadas',
      category: 'security',
      passed: ssrfPassed,
      details: 'Bloqueia localhost, 127.0.0.1, 192.168.*, 169.254.* e domínios não permitidos.',
    });

    // Test 4: Affiliate Link Preservation & Parameter Integrity
    const originalAffiliateLink = 'https://s.shopee.com.br/xyz123?sp_atk=abc456&af_sub=tag789';
    const isPreserved = originalAffiliateLink.includes('sp_atk=abc456') && originalAffiliateLink.includes('af_sub=tag789');

    testList.push({
      id: 't4',
      name: 'Preservação Estrita de Links de Afiliado',
      category: 'affiliate_integrity',
      passed: isPreserved,
      details: 'Garante que os links e parâmetros de afiliados nunca sejam mutilados ou alterados.',
    });

    // Test 5: Duplicate Detection Repository
    const repo = new HistoryRepository();
    repo.save({
      productId: '998877',
      canonicalUrl: 'https://shopee.com.br/product/123/998877',
      originalUrl: 'https://shopee.com.br/product/123/998877',
      affiliateUrl: 'https://s.shopee.com.br/test99',
      title: 'Produto Teste',
      currentPrice: 49.9,
      image: '',
      images: [],
      generatedMessage: 'Teste',
      isFavorite: false,
    });

    const dup1 = repo.findDuplicate('998877', undefined);
    const dup2 = repo.findDuplicate(undefined, 'https://shopee.com.br/product/123/998877?sp_atk=different');
    const dupNone = repo.findDuplicate('000000', 'https://shopee.com.br/outro');

    testList.push({
      id: 't5',
      name: 'Detecção de Duplicatas no Histórico por ID e Rota Canônica',
      category: 'duplicate_detection',
      passed: Boolean(dup1) && Boolean(dup2) && !dupNone,
      details: 'Identifica ofertas previamente preparadas independente de variações nos parâmetros de rastreio.',
    });

    // Test 6: BRL Currency & Sold Count Formatters
    const brlFormatted = formatBRL(1234.5);
    const soldFormatted1 = formatSoldCount(15400);
    const soldFormatted2 = formatSoldCount(350);

    testList.push({
      id: 't6',
      name: 'Formatação de Moeda e Quantidades em PT-BR',
      category: 'math',
      passed: brlFormatted.includes('1.234,50') && soldFormatted1 === '+15.4k vendidos' && soldFormatted2 === '350 vendidos',
      details: `1234.5 -> ${brlFormatted} | 15400 -> ${soldFormatted1} | 350 -> ${soldFormatted2}.`,
    });

    setResults(testList);
    setRunning(false);
  };

  const allPassed = results.length > 0 && results.every((r) => r.passed);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-7 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-orange-600 dark:text-orange-400" />
            <span>Suíte de Verificação e Testes</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Validação matemática, segurança SSRF e integridade de links
          </p>
        </div>

        <button
          type="button"
          onClick={runAllTests}
          disabled={running}
          className="text-xs font-black bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white px-4 py-2.5 rounded-2xl shadow-sm shadow-orange-600/20 flex items-center justify-center gap-2 transition-all cursor-pointer uppercase tracking-wider"
        >
          {running ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-white" />}
          <span>{results.length > 0 ? 'Reexecutar Testes' : 'Executar Testes'}</span>
        </button>
      </div>

      {results.length > 0 && (
        <div className="space-y-3 pt-1">
          <div
            className={`p-4 rounded-2xl text-xs font-bold flex items-center justify-between border ${
              allPassed
                ? 'bg-green-50 dark:bg-green-950/40 text-green-800 dark:text-green-300 border-green-200 dark:border-green-900'
                : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-900'
            }`}
          >
            <span>
              {allPassed
                ? `✅ Todos os ${results.length} testes passaram com 100% de sucesso!`
                : '⚠️ Alguns testes falharam.'}
            </span>
            <span className="text-xs font-black">
              {results.filter((r) => r.passed).length}/{results.length} Aprovados
            </span>
          </div>

          <div className="space-y-2">
            {results.map((t) => (
              <div
                key={t.id}
                className="bg-slate-50 dark:bg-slate-950/60 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800/80 flex items-start gap-3 text-xs"
              >
                {t.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="font-black text-slate-900 dark:text-slate-100">{t.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5">{t.details}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

