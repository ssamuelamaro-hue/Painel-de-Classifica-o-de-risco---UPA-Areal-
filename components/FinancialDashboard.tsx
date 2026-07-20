import React from 'react';
import { 
  DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight, 
  Percent, Sparkles, Building2, Landmark, ShieldCheck 
} from 'lucide-react';
import { 
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, 
  Tooltip, Legend, PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';
import { BudgetLine } from '../types';

interface FinancialDashboardProps {
  data: BudgetLine[];
  onAddData: () => void;
  onFilterSource: (source: 'Todos' | 'Municipal' | 'Estadual' | 'Federal') => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'];
const SOURCE_COLORS = {
  'Municipal': '#3b82f6',
  'Estadual': '#10b981',
  'Federal': '#f59e0b'
};

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(val);
};

export const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ data, onAddData, onFilterSource }) => {
  // Aggregate Metrics
  const totalInitial = data.reduce((sum, item) => sum + item.saldoInicial, 0);
  const totalRevenues = data.reduce((sum, item) => sum + item.receitas, 0);
  const totalYields = data.reduce((sum, item) => sum + item.rendimentos, 0);
  const totalExpenses = data.reduce((sum, item) => sum + item.despesas, 0);
  const totalFinal = data.reduce((sum, item) => sum + item.saldoFinal, 0);

  const netFlow = totalRevenues + totalYields - totalExpenses;
  const executionRate = (totalExpenses / (totalInitial + totalRevenues + totalYields)) * 100;

  // Source-wise Breakdown
  const sourceBreakdown = ['Municipal', 'Estadual', 'Federal'].map(source => {
    const filtered = data.filter(item => item.fonte === source);
    return {
      name: source,
      initial: filtered.reduce((sum, item) => sum + item.saldoInicial, 0),
      revenues: filtered.reduce((sum, item) => sum + item.receitas, 0),
      yields: filtered.reduce((sum, item) => sum + item.rendimentos, 0),
      expenses: filtered.reduce((sum, item) => sum + item.despesas, 0),
      final: filtered.reduce((sum, item) => sum + item.saldoFinal, 0)
    };
  });

  // Category Breakdown
  const categories = Array.from(new Set(data.map(item => item.bloco)));
  const categoryData = categories.map(cat => {
    const filtered = data.filter(item => item.bloco === cat);
    return {
      name: cat,
      receitas: filtered.reduce((sum, item) => sum + item.receitas, 0),
      despesas: filtered.reduce((sum, item) => sum + item.despesas, 0),
      saldoFinal: filtered.reduce((sum, item) => sum + item.saldoFinal, 0)
    };
  }).sort((a, b) => b.despesas - a.despesas);

  // Source distribution for Pie Chart
  const pieData = sourceBreakdown.map(src => ({
    name: src.name,
    value: src.revenues + src.yields,
    color: SOURCE_COLORS[src.name as keyof typeof SOURCE_COLORS]
  })).filter(item => item.value > 0);

  // Executive Insights
  const topExpCategory = categoryData[0];
  const lowExpCategory = [...categoryData].sort((a, b) => a.despesas - b.despesas)[0];

  return (
    <div className="space-y-6 animate-fadeIn" id="financial-dashboard-view">
      
      {/* KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Saldo Inicial */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Saldo Inicial</span>
              <h4 className="text-xl font-black text-slate-800 tracking-tight mt-1">{formatCurrency(totalInitial)}</h4>
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-600">
              <Landmark className="w-5 h-5" />
            </div>
          </div>
          <span className="text-[10px] text-slate-400 mt-4 block">Saldo consolidado em 31/12/2016</span>
        </div>

        {/* Receitas Totais */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold text-blue-500 uppercase tracking-wider block">Receitas Recebidas</span>
              <h4 className="text-xl font-black text-blue-600 tracking-tight mt-1">{formatCurrency(totalRevenues)}</h4>
            </div>
            <div className="p-2.5 bg-blue-50 border border-blue-100/50 rounded-xl text-blue-600">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-center gap-1 mt-4 text-[11px] font-bold text-blue-600">
            <span>+ {formatCurrency(totalYields)} rendimentos</span>
          </div>
        </div>

        {/* Despesas Consolidadas */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold text-rose-500 uppercase tracking-wider block">Despesas Executadas</span>
              <h4 className="text-xl font-black text-rose-600 tracking-tight mt-1">{formatCurrency(totalExpenses)}</h4>
            </div>
            <div className="p-2.5 bg-rose-50 border border-rose-100/50 rounded-xl text-rose-600">
              <ArrowDownRight className="w-5 h-5" />
            </div>
          </div>
          <span className="text-[10px] text-rose-600 mt-4 block">Total liquidado no quadrimestre</span>
        </div>

        {/* Saldo Final */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider block">Saldo Final</span>
              <h4 className="text-xl font-black text-emerald-600 tracking-tight mt-1">{formatCurrency(totalFinal)}</h4>
            </div>
            <div className="p-2.5 bg-emerald-50 border border-emerald-100/50 rounded-xl text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className={`flex items-center gap-1 mt-4 text-[10px] font-black uppercase tracking-wider ${netFlow >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
            <span>{netFlow >= 0 ? 'Superávit' : 'Déficit'} de {formatCurrency(Math.abs(netFlow))}</span>
          </div>
        </div>

        {/* Taxa de Execução */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[11px] font-bold text-violet-500 uppercase tracking-wider block">Taxa de Execução</span>
              <h4 className="text-xl font-black text-violet-600 tracking-tight mt-1">{executionRate.toFixed(1)}%</h4>
            </div>
            <div className="p-2.5 bg-violet-50 border border-violet-100/50 rounded-xl text-violet-600">
              <Percent className="w-5 h-5" />
            </div>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full mt-4 overflow-hidden">
            <div className="bg-violet-600 h-full rounded-full transition-all duration-500" style={{ width: `${executionRate}%` }}></div>
          </div>
        </div>

      </div>

      {/* RECHARTS VISUALIZATIONS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Bar chart by category (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-base font-black text-slate-800">Execução por Bloco de Financiamento</h3>
              <p className="text-xs text-slate-400">Comparação de Receitas recebidas vs Despesas liquidadas por bloco</p>
            </div>
            <span className="bg-blue-50 text-blue-600 text-[10px] font-bold px-2.5 py-1 rounded-md">Ordenado por Despesa</span>
          </div>

          <div className="h-[320px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryData.slice(0, 5)}
                margin={{ top: 10, right: 10, left: 20, bottom: 5 }}
              >
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={(val) => `R$ ${(val / 1000000).toFixed(1)}M`} tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip 
                  formatter={(val: number) => [formatCurrency(val), '']} 
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '12px', border: 'none', color: '#fff' }}
                  labelStyle={{ fontWeight: 'black', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', paddingTop: '10px' }} />
                <Bar dataKey="receitas" name="Receitas" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right: Pie chart sources distribution (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-black text-slate-800">Origem do Financiamento</h3>
            <p className="text-xs text-slate-400">Participação percentual por fonte de recursos no quadrimestre</p>
          </div>

          <div className="h-[220px] w-full my-4 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(val: number) => formatCurrency(val)} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center Label */}
            <div className="absolute text-center">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Receita Total</span>
              <span className="text-lg font-black text-slate-800">
                {formatCurrency(totalRevenues + totalYields)}
              </span>
            </div>
          </div>

          {/* Custom Legends */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            {sourceBreakdown.map(src => {
              const share = ((src.revenues + src.yields) / (totalRevenues + totalYields)) * 100;
              return (
                <button
                  key={src.name}
                  onClick={() => onFilterSource(src.name as any)}
                  className="w-full flex justify-between items-center text-xs p-1.5 hover:bg-slate-50 rounded-lg transition-colors group text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: SOURCE_COLORS[src.name as keyof typeof SOURCE_COLORS] }}></span>
                    <span className="font-bold text-slate-600 group-hover:text-blue-600 transition-colors">{src.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black text-slate-800 block">{share.toFixed(1)}%</span>
                    <span className="text-[9px] text-slate-400">{formatCurrency(src.revenues + src.yields)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* WATERFALL ANALYSIS OR SOURCE BREAKDOWN TABLE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Source breakdown matrix (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <div>
              <h3 className="text-base font-black text-slate-800">Resumo Consolidado por Esfera</h3>
              <p className="text-xs text-slate-400">Detalhamento dos saldos e fluxos por nível de governo</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/20">
                  <th className="py-3.5 px-6">Esfera Governamental</th>
                  <th className="py-3.5 px-4 text-right">Saldo Inicial</th>
                  <th className="py-3.5 px-4 text-right">Receitas (+ Rend)</th>
                  <th className="py-3.5 px-4 text-right">Despesas Exec.</th>
                  <th className="py-3.5 px-6 text-right">Saldo Final</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {sourceBreakdown.map((src, idx) => {
                  const hasIncrease = src.final >= src.initial;
                  return (
                    <tr key={idx} className="hover:bg-slate-50/60 transition-colors font-semibold text-slate-700">
                      <td className="py-4 px-6 flex items-center gap-2.5">
                        <span className="w-1.5 h-10 rounded-full" style={{ backgroundColor: SOURCE_COLORS[src.name as keyof typeof SOURCE_COLORS] }}></span>
                        <div>
                          <p className="font-bold text-slate-800">{src.name}</p>
                          <p className="text-[10px] text-slate-400">Fundo Estadual de Pelotas</p>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-right">{formatCurrency(src.initial)}</td>
                      <td className="py-4 px-4 text-right text-blue-600">
                        {formatCurrency(src.revenues + src.yields)}
                      </td>
                      <td className="py-4 px-4 text-right text-rose-600">
                        {formatCurrency(src.expenses)}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <span className="font-black text-slate-800 block">{formatCurrency(src.final)}</span>
                        <span className={`text-[10px] font-bold flex items-center justify-end gap-0.5 ${hasIncrease ? 'text-emerald-600' : 'text-rose-500'}`}>
                          {hasIncrease ? '▲' : '▼'} {(((src.final - src.initial) / (src.initial || 1)) * 100).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Executive Insights & Audit Alerts (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-blue-600">
              <Sparkles className="w-5 h-5" />
              <h3 className="text-base font-black text-slate-800">Insights do Exercício</h3>
            </div>

            <div className="space-y-3.5 pt-2">
              <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-xs leading-relaxed text-slate-700">
                <p className="font-bold text-blue-900 mb-0.5 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" /> Maior Concentração de Gastos
                </p>
                O bloco de <strong className="text-blue-950 font-black">{topExpCategory?.name}</strong> representa o maior volume de despesas liquidadas, totalizando <strong className="text-blue-950 font-black">{formatCurrency(topExpCategory?.despesas)}</strong>.
              </div>

              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs leading-relaxed text-slate-700">
                <p className="font-bold text-emerald-900 mb-0.5 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Rentabilidade do Caixa
                </p>
                Os rendimentos financeiros das contas geraram uma receita acessória de <strong className="text-emerald-950 font-black">{formatCurrency(totalYields)}</strong> no período, mitigando o impacto das despesas.
              </div>

              <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 text-xs leading-relaxed text-slate-700">
                <p className="font-bold text-amber-900 mb-0.5 flex items-center gap-1">
                  <Percent className="w-3.5 h-3.5" /> Ritmo de Investimento
                </p>
                A taxa de execução financeira geral ficou em <strong className="text-amber-950 font-black">{executionRate.toFixed(1)}%</strong>, indicando um ritmo saudável de liquidação de convênios de saúde.
              </div>
            </div>
          </div>

          <button 
            onClick={onAddData}
            className="w-full mt-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
          >
            Filtros & Análise Detalhada
          </button>
        </div>

      </div>

    </div>
  );
};
