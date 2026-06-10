export interface Subtitle {
  index: number;
  startTime: string;
  endTime: string;
  text: string;
  translation?: string;
}

export interface ProperNoun {
  chinese: string;
  english: string;
}

export interface TranslationRules {
  properNouns: ProperNoun[];
  customInstructions: string;
}

export const DEFAULT_RULES: TranslationRules = {
  properNouns: [],
  customInstructions: "",
};
