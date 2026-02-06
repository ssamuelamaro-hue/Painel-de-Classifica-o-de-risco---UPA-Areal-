
export interface TriageData {
  id: string;
  dia: string;
  vermelho: number;
  laranja: number;
  amarelo: number;
  verde: number;
  azul: number;
  total: number;
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
