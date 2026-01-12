export enum AppStage {
  INITIAL,
  NEWS_FETCHING,
  NEWS_FETCHED,
  PROMPT_GENERATING,
  PROMPT_GENERATED,
  IMAGE_GENERATING,
  IMAGE_GENERATED,
  IMAGE_EDITING,
}

export interface NewsHeadline {
  id: number;
  title: string;
  summary: string;
  sourceUrl: string;
  sourceTitle: string;
  rating: number;
  isSelected?: boolean;
}

export interface ImagePrompt {
  english: string;
  chinese: string;
}

export enum ImageStyle {
  REALISTIC = '寫實',
  OIL_PAINTING = '油畫',
  CARTOON = '卡通',
  WATERCOLOR = '水彩',
  ILLUSTRATION = '插畫',
  CHALKBOARD = '黑板彩色',
  CONCEPT_ART = '概念藝術',
  VISUAL_GUIDE = '視覺引導',
  DYNAMIC_VIDEO = '動態影像',
}

export enum ImageTextLanguage {
  NONE = '無文字',
  CHINESE = '繁體中文',
  ENGLISH = '英文',
}

export interface NewsSource {
  web: {
    uri: string;
    title: string;
  }
}

export interface GenerationItem {
  id: string;
  source: NewsHeadline[];
  prompt: ImagePrompt | null;
  mediaUrl: string | null;
  mediaType: 'image' | 'video' | null;
}