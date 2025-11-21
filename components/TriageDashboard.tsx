import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LabelList, TooltipProps
} from 'recharts';
import { TriageData } from '../types';
import { TrendingUp, LayoutDashboard, Calendar, Lock, Plus, X, Save, AlertCircle, Trash2, FileSpreadsheet, Share2, Copy, Check } from 'lucide-react';
import * as XLSX from 'xlsx';

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
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // State for Authentication Context ('add', 'delete', or 'share')
  const [authMode, setAuthMode] = useState<'add' | 'delete' | 'share' | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);

  // State for New Entry Form
  const [newEntry, setNewEntry] = useState({
    dia: new Date().toISOString().split('T')[0],
    vermelho: 0,
    laranja: 0,
    amarelo: 0,
    verde: 0,
    azul: 0
  });

  // Calculate stats
  const monthlyTotal = data.reduce((acc, curr) => acc + curr.total, 0);
  const redTotal = data.reduce((acc, curr) => acc + curr.vermelho, 0);
  const orangeTotal = data.reduce((acc, curr) => acc + curr.laranja, 0);
  const yellowTotal = data.reduce((acc, curr) => acc + curr.amarelo, 0);
  const greenTotal = data.reduce((acc, curr) => acc + curr.verde, 0);
  const blueTotal = data.reduce((acc, curr) => acc + curr.azul, 0);

  // Filter data for the chart: only the last registered date
  const sortedData = [...data].sort((a, b) => new Date(a.dia).getTime() - new Date(b.dia).getTime());
  const chartData = sortedData.slice(-1);

  // Formatter for labels to hide zeros
  const labelFormatter = (value: number) => value > 0 ? value : '';

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
  };

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === 'Conselho@2026') {
      if (authMode === 'add') {
        setIsEntryModalOpen(true);
      } else if (authMode === 'delete' && itemToDelete) {
        onDeleteData(itemToDelete);
      } else if (authMode === 'share') {
        setIsShareModalOpen(true);
      }
      
      // Reset and close auth (except for share/entry modals which open next)
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
    
    // Show success feedback and keep modal open
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
    
    // Reset form counts but allow continued entry
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
    // Format data for Excel (Brazilian Date format)
    const formattedData = data.map(item => {
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

    // Create Worksheet
    const ws = XLSX.utils.json_to_sheet(formattedData);
    
    // Create Workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dados Triagem");

    // Trigger Download
    XLSX.writeFile(wb, "relatorio_triagem_master.xlsx");
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-shadow">
           <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
             <LayoutDashboard className="w-16 h-16 text-blue-600" />
           </div>
           <div>
             <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total do Mês</p>
             <h3 className="text-3xl font-extrabold text-slate-800">{monthlyTotal}</h3>
             <p className="text-xs text-slate-400 font-medium">pacientes</p>
           </div>
           <div className="mt-4 flex items-center gap-2 text-xs text-green-600 font-medium bg-green-50 w-fit px-2 py-1 rounded-full">
             <TrendingUp className="w-3 h-3" /> +12% vs mês anterior
           </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-red-500 flex flex-col justify-between hover:shadow-md transition-shadow">
           <div>
             <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Emergência (Vermelho)</p>
             <h3 className="text-3xl font-extrabold text-red-600">{redTotal}</h3>
             <p className="text-xs text-slate-400 font-medium">pacientes</p>
           </div>
           <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
             <div className="bg-red-500 h-full rounded-full" style={{ width: `${(redTotal / monthlyTotal) * 100}%` }}></div>
           </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-orange-500 flex flex-col justify-between hover:shadow-md transition-shadow">
           <div>
             <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Laranja (CRAI)</p>
             <h3 className="text-3xl font-extrabold text-orange-600">{orangeTotal}</h3>
             <p className="text-xs text-slate-400 font-medium">pacientes</p>
           </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
             <div className="bg-orange-500 h-full rounded-full" style={{ width: `${(orangeTotal / monthlyTotal) * 100}%` }}></div>
           </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-yellow-500 flex flex-col justify-between hover:shadow-md transition-shadow">
           <div>
             <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Amarelo</p>
             <h3 className="text-3xl font-extrabold text-yellow-600">{yellowTotal}</h3>
             <p className="text-xs text-slate-400 font-medium">pacientes</p>
           </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
             <div className="bg-yellow-500 h-full rounded-full" style={{ width: `${(yellowTotal / monthlyTotal) * 100}%` }}></div>
           </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-green-500 flex flex-col justify-between hover:shadow-md transition-shadow">
           <div>
             <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Verde</p>
             <h3 className="text-3xl font-extrabold text-green-600">{greenTotal}</h3>
             <p className="text-xs text-slate-400 font-medium">pacientes</p>
           </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
             <div className="bg-green-500 h-full rounded-full" style={{ width: `${(greenTotal / monthlyTotal) * 100}%` }}></div>
           </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border-l-4 border-blue-500 flex flex-col justify-between hover:shadow-md transition-shadow">
           <div>
             <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Azul</p>
             <h3 className="text-3xl font-extrabold text-blue-600">{blueTotal}</h3>
             <p className="text-xs text-slate-400 font-medium">pacientes</p>
           </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-4 overflow-hidden">
             <div className="bg-blue-500 h-full rounded-full" style={{ width: `${(blueTotal / monthlyTotal) * 100}%` }}></div>
           </div>
        </div>
      </div>

      {/* Main Chart Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
           <div>
             <h2 className="text-xl font-bold text-slate-800">Evolução Diária Detalhada por Risco</h2>
             <p className="text-slate-500 text-sm mt-1">
               Visualizando dados do último dia registrado: <span className="font-bold text-slate-700">{chartData[0]?.dia ? chartData[0].dia.split('-').slice(1).reverse().join('/') : 'Nenhum dado'}</span>
             </p>
           </div>
        </div>

        <div className="h-[450px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 0 }} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="dia" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} 
                dy={10} 
                tickFormatter={(val) => val.split('-').slice(1).reverse().join('/')} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: '#94a3b8', fontSize: 12, fontWeight: 500 }} 
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '14px' }} />
              
              {/* Unstacked bars with maxBarSize to prevent overly wide bars when single day */}
              <Bar dataKey="azul" name="Azul" fill="#3b82f6" radius={[4,4,0,0]} maxBarSize={60}>
                <LabelList dataKey="azul" position="top" fill="#3b82f6" fontSize={10} fontWeight="bold" formatter={labelFormatter} />
              </Bar>
              <Bar dataKey="verde" name="Verde" fill="#22c55e" radius={[4,4,0,0]} maxBarSize={60}>
                <LabelList dataKey="verde" position="top" fill="#22c55e" fontSize={10} fontWeight="bold" formatter={labelFormatter} />
              </Bar>
              <Bar dataKey="amarelo" name="Amarelo" fill="#eab308" radius={[4,4,0,0]} maxBarSize={60}>
                <LabelList dataKey="amarelo" position="top" fill="#ca8a04" fontSize={10} fontWeight="bold" formatter={labelFormatter} />
              </Bar>
              <Bar dataKey="laranja" name="Laranja (CRAI)" fill="#f97316" radius={[4,4,0,0]} maxBarSize={60}>
                <LabelList dataKey="laranja" position="top" fill="#ea580c" fontSize={10} fontWeight="bold" formatter={labelFormatter} />
              </Bar>
              <Bar dataKey="vermelho" name="Vermelho" fill="#ef4444" radius={[4,4,0,0]} maxBarSize={60}>
                <LabelList dataKey="vermelho" position="top" fill="#dc2626" fontSize={10} fontWeight="bold" formatter={labelFormatter} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Data Table & Actions */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 sm:gap-0">
          <h2 className="text-lg font-bold text-slate-800">Dados Detalhados</h2>
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
              {data.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80 transition-colors group">
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
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
           <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl">
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
                Copie o link abaixo para compartilhar o painel com outros usuários autorizados.
              </p>
              
              <div className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                <input 
                  type="text" 
                  readOnly 
                  value={window.location.href}
                  className="bg-transparent text-sm text-slate-600 flex-1 outline-none truncate"
                />
                <button 
                  onClick={handleCopyLink}
                  className={`p-2 rounded-md transition-colors ${copied ? 'bg-green-100 text-green-700' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-100'}`}
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              {copied && <p className="text-xs text-green-600 text-center font-medium">Link copiado para a área de transferência!</p>}
              
              <button onClick={() => setIsShareModalOpen(false)} className="w-full bg-slate-100 text-slate-700 py-2 rounded-lg font-medium hover:bg-slate-200 transition-colors text-sm">
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