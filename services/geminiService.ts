import { GoogleGenAI, Type, Modality } from "@google/genai";
import { NewsHeadline, ImagePrompt, NewsSource } from '../types';

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const PROMPT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    chinese: {
      type: Type.STRING,
      description: "富有詩意和畫面感的繁體中文提示詞，描述場景的意境與氛圍。",
    },
    english: {
      type: Type.STRING,
      description: "A highly detailed and specific prompt for an AI image generator (like Imagen) in English, aiming for cinematic hyperrealism. Should include details on composition, subjects, background, lighting (e.g., dramatic, volumetric), color tone, and mood. Use quality-boosting keywords. Explicitly state that no text, logos, or watermarks should appear in the image.",
    },
  },
  required: ["chinese", "english"],
};

export const fetchNewsHeadlines = async (): Promise<{ headlines: NewsHeadline[], sources: NewsSource[] }> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
# 角色：專業新聞策展人

# 任務：
請使用 Google 搜尋，找出 10 則今天在台灣發生的即時焦點新聞。目標讀者為 40 至 55 歲的男女。

# 輸出格式說明：
1. 你的回應必須是、也只能是一個 JSON 陣列。
2. 陣列中的每個物件都代表一則新聞，且必須包含以下五個鍵：
    - \`title\`: 新聞標題（字串）。
    - \`summary\`: 新聞摘要（字串）。
    - \`sourceUrl\`: 原始新聞的網址（字串）。
    - \`sourceTitle\`: 來源網站的名稱（字串）。
    - \`rating\`: 讀者興趣評分（一個 1 到 5 的整數，5分最高）。
3. 如果找不到任何符合條件的新聞，請回傳一個空的 JSON 陣列：\`[]\`。
4. 在任何情況下，都不要在 JSON 陣列前後包含任何額外的文字、解釋或 markdown 標籤。

# 範例（單一新聞物件）：
{
  "title": "範例：台股再創新高，電子股領漲",
  "summary": "在國際利多消息激勵下，台灣加權股價指數今日上漲百點，再度刷新歷史紀錄。",
  "sourceUrl": "https://example.com/news/stock-market-high",
  "sourceTitle": "經濟日報",
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
    if (error instanceof SyntaxError) {
      throw new Error("無法解析 AI 回傳的新聞內容，請稍後再試。");
    }
    throw new Error("無法獲取新聞頭條。請檢查您的網路連線或稍後再試。");
  }
};

export const generateImagePrompt = async (headlines: NewsHeadline[]): Promise<ImagePrompt> => {
  try {
    const newsContent = headlines.map((h, i) => 
      `新聞 ${i + 1} 標題: "${h.title}"\n新聞 ${i + 1} 摘要: "${h.summary}"`
    ).join('\n\n');

    const analysisInstruction = headlines.length > 1 ?
     `請綜合分析以下 ${headlines.length} 則台灣新聞，並融合所有新聞的關鍵元素（情緒、場景、人物、事件），創造一個能概括其核心精神的單一、連貫且充滿故事性的超現實主義場景。`
    :
    `請深入分析以下這則台灣新聞，並將其核心元素（情緒、場景、人物、事件）轉化為一個單一、連貫且充滿故事性的視覺場景。`;

    const prompt = `
# 角色：一位富有想像力的概念藝術家與提示詞工程師。

# 任務：
${analysisInstruction}
你的目標是創造一個能喚起強烈情感、引人深思的藝術圖像。

# 輸出要求：
1. 提供兩種語言版本的提示詞：繁體中文（chinese）和英文（english）。
2. **繁體中文提示詞**：應富有詩意和畫面感，描述場景的意境與氛圍。
3. **英文提示詞**：這是給 AI 圖像生成器（如 Imagen）使用的，必須非常詳細、具體。
    - 風格：追求電影般的超寫實主義（cinematic hyperrealism）。
    - 細節：描述場景構圖、主要物件、背景、光線（例如：dramatic lighting, volumetric light）、色彩調性、氛圍與情緒。
    - **人物描繪**：如果新聞內容提到人物，請根據新聞描述（如地點在台灣）準確描繪其人種（例如：台灣人 Taiwanese）、年齡、性別。這點非常重要，避免生成與新聞背景不符的人物。
    - 品質：使用關鍵字如 "masterpiece, 8K, UHD, photorealistic, intricate details" 來提升圖像品質。
    - 排除項：明確指示圖像中**不可**出現任何文字、標誌或浮水印。
4. 你的回應必須是、也只能是一個符合下面結構的 JSON 物件。

# 新聞內容：
${newsContent}
`;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: PROMPT_SCHEMA,
      },
    });

    const jsonStr = response.text.trim();
    const prompts: ImagePrompt = JSON.parse(jsonStr);

    if (!prompts.english || !prompts.chinese) {
        throw new Error("API did not return the expected prompt structure.");
    }

    return prompts;
  } catch (error) {
    console.error("Error generating image prompt:", error);
    throw new Error("無法生成圖片提示詞。");
  }
};

export const generateImage = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/png',
        aspectRatio: '16:9',
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes = response.generatedImages[0].image.imageBytes;
      return `data:image/png;base64,${base64ImageBytes}`;
    } else {
      throw new Error("No image was generated.");
    }
  } catch (error) {
    console.error("Error generating image:", error);
    throw new Error("無法生成圖片。");
  }
};

export const editImage = async (base64ImageData: string, mimeType: string, prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64ImageData,
              mimeType: mimeType,
            },
          },
          {
            text: `Please edit the image based on this instruction: ${prompt}`,
          },
        ],
      },
      config: {
          responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    const imagePart = response.candidates?.[0]?.content?.parts.find(part => part.inlineData);

    if (imagePart && imagePart.inlineData) {
      const base64ImageBytes: string = imagePart.inlineData.data;
      const responseMimeType: string = imagePart.inlineData.mimeType;
      return `data:${responseMimeType};base64,${base64ImageBytes}`;
    } else {
      throw new Error("AI did not return an edited image in its response.");
    }
  } catch (error) {
    console.error("Error editing image:", error);
    if (error instanceof Error && error.message.includes('SAFETY')) {
        throw new Error("圖片修改請求因安全設定被拒絕。請嘗試不同的描述。");
    }
    throw new Error("無法修改圖片。");
  }
};