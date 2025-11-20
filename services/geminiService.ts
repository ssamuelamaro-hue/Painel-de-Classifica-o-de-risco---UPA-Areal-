import { GoogleGenAI, Type } from "@google/genai";
import { AIModelType } from "../types";

const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// Helper to get the right model instance
const getModel = (modelName: string) => ai.models;

export const analyzeImageForTriage = async (base64Image: string, mimeType: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: AIModelType.PRO_THINKING, // Use Pro for complex analysis
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image,
            },
          },
          {
            text: `Analise esta imagem de um relatório ou anotação médica. 
            Extraia dados de triagem (quantidade de pacientes por cor de risco: Vermelho, Laranja, Amarelo, Verde, Azul) para um dia específico.
            Retorne APENAS um objeto JSON com o seguinte formato, sem markdown:
            {
              "dia": "YYYY-MM-DD",
              "vermelho": 0,
              "laranja": 0,
              "amarelo": 0,
              "verde": 0,
              "azul": 0
            }`
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
      }
    });
    return response.text || "{}";
  } catch (error) {
    console.error("Error analyzing image:", error);
    throw error;
  }
};

export const generateImagePro = async (prompt: string, size: "1K" | "2K" | "4K") => {
  try {
    const response = await ai.models.generateContent({
      model: AIModelType.IMAGE_GEN_PRO,
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: "16:9",
          imageSize: size,
        }
      }
    });
    
    // Extract image from response parts
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
};

export const editImageFlash = async (base64Image: string, mimeType: string, prompt: string) => {
  try {
    const response = await ai.models.generateContent({
      model: AIModelType.IMAGE_EDIT_FLASH,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image,
            },
          },
          { text: prompt },
        ],
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error("Error editing image:", error);
    throw error;
  }
};

export const chatWithGemini = async (
  message: string, 
  useSearch: boolean, 
  useThinking: boolean,
  history: { role: string, parts: { text: string }[] }[]
) => {
  try {
    const modelName = useThinking ? AIModelType.PRO_THINKING : AIModelType.FAST;
    
    const config: any = {};
    
    if (useSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    if (useThinking) {
      config.thinkingConfig = { thinkingBudget: 32768 }; // Max for Pro
    }

    const chat = ai.chats.create({
      model: modelName,
      history: history,
      config: config
    });

    const result = await chat.sendMessage({ message });
    
    const text = result.text;
    const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    const sources = groundingChunks?.map((chunk: any) => ({
        uri: chunk.web?.uri || chunk.maps?.uri || '',
        title: chunk.web?.title || chunk.maps?.title || 'Source'
    })).filter((s: any) => s.uri);

    return { text, sources };

  } catch (error) {
    console.error("Error in chat:", error);
    throw error;
  }
};

export const getFastInsight = async (dataContext: string) => {
  try {
    const response = await ai.models.generateContent({
      model: AIModelType.FAST_LITE, // Use Lite for speed
      contents: `Com base nestes dados de triagem hospitalar: ${dataContext}. Dê um resumo executivo de uma frase sobre a carga de trabalho atual.`,
    });
    return response.text;
  } catch (error) {
    console.error("Error getting fast insight:", error);
    return "Não foi possível gerar o insight.";
  }
};
