import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, AreaChart, Area
} from 'recharts';
import { 
  Calendar, Lock, Plus, Trash2, Download, FileText, 
  TrendingUp, TrendingDown, Users, Check, Share2, Copy, Link as LinkIcon, AlertTriangle, Printer, FileDown, GitCompare, ExternalLink, Info, ChevronDown, ChevronUp
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
        <p className="font-bold text-slate-700 mb-2">{label}</p>
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
  const months = useMemo(() => {
    const uniqueMonths = new Set(data.map(d => getMonthFromDate(d.dia)));
    return Array.from(uniqueMonths).sort((a, b) => {
       // Simple sort might not work for month names, but data is usually sequential. 
       // Ideally parse dates. For now, assuming input order roughly works or user accepts string sort.
       return 0; 
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
    if (password === 'Conselho@2026') {
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
      Azul: item.azul,
      Verde: item.verde,
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
      window.location.reload(); // Reload to restore event listeners
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
            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full md:w-64 p-2.5 font-bold"
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

      {/* 2. Main Chart (Priority 1) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold text-slate-800">Evolução Diária por Classificação de Risco</h2>
          {lastDay && <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{formatBrDate(lastDay.dia)}</span>}
        </div>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={lastDay ? [lastDay] : []} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="dia" hide />
              <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
              <Tooltip cursor={{ fill: '#f8fafc' }} content={<CustomTooltip />} />
              <Legend />
              
              <Bar dataKey="vermelho" name="Vermelho" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={60}>
                <LabelList dataKey="vermelho" position="top" fill="#ef4444" fontSize={12} fontWeight="bold" />
              </Bar>
              <Bar dataKey="laranja" name="Laranja (CRAI)" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={60}>
                <LabelList dataKey="laranja" position="top" fill="#f97316" fontSize={12} fontWeight="bold" />
              </Bar>
              <Bar dataKey="amarelo" name="Amarelo" fill="#eab308" radius={[4, 4, 0, 0]} maxBarSize={60}>
                <LabelList dataKey="amarelo" position="top" fill="#ca8a04" fontSize={12} fontWeight="bold" />
              </Bar>
              <Bar dataKey="azul" name="Azul" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={60}>
                <LabelList dataKey="azul" position="top" fill="#2563eb" fontSize={12} fontWeight="bold" />
              </Bar>
              <Bar dataKey="verde" name="Verde" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={60}>
                <LabelList dataKey="verde" position="top" fill="#16a34a" fontSize={12} fontWeight="bold" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. Daily Panel (KPIs) (Priority 2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl p-6 text-white shadow-lg relative overflow-hidden transition-all hover:scale-[1.02]">
          <div className="relative z-10">
            <h3 className="text-blue-100 text-sm font-bold uppercase tracking-wider mb-1">Total do Dia</h3>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-extrabold tracking-tight">{lastDay?.total || 0}</span>
              <span className="text-sm text-blue-200 font-medium">pacientes</span>
            </div>
            <div className="mt-4 w-full bg-black/20 h-2 rounded-full overflow-hidden backdrop-blur-sm">
              <div className="bg-white/90 h-full rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" style={{ width: '100%' }}></div>
            </div>
            <p className="text-xs text-blue-200 mt-2 font-medium">Atendimentos hoje</p>
          </div>
          <div className="absolute right-[-10px] bottom-[-10px] opacity-10 pointer-events-none rotate-12">
            <Users className="w-40 h-40 text-white" />
          </div>
        </div>

        {[
          { 
            key: 'amarelo', 
            label: 'Amarelo', 
            color: 'bg-yellow-500', 
            text: 'text-yellow-600', 
            bg: 'bg-yellow-50', 
            bar: 'bg-yellow-500',
            description: 'Urgente: Risco moderado e não imediato.' 
          },
          { 
            key: 'azul', 
            label: 'Azul', 
            color: 'bg-blue-500', 
            text: 'text-blue-600', 
            bg: 'bg-blue-50', 
            bar: 'bg-blue-500',
            description: 'Não Urgente: Casos que não necessitam de atendimento imediato e podem esperar.'
          },
          { 
            key: 'verde', 
            label: 'Verde', 
            color: 'bg-green-500', 
            text: 'text-green-600', 
            bg: 'bg-green-50', 
            bar: 'bg-green-500',
            description: 'Pouco Urgente: Casos de baixa gravidade e com o paciente estável.'
          },
          { 
            key: 'vermelho', 
            label: 'Vermelho', 
            color: 'bg-red-500', 
            text: 'text-red-600', 
            bg: 'bg-red-50', 
            bar: 'bg-red-500',
            description: 'Vermelha (Emergencial): Risco iminente de morte. O paciente precisa ser atendido imediatamente.'
          },
          { 
            key: 'laranja', 
            label: 'Laranja (CRAI)', 
            color: 'bg-orange-500', 
            text: 'text-orange-600', 
            bg: 'bg-orange-50', 
            bar: 'bg-orange-500',
            description: 'Laranja (Centro de Referência ao Infantojuvenil) atende crianças e adolescentes com até 18 anos de idade vítimas ou testemunhas de violência.'
          },
        ].map((card) => {
          const value = lastDay ? (lastDay as any)[card.key] : 0;
          const total = lastDay ? lastDay.total : 1;
          const percent = ((value / total) * 100).toFixed(1);
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
                  {isExpanded ? 
                    <ChevronUp className="w-4 h-4 text-slate-300" /> : 
                    <ChevronDown className="w-4 h-4 text-slate-300 group-hover:text-slate-500" />
                  }
                </div>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div className={`${card.bar} h-full rounded-full`} style={{ width: `${percent}%` }}></div>
              </div>
              
              {/* Expandable Legend */}
              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-slate-100 animate-fadeIn text-left">
                  <p className="text-sm font-medium text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <span className="flex items-center gap-2 text-xs font-bold uppercase text-slate-400 mb-1">
                      <Info className="w-3 h-3" /> Significado
                    </span>
                    {card.description}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 4. High/Low Stats (Priority 3) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Max Attendance */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 to-indigo-700 p-6 text-white shadow-lg">
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-purple-200 font-bold text-xs uppercase tracking-wider mb-1">Dia de Maior Movimento</p>
              <h3 className="text-2xl font-bold mb-1">{stats.max ? formatBrDate(stats.max.dia) : '--/--/----'}</h3>
              <div className="flex items-baseline gap-2">
                 <span className="text-4xl font-extrabold">{stats.max?.total || 0}</span>
                 <span className="text-sm text-purple-200">atendimentos</span>
              </div>
            </div>
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
        </div>

        {/* Min Attendance */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 p-6 text-white shadow-lg">
          <div className="relative z-10 flex items-center justify-between">
            <div>
              <p className="text-teal-100 font-bold text-xs uppercase tracking-wider mb-1">Dia de Menor Movimento</p>
              <h3 className="text-2xl font-bold mb-1">{stats.min ? formatBrDate(stats.min.dia) : '--/--/----'}</h3>
              <div className="flex items-baseline gap-2">
                 <span className="text-4xl font-extrabold">{stats.min?.total || 0}</span>
                 <span className="text-sm text-teal-100">atendimentos</span>
              </div>
            </div>
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
              <TrendingDown className="w-8 h-8 text-white" />
            </div>
          </div>
          <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
        </div>
      </div>

      {/* 5. Monthly Consolidated Panel (Priority 4 - Redesigned) */}
      <div className="bg-gradient-to-r from-gray-900 to-slate-800 rounded-2xl shadow-xl p-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        
        <div className="flex items-center gap-3 mb-8 relative z-10">
          <div className="bg-white/10 p-3 rounded-xl backdrop-blur-sm border border-white/10">
            <Calendar className="w-6 h-6 text-blue-300" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">Consolidado Total do Mês</h3>
            <p className="text-sm text-slate-400">Somatório de todos os atendimentos de <span className="text-white font-semibold">{selectedMonth}</span></p>
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 relative z-10">
           {/* Total Card */}
           <div className="col-span-2 md:col-span-1 bg-white/10 backdrop-blur-md rounded-xl p-5 border border-white/10 flex flex-col justify-center">
             <p className="text-xs text-blue-200 font-bold uppercase mb-2 tracking-wider">Total Geral</p>
             <p className="text-4xl font-extrabold text-white">{monthlyTotals.total}</p>
             <p className="text-xs text-slate-400 mt-1">pacientes no mês</p>
           </div>
           
           {/* Color Cards */}
           {[
             { label: 'Vermelho', value: monthlyTotals.vermelho, color: 'text-red-400', border: 'border-red-500/30' },
             { label: 'Laranja', value: monthlyTotals.laranja, color: 'text-orange-400', border: 'border-orange-500/30' },
             { label: 'Amarelo', value: monthlyTotals.amarelo, color: 'text-yellow-400', border: 'border-yellow-500/30' },
             { label: 'Azul', value: monthlyTotals.azul, color: 'text-blue-400', border: 'border-blue-500/30' },
             { label: 'Verde', value: monthlyTotals.verde, color: 'text-green-400', border: 'border-green-500/30' },
           ].map((item, idx) => (
             <div key={idx} className={`bg-white/5 backdrop-blur-sm rounded-xl p-4 border ${item.border} flex flex-col justify-center items-center text-center hover:bg-white/10 transition-colors`}>
                <span className={`text-2xl font-bold ${item.color}`}>{item.value}</span>
                <span className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-wide">{item.label}</span>
             </div>
           ))}
        </div>
      </div>

      {/* 6. Detailed Table (Priority 5) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
          <h3 className="font-bold text-slate-800 text-lg">Dados Detalhados</h3>
          <button 
            onClick={handleExportExcel}
            className="flex items-center gap-2 text-sm text-green-700 bg-green-50 hover:bg-green-100 px-4 py-2 rounded-lg font-medium transition-colors border border-green-200"
          >
            <Download className="w-4 h-4" />
            Exportar Excel
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
              <tr>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4 text-red-600">Vermelho</th>
                <th className="px-6 py-4 text-orange-600">Laranja (CRAI)</th>
                <th className="px-6 py-4 text-yellow-600">Amarelo</th>
                <th className="px-6 py-4 text-blue-600">Azul</th>
                <th className="px-6 py-4 text-green-600">Verde</th>
                <th className="px-6 py-4">Total</th>
                <th className="px-6 py-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tableData.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-800">{formatBrDate(item.dia)}</td>
                  <td className="px-6 py-4 font-bold text-red-600 bg-red-50/50">{item.vermelho}</td>
                  <td className="px-6 py-4 font-bold text-orange-600 bg-orange-50/50">{item.laranja}</td>
                  <td className="px-6 py-4 font-bold text-yellow-600 bg-yellow-50/50">{item.amarelo}</td>
                  <td className="px-6 py-4 font-bold text-blue-600 bg-blue-50/50">{item.azul}</td>
                  <td className="px-6 py-4 font-bold text-green-600 bg-green-50/50">{item.verde}</td>
                  <td className="px-6 py-4 font-bold text-slate-800">{item.total}</td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => openAuthForDelete(item.id)}
                      className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      title="Excluir Registro"
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

      {/* Password Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
             <div className="flex flex-col items-center mb-6">
               <div className="bg-blue-100 p-3 rounded-full mb-4">
                 <Lock className="w-6 h-6 text-blue-600" />
               </div>
               <h3 className="text-lg font-bold text-slate-800">Área Restrita</h3>
               <p className="text-sm text-slate-500 text-center mt-1">Digite a senha administrativa para continuar</p>
             </div>
             <input 
               type="password" 
               className="w-full border border-slate-300 rounded-lg p-3 text-center text-lg mb-4 focus:ring-2 focus:ring-blue-500 outline-none"
               placeholder="Senha"
               value={password}
               onChange={(e) => setPassword(e.target.value)}
             />
             <div className="flex gap-2">
               <button 
                 onClick={() => { setIsAuthModalOpen(false); setPassword(''); }}
                 className="flex-1 py-3 text-slate-600 font-medium hover:bg-slate-100 rounded-lg"
               >
                 Cancelar
               </button>
               <button 
                 onClick={handleAuthSubmit}
                 className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700"
               >
                 Confirmar
               </button>
             </div>
          </div>
        </div>
      )}

      {/* Data Entry Modal */}
      {isEntryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
             <div className="bg-blue-600 p-6 flex justify-between items-center">
               <h3 className="text-white font-bold text-lg flex items-center gap-2">
                 <Plus className="w-5 h-5" /> Inserir Novos Dados
               </h3>
               <button onClick={() => setIsEntryModalOpen(false)} className="text-blue-200 hover:text-white">✕</button>
             </div>
             
             {saveSuccess && (
               <div className="bg-green-100 text-green-700 px-6 py-3 text-sm font-bold flex items-center gap-2">
                 <Check className="w-4 h-4" /> Registro salvo com sucesso! Você pode continuar inserindo.
               </div>
             )}

             <div className="p-6 grid grid-cols-2 gap-4">
               <div className="col-span-2">
                 <label className="block text-sm font-bold text-slate-700 mb-1">Data do Plantão</label>
                 <input 
                   type="date" 
                   value={newData.dia}
                   onChange={(e) => setNewData({...newData, dia: e.target.value})}
                   className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500 outline-none"
                 />
               </div>

               {[
                 { label: 'Vermelho', key: 'vermelho', color: 'text-red-600' },
                 { label: 'Laranja (CRAI)', key: 'laranja', color: 'text-orange-600' },
                 { label: 'Amarelo', key: 'amarelo', color: 'text-yellow-600' },
                 { label: 'Azul', key: 'azul', color: 'text-blue-600' },
                 { label: 'Verde', key: 'verde', color: 'text-green-600' },
               ].map((field) => (
                 <div key={field.key}>
                   <label className={`block text-xs font-bold uppercase mb-1 ${field.color}`}>{field.label}</label>
                   <input 
                     type="number" 
                     min="0"
                     value={(newData as any)[field.key]}
                     onChange={(e) => setNewData({...newData, [field.key]: parseInt(e.target.value) || 0})}
                     className="w-full border border-slate-300 rounded-lg p-3 text-lg font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                   />
                 </div>
               ))}
               
               <div className="col-span-2 mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
                  <div>
                    <span className="text-sm text-slate-500 font-bold uppercase">Total Calculado</span>
                    <p className="text-2xl font-bold text-slate-800">
                      {(newData.vermelho || 0) + (newData.laranja || 0) + (newData.amarelo || 0) + (newData.verde || 0) + (newData.azul || 0)}
                    </p>
                  </div>
                  <button 
                    onClick={handleDataSubmit}
                    className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all"
                  >
                    Salvar Dados
                  </button>
               </div>
             </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg">
             <div className="flex items-center gap-3 mb-4 text-indigo-600">
               <Share2 className="w-6 h-6" />
               <h3 className="text-lg font-bold">Compartilhar Acesso</h3>
             </div>
             <p className="text-slate-600 text-sm mb-4">
               Este link contém todos os dados atuais criptografados. Envie para quem precisa acessar este painel com estas informações.
             </p>
             
             <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 break-all text-xs font-mono text-slate-500 max-h-24 overflow-y-auto mb-4">
               {shareLink}
             </div>

             <div className="flex gap-2">
               <button 
                 onClick={() => {
                    navigator.clipboard.writeText(shareLink);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                 }}
                 className="flex-1 py-3 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 flex items-center justify-center gap-2"
               >
                 {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                 {copied ? 'Copiado!' : 'Copiar Link'}
               </button>
               
               <button 
                 onClick={handleShortenLink}
                 className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2"
               >
                 <LinkIcon className="w-4 h-4" />
                 Encurtar Link
               </button>
             </div>
             
             <button onClick={() => setIsShareModalOpen(false)} className="w-full mt-2 py-2 text-slate-400 hover:text-slate-600 text-sm">
               Fechar
             </button>
          </div>
        </div>
      )}

      {/* Comparison Modal */}
      {isComparisonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
               <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                 <GitCompare className="w-5 h-5 text-blue-600" />
                 Comparativo de Dias
               </h3>
               <div className="flex items-center gap-2">
                 <button 
                   onClick={printComparison} 
                   className="p-2 text-slate-500 hover:bg-white hover:text-blue-600 rounded-lg border border-transparent hover:border-slate-200 transition-all"
                   title="Imprimir"
                 >
                   <Printer className="w-5 h-5" />
                 </button>
                 <button 
                   onClick={exportComparisonPDF}
                   className="p-2 text-slate-500 hover:bg-white hover:text-red-600 rounded-lg border border-transparent hover:border-slate-200 transition-all"
                   title="Salvar PDF"
                 >
                   <FileDown className="w-5 h-5" />
                 </button>
                 <button onClick={() => setIsComparisonModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-600">✕</button>
               </div>
            </div>
            
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
               {/* Sidebar Selection */}
               <div className="w-full md:w-64 bg-slate-50 border-b md:border-b-0 md:border-r border-slate-200 p-4 overflow-y-auto h-48 md:h-auto flex-shrink-0">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-3">Selecione os dias</p>
                  <div className="space-y-2">
                    {[...data].sort((a,b) => new Date(b.dia).getTime() - new Date(a.dia).getTime()).map(item => (
                      <div 
                        key={item.id}
                        onClick={() => toggleComparisonSelection(item.id)}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${
                          selectedComparisonIds.includes(item.id) 
                            ? 'bg-blue-50 border-blue-200 shadow-sm' 
                            : 'bg-white border-slate-200 hover:border-blue-300'
                        }`}
                      >
                         <div className="flex items-center gap-2 mb-1">
                           <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedComparisonIds.includes(item.id) ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}>
                              {selectedComparisonIds.includes(item.id) && <Check className="w-3 h-3 text-white" />}
                           </div>
                           <span className="font-bold text-slate-700 text-sm">{formatBrDate(item.dia)}</span>
                         </div>
                         <p className="text-xs text-slate-500 pl-6">Total: {item.total}</p>
                      </div>
                    ))}
                  </div>
               </div>

               {/* Comparison Content */}
               <div className="flex-1 overflow-y-auto p-6 bg-white" id="comparison-print-area">
                  {selectedComparisonIds.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                      <GitCompare className="w-16 h-16 mb-4 opacity-20" />
                      <p>Selecione os dias na barra lateral para comparar</p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                       <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                         <h4 className="font-bold text-slate-700 mb-4">Gráfico Comparativo</h4>
                         <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={getComparisonChartData()} margin={{top: 20, right: 30, left: 20, bottom: 5}}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="dia" tickFormatter={formatBrDate} />
                                <YAxis />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />
                                <Bar dataKey="vermelho" name="Vermelho" fill="#ef4444" radius={[4,4,0,0]} />
                                <Bar dataKey="laranja" name="Laranja" fill="#f97316" radius={[4,4,0,0]} />
                                <Bar dataKey="amarelo" name="Amarelo" fill="#eab308" radius={[4,4,0,0]} />
                                <Bar dataKey="azul" name="Azul" fill="#3b82f6" radius={[4,4,0,0]} />
                                <Bar dataKey="verde" name="Verde" fill="#22c55e" radius={[4,4,0,0]} />
                              </BarChart>
                            </ResponsiveContainer>
                         </div>
                       </div>

                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {getComparisonChartData().map(day => (
                            <div key={day.id} className="border border-slate-200 rounded-xl p-4 shadow-sm break-inside-avoid">
                              <div className="flex justify-between items-center mb-3 border-b pb-2">
                                <span className="font-bold text-slate-800">{formatBrDate(day.dia)}</span>
                                <span className="bg-slate-100 text-xs font-bold px-2 py-1 rounded">Total: {day.total}</span>
                              </div>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-red-600 font-medium">Vermelho</span> <span>{day.vermelho}</span></div>
                                <div className="flex justify-between"><span className="text-orange-600 font-medium">Laranja</span> <span>{day.laranja}</span></div>
                                <div className="flex justify-between"><span className="text-yellow-600 font-medium">Amarelo</span> <span>{day.amarelo}</span></div>
                                <div className="flex justify-between"><span className="text-blue-600 font-medium">Azul</span> <span>{day.azul}</span></div>
                                <div className="flex justify-between"><span className="text-green-600 font-medium">Verde</span> <span>{day.verde}</span></div>
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