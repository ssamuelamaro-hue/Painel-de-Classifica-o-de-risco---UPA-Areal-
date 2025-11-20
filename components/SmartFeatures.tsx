import React, { useState, useRef } from 'react';
import { Camera, MessageSquare, Sparkles, Image as ImageIcon, Search, BrainCircuit, Send, Loader2, Wand2 } from 'lucide-react';
import { analyzeImageForTriage, chatWithGemini, editImageFlash, generateImagePro } from '../services/geminiService';
import { ChatMessage, TriageData } from '../types';

interface SmartFeaturesProps {
  onDataUpdate: (newData: TriageData) => void;
}

const SmartFeatures: React.FC<SmartFeaturesProps> = ({ onDataUpdate }) => {
  const [activeTab, setActiveTab] = useState<'chat' | 'analyze' | 'create'>('chat');

  return (
    <div className="h-full flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex border-b border-slate-100">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'chat' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <MessageSquare className="w-4 h-4" />
          Assistente
        </button>
        <button
          onClick={() => setActiveTab('analyze')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'analyze' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <BrainCircuit className="w-4 h-4" />
          Analisar
        </button>
        <button
          onClick={() => setActiveTab('create')}
          className={`flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 ${activeTab === 'create' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          <Sparkles className="w-4 h-4" />
          Studio
        </button>
      </div>

      <div className="flex-1 overflow-hidden relative">
        {activeTab === 'chat' && <ChatInterface />}
        {activeTab === 'analyze' && <AnalyzerInterface onDataUpdate={onDataUpdate} />}
        {activeTab === 'create' && <CreativeStudio />}
      </div>
    </div>
  );
};

const ChatInterface = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'Olá! Sou o assistente Gemini. Posso ajudar com protocolos de triagem, analisar tendências ou buscar informações médicas atualizadas.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const [useThinking, setUseThinking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg: ChatMessage = { role: 'user', text: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // Convert history to API format
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const response = await chatWithGemini(userMsg.text, useSearch, useThinking, history);
      
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: response.text || "Desculpe, não consegui gerar uma resposta.", 
        sources: response.sources,
        isThinking: useThinking
      }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'model', text: 'Erro ao conectar com o servidor.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-2xl p-3 text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
              {msg.isThinking && <div className="text-xs text-purple-600 font-semibold mb-1 flex items-center gap-1"><BrainCircuit className="w-3 h-3"/> Pensamento Profundo Ativado</div>}
              <div className="whitespace-pre-wrap">{msg.text}</div>
              {msg.sources && msg.sources.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-200">
                  <p className="text-xs font-bold mb-1">Fontes:</p>
                  <div className="flex flex-wrap gap-2">
                    {msg.sources.map((s, i) => (
                      <a key={i} href={s.uri} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1 bg-white px-2 py-1 rounded border border-blue-100">
                         <Search className="w-3 h-3" /> {s.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="p-4 border-t border-slate-100 bg-white">
        <div className="flex gap-2 mb-2">
          <button 
            onClick={() => setUseSearch(!useSearch)}
            className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 border transition-colors ${useSearch ? 'bg-blue-100 border-blue-300 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
          >
            <Search className="w-3 h-3" /> Google Search
          </button>
          <button 
            onClick={() => setUseThinking(!useThinking)}
            className={`text-xs px-2 py-1 rounded-full flex items-center gap-1 border transition-colors ${useThinking ? 'bg-purple-100 border-purple-300 text-purple-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
          >
            <BrainCircuit className="w-3 h-3" /> Thinking Mode (Pro)
          </button>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Digite sua mensagem..."
            className="flex-1 border border-slate-300 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button 
            onClick={handleSend}
            disabled={loading}
            className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

const AnalyzerInterface: React.FC<{ onDataUpdate: (d: TriageData) => void }> = ({ onDataUpdate }) => {
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onloadend = async () => {
        const base64Data = reader.result as string;
        const base64Content = base64Data.split(',')[1];
        
        const jsonString = await analyzeImageForTriage(base64Content, file.type);
        // Clean potential markdown blocks ```json ... ```
        const cleanJson = jsonString.replace(/```json|```/g, '').trim();
        
        try {
          const data = JSON.parse(cleanJson);
          const triageData: TriageData = {
            id: Date.now().toString(),
            dia: data.dia || new Date().toISOString().split('T')[0],
            vermelho: Number(data.vermelho) || 0,
            laranja: Number(data.laranja) || 0,
            amarelo: Number(data.amarelo) || 0,
            verde: Number(data.verde) || 0,
            azul: Number(data.azul) || 0,
            total: (Number(data.vermelho) || 0) + (Number(data.laranja) || 0) + (Number(data.amarelo) || 0) + (Number(data.verde) || 0) + (Number(data.azul) || 0)
          };
          onDataUpdate(triageData);
          alert('Dados importados com sucesso!');
        } catch (parseError) {
          alert('Erro ao processar os dados da imagem. Tente uma imagem mais clara.');
          console.error(parseError);
        }
      };
    } catch (error) {
      alert('Erro ao analisar imagem.');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="p-6 flex flex-col items-center justify-center h-full text-center">
      <div className="bg-blue-50 p-4 rounded-full mb-4">
        <Camera className="w-8 h-8 text-blue-600" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-2">Digitalizar Relatório</h3>
      <p className="text-sm text-slate-500 mb-6 max-w-xs">
        Tire uma foto de um relatório de triagem manual e o Gemini extrairá os dados automaticamente para o painel.
      </p>
      
      <input 
        type="file" 
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />
      
      <button 
        onClick={() => fileInputRef.current?.click()}
        disabled={loading}
        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-all shadow-md hover:shadow-lg"
      >
        {loading ? (
           <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</>
        ) : (
           <><Camera className="w-4 h-4" /> Carregar Foto</>
        )}
      </button>
    </div>
  );
};

const CreativeStudio = () => {
  const [mode, setMode] = useState<'generate' | 'edit'>('generate');
  const [prompt, setPrompt] = useState('');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [editBaseImage, setEditBaseImage] = useState<string | null>(null);
  const editFileRef = useRef<HTMLInputElement>(null);

  const handleGenerate = async () => {
    if (!prompt) return;
    setLoading(true);
    setResultImage(null);
    try {
      const img = await generateImagePro(prompt, imageSize);
      setResultImage(img);
    } catch (e) {
      alert("Erro ao gerar imagem");
    } finally {
      setLoading(false);
    }
  };

  const handleEditUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setEditBaseImage(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleEdit = async () => {
    if (!editBaseImage || !prompt) return;
    setLoading(true);
    try {
      const base64 = editBaseImage.split(',')[1];
      // Using simple jpeg mime for simplicity, ideally detect from file
      const img = await editImageFlash(base64, 'image/jpeg', prompt);
      setResultImage(img);
    } catch (e) {
      alert("Erro ao editar imagem");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex border-b border-slate-100">
        <button onClick={() => setMode('generate')} className={`flex-1 py-2 text-xs font-semibold ${mode === 'generate' ? 'text-blue-600 bg-blue-50' : 'text-slate-500'}`}>GERAR (PRO)</button>
        <button onClick={() => setMode('edit')} className={`flex-1 py-2 text-xs font-semibold ${mode === 'edit' ? 'text-blue-600 bg-blue-50' : 'text-slate-500'}`}>EDITAR (FLASH)</button>
      </div>
      
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-4">
          {mode === 'generate' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Tamanho da Imagem</label>
              <select value={imageSize} onChange={(e) => setImageSize(e.target.value as any)} className="w-full border p-2 rounded text-sm mb-4">
                <option value="1K">1K</option>
                <option value="2K">2K (High Quality)</option>
                <option value="4K">4K (Ultra Quality)</option>
              </select>
            </div>
          )}

          {mode === 'edit' && (
             <div className="mb-4">
                <div 
                  onClick={() => editFileRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center cursor-pointer hover:bg-slate-50"
                >
                  {editBaseImage ? (
                    <img src={editBaseImage} alt="Base" className="max-h-32 mx-auto rounded" />
                  ) : (
                    <div className="text-slate-400 text-sm">Clique para upload da imagem base</div>
                  )}
                </div>
                <input type="file" ref={editFileRef} className="hidden" onChange={handleEditUpload} accept="image/*" />
             </div>
          )}

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={mode === 'generate' ? "Descreva a imagem..." : "O que mudar na imagem? (ex: Adicionar filtro retrô)"}
            className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            rows={3}
          />

          <button
            onClick={mode === 'generate' ? handleGenerate : handleEdit}
            disabled={loading || (mode === 'edit' && !editBaseImage)}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex justify-center items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin w-4 h-4"/> : <Wand2 className="w-4 h-4"/>}
            {mode === 'generate' ? 'Gerar Imagem' : 'Editar Imagem'}
          </button>

          {resultImage && (
            <div className="mt-4 border rounded-lg p-2 bg-slate-50">
              <p className="text-xs text-slate-500 mb-2 font-medium">Resultado:</p>
              <img src={resultImage} alt="Result" className="w-full rounded shadow-sm" />
              <a href={resultImage} download="gemini-art.png" className="block text-center mt-2 text-xs text-blue-600 hover:underline">Download</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SmartFeatures;
