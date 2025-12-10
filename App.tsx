import React, { useState, useEffect } from 'react';
import TriageDashboard from './components/TriageDashboard';
import { TriageData } from './types';
import { Activity, Sparkles } from 'lucide-react';
import { getFastInsight } from './services/geminiService';
import LZString from 'lz-string';

// Mock Initial Data
const initialData: TriageData[] = [
  { id: '1', dia: '2023-10-01', vermelho: 2, laranja: 5, amarelo: 15, verde: 30, azul: 10, total: 62 },
  { id: '2', dia: '2023-10-02', vermelho: 1, laranja: 8, amarelo: 12, verde: 35, azul: 8, total: 64 },
  { id: '3', dia: '2023-10-03', vermelho: 3, laranja: 4, amarelo: 18, verde: 25, azul: 12, total: 62 },
  { id: '4', dia: '2023-10-04', vermelho: 0, laranja: 6, amarelo: 20, verde: 40, azul: 15, total: 81 },
  { id: '5', dia: '2023-10-05', vermelho: 2, laranja: 7, amarelo: 16, verde: 28, azul: 9, total: 62 },
];

// Robust compression/encoding
const encodeData = (data: any) => {
  const json = JSON.stringify(data);
  // Use LZString to compress data for URL storage
  return LZString.compressToEncodedURIComponent(json);
};

const decodeData = (str: string) => {
  // 1. Try decompressing first (New Format)
  const decompressed = LZString.decompressFromEncodedURIComponent(str);
  if (decompressed) {
    return JSON.parse(decompressed);
  }
  
  // 2. Fallback: Try decoding legacy Base64 (Old Format)
  try {
    return JSON.parse(decodeURIComponent(atob(str).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join('')));
  } catch (e) {
    // 3. Last resort: simple atob
    try {
      return JSON.parse(atob(str));
    } catch (e2) {
      console.error("Falha total na decodificação", e2);
      return null;
    }
  }
};

const App: React.FC = () => {
  // Initialize data: Check URL for shared data first, otherwise use initialData
  const [data, setData] = useState<TriageData[]>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const sharedData = params.get('data');
      if (sharedData) {
        try {
          const parsedData = decodeData(sharedData);
          if (Array.isArray(parsedData)) {
            return parsedData;
          }
        } catch (e) {
          console.error("Erro ao carregar dados compartilhados:", e);
        }
      }
    }
    return initialData;
  });

  const [insight, setInsight] = useState<string>("Carregando análise rápida...");

  // Sync URL with data changes using Compression
  useEffect(() => {
    try {
      if (data) {
        const encoded = encodeData(data);
        const url = new URL(window.location.href);
        url.searchParams.set('data', encoded);
        window.history.replaceState(null, '', url.toString());
      }
    } catch (e) {
      console.error("Erro ao atualizar URL:", e);
    }
  }, [data]);

  // Fast Insight Logic
  useEffect(() => {
    const fetchInsight = async () => {
      // Summarize data for the prompt to save tokens/latency
      const summary = data.slice(-3).map(d => `${d.dia}: Total ${d.total} (Vermelho ${d.vermelho})`).join('; ');
      const result = await getFastInsight(summary);
      setInsight(result);
    };
    fetchInsight();
  }, [data]);

  const handleAddData = (newData: TriageData) => {
    // Add new data and sort by date
    const updatedData = [...data, newData].sort((a, b) => 
      new Date(a.dia).getTime() - new Date(b.dia).getTime()
    );
    setData(updatedData);
  };

  const handleDeleteData = (id: string) => {
    setData(prevData => prevData.filter(item => item.id !== id));
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white h-24 md:h-24 border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0 shadow-sm z-10">
          <div className="flex items-center gap-5">
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-200"></div>
              <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 p-3.5 rounded-xl border border-slate-700/50 shadow-xl">
                <Activity className="w-7 h-7 text-blue-400" />
              </div>
            </div>
            <div className="flex flex-col items-start">
              {/* Highlighted Title Container */}
              <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-slate-50 px-5 py-2 rounded-xl border border-blue-100/80 shadow-[0_2px_8px_rgba(59,130,246,0.05)] inline-flex items-center mb-1">
                <h1 className="text-2xl font-black text-slate-800 tracking-tighter leading-none">
                  UPA<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">-Areal</span>
                </h1>
              </div>
              <span className="text-[10px] font-bold text-slate-400 tracking-[0.2em] uppercase ml-1 pl-3 border-l-2 border-blue-200">
                Acolhimento c/ Classificação de Risco
              </span>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-4 text-sm text-slate-500 bg-slate-50 px-4 py-2 rounded-full border border-slate-100 shadow-sm">
             <Sparkles className="w-4 h-4 text-yellow-500" />
             <span className="italic truncate max-w-md">"{insight}"</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto flex flex-col min-h-full">
            {/* Dashboard - Full Width */}
            <div className="flex-1 min-h-0">
              <TriageDashboard 
                data={data} 
                onAddData={handleAddData} 
                onDeleteData={handleDeleteData}
              />
            </div>

            {/* Footer / Credits */}
            <footer className="mt-12 py-6 text-center border-t border-slate-200">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                Desenvolvido por Samuel Amaro
              </p>
            </footer>
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;