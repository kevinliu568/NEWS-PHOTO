import { GoogleGenAI, Type, Modality } from "@google/genai";
import { NewsHeadline, ImagePrompt, NewsSource } from '../types';

const PROMPT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    chinese: {
      type: Type.STRING,
      description: "富有詩意和畫面感的繁體中文提示詞，描述場景的意境與氛圍。",
    },
    english: {
      type: Type.STRING,
      description: "A highly detailed and specific prompt for an AI image generator in English. Should include details on composition, subjects, background, lighting, and mood. No text, logos, or watermarks.",
    },
  },
  required: ["chinese", "english"],
};

export const fetchNewsHeadlines = async (): Promise<{ headlines: NewsHeadline[], sources: NewsSource[] }> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `
# 角色：專業新聞策展人

# 任務：
請使用 Google 搜尋，找出 10 則今天在台灣發生的即時焦點新聞。目標讀者為 40 至 55 歲的男女。

# 輸出格式說明：
1. 你的回應必須是、也只能是一個 JSON 陣列。
2. 陣列中的每個物件都代表一則新聞，且包含 title, summary, sourceUrl, sourceTitle, rating。
3. 如果找不到，回傳 []。

# 範例：
{
  "title": "範例：台股再創新高",
  "summary": "電子股領漲...",
  "sourceUrl": "https://example.com",
  "sourceTitle": "新聞媒體",
  "rating": 5
}
      `,
      config: {
        tools: [{googleSearch: {}}],
      },
    });
    
    const textResponse = response.text.trim();
    const jsonStr = textResponse.replace(/^```json\s*/, '').replace(/```$/, '');
    const headlines = JSON.parse(jsonStr);

    if (!Array.isArray(headlines)) {
        throw new Error("API did not return an array of headlines.");
    }
    
    const sources = (response.candidates?.[0]?.groundingMetadata?.groundingChunks as NewsSource[]) ?? [];

    return { headlines, sources };
  } catch (error) {
    console.error("Error fetching news headlines:", error);
    throw new Error("無法獲取新聞頭條。請確認網路連線或 API 狀態。");
  }
};

export const generateImagePrompt = async (headlines: NewsHeadline[]): Promise<ImagePrompt> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const newsContent = headlines.map((h, i) => 
      `新聞 ${i + 1} 標題: "${h.title}"\n摘要: "${h.summary}"`
    ).join('\n\n');

    const prompt = `
# 角色：創意概念藝術家。
# 任務：根據新聞內容生成富有想像力的視覺提示詞。
# 輸出要求：符合 JSON 結構，提供繁中與英文版本。
# 新聞內容：
${newsContent}
`;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: PROMPT_SCHEMA,
      },
    });

    const prompts: ImagePrompt = JSON.parse(response.text.trim());
    return prompts;
  } catch (error) {
    console.error("Error generating image prompt:", error);
    throw new Error("無法生成圖片提示詞。");
  }
};

export const generateImage = async (prompt: string): Promise<string> => {
  try {
    // 每次生成前實例化，確保使用正確的 API Key
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: { parts: [{ text: prompt }] },
      config: {
        imageConfig: { 
          aspectRatio: "16:9",
          imageSize: "1K"
        }
      }
    });

    const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    if (imagePart && imagePart.inlineData) {
      return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    }
    throw new Error("API 回傳中找不到圖片數據。");
  } catch (error) {
    console.error("Error generating image:", error);
    if (error instanceof Error && error.message.includes("403")) {
      throw new Error("出圖權限遭拒。請點擊『重新選擇金鑰』並確保選擇的是付費項目（Paid Project）。");
    }
    throw new Error("無法生成圖片。請檢查金鑰權限或稍後再試。");
  }
};

export const generateVideo = async (prompt: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    let operation = await ai.models.generateVideos({
      model: 'veo-3.1-fast-generate-preview',
      prompt: prompt,
      config: { numberOfVideos: 1, resolution: '720p', aspectRatio: '16:9' }
    });

    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000));
      operation = await ai.operations.getVideosOperation({ operation });
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch (error) {
    console.error("Error generating video:", error);
    throw new Error("無法生成影片。請確認金鑰權限與配額。");
  }
};

export const editImage = async (base64ImageData: string, mimeType: string, prompt: string): Promise<string> => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: [
          { inlineData: { data: base64ImageData, mimeType } },
          { text: `Edit instruction: ${prompt}` },
        ],
      },
      config: {
        imageConfig: { 
          aspectRatio: "16:9",
          imageSize: "1K"
        }
      }
    });

    const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);
    if (imagePart && imagePart.inlineData) {
      return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
    }
    throw new Error("無法獲取修改後的圖片數據。");
  } catch (error) {
    console.error("Error editing image:", error);
    throw new Error("無法修改圖片。");
  }
};