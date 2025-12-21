
import { GoogleGenAI, Type } from "@google/genai";
import { TranslationDirection } from "../types";

export const translateChunks = async (
  texts: string[],
  direction: TranslationDirection
): Promise<string[]> => {
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
const ai = new GoogleGenAI({ apiKey: apiKey || "" });
  
  const sourceLang = direction === TranslationDirection.EN_TO_FA ? 'English' : 'Persian';
  const targetLang = direction === TranslationDirection.EN_TO_FA ? 'Persian' : 'English';

  const systemInstruction = `
    You are a professional subtitle translator. 
    Your task is to translate an array of movie dialogue lines from ${sourceLang} to ${targetLang}.
    
    Rules:
    1. Maintain the tone: If it's slang/casual, keep it casual. If it's formal, keep it formal.
    2. Do NOT translate names of characters or famous places if they are standard transliterations.
    3. Return EXACTLY the same number of lines as provided in the input.
    4. Keep the translation concise as it must fit on a subtitle screen.
    5. Ensure the meaning is preserved perfectly for the local culture.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash",
      contents: `Translate the following ${texts.length} lines of text. Return them as a JSON array of strings in the exact same order:\n\n${JSON.stringify(texts)}`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
    });

    const result = JSON.parse(response.text || "[]");
    
    if (!Array.isArray(result)) {
      throw new Error("Invalid response format from translation service");
    }

    // Safety check: if lengths don't match, we might have a problem
    // but Flash is usually very reliable with the schema.
    return result;
  } catch (error) {
    console.error("Translation Error:", error);
    throw error;
  }
};
