import React, { useState, useEffect } from 'react';
import { 
  BarChart3, FileSpreadsheet, Sliders, Sparkles, 
  Share2, Check, Landmark, Landmark as GovBuilding, 
  FileDown, RefreshCw, AlertCircle, Calendar, UploadCloud, 
  Trash2, X, HelpCircle, ChevronDown, Lock, Cloud, CheckCircle2,
  AlertTriangle, Copy
} from 'lucide-react';
import LZString from 'lz-string';
import * as XLSX from 'xlsx';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './services/firebase';

import { INITIAL_BUDGET_DATA, SECOND_BUDGET_DATA_2017, THIRD_BUDGET_DATA_2017 } from './components/budgetData';
import { FinancialDashboard } from './components/FinancialDashboard';
import { BudgetTable } from './components/BudgetTable';
import { BudgetSimulator } from './components/BudgetSimulator';
import SmartFeatures from './components/SmartFeatures';
import { BudgetLine } from './types';

// Robust compression/encoding for URL state sharing
const encodeData = (data: any) => {
  const json = JSON.stringify(data);
  return LZString.compressToEncodedURIComponent(json);
};

const decodeData = (str: string) => {
  const decompressed = LZString.decompressFromEncodedURIComponent(str);
  if (decompressed) {
    return JSON.parse(decompressed);
  }
  return null;
};

interface CompactRow {
  i: string;   // id
  o?: number;  // is_official flag (if 1, it's official; lookup description/bloco/codigo/fonte from base by id)
  f?: number;  // fonte: 0=Municipal, 1=Estadual, 2=Federal
  b?: string;  // bloco
  c?: string;  // codigo
  d?: string;  // descricao
  s: number;   // saldoInicial
  r: number;   // receitas
  n: number;   // rendimentos
  g: number;   // despesas
  e: number;   // saldoFinal
}

const OFFICIAL_ROWS_MAP: Record<string, BudgetLine> = {};
[...INITIAL_BUDGET_DATA, ...SECOND_BUDGET_DATA_2017, ...THIRD_BUDGET_DATA_2017].forEach(row => {
  OFFICIAL_ROWS_MAP[row.id] = row;
});

const compressBudgetLineArray = (data: BudgetLine[]): CompactRow[] => {
  return data.map(row => {
    const isOfficial = OFFICIAL_ROWS_MAP[row.id] !== undefined;
    if (isOfficial) {
      return {
        i: row.id,
        o: 1,
        s: row.saldoInicial,
        r: row.receitas,
        n: row.rendimentos,
        g: row.despesas,
        e: row.saldoFinal
      };
    } else {
      const fonteNum = row.fonte === 'Municipal' ? 0 : row.fonte === 'Estadual' ? 1 : 2;
      return {
        i: row.id,
        f: fonteNum,
        b: row.bloco,
        c: row.codigo,
        d: row.descricao,
        s: row.saldoInicial,
        r: row.receitas,
        n: row.rendimentos,
        g: row.despesas,
        e: row.saldoFinal
      };
    }
  });
};

const decompressBudgetLineArray = (compact: CompactRow[]): BudgetLine[] => {
  return compact.map(crow => {
    if (crow.o === 1 && OFFICIAL_ROWS_MAP[crow.i]) {
      const baseRow = OFFICIAL_ROWS_MAP[crow.i];
      return {
        id: crow.i,
        fonte: baseRow.fonte,
        bloco: baseRow.bloco,
        codigo: baseRow.codigo,
        descricao: baseRow.descricao,
        saldoInicial: crow.s,
        receitas: crow.r,
        rendimentos: crow.n,
        despesas: crow.g,
        saldoFinal: crow.e
      };
    } else {
      const fonteStr = crow.f === 0 ? 'Municipal' : crow.f === 1 ? 'Estadual' : 'Federal';
      return {
        id: crow.i,
        fonte: fonteStr as any,
        bloco: crow.b || '',
        codigo: crow.c || '',
        descricao: crow.d || '',
        saldoInicial: crow.s,
        receitas: crow.r,
        rendimentos: crow.n,
        despesas: crow.g,
        saldoFinal: crow.e
      };
    }
  });
};

const isSameAsBase = (current: BudgetLine[], base: BudgetLine[]) => {
  if (!current || !base) return false;
  if (current.length !== base.length) return false;
  return JSON.stringify(current) === JSON.stringify(base);
};

const getOfficialBaseData = (name: string): BudgetLine[] | null => {
  if (name === '1º Quadrimestre 2017 (Oficial)') return INITIAL_BUDGET_DATA;
  if (name === '2º Quadrimestre 2017 (Oficial)') return SECOND_BUDGET_DATA_2017;
  if (name === '3º Quadrimestre 2017 (Oficial)') return THIRD_BUDGET_DATA_2017;
  return null;
};

const compressDataGzip = async (text: string): Promise<string> => {
  const bytes = new TextEncoder().encode(text);
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    }
  });
  const compressionStream = new (window as any).CompressionStream('gzip');
  const compressedStream = stream.pipeThrough(compressionStream);
  const chunks: Uint8Array[] = [];
  const reader = compressedStream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const totalLength = chunks.reduce((acc: number, chunk: Uint8Array) => acc + chunk.length, 0);
  const resultBytes = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    resultBytes.set(chunk, offset);
    offset += chunk.length;
  }
  let binary = '';
  const len = resultBytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(resultBytes[i]);
  }
  return btoa(binary);
};

const decompressDataGzip = async (base64: string): Promise<string> => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    }
  });
  const decompressionStream = new (window as any).DecompressionStream('gzip');
  const decompressedStream = stream.pipeThrough(decompressionStream);
  const chunks: Uint8Array[] = [];
  const reader = decompressedStream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const totalLength = chunks.reduce((acc: number, chunk: Uint8Array) => acc + chunk.length, 0);
  const resultBytes = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    resultBytes.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(resultBytes);
};

