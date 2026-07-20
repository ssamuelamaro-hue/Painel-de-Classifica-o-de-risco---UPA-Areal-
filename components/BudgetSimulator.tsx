import React, { useState } from 'react';
import { 
  Sliders, TrendingUp, HelpCircle, RefreshCw, 
  ArrowUpRight, ArrowDownRight, Activity, Percent, Sparkles 
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, Legend 
} from 'recharts';
import { BudgetLine } from '../types';

interface BudgetSimulatorProps {
  data: BudgetLine[];
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(val);
};

export const BudgetSimulator: React.FC<BudgetSimulatorProps> = ({ data }) => {
  // Simulator factors in percentages (0% means multiplier = 1.0)
  const [municipalRevFactor, setMunicipalRevFactor] = useState(0);
  const [municipalExpFactor, setMunicipalExpFactor] = useState(0);

  const [estadualRevFactor, setEstadualRevFactor] = useState(0);
  const [estadualExpFactor, setEstadualExpFactor] = useState(0);

  const [federalRevFactor, setFederalRevFactor] = useState(0);
  const [federalExpFactor, setFederalExpFactor] = useState(0);

  const handleReset = () => {
    setMunicipalRevFactor(0);
    setMunicipalExpFactor(0);
    setEstadualRevFactor(0);
    setEstadualExpFactor(0);
    setFederalRevFactor(0);
    setFederalExpFactor(0);
  };

  // Original aggregates
  const origInitial = data.reduce((sum, item) => sum + item.saldoInicial, 0);
  const origRevenues = data.reduce((sum, item) => sum + item.receitas + item.rendimentos, 0);
  const origExpenses = data.reduce((sum, item) => sum + item.despesas, 0);
  const origFinal = data.reduce((sum, item) => sum + item.saldoFinal, 0);

  // Calculate simulated values
  let simTotalInitial = 0;
  let simTotalRevenues = 0;
  let simTotalExpenses = 0;
  let simTotalFinal = 0;

  data.forEach(item => {
    let revMult = 1.0;
    let expMult = 1.0;

    if (item.fonte === 'Municipal') {
      revMult = 1.0 + (municipalRevFactor / 100);
      expMult = 1.0 + (municipalExpFactor / 100);
    } else if (item.fonte === 'Estadual') {
      revMult = 1.0 + (estadualRevFactor / 100);
      expMult = 1.0 + (estadualExpFactor / 100);
    } else if (item.fonte === 'Federal') {
      revMult = 1.0 + (federalRevFactor / 100);
      expMult = 1.0 + (federalExpFactor / 100);
    }

    const simRev = (item.receitas + item.rendimentos) * revMult;
    const simExp = item.despesas * expMult;

    simTotalInitial += item.saldoInicial;
    simTotalRevenues += simRev;
    simTotalExpenses += simExp;
    simTotalFinal += (item.saldoInicial + simRev - simExp);
  });

  const origSurplus = origRevenues - origExpenses;
  const simSurplus = simTotalRevenues - simTotalExpenses;

  const surplusDiff = simSurplus - origSurplus;

  // Chart Data
  const chartData = [
    {
      name: 'Receitas Totais',
      Original: origRevenues,
      Simulado: simTotalRevenues,
    },
    {
      name: 'Despesas Totais',
      Original: origExpenses,
      Simulado: simTotalExpenses,
    },
    {
      name: 'Saldo Final',
      Original: origFinal,
      Simulado: simTotalFinal,
    }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fadeIn" id="budget-simulator-view">
      
      {/* Sliders on the left (5 cols) */}
      <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
        <div className="space-y-6">
          <div className="flex justify-between items-center pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-blue-600" />
              <h3 className="text-base font-black text-slate-800">Parâmetros de Simulação</h3>
            </div>
            <button 
              onClick={handleReset}
              className="text-slate-400 hover:text-blue-600 text-xs font-bold flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Redefinir
            </button>
          </div>

          {/* MUNICIPAL SLIDERS */}
          <div className="space-y-4">
            <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest">Esfera Municipal</h4>
            <div className="space-y-3.5">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                  <span>Repasses / Receitas</span>
                  <span className={municipalRevFactor >= 0 ? 'text-emerald-600 font-black' : 'text-rose-500 font-black'}>
                    {municipalRevFactor >= 0 ? '+' : ''}{municipalRevFactor}%
                  </span>
                </div>
                <input 
                  type="range" min="-50" max="50" step="5"
                  value={municipalRevFactor}
                  onChange={(e) => setMunicipalRevFactor(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                  <span>Custo Operacional / Despesas</span>
                  <span className={municipalExpFactor >= 0 ? 'text-rose-500 font-black' : 'text-emerald-600 font-black'}>
                    {municipalExpFactor >= 0 ? '+' : ''}{municipalExpFactor}%
                  </span>
                </div>
                <input 
                  type="range" min="-50" max="50" step="5"
                  value={municipalExpFactor}
                  onChange={(e) => setMunicipalExpFactor(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-rose-600"
                />
              </div>
            </div>
          </div>

          {/* ESTADUAL SLIDERS */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest">Esfera Estadual</h4>
            <div className="space-y-3.5">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                  <span>Repasses / Receitas</span>
                  <span className={estadualRevFactor >= 0 ? 'text-emerald-600 font-black' : 'text-rose-500 font-black'}>
                    {estadualRevFactor >= 0 ? '+' : ''}{estadualRevFactor}%
                  </span>
                </div>
                <input 
                  type="range" min="-50" max="50" step="5"
                  value={estadualRevFactor}
                  onChange={(e) => setEstadualRevFactor(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                  <span>Despesas / Investimento</span>
                  <span className={estadualExpFactor >= 0 ? 'text-rose-500 font-black' : 'text-emerald-600 font-black'}>
                    {estadualExpFactor >= 0 ? '+' : ''}{estadualExpFactor}%
                  </span>
                </div>
                <input 
                  type="range" min="-50" max="50" step="5"
                  value={estadualExpFactor}
                  onChange={(e) => setEstadualExpFactor(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-rose-600"
                />
              </div>
            </div>
          </div>

          {/* FEDERAL SLIDERS */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h4 className="text-xs font-black text-amber-600 uppercase tracking-widest">Esfera Federal</h4>
            <div className="space-y-3.5">
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                  <span>Repasses / Receitas</span>
                  <span className={federalRevFactor >= 0 ? 'text-emerald-600 font-black' : 'text-rose-500 font-black'}>
                    {federalRevFactor >= 0 ? '+' : ''}{federalRevFactor}%
                  </span>
                </div>
                <input 
                  type="range" min="-50" max="50" step="5"
                  value={federalRevFactor}
                  onChange={(e) => setFederalRevFactor(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-amber-600"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold text-slate-600 mb-1">
                  <span>Despesas Aplicadas</span>
                  <span className={federalExpFactor >= 0 ? 'text-rose-500 font-black' : 'text-emerald-600 font-black'}>
                    {federalExpFactor >= 0 ? '+' : ''}{federalExpFactor}%
                  </span>
                </div>
                <input 
                  type="range" min="-50" max="50" step="5"
                  value={federalExpFactor}
                  onChange={(e) => setFederalExpFactor(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-rose-600"
                />
              </div>
            </div>
          </div>

        </div>

        <div className="p-4 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-400 font-bold leading-relaxed mt-6">
          Ajuste as taxas para simular cenários como cortes federais de verba ou inflação em insumos hospitalares estaduais.
        </div>
      </div>

      {/* Analytics on the right (7 cols) */}
      <div className="lg:col-span-7 space-y-6">
        
        {/* Comparison KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Simulated Final Balance */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Saldo Final Simulado</span>
              <h4 className={`text-xl font-black mt-1 ${simTotalFinal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(simTotalFinal)}
              </h4>
            </div>
            <div className="flex items-center gap-1.5 mt-4 text-[11px] font-bold text-slate-500">
              <span>Original: {formatCurrency(origFinal)}</span>
            </div>
          </div>

          {/* Simulated Impact */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Variação do Caixa</span>
              <h4 className={`text-xl font-black mt-1 ${surplusDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {surplusDiff >= 0 ? '+' : ''}{formatCurrency(surplusDiff)}
              </h4>
            </div>
            <div className="flex items-center gap-1.5 mt-4 text-[11px] font-bold text-slate-500">
              <span>Resultado do cenário simulado</span>
            </div>
          </div>

        </div>

        {/* Comparison Chart */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="mb-6">
            <h3 className="text-base font-black text-slate-800">Cenário Original vs. Simulado</h3>
            <p className="text-xs text-slate-400">Impacto direto no fluxo financeiro do Fundo de Saúde</p>
          </div>

          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 20, bottom: 5 }}
              >
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(val) => `R$ ${(val / 1000000).toFixed(1)}M`} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  formatter={(val: number) => [formatCurrency(val), '']}
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff' }}
                  labelStyle={{ fontWeight: 'black', fontSize: '11px', color: '#94a3b8' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold' }} />
                <Bar dataKey="Original" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Simulado" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Intelligent Advisory Reports based on simulation */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center gap-2 text-violet-600 mb-4">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <h3 className="text-base font-black text-slate-800">Análise de Impacto do Cenário</h3>
          </div>

          <div className="text-xs text-slate-600 space-y-3 leading-relaxed">
            {surplusDiff > 0 ? (
              <p>
                🟢 <strong>Cenário Otimista:</strong> O aumento projetado nas receitas ou a economia operacional gerou um acréscimo de <strong>{formatCurrency(surplusDiff)}</strong> no caixa. Essa folga orçamentária pode ser idealmente destinada para reestruturação das Unidades Básicas de Saúde (UBS) ou para expansão do PSF Indígena e do Primeira Infância Melhor (PIM), fortalecendo a rede básica.
              </p>
            ) : surplusDiff < 0 ? (
              <p>
                🔴 <strong>Cenário de Alerta Financeiro:</strong> A redução de repasses ou o encarecimento de custos resultou em uma perda projetada de <strong>{formatCurrency(Math.abs(surplusDiff))}</strong>. Recomenda-se priorizar o teto da Média e Alta Complexidade e contingenciar recursos de convênios secundários até o restabelecimento do equilíbrio financeiro.
              </p>
            ) : (
              <p>
                ℹ️ <strong>Cenário Estável:</strong> Não foram projetadas mudanças financeiras. Os saldos seguem a projeção exata do relatório oficial da prefeitura de Pelotas para o quadrimestre 2017.
              </p>
            )}

            <p className="border-t border-slate-100 pt-3 text-[10px] text-slate-400 font-bold">
              * Relatório gerado dinamicamente com base nas simulações atuariais do Fundo Municipal de Saúde de Pelotas.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
};
