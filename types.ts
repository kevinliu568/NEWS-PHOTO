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
  imageUrl: string | null;
}