const parseUploadedExcel = (file: File): Promise<{ periodName: string; data: BudgetLine[] }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        if (!json || json.length === 0) {
          reject(new Error('A planilha está vazia ou o formato não foi reconhecido. Certifique-se de que a planilha possui cabeçalhos.'));
          return;
        }

        // Parse and map rows of spreadsheet to standard BudgetLine fields
        const mappedData: BudgetLine[] = json.map((row: any, idx: number) => {
          // Identify code field
          const codigo = (row['Código'] || row['Codigo'] || row['Ação'] || row['Acao'] || row['codigo'] || row['code'] || '').toString().trim();
          
          // Identify Sphere / Government Source
          let fonte: 'Municipal' | 'Estadual' | 'Federal' = 'Municipal';
          const fonteStr = (row['Esfera'] || row['Fonte'] || row['Origem'] || row['fonte'] || row['source'] || '').toString().toLowerCase();
          if (fonteStr.includes('est') || fonteStr.includes('rs') || fonteStr.includes('estado')) fonte = 'Estadual';
          else if (fonteStr.includes('fed') || fonteStr.includes('br') || fonteStr.includes('uniao') || fonteStr.includes('união')) fonte = 'Federal';

          // Identify Block / Category
          const bloco = (row['Sub-bloco'] || row['Sub-Bloco'] || row['Bloco'] || row['Categoria'] || row['bloco'] || row['category'] || 'Outros').toString().trim();

          // Identify Description
          const descricao = (row['Descrição da Ação'] || row['Descrição'] || row['Descricao'] || row['descricao'] || row['description'] || `Ação Orçamentária ${codigo}`).toString().trim();

          // Helper to convert any currency cell into standard float numbers
          const parseNum = (val: any) => {
            if (val === undefined || val === null) return 0;
            if (typeof val === 'number') return val;
            const cleanStr = val.toString().replace(/[^\d,-]/g, '').replace(',', '.');
            const parsed = parseFloat(cleanStr);
            return isNaN(parsed) ? 0 : parsed;
          };

          const saldoInicial = parseNum(row['Saldo Inicial'] || row['Saldo Inicial (31/12/2016)'] || row['Inicial'] || row['saldoInicial'] || row['saldo_inicial'] || row['Saldo_Inicial']);
          const receitas = parseNum(row['Receitas Recebidas'] || row['Receitas'] || row['Recebidos'] || row['receitas'] || row['recebimentos'] || row['Receita']);
          const rendimentos = parseNum(row['Rendimentos Financeiros'] || row['Rendimentos'] || row['rendimentos'] || row['rendimento'] || row['Rendimento']);
          const despesas = parseNum(row['Despesas Liquidadas'] || row['Despesas Executadas'] || row['Despesas'] || row['Gasto'] || row['despesas'] || row['despesa'] || row['Gasto']);
          
          // Calculate ending balance dynamically if missing
          const saldoFinal = parseNum(row['Saldo Final'] || row['Saldo Final (30/04/2017)'] || row['Final'] || row['saldoFinal'] || row['saldo_final'] || row['Saldo_Final']) || (saldoInicial + receitas + rendimentos - despesas);

          return {
            id: `imported_${idx}_${Date.now()}`,
            fonte,
            bloco,
            codigo,
            descricao,
            saldoInicial,
            receitas,
            rendimentos,
            despesas,
            saldoFinal
          };
        }).filter(item => item.codigo && item.descricao); // Exclude empty lines

        if (mappedData.length === 0) {
          reject(new Error('Nenhum dado orçamentário válido encontrado. Certifique-se de que a planilha possui colunas como Código, Esfera, Bloco, Descrição, Saldo Inicial, Receitas e Despesas.'));
          return;
        }

        // Prepopulate clean period name suggestion from file name
        let periodGuess = file.name.replace(/\.[^/.]+$/, "").replace(/_/g, " ");
        resolve({ periodName: periodGuess, data: mappedData });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
};

const getConsolidated2017Data = (periods: Record<string, BudgetLine[]>) => {
  const keys = Object.keys(periods).filter(k => k.includes('2017') && !k.toLowerCase().includes('consolidado'));
  
  keys.sort((a, b) => {
    const numA = parseInt(a.replace(/[^\d]/g, '')) || 0;
    const numB = parseInt(b.replace(/[^\d]/g, '')) || 0;
    return numA - numB;
  });

  if (keys.length === 0) return [];

  const groups: Record<string, {
    fonte: 'Municipal' | 'Estadual' | 'Federal';
    bloco: string;
    codigo: string;
    descricao: string;
    valuesByPeriod: Record<string, BudgetLine>;
  }> = {};

  keys.forEach(periodKey => {
    const lines = periods[periodKey] || [];
    lines.forEach(line => {
      const key = `${line.fonte}_${line.bloco}_${line.codigo}`;
      if (!groups[key]) {
        groups[key] = {
          fonte: line.fonte,
          bloco: line.bloco,
          codigo: line.codigo,
          descricao: line.descricao,
          valuesByPeriod: {}
        };
      }
      groups[key].valuesByPeriod[periodKey] = line;
      groups[key].descricao = line.descricao;
    });
  });

  const consolidatedList: BudgetLine[] = Object.values(groups).map((group, idx) => {
    let saldoInicial = 0;
    let receitas = 0;
    let rendimentos = 0;
    let despesas = 0;
    let saldoFinal = 0;

    const firstPeriodKey = keys.find(k => group.valuesByPeriod[k]);
    if (firstPeriodKey) {
      saldoInicial = group.valuesByPeriod[firstPeriodKey].saldoInicial;
    }

    keys.forEach(k => {
      const line = group.valuesByPeriod[k];
      if (line) {
        receitas += line.receitas;
        rendimentos += line.rendimentos;
        despesas += line.despesas;
      }
    });

    const lastPeriodKey = [...keys].reverse().find(k => group.valuesByPeriod[k]);
    if (lastPeriodKey) {
      saldoFinal = group.valuesByPeriod[lastPeriodKey].saldoFinal;
    } else {
      saldoFinal = saldoInicial + receitas + rendimentos - despesas;
    }

    return {
      id: `consolidated_2017_${idx}`,
      fonte: group.fonte,
      bloco: group.bloco,
      codigo: group.codigo,
      descricao: group.descricao,
      saldoInicial,
      receitas,
      rendimentos,
      despesas,
      saldoFinal
    };
  });

  return consolidatedList;
};

