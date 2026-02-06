
import { GoogleGenAI, Type } from "@google/genai";
import { AIModelType } from "../types";

/**
 * Helper to initialize a new GoogleGenAI instance for each request.
 * This ensures we always use the latest API key if it's updated via the UI (mandatory for Pro models).
 */
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeImageForTriage = async (base64Image: string, mimeType: string): Promise<string> => {
  try {
    const ai = getAI();
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
    // Correctly accessing the text property instead of a method
    return response.text || "{}";
  } catch (error) {
    console.error("Error analyzing image:", error);
    throw error;
  }
};

export const generateImagePro = async (prompt: string, size: "1K" | "2K" | "4K") => {
  try {
    const ai = getAI();
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
    
    // Iterate through all parts to find the image part (inlineData)
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
    const ai = getAI();
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

    // Iterate through all parts to find the image part
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
    const ai = getAI();
    const modelName = useThinking ? AIModelType.PRO_THINKING : AIModelType.FAST;
    
    const config: any = {};
    
    if (useSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    if (useThinking) {
      // Configure thinking budget for Gemini 3 Pro
      config.thinkingConfig = { thinkingBudget: 32768 };
    }

    const chat = ai.chats.create({
      model: modelName,
      history: history,
      config: config
    });

    const result = await chat.sendMessage({ message });
    
    const text = result.text;
    const groundingChunks = result.candidates?.[0]?.groundingMetadata?.groundingChunks;
    
    // Extract sources if grounding is available (required for search grounding)
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
    const ai = getAI();
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
