
export interface SubtitleBlock {
  index: string;
  timecode: string;
  text: string;
}

export enum TranslationDirection {
  EN_TO_FA = 'en-fa',
  FA_TO_EN = 'fa-en'
}

export interface TranslationState {
  isTranslating: boolean;
  progress: number;
  error: string | null;
  result: string | null;
}
