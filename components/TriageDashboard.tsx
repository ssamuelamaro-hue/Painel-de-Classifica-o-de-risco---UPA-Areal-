
import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, AreaChart, Area
} from 'recharts';
import { 
  Calendar, Lock, Plus, Trash2, Download, FileText, 
  TrendingUp, TrendingDown, Users, Check, Share2, Copy, Link as LinkIcon, AlertTriangle, Printer, FileDown, GitCompare, ExternalLink, Info, ChevronDown, ChevronUp, BarChart3
} from 'lucide-react';
import { TriageData } from '../types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import LZString from 'lz-string';

interface TriageDashboardProps {
  data: TriageData[];
  onAddData: (newData: TriageData) => void;
  onDeleteData: (id: string) => void;
}

const formatBrDate = (dateString: string) => {
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

const getMonthFromDate = (dateString: string) => {
  const [year, month] = dateString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
};

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg text-sm z-50">
        <p className="font-bold text-slate-700 mb-2">{label ? formatBrDate(label) : ''}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-500 capitalize">{entry.name}:</span>
            <span className="font-medium text-slate-700">{entry.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const TriageDashboard: React.FC<TriageDashboardProps> = ({ data, onAddData, onDeleteData }) => {
  // --- STATE ---
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isComparisonModalOpen, setIsComparisonModalOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'add' | 'delete' | 'share'>('add');
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [newData, setNewData] = useState<Partial<TriageData>>({
    dia: new Date().toISOString().split('T')[0],
    vermelho: 0, laranja: 0, amarelo: 0, verde: 0, azul: 0
  });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedComparisonIds, setSelectedComparisonIds] = useState<string[]>([]);
  const [activeLegend, setActiveLegend] = useState<string | null>(null);
  
  // --- DERIVED DATA ---
  // Fix: Improved sorting logic to handle localized month strings correctly and fix TS errors
  const months = useMemo(() => {
    // We map localized month names to a sample ISO date from the dataset to ensure correct sorting
    const monthToDateMap = new Map<string, string>();
    data.forEach(item => {
      const localizedMonth = getMonthFromDate(item.dia);
      if (!monthToDateMap.has(localizedMonth)) {
        monthToDateMap.set(localizedMonth, item.dia);
      }
    });

    return Array.from(monthToDateMap.keys()).sort((a: string, b: string) => {
      const dateA = new Date(monthToDateMap.get(a) as string).getTime();
      const dateB = new Date(monthToDateMap.get(b) as string).getTime();
      return dateA - dateB;
    });
  }, [data]);

  useEffect(() => {
    if (months.length > 0 && !selectedMonth) {
      setSelectedMonth(months[months.length - 1]); // Default to latest month
    }
  }, [months, selectedMonth]);

  const filteredData = useMemo(() => {
    if (!selectedMonth) return data;
    return data.filter(d => getMonthFromDate(d.dia) === selectedMonth).sort((a,b) => new Date(a.dia).getTime() - new Date(b.dia).getTime());
  }, [data, selectedMonth]);

  // Last Day Data (for Charts/KPIs)
  const lastDay = filteredData.length > 0 ? filteredData[filteredData.length - 1] : null;

  // Monthly Totals
  const monthlyTotals = useMemo(() => {
    return filteredData.reduce((acc, curr) => ({
      vermelho: acc.vermelho + curr.vermelho,
      laranja: acc.laranja + curr.laranja,
      amarelo: acc.amarelo + curr.amarelo,
      verde: acc.verde + curr.verde,
      azul: acc.azul + curr.azul,
      total: acc.total + curr.total,
    }), { vermelho: 0, laranja: 0, amarelo: 0, verde: 0, azul: 0, total: 0 });
  }, [filteredData]);

  // High/Low Stats
  const stats = useMemo(() => {
    if (filteredData.length === 0) return { max: null, min: null };
    const sortedByTotal = [...filteredData].sort((a, b) => b.total - a.total);
    return {
      max: sortedByTotal[0],
      min: sortedByTotal[sortedByTotal.length - 1]
    };
  }, [filteredData]);

  // Table Data (Reverse Order)
  const tableData = [...filteredData].sort((a, b) => new Date(b.dia).getTime() - new Date(a.dia).getTime());

  // --- ACTIONS ---
  
  const handleAuthSubmit = () => {
    // UPDATED PASSWORD: Conselho@2027#
    if (password === 'Conselho@2027#') {
      setIsAuthModalOpen(false);
      setPassword('');
      if (authMode === 'add') setIsEntryModalOpen(true);
      if (authMode === 'delete' && itemToDelete) {
        onDeleteData(itemToDelete);
        setItemToDelete(null);
      }
      if (authMode === 'share') {
        generateShareLink();
        setIsShareModalOpen(true);
      }
    } else {
      alert('Senha incorreta');
    }
  };

  const openAuthForAdd = () => {
    setAuthMode('add');
    setIsAuthModalOpen(true);
  };

  const openAuthForDelete = (id: string) => {
    setAuthMode('delete');
    setItemToDelete(id);
    setIsAuthModalOpen(true);
  };

  const openAuthForShare = () => {
    setAuthMode('share');
    setIsAuthModalOpen(true);
  };

  const handleDataSubmit = () => {
    if (newData.dia) {
      const total = (newData.vermelho || 0) + (newData.laranja || 0) + (newData.amarelo || 0) + (newData.verde || 0) + (newData.azul || 0);
      onAddData({
        id: Date.now().toString(),
        dia: newData.dia,
        vermelho: newData.vermelho || 0,
        laranja: newData.laranja || 0,
        amarelo: newData.amarelo || 0,
        verde: newData.verde || 0,
        azul: newData.azul || 0,
        total
      });
      setNewData(prev => ({ ...prev, vermelho: 0, laranja: 0, amarelo: 0, verde: 0, azul: 0 }));
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data.map(item => ({
      Data: formatBrDate(item.dia),
      Vermelho: item.vermelho,
      'Laranja (CRAI)': item.laranja,
      Amarelo: item.amarelo,
      Verde: item.verde,
      Azul: item.azul,
      Total: item.total
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dados Triagem");
    XLSX.writeFile(wb, "relatorio_triagem.xlsx");
  };

  const generateShareLink = () => {
    const json = JSON.stringify(data);
    const compressed = LZString.compressToEncodedURIComponent(json);
    const url = new URL(window.location.href);
    url.searchParams.set('data', compressed);
    setShareLink(url.toString());
  };

  const handleShortenLink = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      window.open('https://www.encurtador.com.br/', '_blank');
    } catch (err) {
      alert('Não foi possível copiar o link automaticamente. Por favor, copie manualmente.');
    }
  };

  const toggleComparisonSelection = (id: string) => {
    setSelectedComparisonIds(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const getComparisonChartData = () => {
    return data
      .filter(d => selectedComparisonIds.includes(d.id))
      .sort((a,b) => new Date(a.dia).getTime() - new Date(b.dia).getTime());
  };

  const printComparison = () => {
    const printContent = document.getElementById('comparison-print-area');
    const originalContent = document.body.innerHTML;
    
    if (printContent) {
      document.body.innerHTML = printContent.innerHTML;
      window.print();
      document.body.innerHTML = originalContent;
      window.location.reload();
    }
  };

  const exportComparisonPDF = () => {
    const input = document.getElementById('comparison-print-area');
    if (input) {
      html2canvas(input).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF('l', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save("comparativo_triagem.pdf");
      });
    }
  };

  return (
    <div className="flex flex-col gap-6 font-sans">
      
      {/* 1. Header & Actions */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <Calendar className="w-5 h-5 text-blue-600" />
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full md:w-64 p-2.5 font-bold outline-none"
          >
            {months.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button 
            onClick={() => setIsComparisonModalOpen(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <GitCompare className="w-4 h-4" />
            Comparar Dias
          </button>
          <button 
            onClick={openAuthForShare}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Compartilhar
          </button>
          <button 
            onClick={openAuthForAdd}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            <Lock className="w-4 h-4" />
            Inserir Dados
          </button>
        </div>
      </div>

      {/* 2. Main Daily KPIs Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Total Day Card */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-6 text-white shadow-lg relative overflow-hidden transition-all hover:scale-[1.01]">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-blue-100 text-sm font-bold uppercase tracking-wider">Último Registro</h3>
              {lastDay && (
                <span className="bg-white/20 border border-white/10 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-sm">
                  {formatBrDate(lastDay.dia)}
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-extrabold tracking-tight">{lastDay?.total || 0}</span>
              <span className="text-sm text-blue-200 font-medium">atendimentos</span>
            </div>
            <div className="mt-4 w-full bg-black/20 h-2 rounded-full overflow-hidden backdrop-blur-sm">
              <div className="bg-white/90 h-full rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ width: '100%' }}></div>
            </div>
            <p className="text-xs text-blue-200 mt-2 font-medium">Volume total do último plantão</p>
          </div>
          <div className="absolute right-[-10px] bottom-[-10px] opacity-10 pointer-events-none rotate-12">
            <Users className="w-40 h-40 text-white" />
          </div>
        </div>

        {/* Individual Color Cards */}
        {[
          { 
            key: 'vermelho', label: 'Vermelho', color: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50', bar: 'bg-red-500',
            description: 'Vermelha (Emergencial): Risco iminente de morte. O paciente precisa ser atendido imediatamente.'
          },
          { 
            key: 'laranja', label: 'Laranja (CRAI)', color: 'bg-orange-500', text: 'text-orange-600', bg: 'bg-orange-50', bar: 'bg-orange-500',
            description: 'Laranja (CRAI): Centro de Referência ao Infantojuvenil atende crianças/adolescentes vítimas de violência.'
          },
          { 
            key: 'amarelo', label: 'Amarelo', color: 'bg-yellow-500', text: 'text-yellow-600', bg: 'bg-yellow-50', bar: 'bg-yellow-500',
            description: 'Urgente: Risco moderado e não imediato.' 
          },
          { 
            key: 'verde', label: 'Verde', color: 'bg-green-500', text: 'text-green-600', bg: 'bg-green-50', bar: 'bg-green-500',
            description: 'Pouco Urgente: Casos de baixa gravidade e com o paciente estável.'
          },
          { 
            key: 'azul', label: 'Azul', color: 'bg-blue-500', text: 'text-blue-600', bg: 'bg-blue-50', bar: 'bg-blue-500',
            description: 'Não Urgente: Casos que não necessitam de atendimento imediato.'
          },
        ].map((card) => {
          const value = lastDay ? (lastDay as any)[card.key] : 0;
          const total = lastDay ? lastDay.total : 1;
          const percent = ((value / (total || 1)) * 100).toFixed(1);
          const isExpanded = activeLegend === card.key;
          
          return (
            <div 
              key={card.key} 
              onClick={() => setActiveLegend(isExpanded ? null : card.key)}
              className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all cursor-pointer group"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className={`text-sm font-bold uppercase tracking-wider mb-1 ${card.text}`}>{card.label}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-slate-800">{value}</span>
                    <span className="text-xs text-slate-400 font-medium">pacientes</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={`p-2 rounded-lg ${card.bg}`}>
                    <div className={`w-4 h-4 rounded-full ${card.color}`}></div>
                  </div>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-300" /> : <ChevronDown className="w-4 h-4 text-slate-300" />}
                </div>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className={`${card.bar} h-full rounded-full`} style={{ width: `${percent}%` }}></div>
              </div>
              
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-slate-100 animate-fadeIn text-left">
                  <p className="text-xs font-medium text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg">
                    {card.description}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. High/Low Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 p-6 text-white shadow-lg">
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-purple-200 font-bold text-xs uppercase tracking-wider mb-1">Pico de Movimento</p>
              <h3 className="text-2xl font-bold mb-1">{stats.max ? formatBrDate(stats.max.dia) : '--/--/----'}</h3>
              <div className="flex items-baseline gap-2">
                 <span className="text-4xl font-extrabold">{stats.max?.total || 0}</span>
                 <span className="text-sm text-purple-200">pacientes</span>
              </div>
            </div>
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 p-6 text-white shadow-lg">
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-teal-100 font-bold text-xs uppercase tracking-wider mb-1">Menor Movimento</p>
              <h3 className="text-2xl font-bold mb-1">{stats.min ? formatBrDate(stats.min.dia) : '--/--/----'}</h3>
              <div className="flex items-baseline gap-2">
                 <span className="text-4xl font-extrabold">{stats.min?.total || 0}</span>
                 <span className="text-sm text-teal-100">pacientes</span>
              </div>
            </div>
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
              <TrendingDown className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* 5. Monthly Consolidated */}
      <div className="bg-slate-900 rounded-2xl shadow-xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="flex items-center gap-3 mb-8">
          <div className="bg-white/10 p-3 rounded-xl border border-white/10">
            <Calendar className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Acumulado do Mês</h3>
            <p className="text-sm text-slate-400">Total de atendimentos em <span className="text-white font-semibold">{selectedMonth}</span></p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
           <div className="col-span-2 md:col-span-1 bg-blue-600/20 rounded-xl p-5 border border-blue-500/30 flex flex-col justify-center">
             <p className="text-xs text-blue-200 font-bold uppercase mb-1">Total</p>
             <p className="text-4xl font-black text-white">{monthlyTotals.total}</p>
           </div>
           
           {[
             { label: 'Vermelho', value: monthlyTotals.vermelho, color: 'text-red-400', border: 'border-red-500/30' },
             { label: 'Laranja', value: monthlyTotals.laranja, color: 'text-orange-400', border: 'border-orange-500/30' },
             { label: 'Amarelo', value: monthlyTotals.amarelo, color: 'text-yellow-400', border: 'border-yellow-500/30' },
             { label: 'Verde', value: monthlyTotals.verde, color: 'text-green-400', border: 'border-green-500/30' },
             { label: 'Azul', value: monthlyTotals.azul, color: 'text-blue-400', border: 'border-blue-500/30' },
           ].map((item, idx) => (
             <div key={idx} className={`bg-white/5 rounded-xl p-4 border ${item.border} flex flex-col justify-center items-center text-center`}>
                <span className={`text-2xl font-bold ${item.color}`}>{item.value}</span>
                <span className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-widest">{item.label}</span>
             </div>
           ))}
        </div>
      </div>

      {/* 6. Detailed Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <h3 className="font-bold text-slate-800 text-lg">Histórico de Registros</h3>
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 text-sm text-green-700 bg-green-50 hover:bg-green-100 px-4 py-2 rounded-lg font-bold border border-green-200 transition-all"
          >
            <Download className="w-4 h-4" />
            Excel
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-widest">
              <tr>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4 text-red-600">V</th>
                <th className="px-6 py-4 text-orange-600">L</th>
                <th className="px-6 py-4 text-yellow-600">Am</th>
                <th className="px-6 py-4 text-green-600">Ve</th>
                <th className="px-6 py-4 text-blue-600">Az</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-700">{formatBrDate(item.dia)}</td>
                  <td className="px-6 py-4 font-medium text-red-600">{item.vermelho}</td>
                  <td className="px-6 py-4 font-medium text-orange-600">{item.laranja}</td>
                  <td className="px-6 py-4 font-medium text-yellow-600">{item.amarelo}</td>
                  <td className="px-6 py-4 font-medium text-green-600">{item.verde}</td>
                  <td className="px-6 py-4 font-medium text-blue-600">{item.azul}</td>
                  <td className="px-6 py-4 font-black text-slate-900">{item.total}</td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => openAuthForDelete(item.id)}
                      className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MODALS --- */}

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm animate-fadeIn">
             <div className="flex flex-col items-center mb-8">
               <div className="bg-blue-100 p-4 rounded-full mb-4">
                 <Lock className="w-8 h-8 text-blue-600" />
               </div>
               <h3 className="text-xl font-black text-slate-800">Acesso Restrito</h3>
               <p className="text-sm text-slate-500 text-center mt-2">Informe a credencial administrativa para realizar operações críticas.</p>
             </div>
             <input 
               type="password" 
               className="w-full border-2 border-slate-100 rounded-xl p-4 text-center text-xl mb-6 focus:border-blue-500 outline-none transition-all font-bold"
               placeholder="Digite a Senha"
               value={password}
               autoFocus
               onKeyDown={(e) => e.key === 'Enter' && handleAuthSubmit()}
               onChange={(e) => setPassword(e.target.value)}
             />
             <div className="flex gap-3">
               <button 
                 onClick={() => { setIsAuthModalOpen(false); setPassword(''); }}
                 className="flex-1 py-4 text-slate-400 font-bold hover:bg-slate-50 rounded-xl transition-all"
               >
                 Sair
               </button>
               <button 
                 onClick={handleAuthSubmit}
                 className="flex-1 py-4 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all"
               >
                 Entrar
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Data Entry Modal */}
      {isEntryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-slideUp">
             <div className="bg-blue-600 p-6 flex justify-between items-center">
               <h3 className="text-white font-black text-xl flex items-center gap-3">
                 <Plus className="w-6 h-6" /> Novo Lançamento
               </h3>
               <button onClick={() => setIsEntryModalOpen(false)} className="text-blue-100 hover:text-white transition-colors">✕</button>
             </div>
             
             <div className="p-8">
               <div className="mb-6">
                 <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Data do Plantão</label>
                 <input 
                   type="date" 
                   value={newData.dia}
                   onChange={(e) => setNewData({...newData, dia: e.target.value})}
                   className="w-full border-2 border-slate-100 rounded-xl p-4 font-bold text-slate-700 focus:border-blue-500 outline-none"
                 />
               </div>

               <div className="grid grid-cols-2 gap-4 mb-8">
                 {[
                   { label: 'Vermelho', key: 'vermelho', color: 'border-red-500', text: 'text-red-600' },
                   { label: 'Laranja (CRAI)', key: 'laranja', color: 'border-orange-500', text: 'text-orange-600' },
                   { label: 'Amarelo', key: 'amarelo', color: 'border-yellow-500', text: 'text-yellow-600' },
                   { label: 'Verde', key: 'verde', color: 'border-green-500', text: 'text-green-600' },
                   { label: 'Azul', key: 'azul', color: 'border-blue-500', text: 'text-blue-600' },
                 ].map((field) => (
                   <div key={field.key} className={field.key === 'azul' ? 'col-span-1' : ''}>
                     <label className={`block text-[10px] font-black uppercase mb-1 ${field.text}`}>{field.label}</label>
                     <input 
                       type="number" 
                       min="0"
                       value={(newData as any)[field.key]}
                       onChange={(e) => setNewData({...newData, [field.key]: parseInt(e.target.value) || 0})}
                       className={`w-full border-2 border-slate-100 rounded-xl p-4 text-lg font-black focus:${field.color} outline-none`}
                     />
                   </div>
                 ))}
               </div>
               
               <div className="flex justify-between items-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Total Calculado</span>
                    <p className="text-3xl font-black text-slate-800">
                      {(newData.vermelho || 0) + (newData.laranja || 0) + (newData.amarelo || 0) + (newData.verde || 0) + (newData.azul || 0)}
                    </p>
                  </div>
                  <button 
                    onClick={handleDataSubmit}
                    className="bg-blue-600 text-white px-10 py-5 rounded-xl font-black hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all active:scale-95"
                  >
                    Salvar Dados
                  </button>
               </div>
               {saveSuccess && <p className="text-center text-green-600 font-bold mt-4 animate-bounce">✓ Registro Salvo!</p>}
             </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-lg">
             <div className="flex items-center gap-4 mb-6 text-indigo-600">
               <div className="p-3 bg-indigo-100 rounded-xl"><Share2 className="w-8 h-8" /></div>
               <h3 className="text-xl font-black">Link de Acesso</h3>
             </div>
             <p className="text-slate-500 text-sm mb-6 font-medium leading-relaxed">
               Este link contém os dados atuais criptografados. Utilize para espelhar este painel em outros dispositivos.
             </p>
             
             <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-100 break-all text-[10px] font-mono text-slate-400 max-h-32 overflow-y-auto mb-6 scrollbar-hide">
               {shareLink}
             </div>

             <div className="flex gap-3">
               <button 
                 onClick={() => {
                    navigator.clipboard.writeText(shareLink);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                 }}
                 className="flex-1 py-4 bg-slate-100 text-slate-700 font-black rounded-xl hover:bg-slate-200 flex items-center justify-center gap-2 transition-all"
               >
                 {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
                 {copied ? 'Copiado' : 'Copiar'}
               </button>
               
               <button 
                 onClick={handleShortenLink}
                 className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all"
               >
                 Encurtador
               </button>
             </div>
             
             <button onClick={() => setIsShareModalOpen(false)} className="w-full mt-6 py-2 text-slate-400 font-bold text-sm hover:text-slate-600">
               Fechar Janela
             </button>
          </div>
        </div>
      )}

      {/* Comparison Modal */}
      {isComparisonModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden animate-slideUp">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white z-10">
               <div className="flex items-center gap-3">
                 <div className="p-2 bg-blue-100 rounded-lg"><GitCompare className="w-5 h-5 text-blue-600" /></div>
                 <h3 className="text-xl font-black text-slate-800">Comparativo Multi-Datas</h3>
               </div>
               <div className="flex items-center gap-3">
                 <button onClick={printComparison} className="p-3 text-slate-500 hover:bg-slate-50 rounded-xl transition-all"><Printer className="w-5 h-5" /></button>
                 <button onClick={exportComparisonPDF} className="p-3 text-slate-500 hover:bg-slate-50 rounded-xl transition-all"><FileDown className="w-5 h-5" /></button>
                 <button onClick={() => setIsComparisonModalOpen(false)} className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 font-bold transition-all ml-4">✕</button>
               </div>
            </div>
            
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-50">
               <div className="w-full md:w-80 bg-white border-r border-slate-100 p-6 overflow-y-auto h-64 md:h-auto flex-shrink-0">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Selecione para Comparar</p>
                  <div className="space-y-3">
                    {[...data].sort((a,b) => new Date(b.dia).getTime() - new Date(a.dia).getTime()).map(item => (
                      <div 
                        key={item.id}
                        onClick={() => toggleComparisonSelection(item.id)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all ${
                          selectedComparisonIds.includes(item.id) 
                            ? 'bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/20' 
                            : 'bg-white border-slate-100 hover:border-blue-200'
                        }`}
                      >
                         <div className="flex items-center gap-3 mb-1">
                           <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center ${selectedComparisonIds.includes(item.id) ? 'bg-white border-white' : 'bg-slate-50 border-slate-200'}`}>
                              {selectedComparisonIds.includes(item.id) && <Check className="w-4 h-4 text-blue-600" />}
                           </div>
                           <span className="font-black text-sm">{formatBrDate(item.dia)}</span>
                         </div>
                         <p className={`text-[10px] font-bold opacity-70 ml-8`}>Total: {item.total} atendimentos</p>
                      </div>
                    ))}
                  </div>
               </div>

               <div className="flex-1 overflow-y-auto p-10 bg-slate-50" id="comparison-print-area">
                  {selectedComparisonIds.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300">
                      <BarChart3 className="w-24 h-24 mb-6 opacity-20" />
                      <p className="text-lg font-bold">Escolha os plantões para visualizar o gráfico</p>
                    </div>
                  ) : (
                    <div className="space-y-12 max-w-5xl mx-auto">
                       <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl">
                         <h4 className="font-black text-slate-800 mb-8 uppercase tracking-widest text-xs">Desempenho Comparativo</h4>
                         <div className="h-[350px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={getComparisonChartData()} margin={{top: 0, right: 0, left: -20, bottom: 0}}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="dia" tickFormatter={formatBrDate} axisLine={false} tickLine={false} stroke="#94a3b8" fontSize={10} fontVariant="bold" />
                                <YAxis axisLine={false} tickLine={false} stroke="#94a3b8" fontSize={10} />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend verticalAlign="top" align="right" height={36} iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 'bold' }} />
                                <Bar dataKey="vermelho" name="V" fill="#ef4444" radius={[6,6,0,0]} barSize={20} />
                                <Bar dataKey="laranja" name="L" fill="#f97316" radius={[6,6,0,0]} barSize={20} />
                                <Bar dataKey="amarelo" name="Am" fill="#eab308" radius={[6,6,0,0]} barSize={20} />
                                <Bar dataKey="verde" name="Ve" fill="#22c55e" radius={[6,6,0,0]} barSize={20} />
                                <Bar dataKey="azul" name="Az" fill="#3b82f6" radius={[6,6,0,0]} barSize={20} />
                              </BarChart>
                            </ResponsiveContainer>
                         </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {getComparisonChartData().map(day => (
                            <div key={day.id} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-lg break-inside-avoid border-l-8 border-l-blue-600">
                              <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-4">
                                <span className="font-black text-slate-800 text-lg">{formatBrDate(day.dia)}</span>
                                <span className="bg-blue-600 text-white text-[10px] font-black px-4 py-2 rounded-full shadow-lg shadow-blue-500/20">TOTAL: {day.total}</span>
                              </div>
                              <div className="grid grid-cols-5 gap-2 text-center">
                                <div className="p-2 bg-red-50 rounded-xl"><p className="text-[10px] font-black text-red-600 uppercase mb-1">V</p><p className="font-black text-red-700">{day.vermelho}</p></div>
                                <div className="p-2 bg-orange-50 rounded-xl"><p className="text-[10px] font-black text-orange-600 uppercase mb-1">L</p><p className="font-black text-orange-700">{day.laranja}</p></div>
                                <div className="p-2 bg-yellow-50 rounded-xl"><p className="text-[10px] font-black text-yellow-600 uppercase mb-1">Am</p><p className="font-black text-yellow-700">{day.amarelo}</p></div>
                                <div className="p-2 bg-green-50 rounded-xl"><p className="text-[10px] font-black text-green-600 uppercase mb-1">Ve</p><p className="font-black text-green-700">{day.verde}</p></div>
                                <div className="p-2 bg-blue-50 rounded-xl"><p className="text-[10px] font-black text-blue-600 uppercase mb-1">Az</p><p className="font-black text-blue-700">{day.azul}</p></div>
                              </div>
                            </div>
                          ))}
                       </div>
                    </div>
                  )}
               </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TriageDashboard;
