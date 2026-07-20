export interface BudgetLine {
  id: string;
  fonte: 'Municipal' | 'Estadual' | 'Federal';
  bloco: string; // 'Ações de Saúde', 'Assistência Farmacêutica', 'Atenção Básica', 'Consulta Popular', 'Convênios', 'Média e Alta Complexidade', 'Vigilância em Saúde', 'Gestão do SUS', 'INVESTIMENTO', 'Outros'
  codigo: string;
  descricao: string;
  saldoInicial: number;
  receitas: number;
  rendimentos: number;
  despesas: number;
  saldoFinal: number;
}

export enum AIModelType {
  FAST = 'gemini-3-flash-preview',
  FAST_LITE = 'gemini-flash-lite-latest',
  PRO_THINKING = 'gemini-3-pro-preview',
  IMAGE_GEN_PRO = 'gemini-3-pro-image-preview',
  IMAGE_EDIT_FLASH = 'gemini-2.5-flash-image',
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
  sources?: Array<{ uri: string; title: string }>;
  image?: string;
}

export interface ScenarioSimulation {
  id: string;
  name: string;
  adjustments: {
    [key: string]: {
      receitasPercent: number;
      despesasPercent: number;
    }
  };
}