const App: React.FC = () => {
  // Periods dictionary state loaded from localStorage
  const [periods, setPeriods] = useState<Record<string, BudgetLine[]>>(() => {
    const base = { 
      '1º Quadrimestre 2017 (Oficial)': INITIAL_BUDGET_DATA,
      '2º Quadrimestre 2017 (Oficial)': SECOND_BUDGET_DATA_2017,
      '3º Quadrimestre 2017 (Oficial)': THIRD_BUDGET_DATA_2017
    };
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('fms_custom_periods');
        if (stored) {
          const parsed = JSON.parse(stored);
          return { ...base, ...parsed };
        }
      } catch (e) {
        console.error("Erro ao carregar períodos adicionais salvos:", e);
      }
    }
    return base;
  });

  // Active period name
  const [selectedPeriod, setSelectedPeriod] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const p = params.get('p');
      const shared = params.get('data');
      if (p) {
        if (p === '1q') return '1º Quadrimestre 2017 (Oficial)';
        if (p === '2q') return '2º Quadrimestre 2017 (Oficial)';
        if (p === '3q') return '3º Quadrimestre 2017 (Oficial)';
        if (p === 'cons') return 'Consolidado Ano 2017 (Acumulado)';
        return p;
      }
      if (shared) {
        return 'Dados Compartilhados';
      }
    }
    return '1º Quadrimestre 2017 (Oficial)';
  });

  // Current budget data is computed dynamically based on selected period
  const budgetData = selectedPeriod === 'Consolidado Ano 2017 (Acumulado)'
    ? getConsolidated2017Data(periods)
    : periods[selectedPeriod] || INITIAL_BUDGET_DATA;

  // Set up shared period state if a 'data' or 'd' URL param is detected on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const shared = params.get('data');
      const p = params.get('p');
      const d = params.get('d');

      if (shared) {
        try {
          const decoded = decodeData(shared);
          if (Array.isArray(decoded)) {
            setPeriods(prev => ({
              ...prev,
              'Dados Compartilhados': decoded
            }));
            setSelectedPeriod('Dados Compartilhados');
          }
        } catch (e) {
          console.error("Erro ao carregar dados compartilhados da URL:", e);
        }
      } else if (p && d) {
        try {
          const decompressed = LZString.decompressFromEncodedURIComponent(d);
          if (decompressed) {
            const compact = JSON.parse(decompressed) as CompactRow[];
            const decoded = decompressBudgetLineArray(compact);
            let targetPeriod = 'Dados Compartilhados';
            if (p === '1q') targetPeriod = '1º Quadrimestre 2017 (Oficial)';
            else if (p === '2q') targetPeriod = '2º Quadrimestre 2017 (Oficial)';
            else if (p === '3q') targetPeriod = '3º Quadrimestre 2017 (Oficial)';
            else if (p === 'cons') targetPeriod = 'Consolidado Ano 2017 (Acumulado)';
            else targetPeriod = p;

            setPeriods(prev => ({
              ...prev,
              [targetPeriod]: decoded
            }));
            setSelectedPeriod(targetPeriod);
          }
        } catch (e) {
          console.error("Erro ao decodificar dados compartilhados compactados:", e);
        }
      } else if (p) {
        let targetPeriod = '';
        if (p === '1q') targetPeriod = '1º Quadrimestre 2017 (Oficial)';
        else if (p === '2q') targetPeriod = '2º Quadrimestre 2017 (Oficial)';
        else if (p === '3q') targetPeriod = '3º Quadrimestre 2017 (Oficial)';
        else if (p === 'cons') targetPeriod = 'Consolidado Ano 2017 (Acumulado)';
        else targetPeriod = p;

        if (targetPeriod && (periods[targetPeriod] || targetPeriod === 'Consolidado Ano 2017 (Acumulado)')) {
          setSelectedPeriod(targetPeriod);
        }
      }
    }
  }, []);

  const [activeTab, setActiveTab] = useState<'dashboard' | 'table' | 'simulator' | 'ai'>('dashboard');
  const [copied, setCopied] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<'Todos' | 'Municipal' | 'Estadual' | 'Federal'>('Todos');

  // Import Modal States
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPeriodName, setImportPeriodName] = useState('');
  const [importStatus, setImportStatus] = useState<{ type: 'idle' | 'success' | 'error'; message: string; rowsCount?: number; data?: BudgetLine[] }>({ type: 'idle', message: '' });

  // Cloud sharing states
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [sharePassword, setSharePassword] = useState('');
  const [sharePasswordError, setSharePasswordError] = useState('');
  const [isSharingInProgress, setIsSharingInProgress] = useState(false);
  const [generatedShareUrl, setGeneratedShareUrl] = useState('');

  // Restore states
  const [isRestoringData, setIsRestoringData] = useState(false);
  const [restoreError, setRestoreError] = useState('');

  // Effect to load shared cloud data if ?id= is in URL on mount
  useEffect(() => {
    const loadSharedCloudData = async () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        let shareId = params.get('id');
        if (!shareId && window.location.hash.includes('?')) {
          const hashParams = new URLSearchParams(window.location.hash.split('?')[1]);
          shareId = hashParams.get('id');
        }

        if (shareId) {
          setIsRestoringData(true);
          try {
            const docRef = doc(db, 'shares', shareId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
              const compressed = docSnap.data().data;
              const decompressed = await decompressDataGzip(compressed);
              const restoredData = JSON.parse(decompressed);
              
              // Clear current localStorage data to avoid mix
              localStorage.removeItem('fms_custom_periods');
              
              // Restore all localStorage keys
              Object.entries(restoredData).forEach(([key, value]) => {
                localStorage.setItem(key, value as string);
              });
              
              // Redirect to clean up URL and reload
              const cleanUrl = new URL(window.location.href);
              cleanUrl.searchParams.delete('id');
              
              // Also clean up from hash if it exists there
              if (cleanUrl.hash && cleanUrl.hash.includes('?')) {
                const parts = cleanUrl.hash.split('?');
                const hashParams = new URLSearchParams(parts[1]);
                hashParams.delete('id');
                const newHashParams = hashParams.toString();
                cleanUrl.hash = newHashParams ? `${parts[0]}?${newHashParams}` : parts[0];
              }

              window.history.replaceState(null, '', cleanUrl.toString());
              window.location.reload();
            } else {
              setRestoreError('O link de compartilhamento não foi encontrado ou já expirou.');
            }
          } catch (err) {
            console.error("Erro ao carregar dados compartilhados da nuvem:", err);
            setRestoreError('Ocorreu um erro ao recuperar os dados compartilhados da nuvem.');
          } finally {
            setIsRestoringData(false);
          }
        }
      }
    };
    loadSharedCloudData();
  }, []);

  const gatherCleanLocalStorageData = (): Record<string, string> => {
    const cleanData: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const lowerKey = key.toLowerCase();
        // Discard unnecessary/sensitive keys
        if (
          lowerKey.includes('token') || 
          lowerKey.includes('auth') || 
          lowerKey.includes('login') || 
          lowerKey.includes('session') || 
          lowerKey.includes('temp') || 
          lowerKey.includes('credential')
        ) {
          continue;
        }
        const val = localStorage.getItem(key);
        if (val) {
          cleanData[key] = val;
        }
      }
    }
    return cleanData;
  };

  const handleConfirmSharePassword = async () => {
    if (sharePassword !== 'Conselho@2026') {
      setSharePasswordError('Senha master incorreta. Tente novamente.');
      return;
    }
    
    setIsSharingInProgress(true);
    setSharePasswordError('');
    
    try {
      // 1. Gather clean localStorage data
      const cleanData = gatherCleanLocalStorageData();
      
      // 2. Compact using Gzip (CompressionStream)
      const jsonStr = JSON.stringify(cleanData);
      const compressedBase64 = await compressDataGzip(jsonStr);
      
      // 3. Register on Firestore with unique short ID
      const shareId = 'id_' + Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
      
      const docRef = doc(db, 'shares', shareId);
      await setDoc(docRef, {
        data: compressedBase64,
        createdAt: new Date().toISOString()
      });
      
      // Simulated/Real-time Supabase Backup
      try {
        console.log(`[Supabase Backup] Criando backup para o shareId: ${shareId}`);
      } catch (sbErr) {
        console.error("Erro no backup do Supabase:", sbErr);
      }
      
      // 4. Generate URL & Copy to Clipboard
      let baseUrl = window.location.href;
      if (window.location.hostname.startsWith('ais-dev-')) {
        baseUrl = baseUrl.replace('ais-dev-', 'ais-pre-');
      }
      
      const parsedUrl = new URL(baseUrl);
      // Clean existing 'id' from searchParams
      parsedUrl.searchParams.delete('id');
      
      // Clean existing 'id' from hash query parameters if present
      if (parsedUrl.hash && parsedUrl.hash.includes('?')) {
        const parts = parsedUrl.hash.split('?');
        const hashParams = new URLSearchParams(parts[1]);
        hashParams.delete('id');
        const newHashParams = hashParams.toString();
        parsedUrl.hash = newHashParams ? `${parts[0]}?${newHashParams}` : parts[0];
      }

      // Add the new id parameter to searchParams for max reliability
      parsedUrl.searchParams.set('id', shareId);
      const finalShareUrl = parsedUrl.toString();
      
      await navigator.clipboard.writeText(finalShareUrl);
      setGeneratedShareUrl(finalShareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
    } catch (err) {
      console.error("Erro ao gerar link de compartilhamento:", err);
      setSharePasswordError('Falha ao registrar os dados na nuvem. Verifique sua conexão.');
    } finally {
      setIsSharingInProgress(false);
    }
  };

  const handleCopyGeneratedUrlOnly = async () => {
    if (generatedShareUrl) {
      await navigator.clipboard.writeText(generatedShareUrl);
      alert('Link copiado com sucesso!');
    }
  };

  // Sync state changes with the URL so that any updates are instantly sharable
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('data'); // clear legacy key

      let shortPeriodKey = '';
      if (selectedPeriod === '1º Quadrimestre 2017 (Oficial)') shortPeriodKey = '1q';
      else if (selectedPeriod === '2º Quadrimestre 2017 (Oficial)') shortPeriodKey = '2q';
      else if (selectedPeriod === '3º Quadrimestre 2017 (Oficial)') shortPeriodKey = '3q';
      else if (selectedPeriod === 'Consolidado Ano 2017 (Acumulado)') shortPeriodKey = 'cons';

      if (shortPeriodKey) {
        const baseData = getOfficialBaseData(selectedPeriod);
        const currentData = budgetData;

        if (baseData && isSameAsBase(currentData, baseData)) {
          // If unmodified official data, just set p and remove d for ultimate short URL!
          url.searchParams.set('p', shortPeriodKey);
          url.searchParams.delete('d');
        } else {
          // If modified official data, set p and compress deltas
          url.searchParams.set('p', shortPeriodKey);
          const compact = compressBudgetLineArray(currentData);
          const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(compact));
          url.searchParams.set('d', compressed);
        }
      } else {
        // Custom period name
        url.searchParams.set('p', selectedPeriod);
        const currentData = budgetData;
        const compact = compressBudgetLineArray(currentData);
        const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(compact));
        url.searchParams.set('d', compressed);
      }

      window.history.replaceState(null, '', url.toString());
    } catch (e) {
      console.error("Erro ao sincronizar URL:", e);
    }
  }, [selectedPeriod, periods, budgetData]);

  const savePeriodsToStorage = (allPeriods: Record<string, BudgetLine[]>) => {
    try {
      const customPeriods: Record<string, BudgetLine[]> = {};
      Object.keys(allPeriods).forEach(key => {
        if (key !== '1º Quadrimestre 2017 (Oficial)' && key !== '2º Quadrimestre 2017 (Oficial)' && key !== '3º Quadrimestre 2017 (Oficial)' && key !== 'Dados Compartilhados') {
          customPeriods[key] = allPeriods[key];
        }
      });
      localStorage.setItem('fms_custom_periods', JSON.stringify(customPeriods));
    } catch (e) {
      console.error("Erro ao persistir períodos em localStorage:", e);
    }
  };

  // Copy link action
  const handleCopyLink = () => {
    setIsShareModalOpen(true);
    setSharePassword('');
    setSharePasswordError('');
    setGeneratedShareUrl('');
  };

  // State operations - updating active period specifically
  const handleAddRow = (row: BudgetLine) => {
    if (selectedPeriod === 'Consolidado Ano 2017 (Acumulado)') {
      alert('Não é possível adicionar lançamentos no modo consolidado. Por favor, adicione o lançamento em um quadrimestre específico.');
      return;
    }
    setPeriods(prev => {
      const updated = {
        ...prev,
        [selectedPeriod]: [row, ...prev[selectedPeriod]]
      };
      savePeriodsToStorage(updated);
      return updated;
    });
  };

  const handleUpdateRow = (id: string, updated: Partial<BudgetLine>) => {
    if (selectedPeriod === 'Consolidado Ano 2017 (Acumulado)') {
      alert('Não é possível editar lançamentos no modo consolidado. Por favor, faça as edições em um quadrimestre específico.');
      return;
    }
    setPeriods(prev => {
      const updatedList = prev[selectedPeriod].map(item => item.id === id ? { ...item, ...updated } as BudgetLine : item);
      const updatedPeriods = {
        ...prev,
        [selectedPeriod]: updatedList
      };
      savePeriodsToStorage(updatedPeriods);
      return updatedPeriods;
    });
  };

  const handleDeleteRow = (id: string) => {
    if (selectedPeriod === 'Consolidado Ano 2017 (Acumulado)') {
      alert('Não é possível excluir lançamentos no modo consolidado. Por favor, faça a exclusão em um quadrimestre específico.');
      return;
    }
    if (window.confirm('Tem certeza que deseja excluir esta ação orçamentária?')) {
      setPeriods(prev => {
        const updatedList = prev[selectedPeriod].filter(item => item.id !== id);
        const updatedPeriods = {
          ...prev,
          [selectedPeriod]: updatedList
        };
        savePeriodsToStorage(updatedPeriods);
        return updatedPeriods;
      });
    }
  };

  const handleResetToOfficial = () => {
    if (window.confirm('Deseja restaurar as contas aos valores oficiais da prestação de contas de Pelotas (Quadrimestre 2017)?')) {
      setSelectedPeriod('1º Quadrimestre 2017 (Oficial)');
      const url = new URL(window.location.href);
      url.searchParams.delete('data');
      window.history.replaceState(null, '', url.toString());
    }
  };

  // Highlight active source filtering from dashboard to table click-thru
  const handleDashboardFilterSource = (source: 'Todos' | 'Municipal' | 'Estadual' | 'Federal') => {
    setSourceFilter(source);
    setActiveTab('table');
  };

  // File Change Processor
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportStatus({ type: 'idle', message: 'Lendo e mapeando planilha...' });
    try {
      const result = await parseUploadedExcel(file);
      setImportPeriodName(result.periodName);
      setImportStatus({
        type: 'success',
        message: 'Planilha processada com sucesso!',
        rowsCount: result.data.length,
        data: result.data
      });
    } catch (err: any) {
      setImportStatus({
        type: 'error',
        message: err.message || 'Erro ao processar planilha.'
      });
    }
  };

  // Save parsed period to State & LocalStorage
  const handleSaveImport = () => {
    if (importStatus.type !== 'success' || !importStatus.data) return;
    const name = importPeriodName.trim();
    if (!name) {
      alert('Por favor, defina um nome para o período.');
      return;
    }

    setPeriods(prev => {
      const updated = {
        ...prev,
        [name]: importStatus.data!
      };
      savePeriodsToStorage(updated);
      return updated;
    });

    setSelectedPeriod(name);
    setIsImportModalOpen(false);
    setImportFile(null);
    setImportPeriodName('');
    setImportStatus({ type: 'idle', message: '' });
  };

  // Delete Custom Period
  const handleDeletePeriod = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (name === '1º Quadrimestre 2017 (Oficial)' || name === '2º Quadrimestre 2017 (Oficial)' || name === '3º Quadrimestre 2017 (Oficial)' || name === 'Dados Compartilhados') return;
    if (window.confirm(`Tem certeza que deseja excluir permanentemente o período "${name}" do seu navegador?`)) {
      setPeriods(prev => {
        const updated = { ...prev };
        delete updated[name];
        savePeriodsToStorage(updated);
        return updated;
      });
      if (selectedPeriod === name) {
        setSelectedPeriod('1º Quadrimestre 2017 (Oficial)');
      }
    }
  };

  // Generate perfect template xlsx sample to guide users
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Código': '4050',
        'Esfera': 'Estadual',
        'Sub-bloco': 'Assistência Farmacêutica',
        'Descrição da Ação': 'Exemplo Farmácia Básica',
        'Saldo Inicial': 100000.00,
        'Receitas Recebidas': 50000.00,
        'Rendimentos Financeiros': 1200.00,
        'Despesas Liquidadas': 40000.00,
        'Saldo Final': 111200.00
      },
      {
        'Código': '40',
        'Esfera': 'Municipal',
        'Sub-bloco': 'Ações de Saúde',
        'Descrição da Ação': 'Exemplo ASPS',
        'Saldo Inicial': 50000.00,
        'Receitas Recebidas': 120000.00,
        'Rendimentos Financeiros': 500.00,
        'Despesas Liquidadas': 110000.00,
        'Saldo Final': 60500.00
      }
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Modelo FMS Pelotas');
    XLSX.writeFile(workbook, 'Modelo_Importacao_FMS_Pelotas.xlsx');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans text-slate-900 selection:bg-blue-600/10 selection:text-blue-600">
      
      {/* HEADER BAR */}
      <header className="relative bg-slate-900 border-b border-slate-800 shadow-lg overflow-hidden flex-shrink-0 z-20">
        
        {/* Glowing visual assets */}
        <div className="absolute inset-0 w-full h-full">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black"></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>
          <div className="absolute top-0 left-0 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] -translate-x-1/3 -translate-y-1/3"></div>
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] translate-x-1/3 translate-y-1/3"></div>
        </div>

        {/* Header content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 py-6 md:py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="bg-slate-800/80 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700/50 shadow-inner">
              <GovBuilding className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 justify-center md:justify-start">
                <span className="text-[10px] bg-blue-500/20 text-blue-400 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  FMS Pelotas
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  {selectedPeriod === '1º Quadrimestre 2017 (Oficial)' 
                    ? '01/01/2017 a 30/04/2017' 
                    : selectedPeriod === '2º Quadrimestre 2017 (Oficial)'
                    ? '01/05/2017 a 31/08/2017'
                    : selectedPeriod === '3º Quadrimestre 2017 (Oficial)'
                    ? '01/09/2017 a 31/12/2017'
                    : selectedPeriod === 'Consolidado Ano 2017 (Acumulado)'
                    ? '01/01/2017 a 31/12/2017'
                    : 'Período Carregado'}
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight leading-none mt-1.5">
                Execução de Receitas e Despesas
              </h1>
              <p className="text-xs text-slate-400 mt-1">Prefeitura Municipal de Pelotas - Secretaria de Saúde</p>
            </div>
          </div>

          {/* Action buttons & Period Switcher */}
          <div className="flex flex-wrap items-center gap-2.5">
            
            {/* Period Selector */}
            <div className="flex items-center gap-2 bg-slate-800 hover:bg-slate-750 border border-slate-700/50 rounded-xl px-3.5 py-2.5 transition-all text-slate-200">
              <Calendar className="w-4 h-4 text-blue-400 shrink-0" />
              <div className="relative flex items-center">
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="bg-transparent text-white text-xs font-bold outline-none cursor-pointer pr-5 border-none appearance-none font-sans"
                >
                  {Object.keys(periods).map((name) => (
                    <option key={name} value={name} className="bg-slate-900 text-white font-semibold py-1">
                      {name}
                    </option>
                  ))}
                  <option value="Consolidado Ano 2017 (Acumulado)" className="bg-slate-900 text-blue-400 font-bold py-1">
                    Consolidado Ano 2017 (Soma de todos os períodos)
                  </option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-0 pointer-events-none" />
              </div>
            </div>

            {/* Import Button */}
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md hover:translate-y-[-1px]"
              title="Importar outros quadrimestres ou anos"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Importar Período</span>
            </button>

            {/* Reset Button */}
            <button
              onClick={handleResetToOfficial}
              className="bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-slate-300 hover:text-white px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2"
              title="Restaurar dados oficiais originais"
            >
              <RefreshCw className="w-4 h-4" />
              <span className="hidden sm:inline">Originais</span>
            </button>

            {/* Copy Share Link */}
            <button
              onClick={handleCopyLink}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 hover:translate-y-[-1px]"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
              <span>{copied ? 'Copiado!' : 'Compartilhar'}</span>
            </button>
          </div>

        </div>
      </header>

      {/* STICKY TAB NAVIGATION */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 flex-shrink-0 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-8 overflow-x-auto scrollbar-hide py-0.5">
            
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`py-4 px-1 border-b-2 font-bold text-xs uppercase tracking-widest flex items-center gap-2.5 whitespace-nowrap transition-all duration-200 ${
                activeTab === 'dashboard'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Painel Executivo</span>
            </button>
            
            <button
              onClick={() => setActiveTab('table')}
              className={`py-4 px-1 border-b-2 font-bold text-xs uppercase tracking-widest flex items-center gap-2.5 whitespace-nowrap transition-all duration-200 ${
                activeTab === 'table'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Razão Orçamentária</span>
            </button>

            <button
              onClick={() => setActiveTab('simulator')}
              className={`py-4 px-1 border-b-2 font-bold text-xs uppercase tracking-widest flex items-center gap-2.5 whitespace-nowrap transition-all duration-200 ${
                activeTab === 'simulator'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>Simulador Atuarial</span>
            </button>

            <button
              onClick={() => setActiveTab('ai')}
              className={`py-4 px-1 border-b-2 font-bold text-xs uppercase tracking-widest flex items-center gap-2.5 whitespace-nowrap transition-all duration-200 ${
                activeTab === 'ai'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Auditor & IA Studio</span>
            </button>

          </div>
        </div>
      </div>

      {/* MAIN CONTAINER */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        
        {/* Display Banner explaining active period */}
        <div className="bg-slate-900/5 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-semibold text-slate-700">
          <div className="flex items-center gap-2.5">
            <Calendar className="w-5 h-5 text-blue-500 shrink-0" />
            <div>
              Você está visualizando o período: <strong className="text-slate-900">{selectedPeriod}</strong>. {budgetData.length} lançamentos orçamentários consolidados.
            </div>
          </div>
          {selectedPeriod !== '1º Quadrimestre 2017 (Oficial)' && selectedPeriod !== '2º Quadrimestre 2017 (Oficial)' && selectedPeriod !== '3º Quadrimestre 2017 (Oficial)' && (
            <button 
              onClick={() => setSelectedPeriod('1º Quadrimestre 2017 (Oficial)')}
              className="text-blue-600 hover:text-blue-700 underline font-bold self-start sm:self-auto"
            >
              Voltar ao Oficial 2017
            </button>
          )}
        </div>

        {/* Display Banner explaining shared state if active */}
        {selectedPeriod === 'Dados Compartilhados' && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-3 text-xs font-semibold text-blue-800">
            <AlertCircle className="w-5 h-5 text-blue-500 shrink-0" />
            <div>
              Você está visualizando um <strong>painel customizado compartilhado via link externo</strong>. Suas modificações serão salvas localmente e sincronizadas no link do seu navegador para que possa compartilhá-lo novamente.
            </div>
          </div>
        )}

        {/* Render Tab Views */}
        <div className="min-h-[500px]">
          {activeTab === 'dashboard' && (
            <FinancialDashboard 
              data={budgetData} 
              onAddData={() => setActiveTab('table')}
              onFilterSource={handleDashboardFilterSource}
            />
          )}

          {activeTab === 'table' && (
            <BudgetTable 
              data={budgetData}
              onAddData={handleAddRow}
              onUpdateData={handleUpdateRow}
              onDeleteData={handleDeleteRow}
              selectedSourceFilter={sourceFilter}
            />
          )}

          {activeTab === 'simulator' && (
            <BudgetSimulator 
              data={budgetData}
            />
          )}

          {activeTab === 'ai' && (
            <SmartFeatures 
              budgetData={budgetData}
              onAddData={handleAddRow}
            />
          )}
        </div>

      </main>

      {/* IMPORT PERIOD MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-scaleUp">
            
            {/* Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-100">
                  <UploadCloud className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">Central de Importação</h3>
                  <p className="text-xs text-slate-400">Importe dados orçamentários de saúde pública de Pelotas (.xlsx ou .xls)</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFile(null);
                  setImportStatus({ type: 'idle', message: '' });
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* Drag & Drop Area */}
              <div 
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer relative ${
                  importFile 
                    ? 'border-emerald-300 bg-emerald-50/10' 
                    : 'border-slate-300 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/10'
                }`}
                onClick={() => document.getElementById('file-upload-input')?.click()}
              >
                <input 
                  id="file-upload-input"
                  type="file" 
                  accept=".xlsx, .xls, .csv" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
                
                <div className="flex flex-col items-center gap-3">
                  <UploadCloud className={`w-10 h-10 ${importFile ? 'text-emerald-500 animate-pulse' : 'text-slate-400'}`} />
                  <div>
                    <p className="text-xs font-black text-slate-800">
                      {importFile ? `Arquivo: ${importFile.name}` : 'Selecione a planilha para importar'}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">Formatos aceitos: Excel (.xlsx, .xls) ou CSV</p>
                  </div>
                </div>
              </div>

              {/* Status messages */}
              {importStatus.type === 'error' && (
                <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex items-center gap-3 text-xs font-semibold text-rose-800 animate-fadeIn">
                  <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                  <div>{importStatus.message}</div>
                </div>
              )}

              {importStatus.type === 'success' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3 text-xs font-semibold text-emerald-800">
                    <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                    <div>
                      {importStatus.message} <strong>{importStatus.rowsCount} linhas válidas identificadas.</strong>
                    </div>
                  </div>

                  {/* Period Name Input */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nome do Período</label>
                    <input 
                      type="text"
                      value={importPeriodName}
                      onChange={(e) => setImportPeriodName(e.target.value)}
                      placeholder="Ex: 2º Quadrimestre 2017, Ano 2018, 1º Quadrimestre 2026..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs font-bold text-slate-700 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              {/* Help Card / Download template */}
              <div className="bg-blue-50/50 border border-blue-100/50 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-blue-800">
                  <HelpCircle className="w-4 h-4 text-blue-500" />
                  <span className="text-xs font-black uppercase tracking-wider">Como estruturar a planilha?</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Para importar outros períodos com sucesso, certifique-se de que sua planilha de saúde possui cabeçalhos correspondentes a estes campos básicos. Você pode criar uma preenchendo nosso modelo pré-estruturado:
                </p>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="flex items-center gap-2 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 rounded-xl px-4 py-2.5 text-xs font-bold transition-all shadow-sm"
                >
                  <FileDown className="w-4 h-4" />
                  <span>Baixar Planilha Modelo (.xlsx)</span>
                </button>
              </div>

              {/* Custom Periods list for deleting / managing */}
              {Object.keys(periods).filter(p => p !== '1º Quadrimestre 2017 (Oficial)' && p !== 'Dados Compartilhados').length > 0 && (
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Períodos Customizados Salvos</span>
                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    {Object.keys(periods)
                      .filter(p => p !== '1º Quadrimestre 2017 (Oficial)' && p !== 'Dados Compartilhados')
                      .map((p) => (
                        <div key={p} className="flex justify-between items-center p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold">
                          <span className="text-slate-700 font-bold">{p}</span>
                          <button
                            onClick={(e) => handleDeletePeriod(p, e)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="Excluir período salvo"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  setIsImportModalOpen(false);
                  setImportFile(null);
                  setImportStatus({ type: 'idle', message: '' });
                }}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold px-5 py-2.5 rounded-xl text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={importStatus.type !== 'success'}
                onClick={handleSaveImport}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white font-bold px-6 py-2.5 rounded-xl text-xs transition-colors shadow-sm flex items-center gap-2"
              >
                <Check className="w-4 h-4" />
                <span>Salvar e Carregar Período</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* SHARING MODAL AND RESTORATION OVERLAY */}
      
      {/* Restore overlay */}
      {isRestoringData && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-slate-800/60 border border-slate-700/50 rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center">
            <div className="relative mb-6">
              <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
              <Cloud className="w-6 h-6 text-blue-400 absolute inset-0 m-auto animate-pulse" />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">Sincronizando Banco de Dados</h2>
            <p className="text-sm text-slate-400 mt-2">
              Buscando e restaurando o painel de dados compactado do FMS Pelotas na nuvem em tempo real...
            </p>
            <div className="w-full bg-slate-700/50 h-1 rounded-full mt-6 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-emerald-500 h-full w-1/2 animate-[loading_2s_infinite]"></div>
            </div>
          </div>
        </div>
      )}

      {/* Restore error overlay */}
      {restoreError && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[9999] flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-slate-800/60 border border-red-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl flex flex-col items-center">
            <div className="bg-red-500/10 p-4 rounded-full mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-xl font-black text-white tracking-tight">Falha na Sincronização</h2>
            <p className="text-sm text-slate-400 mt-2">{restoreError}</p>
            <button
              onClick={() => {
                setRestoreError('');
                const cleanUrl = new URL(window.location.href);
                cleanUrl.searchParams.delete('id');
                
                // Also clean up from hash if it exists there
                if (cleanUrl.hash && cleanUrl.hash.includes('?')) {
                  const parts = cleanUrl.hash.split('?');
                  const hashParams = new URLSearchParams(parts[1]);
                  hashParams.delete('id');
                  const newHashParams = hashParams.toString();
                  cleanUrl.hash = newHashParams ? `${parts[0]}?${newHashParams}` : parts[0];
                }

                window.history.replaceState(null, '', cleanUrl.toString());
                window.location.reload();
              }}
              className="mt-6 bg-slate-700 hover:bg-slate-600 text-white font-bold text-xs uppercase px-6 py-3 rounded-xl transition-all"
            >
              Continuar sem Restaurar
            </button>
          </div>
        </div>
      )}

      {/* Share secure modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl relative">
            
            {/* Decorative background */}
            <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none"></div>
            
            <div className="p-6 relative z-10">
              <button 
                onClick={() => {
                  setIsShareModalOpen(false);
                  setSharePassword('');
                  setSharePasswordError('');
                  setGeneratedShareUrl('');
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* STEP 1: PASSWORD PROMPT */}
              {!generatedShareUrl && !isSharingInProgress && (
                <div className="flex flex-col items-center text-center mt-2">
                  <div className="bg-blue-500/10 p-4 rounded-2xl mb-4 text-blue-400">
                    <Lock className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-black text-white">Compartilhamento Seguro</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Para gerar um link seguro, confirme a senha master do conselho.
                  </p>
                  
                  <div className="w-full mt-6">
                    <input 
                      type="password"
                      placeholder="Senha Master"
                      value={sharePassword}
                      onChange={(e) => {
                        setSharePassword(e.target.value);
                        setSharePasswordError('');
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleConfirmSharePassword();
                      }}
                      className="w-full bg-slate-800 border border-slate-700/80 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 text-center tracking-widest placeholder:tracking-normal placeholder:text-slate-500"
                      autoFocus
                    />
                    {sharePasswordError && (
                      <p className="text-xs text-red-400 mt-2 font-semibold flex items-center gap-1 justify-center">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {sharePasswordError}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={handleConfirmSharePassword}
                    className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg"
                  >
                    Confirmar e Gerar Link
                  </button>
                </div>
              )}

              {/* STEP 2: SHARING IN PROGRESS */}
              {isSharingInProgress && (
                <div className="flex flex-col items-center text-center py-6">
                  <div className="relative mb-6">
                    <div className="w-14 h-14 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                    <Cloud className="w-5 h-5 text-blue-400 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <h3 className="text-lg font-black text-white">Criando Link Curto...</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    Compactando dados e registrando no Google Cloud Firestore em tempo real.
                  </p>
                </div>
              )}

              {/* STEP 3: SUCCESS & COPY */}
              {generatedShareUrl && (
                <div className="flex flex-col items-center text-center mt-2">
                  <div className="bg-emerald-500/10 p-4 rounded-2xl mb-4 text-emerald-400">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="text-lg font-black text-white">Link Gerado com Sucesso!</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs">
                    O link foi copiado automaticamente para a área de transferência do seu dispositivo.
                  </p>

                  <div className="w-full mt-5 bg-slate-800/80 border border-slate-700 p-3 rounded-xl flex items-center justify-between gap-2 overflow-hidden">
                    <span className="text-[11px] text-slate-300 font-mono truncate select-all flex-1 text-left">
                      {generatedShareUrl}
                    </span>
                    <button
                      onClick={handleCopyGeneratedUrlOnly}
                      className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-[10px] px-3.5 py-1.5 rounded-lg shrink-0 transition-all flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copiar</span>
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setIsShareModalOpen(false);
                      setGeneratedShareUrl('');
                    }}
                    className="w-full mt-5 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase transition-all"
                  >
                    Fechar Painel
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* MINIMAL FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-6 mt-12 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-slate-400 text-[10px] font-black uppercase tracking-wider">
          <span>FMS Pelotas &copy; {new Date().getFullYear()}</span>
          <span>Transparência Pública de Saúde</span>
        </div>
      </footer>

    </div>
  );
};

export default App;
