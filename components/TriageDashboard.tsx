import React, { useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { Calendar, Check, GitCompare, Trash2 } from 'lucide-react';
import { TriageData } from '../types';
import SmartFeatures from './SmartFeatures';

interface TriageDashboardProps {
  data: TriageData[];
  onAddData: (newData: TriageData) => void;
  onDeleteData: (id: string) => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-slate-200 shadow-lg rounded-lg text-sm">
        <p className="font-bold text-slate-700 mb-2">{label ? label.split('-').slice(1).reverse().join('/') : ''}</p>
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
  const [selectedIds, setSelectedIds] = useState<string[]>(() => 
    data.length > 0 ? data.slice(-5).map(d => d.id) : []
  );

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const getComparisonData = () => {
    return data
      .filter(item => selectedIds.includes(item.id))
      .sort((a, b) => new Date(a.dia).getTime() - new Date(b.dia).getTime());
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Tem certeza que deseja excluir estes dados?')) {
      onDeleteData(id);
      setSelectedIds(prev => prev.filter(p => p !== id));
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full overflow-hidden bg-slate-50">
      {/* Left Panel: Sidebar & Chart */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        
        {/* Sidebar: Date Selection */}
        <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-200 bg-white flex flex-col flex-shrink-0 no-print">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <h4 className="font-bold text-slate-700 text-sm uppercase tracking-wider">Histórico</h4>
          </div>
          <div className="overflow-y-auto p-4 space-y-2 flex-1">
            {[...data].sort((a,b) => new Date(b.dia).getTime() - new Date(a.dia).getTime()).map(item => (
              <div 
                key={item.id}
                onClick={() => toggleSelection(item.id)}
                className={`p-3 rounded-lg cursor-pointer border transition-all group relative ${
                  selectedIds.includes(item.id) 
                    ? 'bg-blue-50 border-blue-200 shadow-sm' 
                    : 'bg-white border-slate-100 hover:border-blue-200'
                }`}
              >
                <div className="flex items-center gap-3">
                   <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors flex-shrink-0 ${
                     selectedIds.includes(item.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'
                   }`}>
                     {selectedIds.includes(item.id) && <Check className="w-3 h-3 text-white" />}
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className={`font-bold text-sm truncate ${selectedIds.includes(item.id) ? 'text-blue-700' : 'text-slate-700'}`}>
                       {item.dia.split('-').slice(1).reverse().join('/')}
                     </p>
                     <p className="text-xs text-slate-400 mt-0.5">Total: {item.total}</p>
                   </div>
                   <button 
                     onClick={(e) => handleDelete(e, item.id)}
                     className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded transition-all"
                     title="Excluir"
                   >
                     <Trash2 className="w-4 h-4" />
                   </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Main Content: Charts & Stats */}
        <div id="comparison-content" className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {selectedIds.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[300px]">
              <GitCompare className="w-16 h-16 mb-4 opacity-20" />
              <p>Selecione pelo menos um dia para visualizar os dados</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Comparison Chart */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                 <div className="flex items-center justify-between mb-6">
                   <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                     <GitCompare className="w-4 h-4 text-blue-600" />
                     Análise Comparativa
                   </h4>
                 </div>
                 <div className="h-[350px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={getComparisonData()} margin={{ top: 20, right: 30, left: 20, bottom: 5 }} barGap={4}>
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
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                      <Bar dataKey="vermelho" name="Vermelho" fill="#ef4444" radius={[4,4,0,0]} maxBarSize={50} />
                      <Bar dataKey="laranja" name="Laranja" fill="#f97316" radius={[4,4,0,0]} maxBarSize={50} />
                      <Bar dataKey="amarelo" name="Amarelo" fill="#eab308" radius={[4,4,0,0]} maxBarSize={50} />
                      <Bar dataKey="verde" name="Verde" fill="#22c55e" radius={[4,4,0,0]} maxBarSize={50} />
                      <Bar dataKey="azul" name="Azul" fill="#3b82f6" radius={[4,4,0,0]} maxBarSize={50} />
                    </BarChart>
                  </ResponsiveContainer>
                 </div>
              </div>

              {/* Stats Grid */}
              <div>
                <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Detalhamento Diário
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {getComparisonData().map((item) => (
                    <div key={item.id} className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                        <span className="font-bold text-slate-700 flex items-center gap-2">
                          {item.dia.split('-').slice(1).reverse().join('/')}
                        </span>
                        <span className="bg-slate-100 text-slate-700 text-xs px-2 py-1 rounded font-bold">Total: {item.total}</span>
                      </div>
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500"></div> Vermelho
                          </span>
                          <span className="font-bold text-slate-700">{item.vermelho}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-orange-500"></div> Laranja
                          </span>
                          <span className="font-bold text-slate-700">{item.laranja}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-yellow-500"></div> Amarelo
                          </span>
                          <span className="font-bold text-slate-700">{item.amarelo}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div> Verde
                          </span>
                          <span className="font-bold text-slate-700">{item.verde}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500 flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500"></div> Azul
                          </span>
                          <span className="font-bold text-slate-700">{item.azul}</span>
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

      {/* Right Panel: Smart Features */}
      <div className="w-full lg:w-96 border-t lg:border-t-0 lg:border-l border-slate-200 bg-white flex flex-col h-[500px] lg:h-auto flex-shrink-0">
         <SmartFeatures onDataUpdate={onAddData} />
      </div>
    </div>
  );
};

export default TriageDashboard;