import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, ArrowUpDown, FileDown, Plus, 
  Trash2, Edit, Check, X, SlidersHorizontal, HelpCircle, 
  AlertCircle, ChevronDown, ChevronUp, RefreshCw 
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { BudgetLine } from '../types';

interface BudgetTableProps {
  data: BudgetLine[];
  onAddData: (newData: BudgetLine) => void;
  onUpdateData: (id: string, updated: Partial<BudgetLine>) => void;
  onDeleteData: (id: string) => void;
  selectedSourceFilter: 'Todos' | 'Municipal' | 'Estadual' | 'Federal';
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(val);
};

export const BudgetTable: React.FC<BudgetTableProps> = ({ 
  data, 
  onAddData, 
  onUpdateData, 
  onDeleteData,
  selectedSourceFilter
}) => {
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'Todos' | 'Municipal' | 'Estadual' | 'Federal'>(selectedSourceFilter);
  const [blocoFilter, setBlocoFilter] = useState('Todos');
  const [sortField, setSortField] = useState<keyof BudgetLine>('codigo');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Insert form state
  const [isAdding, setIsAdding] = useState(false);
  const [newRow, setNewRow] = useState<Partial<BudgetLine>>({
    fonte: 'Municipal',
    bloco: 'Atenção Básica',
    codigo: '',
    descricao: '',
    saldoInicial: 0,
    receitas: 0,
    rendimentos: 0,
    despesas: 0,
  });

  // Edit row state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<BudgetLine>>({});

  // Sync prop filter
  React.useEffect(() => {
    setSourceFilter(selectedSourceFilter);
  }, [selectedSourceFilter]);

  // Unique Blocks/Blocos
  const uniqueBlocos = useMemo(() => {
    return Array.from(new Set(data.map(item => item.bloco)));
  }, [data]);

  // Handle Sort
  const handleSort = (field: keyof BudgetLine) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter and Sort Data
  const filteredAndSortedData = useMemo(() => {
    let result = [...data];

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(item => 
        item.codigo.toLowerCase().includes(q) ||
        item.descricao.toLowerCase().includes(q) ||
        item.bloco.toLowerCase().includes(q)
      );
    }

    // Source Filter
    if (sourceFilter !== 'Todos') {
      result = result.filter(item => item.fonte === sourceFilter);
    }

    // Bloco Filter
    if (blocoFilter !== 'Todos') {
      result = result.filter(item => item.bloco === blocoFilter);
    }

    // Sort
    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortDirection === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }

      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' 
          ? valA - valB 
          : valB - valA;
      }

      return 0;
    });

    return result;
  }, [data, search, sourceFilter, blocoFilter, sortField, sortDirection]);

  // Total calculated dynamically based on filtered rows
  const totals = useMemo(() => {
    return {
      saldoInicial: filteredAndSortedData.reduce((sum, item) => sum + item.saldoInicial, 0),
      receitas: filteredAndSortedData.reduce((sum, item) => sum + item.receitas, 0),
      rendimentos: filteredAndSortedData.reduce((sum, item) => sum + item.rendimentos, 0),
      despesas: filteredAndSortedData.reduce((sum, item) => sum + item.despesas, 0),
      saldoFinal: filteredAndSortedData.reduce((sum, item) => sum + item.saldoFinal, 0),
    };
  }, [filteredAndSortedData]);

  // Export to Excel
  const handleExportExcel = () => {
    const exportData = filteredAndSortedData.map(item => ({
      'Código': item.codigo,
      'Esfera': item.fonte,
      'Sub-bloco': item.bloco,
      'Descrição da Ação': item.descricao,
      'Saldo Inicial (31/12/2016)': item.saldoInicial,
      'Receitas Recebidas': item.receitas,
      'Rendimentos Financeiros': item.rendimentos,
      'Despesas Liquidadas': item.despesas,
      'Saldo Final (30/04/2017)': item.saldoFinal,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Auto-fit column widths
    const max_len = exportData.reduce((acc, row) => {
      Object.keys(row).forEach((key, col_idx) => {
        const val = row[key as keyof typeof row]?.toString() || '';
        acc[col_idx] = Math.max(acc[col_idx] || 10, val.length + 2);
      });
      return acc;
    }, [] as number[]);
    worksheet['!cols'] = max_len.map(len => ({ wch: len }));

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Execução Orçamentária');
    XLSX.writeFile(workbook, 'Execucao_Fundo_Saude_Pelotas.xlsx');
  };

  // Submit Add Row
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRow.codigo || !newRow.descricao) {
      alert('Código e Descrição são obrigatórios.');
      return;
    }

    const sInit = Number(newRow.saldoInicial || 0);
    const rec = Number(newRow.receitas || 0);
    const rend = Number(newRow.rendimentos || 0);
    const desp = Number(newRow.despesas || 0);
    const finalVal = sInit + rec + rend - desp;

    const row: BudgetLine = {
      id: `custom_${Date.now()}`,
      fonte: newRow.fonte as any,
      bloco: newRow.bloco || 'Outros',
      codigo: newRow.codigo,
      descricao: newRow.descricao,
      saldoInicial: sInit,
      receitas: rec,
      rendimentos: rend,
      despesas: desp,
      saldoFinal: finalVal,
    };

    onAddData(row);
    setIsAdding(false);
    setNewRow({
      fonte: 'Municipal',
      bloco: 'Atenção Básica',
      codigo: '',
      descricao: '',
      saldoInicial: 0,
      receitas: 0,
      rendimentos: 0,
      despesas: 0,
    });
  };

  // Trigger editing
  const startEditing = (row: BudgetLine) => {
    setEditingId(row.id);
    setEditFormData(row);
  };

  // Submit edits
  const handleEditSubmit = (id: string) => {
    const sInit = Number(editFormData.saldoInicial || 0);
    const rec = Number(editFormData.receitas || 0);
    const rend = Number(editFormData.rendimentos || 0);
    const desp = Number(editFormData.despesas || 0);
    const finalVal = sInit + rec + rend - desp;

    onUpdateData(id, {
      ...editFormData,
      saldoInicial: sInit,
      receitas: rec,
      rendimentos: rend,
      despesas: desp,
      saldoFinal: finalVal
    });
    setEditingId(null);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fadeIn" id="budget-table-view">
      
      {/* Search / Filters Controls */}
      <div className="p-5 border-b border-slate-200/80 bg-slate-50/50 flex flex-col md:flex-row gap-4 justify-between items-center">
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4.5 h-4.5" />
          <input 
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código ou queixa..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500 shadow-inner"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
          
          {/* Esfera */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value as any)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none text-slate-600 focus:border-blue-500 cursor-pointer"
          >
            <option value="Todos">Esfera: Todas</option>
            <option value="Municipal">Municipal</option>
            <option value="Estadual">Estadual</option>
            <option value="Federal">Federal</option>
          </select>

          {/* Bloco */}
          <select
            value={blocoFilter}
            onChange={(e) => setBlocoFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold outline-none text-slate-600 focus:border-blue-500 cursor-pointer max-w-[180px]"
          >
            <option value="Todos">Bloco: Todos</option>
            {uniqueBlocos.map((bl, i) => (
              <option key={i} value={bl}>{bl}</option>
            ))}
          </select>

          {/* Add / Export */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-xl px-4 py-2.5 text-xs font-bold transition-all"
          >
            <FileDown className="w-4 h-4" />
            <span>Excel</span>
          </button>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Inserir Nova Linha</span>
          </button>

        </div>

      </div>

      {/* Add Row Overlay / Form */}
      {isAdding && (
        <form onSubmit={handleAddSubmit} className="p-6 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 animate-slideDown">
          <div className="md:col-span-4 flex justify-between items-center pb-2 border-b border-slate-200">
            <h4 className="text-sm font-black text-slate-800 flex items-center gap-2">
              <Plus className="w-4 h-4 text-blue-500" /> Adicionar Lançamento Orçamentário
            </h4>
            <button type="button" onClick={() => setIsAdding(false)} className="text-slate-400 hover:text-slate-600">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Esfera Governamental</label>
            <select
              value={newRow.fonte}
              onChange={(e) => setNewRow({...newRow, fonte: e.target.value as any})}
              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 outline-none"
            >
              <option value="Municipal">Municipal</option>
              <option value="Estadual">Estadual</option>
              <option value="Federal">Federal</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bloco / Subcategoria</label>
            <input 
              type="text"
              value={newRow.bloco}
              onChange={(e) => setNewRow({...newRow, bloco: e.target.value})}
              placeholder="Ex: Atenção Básica"
              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Código da Ação</label>
            <input 
              type="text"
              required
              value={newRow.codigo}
              onChange={(e) => setNewRow({...newRow, codigo: e.target.value})}
              placeholder="Ex: 4050"
              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Descrição / Nome do Programa</label>
            <input 
              type="text"
              required
              value={newRow.descricao}
              onChange={(e) => setNewRow({...newRow, descricao: e.target.value})}
              placeholder="Ex: Farmácia Básica Municipal"
              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Saldo Inicial (R$)</label>
            <input 
              type="number"
              value={newRow.saldoInicial || ''}
              onChange={(e) => setNewRow({...newRow, saldoInicial: Number(e.target.value)})}
              placeholder="0,00"
              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Receitas Recebidas (R$)</label>
            <input 
              type="number"
              value={newRow.receitas || ''}
              onChange={(e) => setNewRow({...newRow, receitas: Number(e.target.value)})}
              placeholder="0,00"
              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rendimentos Financeiros (R$)</label>
            <input 
              type="number"
              value={newRow.rendimentos || ''}
              onChange={(e) => setNewRow({...newRow, rendimentos: Number(e.target.value)})}
              placeholder="0,00"
              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Despesas Executadas (R$)</label>
            <input 
              type="number"
              value={newRow.despesas || ''}
              onChange={(e) => setNewRow({...newRow, despesas: Number(e.target.value)})}
              placeholder="0,00"
              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-700 outline-none"
            />
          </div>

          <div className="md:col-span-4 flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-5 py-2.5 rounded-xl text-xs transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-colors shadow-sm"
            >
              Confirmar Lançamento
            </button>
          </div>
        </form>
      )}

      {/* Main Budget Grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <th className="py-4 px-5 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('codigo')}>
                <div className="flex items-center gap-1.5">Ação <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="py-4 px-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('fonte')}>
                <div className="flex items-center gap-1.5">Esfera <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="py-4 px-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('bloco')}>
                <div className="flex items-center gap-1.5">Bloco <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="py-4 px-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('descricao')}>
                <div className="flex items-center gap-1.5">Descrição da Despesa <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="py-4 px-4 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('saldoInicial')}>
                <div className="flex items-center justify-end gap-1.5">S. Inicial <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="py-4 px-4 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('receitas')}>
                <div className="flex items-center justify-end gap-1.5">Receitas <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="py-4 px-4 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('despesas')}>
                <div className="flex items-center justify-end gap-1.5">Despesas <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="py-4 px-4 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('saldoFinal')}>
                <div className="flex items-center justify-end gap-1.5">S. Final <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="py-4 px-5 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {filteredAndSortedData.map((item) => {
              const isEditing = editingId === item.id;
              return (
                <tr key={item.id} className="hover:bg-slate-50/50 transition-colors font-medium text-slate-700">
                  
                  {/* Codigo */}
                  <td className="py-3 px-5 font-mono text-slate-400 font-bold">{item.codigo}</td>
                  
                  {/* Fonte Badge */}
                  <td className="py-3 px-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black tracking-wide uppercase ${
                      item.fonte === 'Municipal' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                      item.fonte === 'Estadual' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                      'bg-amber-50 text-amber-700 border border-amber-100'
                    }`}>
                      {item.fonte}
                    </span>
                  </td>

                  {/* Bloco */}
                  <td className="py-3 px-4 text-slate-500 font-bold text-[11px] max-w-[120px] truncate" title={item.bloco}>
                    {item.bloco}
                  </td>

                  {/* Descricao */}
                  <td className="py-3 px-4">
                    {isEditing ? (
                      <input 
                        type="text"
                        value={editFormData.descricao || ''}
                        onChange={(e) => setEditFormData({...editFormData, descricao: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded p-1.5 font-bold"
                      />
                    ) : (
                      <div className="text-slate-800 font-bold max-w-[280px] truncate" title={item.descricao}>
                        {item.descricao}
                      </div>
                    )}
                  </td>

                  {/* Saldo Inicial */}
                  <td className="py-3 px-4 text-right font-mono text-slate-600">
                    {isEditing ? (
                      <input 
                        type="number"
                        value={editFormData.saldoInicial || ''}
                        onChange={(e) => setEditFormData({...editFormData, saldoInicial: Number(e.target.value)})}
                        className="w-24 bg-slate-50 border border-slate-200 rounded p-1 text-right font-bold"
                      />
                    ) : (
                      formatCurrency(item.saldoInicial)
                    )}
                  </td>

                  {/* Receitas */}
                  <td className="py-3 px-4 text-right font-mono text-blue-600">
                    {isEditing ? (
                      <input 
                        type="number"
                        value={editFormData.receitas || ''}
                        onChange={(e) => setEditFormData({...editFormData, receitas: Number(e.target.value)})}
                        className="w-24 bg-slate-50 border border-slate-200 rounded p-1 text-right font-bold"
                      />
                    ) : (
                      formatCurrency(item.receitas + item.rendimentos)
                    )}
                  </td>

                  {/* Despesas */}
                  <td className="py-3 px-4 text-right font-mono text-rose-600">
                    {isEditing ? (
                      <input 
                        type="number"
                        value={editFormData.despesas || ''}
                        onChange={(e) => setEditFormData({...editFormData, despesas: Number(e.target.value)})}
                        className="w-24 bg-slate-50 border border-slate-200 rounded p-1 text-right font-bold"
                      />
                    ) : (
                      formatCurrency(item.despesas)
                    )}
                  </td>

                  {/* Saldo Final */}
                  <td className="py-3 px-4 text-right font-mono">
                    {isEditing ? (
                      <span className="font-black text-slate-400">Calculado...</span>
                    ) : (
                      <span className={`font-black ${item.saldoFinal >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                        {formatCurrency(item.saldoFinal)}
                      </span>
                    )}
                  </td>

                  {/* Action row controls */}
                  <td className="py-3 px-5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {isEditing ? (
                        <>
                          <button 
                            type="button"
                            onClick={() => handleEditSubmit(item.id)}
                            className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-md border border-emerald-100"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="p-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 rounded-md border border-rose-100"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            type="button"
                            onClick={() => startEditing(item)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button 
                            type="button"
                            onClick={() => onDeleteData(item.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>

                </tr>
              );
            })}

            {filteredAndSortedData.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-10 text-slate-400 font-bold">
                  Nenhum lançamento corresponde aos filtros ativos.
                </td>
              </tr>
            )}

            {/* Total Row */}
            <tr className="bg-slate-50 font-black text-slate-900 border-t border-slate-200">
              <td colSpan={4} className="py-4 px-5 text-left font-black uppercase tracking-wider text-[10px]">
                Totais Consolidados da Seleção
              </td>
              <td className="py-4 px-4 text-right font-mono">{formatCurrency(totals.saldoInicial)}</td>
              <td className="py-4 px-4 text-right font-mono text-blue-700">{formatCurrency(totals.receitas + totals.rendimentos)}</td>
              <td className="py-4 px-4 text-right font-mono text-rose-700">{formatCurrency(totals.despesas)}</td>
              <td className="py-4 px-4 text-right font-mono text-emerald-700">{formatCurrency(totals.saldoFinal)}</td>
              <td className="py-4 px-5"></td>
            </tr>

          </tbody>
        </table>
      </div>

    </div>
  );
};
