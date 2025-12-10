import React, { useState, useEffect } from 'react';
import TriageDashboard from './components/TriageDashboard';
import { TriageData } from './types';
import { Activity, PlusSquare } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      
      {/* HEADER BANNER - Full Width & Centered */}
      <header className="relative bg-slate-900 border-b border-slate-800 shadow-xl overflow-hidden flex-shrink-0 z-20">
        
        {/* Creative Background Elements */}
        <div className="absolute inset-0 w-full h-full">
           {/* Dark Gradient Base */}
           <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black"></div>
           
           {/* Tech Grid Pattern */}
           <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20"></div>

           {/* Glowing Orbs */}
           <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 mix-blend-screen"></div>
           <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[100px] translate-x-1/3 translate-y-1/3 mix-blend-screen"></div>
        </div>

        {/* Central Content */}
        <div className="relative z-10 container mx-auto px-6 py-8 md:py-10 flex flex-col items-center justify-center text-center">
           
           {/* Logo Container with Glow */}
           <div className="mb-4 relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
              <div className="relative bg-slate-900/80 backdrop-blur-xl p-4 rounded-2xl border border-slate-700/50 shadow-2xl">
                 <Activity className="w-10 h-10 md:w-12 md:h-12 text-blue-400" />
              </div>
           </div>

           {/* Typography */}
           <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tighter leading-none mb-3 drop-shadow-lg">
             UPA <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-blue-400 animate-pulse">AREAL</span>
           </h1>
           
           {/* Decorative Subtitle Line */}
           <div className="flex items-center gap-4 opacity-80">
              <div className="h-[2px] w-8 md:w-24 bg-gradient-to-r from-transparent to-blue-500"></div>
              <span className="text-[10px] md:text-xs font-bold text-blue-100 tracking-[0.3em] uppercase drop-shadow-md">
                Acolhimento & Classificação de Risco
              </span>
              <div className="h-[2px] w-8 md:w-24 bg-gradient-to-l from-transparent to-blue-500"></div>
           </div>

        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50">
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