import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, TooltipProps
} from 'recharts';
import { TriageData } from '../types';
import { LayoutDashboard, Calendar, Lock, Plus, X, Save, AlertCircle, Trash2, FileSpreadsheet, Share2, Copy, Check, Link as LinkIcon, Loader2, GitCompare, ArrowRightLeft, Printer, FileDown, TrendingUp, TrendingDown, Activity, Award, BarChart3, CalendarDays, Filter, Calculator } from 'lucide-react';
import * as XLSX from 'xlsx';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

interface TriageDashboardProps {
  data: TriageData[];
  onAddData: (data: TriageData) => void;
  onDeleteData: (id: string) => void;
}

const CustomTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-xl shadow-xl border border-slate-100 text-xs min-w-[200px] z-50">
        <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <p className="font-semibold text-slate-700">{label}</p>
        </div>
        <div className="space-y-2">
          {[...payload].map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
                <span className="text-slate-500 font-medium capitalize">{entry.name}</span>
              </div>
              <span className="font-bold text-slate-700">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

const TriageDashboard: React.FC<TriageDashboardProps> = ({ data, onAddData, onDeleteData }) => {
  // State for Modals
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);

  // Shortener States
  const [shortUrl, setShortUrl] = useState<string | null>(null);
  const [isShortening, setIsShortening] = useState(false);

  // State for Authentication Context ('add', 'delete', or 'share')
  const [authMode, setAuthMode] = useState<'add' | 'delete' | 'share' | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // Comparison State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Month Selection State
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // State for New Entry Form
  const [newEntry, setNewEntry] = useState({
    dia: new Date().toISOString().split('T')[0],
    vermelho: 0,
    laranja: 0,
    amarelo: 0,
    verde: 0,
    azul: 0
  });

  // Extract available months from data
  const availableMonths = useMemo(() => {
    const months = new Set(data.map(item => item.dia.substring(0, 7))); // YYYY-MM
    return Array.from(months).sort().reverse();
  }, [data]);

  // Set default month if none selected
  useEffect(() => {
    if (!selectedMonth && availableMonths.length > 0) {
      setSelectedMonth(availableMonths[0]);
    }
  }, [availableMonths, selectedMonth]);

  // Filter Data by Selected Month
  const filteredData = useMemo(() => {
    if (!selectedMonth) return data;
    return data.filter(item => item.dia.startsWith(selectedMonth));
  }, [data, selectedMonth]);

  // Filter data for the chart: only the last registered date OF THE SELECTED MONTH
  const sortedData = [...filteredData].sort((a, b) => new Date(a.dia).getTime() - new Date(b.dia).getTime());
  const chartData = sortedData.slice(-1);
  
  // Data for table (descending order - newest first)
  const tableData = [...sortedData].reverse();
  
  // Get the last day's data for the KPI cards
  const lastDay = chartData[0] || { 
    dia: '', 
    vermelho: 0, 
    laranja: 0, 
    amarelo: 0, 
    verde: 0, 
    azul: 0, 
    total: 0, 
    id: '' 
  };

  // Calculate Monthly Totals (Consolidated)
  const monthlyTotals = useMemo(() => {
    return filteredData.reduce((acc, curr) => ({
      vermelho: acc.vermelho + curr.vermelho,
      laranja: acc.laranja + curr.laranja,
      amarelo: acc.amarelo + curr.amarelo,
      verde: acc.verde + curr.verde,
      azul: acc.azul + curr.azul,
      total: acc.total + curr.total
    }), { vermelho: 0, laranja: 0, amarelo: 0, verde: 0, azul: 0, total: 0 });
  }, [filteredData]);

  // Calculate Max and Min Attendance FOR SELECTED MONTH
  const hasData = filteredData.length > 0;
  const maxAttendance = hasData ? filteredData.reduce((prev, current) => (prev.total > current.total) ? prev : current) : null;
  const minAttendance = hasData ? filteredData.reduce((prev, current) => (prev.total < current.total) ? prev : current) : null;

  // Comparison Logic
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const getComparisonData = () => {
    return [...data].sort((a, b) => new Date(a.dia).getTime() - new Date(b.dia).getTime())
      .filter(item => selectedIds.includes(item.id));
  };

  // Formatter for labels to hide zeros
  const labelFormatter = (value: number) => value > 0 ? value : '';

  // Helper to format Month Name
  const formatMonth = (yyyy_mm: string) => {
    if (!yyyy_mm) return '';
    const [year, month] = yyyy_mm.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const openAuthForAdd = () => {
    setAuthMode('add');
    setItemToDelete(null);
    setIsAuthModalOpen(true);
    setAuthError(false);
    setPasswordInput('');
  };

  const openAuthForDelete = (id: string) => {
    setAuthMode('delete');
    setItemToDelete(id);
    setIsAuthModalOpen(true);
    setAuthError(false);
    setPasswordInput('');
  };

  const openAuthForShare = () => {
    setAuthMode('share');
    setItemToDelete(null);
    setIsAuthModalOpen(true);
    setAuthError(false);
    setPasswordInput('');
    setShortUrl(null); // Reset short url when opening modal
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'Conselho@2026') {
      if (authMode === 'add') {
        setIsEntryModalOpen(true);
      } else if (authMode === 'delete' && itemToDelete) {
        onDeleteData(itemToDelete);
        setSelectedIds(prev => prev.filter(id => id !== itemToDelete));
      } else if (authMode === 'share') {
        setIsShareModalOpen(true);
      }
      
      setIsAuthModalOpen(false);
      setPasswordInput('');
      setAuthError(false);
      setAuthMode(null);
      setItemToDelete(null);
    } else {
      setAuthError(true);
    }
  };

  const handleDataSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const total = 
      Number(newEntry.vermelho) + 
      Number(newEntry.laranja) + 
      Number(newEntry.amarelo) + 
      Number(newEntry.verde) + 
      Number(newEntry.azul);

    const newData: TriageData = {
      id: Date.now().toString(),
      dia: newEntry.dia,
      vermelho: Number(newEntry.vermelho),
      laranja: Number(newEntry.laranja),
      amarelo: Number(newEntry.amarelo),
      verde: Number(newEntry.verde),
      azul: Number(newEntry.azul),
      total: total
    };

    onAddData(newData);
    
    const entryMonth = newEntry.dia.substring(0, 7);
    if (!availableMonths.includes(entryMonth)) {
        setSelectedMonth(entryMonth);
    } else {
        setSelectedMonth(entryMonth);
    }

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    
    setNewEntry({
      dia: new Date().toISOString().split('T')[0],
      vermelho: 0,
      laranja: 0,
      amarelo: 0,
      verde: 0,
      azul: 0
    });
  };

  const handleExportExcel = () => {
    const formattedData = filteredData.map(item => {
      const [year, month, day] = item.dia.split('-');
      return {
        'Data': `${day}/${month}/${year}`,
        'Vermelho': item.vermelho,
        'Laranja (CRAI)': item.laranja,
        'Amarelo': item.amarelo,
        'Verde': item.verde,
        'Azul': item.azul,
        'Total': item.total
      };
    });

    const ws = XLSX.utils.json_to_sheet(formattedData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dados Triagem");
    XLSX.writeFile(wb, `relatorio_triagem_${selectedMonth || 'geral'}.xlsx`);
  };

  const getShareableLink = () => {
    try {
      const json = JSON.stringify(data);
      const encodedData = btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g,
        (match, p1) => String.fromCharCode(Number('0x' + p1))
      ));
      const url = new URL(window.location.origin + window.location.pathname);
      url.searchParams.set('data', encodedData);
      return url.toString();
    } catch (e) {
      console.error("Error generating share link:", e);
      return window.location.href;
    }
  };

  const handleShortenLink = async () => {
    const longUrl = getShareableLink();
    setIsShortening(true);
    try {
      const response = await fetch(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(longUrl)}`);
      if (response.ok) {
        const short = await response.text();
        setShortUrl(short);
      } else {
        alert("Erro ao encurtar o link. O serviço pode estar indisponível.");
      }
    } catch (error) {
      console.error("Shorten error:", error);
      alert("Não foi possível conectar ao encurtador. Verifique sua conexão ou bloqueadores de anúncios.");
    } finally {
      setIsShortening(false);
    }
  };

  const currentDisplayUrl = shortUrl || getShareableLink();

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentDisplayUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintComparison = () => {
    window.print();
  };

  const handleSavePDFComparison = async () => {
    const element = document.getElementById('comparison-content');
    if (!element) return;
    
    setIsPdfGenerating(true);
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('l', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const imgProps = pdf.getImageProperties(imgData);
      const ratio = imgProps.width / imgProps.height;
      
      const width = pdfWidth - 20;
      const height = width / ratio;
      
      let finalWidth = width;
      let finalHeight = height;
      
      if (height > pdfHeight - 20) {
          finalHeight = pdfHeight - 20;
          finalWidth = finalHeight * ratio;
      }
      
      pdf.addImage(imgData, 'PNG', 10, 10, finalWidth, finalHeight);
      pdf.save('comparativo-triagem.pdf');
    } catch (e) {
      console.error("Erro ao gerar PDF:", e);
      alert("Ocorreu um erro ao gerar o PDF.");
    } finally {
      setIsPdfGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      <style>{`
        @media print {
          body > * {
            visibility: hidden;
          }
          #comparison-modal-root, #comparison-modal-root * {
            visibility: visible;
          }
          #comparison-modal-root {
            position: fixed;
            left: 0;
            top: 0;
            width: 100vw;
            height: 100vh;
            background: white;
            z-index: 99999;
            padding: 0;
            overflow: visible;
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          #comparison-content {
            width: 100%;
            max-width: 100%;
            box-shadow: none;
            border: none;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* MONTH SELECTOR (FILTER) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex flex-col sm:flex-row justify-between items-center gap-4 bg-slate-50/50">
           <div className="flex items-center gap-3">
             <div className="bg-blue-100 p-2 rounded-lg">
               <CalendarDays className="w-5 h-5 text-blue-600" />
             </div>
             <div>
               <h2 className="text-base font-bold text-slate-800">Selecione o Mês</h2>
               <p className="text-xs text-slate-500">O painel será atualizado com os dados do período</p>
             </div>
           </div>
           <div className="relative w-full sm:w-64">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
               <Filter className="h-4 w-4 text-slate-400" />
             </div>
             <select 
               value={selectedMonth}
               onChange={(e) => setSelectedMonth(e.target.value)}
               className="block w-full pl-10 pr-4 py-2 text-sm border border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white text-slate-700 font-medium capitalize outline-none shadow-sm"
             >
               {availableMonths.length === 0 && <option value="">Sem dados cadastrados</option>}
               {availableMonths.map(month => (
                 <option key={month} value={month} className="capitalize">
                   {formatMonth(month)}
                 </option>
               ))}
             </select>
           </div>
      </div>

      {/* 1. Evolução Diária Detalhada por Risco */}
      <div className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/30">
           <div>
             <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                <h2 className="text-lg font-bold text-slate-800">Evolução Diária Detalhada por Risco</h2>
             </div>
             <p className="text-slate-500 text-sm pl-7">
               Visualizando último dia do mês de: <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs capitalize">{formatMonth(selectedMonth)}</span>
             </p>
           </div>
        </div>

        <div className="p-6">
          {chartData.length > 0 ? (
          <div className="h-[450px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 30, right: 30, left: 0, bottom: 0 }} barGap={6}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="dia" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 13, fontWeight: 600 }} 
                  dy={15} 
                  tickFormatter={(val) => val.split('-').slice(1).reverse().join('/')} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }} 
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', radius: 4 }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '30px', fontSize: '13px', fontWeight: 500 }} />
                
                <Bar dataKey="azul" name="Azul" fill="#3b82f6" radius={[6,6,0,0]} maxBarSize={70}>
                  <LabelList dataKey="azul" position="top" fill="#3b82f6" fontSize={11} fontWeight="800" formatter={labelFormatter} dy={-5} />
                </Bar>
                <Bar dataKey="verde" name="Verde" fill="#22c55e" radius={[6,6,0,0]} maxBarSize={70}>
                  <LabelList dataKey="verde" position="top" fill="#22c55e" fontSize={11} fontWeight="800" formatter={labelFormatter} dy={-5} />
                </Bar>
                <Bar dataKey="amarelo" name="Amarelo" fill="#eab308" radius={[6,6,0,0]} maxBarSize={70}>
                  <LabelList dataKey="amarelo" position="top" fill="#ca8a04" fontSize={11} fontWeight="800" formatter={labelFormatter} dy={-5} />
                </Bar>
                <Bar dataKey="laranja" name="Laranja (CRAI)" fill="#f97316" radius={[6,6,0,0]} maxBarSize={70}>
                  <LabelList dataKey="laranja" position="top" fill="#ea580c" fontSize={11} fontWeight="800" formatter={labelFormatter} dy={-5} />
                </Bar>
                <Bar dataKey="vermelho" name="Vermelho" fill="#ef4444" radius={[6,6,0,0]} maxBarSize={70}>
                  <LabelList dataKey="vermelho" position="top" fill="#dc2626" fontSize={11} fontWeight="800" formatter={labelFormatter} dy={-5} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          ) : (
            <div className="h-[450px] w-full flex flex-col items-center justify-center text-slate-400">
               <Calendar className="w-12 h-12 mb-2 opacity-20" />
               <p>Nenhum dado encontrado para {formatMonth(selectedMonth)}</p>
            </div>
          )}
        </div>
      </div>

      {/* 2. Painel do Dia (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Featured Total Card */}
        <div className="bg-slate-800 p-6 rounded-2xl shadow-lg shadow-slate-200 flex flex-col justify-between relative overflow-hidden group">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
             <LayoutDashboard className="w-20 h-20 text-white" />
           </div>
           <div>
             <p className="text-blue-200 text-xs font-bold uppercase tracking-widest mb-2">Painel do Dia (Último Registro)</p>
             <h3 className="text-4xl font-black text-white">{lastDay.total}</h3>
             <p className="text-sm text-slate-400 font-medium mt-1">pacientes totais</p>
           </div>
           <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-between text-slate-400 text-xs">
              <span>{lastDay.dia ? lastDay.dia.split('-').slice(1).reverse().join('/') : '--/--'}</span>
              <Activity className="w-4 h-4" />
           </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-[6px] border-red-500 flex flex-col justify-between hover:shadow-md transition-shadow">
           <div>
             <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Emergência</p>
             <h3 className="text-4xl font-extrabold text-slate-800">{lastDay.vermelho}</h3>
             <p className="text-xs text-slate-400 font-medium mt-1">pacientes</p>
           </div>
           <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
             <div className="bg-red-500 h-full rounded-full transition-all duration-1000" style={{ width: `${(lastDay.vermelho / (lastDay.total || 1)) * 100}%` }}></div>
           </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-[6px] border-orange-500 flex flex-col justify-between hover:shadow-md transition-shadow">
           <div>
             <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Laranja (CRAI)</p>
             <h3 className="text-4xl font-extrabold text-slate-800">{lastDay.laranja}</h3>
             <p className="text-xs text-slate-400 font-medium mt-1">pacientes</p>
           </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
             <div className="bg-orange-500 h-full rounded-full transition-all duration-1000" style={{ width: `${(lastDay.laranja / (lastDay.total || 1)) * 100}%` }}></div>
           </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-[6px] border-yellow-500 flex flex-col justify-between hover:shadow-md transition-shadow">
           <div>
             <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Amarelo</p>
             <h3 className="text-4xl font-extrabold text-slate-800">{lastDay.amarelo}</h3>
             <p className="text-xs text-slate-400 font-medium mt-1">pacientes</p>
           </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
             <div className="bg-yellow-500 h-full rounded-full transition-all duration-1000" style={{ width: `${(lastDay.amarelo / (lastDay.total || 1)) * 100}%` }}></div>
           </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-[6px] border-green-500 flex flex-col justify-between hover:shadow-md transition-shadow">
           <div>
             <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Verde</p>
             <h3 className="text-4xl font-extrabold text-slate-800">{lastDay.verde}</h3>
             <p className="text-xs text-slate-400 font-medium mt-1">pacientes</p>
           </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
             <div className="bg-green-500 h-full rounded-full transition-all duration-1000" style={{ width: `${(lastDay.verde / (lastDay.total || 1)) * 100}%` }}></div>
           </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-[6px] border-blue-500 flex flex-col justify-between hover:shadow-md transition-shadow">
           <div>
             <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Azul</p>
             <h3 className="text-4xl font-extrabold text-slate-800">{lastDay.azul}</h3>
             <p className="text-xs text-slate-400 font-medium mt-1">pacientes</p>
           </div>
            <div className="w-full bg-slate-100 h-2 rounded-full mt-4 overflow-hidden">
             <div className="bg-blue-500 h-full rounded-full transition-all duration-1000" style={{ width: `${(lastDay.azul / (lastDay.total || 1)) * 100}%` }}></div>
           </div>
        </div>
      </div>

      {/* 3. Dia de Maior e Menor Atendimento */}
      {hasData && maxAttendance && minAttendance && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Max Attendance */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 p-8 shadow-xl shadow-indigo-200 transition-transform hover:scale-[1.01]">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
            <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-pink-500/20 blur-3xl"></div>
            
            <div className="relative flex items-center justify-between z-10">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">
                    <TrendingUp className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest">Pico no Mês</p>
                </div>
                <h3 className="text-5xl font-black text-white tracking-tight">{maxAttendance.total}</h3>
                <p className="text-indigo-200 text-sm mt-1">pacientes atendidos</p>
              </div>
              <div className="text-right">
                <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-center min-w-[100px]">
                   <p className="text-indigo-200 text-xs font-bold uppercase mb-1">DATA</p>
                   <p className="text-xl font-bold text-white">{maxAttendance.dia.split('-').slice(1).reverse().join('/')}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Min Attendance */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-8 shadow-xl shadow-teal-200 transition-transform hover:scale-[1.01]">
            <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl"></div>
            <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-yellow-400/20 blur-3xl"></div>
            
            <div className="relative flex items-center justify-between z-10">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">
                    <TrendingDown className="w-4 h-4 text-white" />
                  </div>
                  <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest">Menor Movimento</p>
                </div>
                <h3 className="text-5xl font-black text-white tracking-tight">{minAttendance.total}</h3>
                <p className="text-emerald-100 text-sm mt-1">pacientes atendidos</p>
              </div>
              <div className="text-right">
                <div className="bg-white/10 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-center min-w-[100px]">
                   <p className="text-emerald-100 text-xs font-bold uppercase mb-1">DATA</p>
                   <p className="text-xl font-bold text-white">{minAttendance.dia.split('-').slice(1).reverse().join('/')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. Consolidado do Mês */}
      {hasData && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex items-center gap-2 bg-slate-50/30">
              <Calculator className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wider">
                Consolidado do Mês: <span className="text-blue-600 capitalize">{formatMonth(selectedMonth)}</span>
              </h3>
            </div>
            
            <div className="p-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
               <div className="bg-slate-100 rounded-xl p-4 text-center border border-slate-200 shadow-sm">
                  <p className="text-xs text-slate-500 font-bold uppercase mb-1">Total Geral</p>
                  <p className="text-2xl font-black text-slate-800">{monthlyTotals.total}</p>
               </div>
               <div className="bg-red-50 rounded-xl p-4 text-center border border-red-100 shadow-sm">
                  <p className="text-xs text-red-600 font-bold uppercase mb-1">Vermelho</p>
                  <p className="text-2xl font-black text-red-700">{monthlyTotals.vermelho}</p>
               </div>
               <div className="bg-orange-50 rounded-xl p-4 text-center border border-orange-100 shadow-sm">
                  <p className="text-xs text-orange-600 font-bold uppercase mb-1">Laranja</p>
                  <p className="text-2xl font-black text-orange-700">{monthlyTotals.laranja}</p>
               </div>
               <div className="bg-yellow-50 rounded-xl p-4 text-center border border-yellow-100 shadow-sm">
                  <p className="text-xs text-yellow-600 font-bold uppercase mb-1">Amarelo</p>
                  <p className="text-2xl font-black text-yellow-700">{monthlyTotals.amarelo}</p>
               </div>
               <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100 shadow-sm">
                  <p className="text-xs text-green-600 font-bold uppercase mb-1">Verde</p>
                  <p className="text-2xl font-black text-green-700">{monthlyTotals.verde}</p>
               </div>
               <div className="bg-blue-50 rounded-xl p-4 text-center border border-blue-100 shadow-sm">
                  <p className="text-xs text-blue-600 font-bold uppercase mb-1">Azul</p>
                  <p className="text-2xl font-black text-blue-700">{monthlyTotals.azul}</p>
               </div>
            </div>
          </div>
      )}

      {/* Data Table & Actions */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 sm:gap-0">
          <div className="flex items-center gap-3">
             <h2 className="text-lg font-bold text-slate-800">Dados Detalhados</h2>
             <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-medium capitalize">{formatMonth(selectedMonth)}</span>
             <button 
              onClick={() => setIsCompareModalOpen(true)}
              className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full hover:bg-indigo-100 border border-indigo-200 transition-colors"
             >
               <GitCompare className="w-3 h-3" />
               Comparar Datas
             </button>
          </div>
          <div className="flex gap-2 flex-wrap justify-center">
             <div className="flex gap-2">
              <button 
                onClick={openAuthForAdd}
                className="flex items-center gap-2 text-xs font-semibold text-white bg-blue-600 px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Lock className="w-3 h-3" />
                <span className="hidden sm:inline">Área Administrativa:</span> Inserir Dados
              </button>
              <button 
                onClick={openAuthForShare}
                className="flex items-center gap-2 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-2 rounded-lg hover:bg-blue-100 border border-blue-200 transition-colors"
                title="Compartilhar Link (Área Restrita)"
              >
                <Share2 className="w-3 h-3" />
                <span className="hidden sm:inline">Compartilhar Link</span>
              </button>
             </div>
            <button 
              onClick={handleExportExcel}
              className="flex items-center gap-2 text-xs font-semibold text-green-700 bg-green-50 px-3 py-2 rounded-lg hover:bg-green-100 border border-green-200 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Exportar Excel (.xlsx)
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-xs bg-slate-50/50 rounded-l-lg">Dia</th>
                <th className="px-6 py-4 font-semibold text-red-600 uppercase tracking-wider text-xs bg-slate-50/50">Vermelho</th>
                <th className="px-6 py-4 font-semibold text-orange-600 uppercase tracking-wider text-xs bg-slate-50/50">Laranja (CRAI)</th>
                <th className="px-6 py-4 font-semibold text-yellow-600 uppercase tracking-wider text-xs bg-slate-50/50">Amarelo</th>
                <th className="px-6 py-4 font-semibold text-green-600 uppercase tracking-wider text-xs bg-slate-50/50">Verde</th>
                <th className="px-6 py-4 font-semibold text-blue-600 uppercase tracking-wider text-xs bg-slate-50/50">Azul</th>
                <th className="px-6 py-4 font-bold text-slate-800 uppercase tracking-wider text-xs bg-slate-50/50">Total</th>
                <th className="px-6 py-4 font-semibold text-slate-500 uppercase tracking-wider text-xs bg-slate-50/50 rounded-r-lg">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tableData.length > 0 ? (
                tableData.map((row) => (
                  <tr key={row.id} className={`hover:bg-slate-50/80 transition-colors group ${selectedIds.includes(row.id) ? 'bg-blue-50/30' : ''}`}>
                    <td className="px-6 py-4 font-bold text-slate-700">{row.dia.split('-').slice(1).reverse().join('/')}</td>
                    <td className="px-6 py-4">
                      <span className="bg-red-50 text-red-700 py-1 px-2 rounded font-bold text-xs">{row.vermelho}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-orange-50 text-orange-700 py-1 px-2 rounded font-bold text-xs">{row.laranja}</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-600">{row.amarelo}</td>
                    <td className="px-6 py-4 font-medium text-slate-600">{row.verde}</td>
                    <td className="px-6 py-4 font-medium text-slate-600">{row.azul}</td>
                    <td className="px-6 py-4 font-extrabold text-slate-800">{row.total}</td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => openAuthForDelete(row.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors p-1 rounded-full hover:bg-red-50"
                        title="Excluir registro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-400 italic">
                    Nenhum registro encontrado para este mês.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comparison Modal */}
      {isCompareModalOpen && (
         <div id="comparison-modal-root" className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
            {/* Header with Controls */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 flex-shrink-0">
               <div>
                 <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                   <GitCompare className="w-6 h-6 text-indigo-600" />
                   Comparativo de Dias
                 </h3>
                 <p className="text-sm text-slate-500 mt-1 hidden sm:block">Selecione os dias na lista para comparar visualmente</p>
               </div>
               <div className="flex items-center gap-2 no-print">
                 <button 
                   onClick={handlePrintComparison}
                   className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors flex items-center gap-2 text-sm font-medium"
                   title="Imprimir Comparativo"
                 >
                   <Printer className="w-4 h-4" />
                   <span className="hidden sm:inline">Imprimir</span>
                 </button>
                 <button 
                   onClick={handleSavePDFComparison}
                   disabled={isPdfGenerating}
                   className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-red-600 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50"
                   title="Salvar como PDF"
                 >
                   {isPdfGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                   <span className="hidden sm:inline">{isPdfGenerating ? 'Gerando...' : 'Salvar PDF'}</span>
                 </button>
                 <div className="w-px h-6 bg-slate-300 mx-2"></div>
                 <button onClick={() => setIsCompareModalOpen(false)} className="bg-slate-200 hover:bg-slate-300 p-2 rounded-full transition-colors">
                   <X className="w-5 h-5 text-slate-600" />
                 </button>
               </div>
            </div>
            
            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar: Date Selection */}
              <div className="w-64 border-r border-slate-100 overflow-y-auto bg-slate-50 p-4 hidden md:block no-print">
                <h4 className="font-bold text-slate-700 mb-4 text-sm uppercase tracking-wider">Selecione os dias</h4>
                {/* We use ALL sorted data for the sidebar to allow comparing across months if needed, or we could use tableData */}
                <div className="space-y-2">
                  {[...data].sort((a,b) => new Date(b.dia).getTime() - new Date(a.dia).getTime()).map(item => (
                    <div 
                      key={item.id}
                      onClick={() => toggleSelection(item.id)}
                      className={`p-3 rounded-lg cursor-pointer border transition-all ${
                        selectedIds.includes(item.id) 
                          ? 'bg-blue-50 border-blue-200 shadow-sm' 
                          : 'bg-white border-slate-100 hover:border-blue-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                         <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                           selectedIds.includes(item.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'
                         }`}>
                           {selectedIds.includes(item.id) && <Check className="w-3 h-3 text-white" />}
                         </div>
                         <div>
                           <p className={`font-bold text-sm ${selectedIds.includes(item.id) ? 'text-blue-700' : 'text-slate-700'}`}>
                             {item.dia.split('-').slice(1).reverse().join('/')}
                           </p>
                           <p className="text-xs text-slate-400 mt-0.5">Total: {item.total}</p>
                         </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Main Content: Charts & Stats */}
              <div id="comparison-content" className="flex-1 overflow-y-auto p-6 bg-white">
                {selectedIds.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <GitCompare className="w-16 h-16 mb-4 opacity-20" />
                    <p>Selecione pelo menos um dia para visualizar os dados</p>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Comparison Chart */}
                    <div className="h-[350px] w-full bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                       <h4 className="text-sm font-bold text-slate-800 mb-4">Gráfico Comparativo</h4>
                       <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={getComparisonData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} barGap={2}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="dia" 
                            tickFormatter={(val) => val.split('-').slice(1).reverse().join('/')}
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }}
                            dy={10}
                          />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                          <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                          <Legend iconType="circle" />
                          <Bar dataKey="vermelho" name="Vermelho" fill="#ef4444" radius={[4,4,0,0]} />
                          <Bar dataKey="laranja" name="Laranja" fill="#f97316" radius={[4,4,0,0]} />
                          <Bar dataKey="amarelo" name="Amarelo" fill="#eab308" radius={[4,4,0,0]} />
                          <Bar dataKey="verde" name="Verde" fill="#22c55e" radius={[4,4,0,0]} />
                          <Bar dataKey="azul" name="Azul" fill="#3b82f6" radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Stats Grid */}
                    <div>
                      <h4 className="text-sm font-bold text-slate-800 mb-4">Detalhamento por Dia</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {getComparisonData().map((item) => (
                          <div key={item.id} className="bg-slate-50 rounded-xl p-5 border border-slate-200 break-inside-avoid">
                            <div className="flex justify-between items-center mb-4 border-b border-slate-200 pb-3">
                              <span className="font-bold text-slate-700 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                {item.dia.split('-').slice(1).reverse().join('/')}
                              </span>
                              <span className="bg-slate-200 text-slate-700 text-xs px-2 py-1 rounded font-bold">Total: {item.total}</span>
                            </div>
                            <div className="space-y-3 text-sm">
                              <div className="flex justify-between items-center">
                                <span className="text-red-600 font-medium">Vermelho</span>
                                <span className="font-bold">{item.vermelho}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-orange-600 font-medium">Laranja (CRAI)</span>
                                <span className="font-bold">{item.laranja}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-yellow-600 font-medium">Amarelo</span>
                                <span className="font-bold">{item.amarelo}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-green-600 font-medium">Verde</span>
                                <span className="font-bold">{item.verde}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-blue-600 font-medium">Azul</span>
                                <span className="font-bold">{item.azul}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
         </div>
      )}

      {/* Password Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Lock className="w-5 h-5 text-blue-600" /> 
                {authMode === 'delete' ? 'Confirmar Exclusão' : 'Área Administrativa'}
              </h3>
              <button onClick={() => setIsAuthModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAuthSubmit}>
              <div className="mb-4">
                <p className="text-sm text-slate-500 mb-3">
                  {authMode === 'delete' 
                    ? 'Esta ação é irreversível. Digite a senha para confirmar a exclusão.' 
                    : 'Área restrita. Digite a senha para continuar.'}
                </p>
                <label className="block text-xs font-medium text-slate-600 mb-1">Senha</label>
                <input 
                  type="password" 
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className={`w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 ${authError ? 'border-red-300 focus:ring-red-200' : 'border-slate-300 focus:ring-blue-200'}`}
                  placeholder="Digite a senha..."
                  autoFocus
                />
                {authError && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3"/> Senha incorreta</p>}
              </div>
              <button type="submit" className={`w-full text-white py-2 rounded-lg font-semibold transition-colors ${authMode === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                {authMode === 'delete' ? 'Confirmar Exclusão' : 'Acessar'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Data Entry Modal */}
      {isEntryModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="bg-white rounded-xl p-8 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Plus className="w-6 h-6 text-blue-600" /> Novo Registro Diário
              </h3>
              <button onClick={() => setIsEntryModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleDataSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Data do Plantão</label>
                <input 
                  type="date" 
                  required
                  value={newEntry.dia}
                  onChange={(e) => setNewEntry({...newEntry, dia: e.target.value})}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-red-600 mb-1">Vermelho</label>
                  <input 
                    type="number" 
                    min="0"
                    value={newEntry.vermelho}
                    onChange={(e) => setNewEntry({...newEntry, vermelho: Number(e.target.value)})}
                    className="w-full border-2 border-red-100 rounded-lg px-3 py-2 outline-none focus:border-red-500 bg-red-50/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-orange-600 mb-1">Laranja (CRAI)</label>
                  <input 
                    type="number" 
                    min="0"
                    value={newEntry.laranja}
                    onChange={(e) => setNewEntry({...newEntry, laranja: Number(e.target.value)})}
                    className="w-full border-2 border-orange-100 rounded-lg px-3 py-2 outline-none focus:border-orange-500 bg-orange-50/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-yellow-600 mb-1">Amarelo</label>
                  <input 
                    type="number" 
                    min="0"
                    value={newEntry.amarelo}
                    onChange={(e) => setNewEntry({...newEntry, amarelo: Number(e.target.value)})}
                    className="w-full border-2 border-yellow-100 rounded-lg px-3 py-2 outline-none focus:border-yellow-500 bg-yellow-50/30"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-green-600 mb-1">Verde</label>
                  <input 
                    type="number" 
                    min="0"
                    value={newEntry.verde}
                    onChange={(e) => setNewEntry({...newEntry, verde: Number(e.target.value)})}
                    className="w-full border-2 border-green-100 rounded-lg px-3 py-2 outline-none focus:border-green-500 bg-green-50/30"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-bold text-blue-600 mb-1">Azul</label>
                  <input 
                    type="number" 
                    min="0"
                    value={newEntry.azul}
                    onChange={(e) => setNewEntry({...newEntry, azul: Number(e.target.value)})}
                    className="w-full border-2 border-blue-100 rounded-lg px-3 py-2 outline-none focus:border-blue-500 bg-blue-50/30"
                  />
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg flex justify-between items-center border border-slate-100">
                <span className="font-semibold text-slate-600">Total Previsto:</span>
                <span className="text-2xl font-bold text-slate-800">
                  {Number(newEntry.vermelho) + Number(newEntry.laranja) + Number(newEntry.amarelo) + Number(newEntry.verde) + Number(newEntry.azul)}
                </span>
              </div>
              
              {saveSuccess && (
                <div className="bg-green-100 text-green-800 p-3 rounded-lg flex items-center gap-2 text-sm animate-pulse">
                  <Check className="w-4 h-4" /> Registro salvo com sucesso! Você pode inserir o próximo.
                </div>
              )}

              <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2">
                <Save className="w-5 h-5" /> Salvar Dados
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60]">
           <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Share2 className="w-5 h-5 text-blue-600" /> Compartilhar Acesso
              </h3>
              <button onClick={() => setIsShareModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-slate-600">
                Copie o link abaixo para compartilhar o painel com os dados atualizados. O link contém todas as informações inseridas.
              </p>
              
              <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <input 
                  type="text" 
                  readOnly 
                  value={currentDisplayUrl}
                  className="bg-transparent text-sm text-slate-600 flex-1 outline-none truncate"
                />
                <button 
                  onClick={handleCopyLink}
                  className={`p-2 rounded-md transition-colors ${copied ? 'bg-green-100 text-green-700' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'}`}
                  title="Copiar"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* URL Shortener Action */}
              {!shortUrl && (
                <button 
                  onClick={handleShortenLink}
                  disabled={isShortening}
                  className="w-full bg-indigo-50 text-indigo-700 py-2 rounded-lg font-medium hover:bg-indigo-100 transition-colors text-sm flex items-center justify-center gap-2 border border-indigo-200"
                >
                  {isShortening ? <Loader2 className="w-4 h-4 animate-spin" /> : <LinkIcon className="w-4 h-4" />}
                  {isShortening ? 'Gerando link curto...' : 'Encurtar Link (TinyURL)'}
                </button>
              )}

              {copied && <p className="text-xs text-green-600 text-center font-medium">Link copiado para a área de transferência!</p>}
              
              <button onClick={() => setIsShareModalOpen(false)} className="w-full bg-slate-100 text-slate-700 py-2 rounded-lg font-medium hover:bg-slate-200 transition-colors text-sm mt-2">
                Fechar
              </button>
            </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default TriageDashboard;