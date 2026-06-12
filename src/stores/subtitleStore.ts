import { create } from "zustand";
import { Subtitle, TranslationRules, DEFAULT_RULES } from "../types/subtitle";

interface UndoSnapshot {
  subtitles: Subtitle[];
  sentenceGroups: number[][];
}

const MAX_UNDO = 10;

function pushUndo(stack: UndoSnapshot[], state: SubtitleState): UndoSnapshot[] {
  const snapshot: UndoSnapshot = {
    subtitles: state.subtitles.map((s) => ({ ...s, translation: s.translation ?? undefined })),
    sentenceGroups: state.sentenceGroups.map((g) => [...g]),
  };
  return [...stack.slice(-(MAX_UNDO - 1)), snapshot];
}

interface SubtitleState {
  subtitles: Subtitle[];
  translationRules: TranslationRules;
  apiKey: string;
  isTranslating: boolean;
  translatedCount: number;
  fileName: string;
  sentenceGroups: number[][];
  pendingTranslations: Record<number, string>;
  autoSaveTime: number;
  undoStack: UndoSnapshot[];

  // Cross-page data for social post generation
  editorSubtitles: Subtitle[];
  splitterResult: Subtitle[];

  setSubtitles: (subtitles: Subtitle[]) => void;
  setTranslation: (index: number, translation: string) => void;
  setSubtitleText: (index: number, text: string) => void;
  deleteSubtitle: (index: number) => void;
  setTranslationRules: (rules: TranslationRules) => void;
  setApiKey: (key: string) => void;
  setIsTranslating: (v: boolean) => void;
  setTranslatedCount: (n: number) => void;
  setFileName: (name: string) => void;
  setSentenceGroups: (groups: number[][]) => void;
  setPendingTranslation: (idx: number, text: string) => void;
  setAutoSaveTime: (t: number) => void;
  clearPendingTranslations: () => void;
  applyPendingTranslations: () => void;
  undo: () => void;
  reset: () => void;
  setEditorSubtitles: (subtitles: Subtitle[]) => void;
  setSplitterResult: (subtitles: Subtitle[]) => void;
}

export const useSubtitleStore = create<SubtitleState>((set) => ({
  subtitles: [],
  translationRules: DEFAULT_RULES,
  apiKey: "",
  isTranslating: false,
  translatedCount: 0,
  fileName: "",
  sentenceGroups: [],
  pendingTranslations: {},
  autoSaveTime: 0,
  undoStack: [],

  // Cross-page data for social post generation
  editorSubtitles: [],
  splitterResult: [],

  setSubtitles: (subtitles) =>
    set((state) => ({
      subtitles,
      translatedCount: subtitles.filter((s) => s.translation).length,
      undoStack: pushUndo(state.undoStack, state),
    })),

  setTranslation: (idx, translation) =>
    set((state) => {
      const subtitles = [...state.subtitles];
      subtitles[idx] = { ...subtitles[idx], translation };
      const translatedCount = subtitles.filter((s) => s.translation).length;
      return { subtitles, translatedCount, undoStack: pushUndo(state.undoStack, state) };
    }),

  setSubtitleText: (idx, text) =>
    set((state) => {
      const subtitles = [...state.subtitles];
      subtitles[idx] = { ...subtitles[idx], text };
      return { subtitles, undoStack: pushUndo(state.undoStack, state) };
    }),

  deleteSubtitle: (idx) =>
    set((state) => {
      const subtitles = state.subtitles.filter((_, i) => i !== idx);
      const translatedCount = subtitles.filter((s) => s.translation).length;
      return { subtitles, translatedCount, undoStack: pushUndo(state.undoStack, state) };
    }),

  setTranslationRules: (rules) => set({ translationRules: rules }),
  setApiKey: (key) => set({ apiKey: key }),
  setIsTranslating: (v) => set({ isTranslating: v }),
  setTranslatedCount: (n) => set({ translatedCount: n }),
  setFileName: (name) => set({ fileName: name }),
  setSentenceGroups: (groups) => set({ sentenceGroups: groups }),
  setPendingTranslation: (idx, text) =>
    set((state) => ({
      pendingTranslations: { ...state.pendingTranslations, [idx]: text },
    })),
  setAutoSaveTime: (t) => set({ autoSaveTime: t }),
  clearPendingTranslations: () => set({ pendingTranslations: {} }),

  applyPendingTranslations: () =>
    set((state) => {
      const subtitles = [...state.subtitles];
      for (const key of Object.keys(state.pendingTranslations)) {
        const idx = parseInt(key, 10);
        subtitles[idx] = { ...subtitles[idx], translation: state.pendingTranslations[idx] };
      }
      const translatedCount = subtitles.filter((s) => s.translation).length;
      return { subtitles, translatedCount, pendingTranslations: {}, undoStack: pushUndo(state.undoStack, state) };
    }),

  undo: () =>
    set((state) => {
      if (state.undoStack.length === 0) return {};
      const restored = state.undoStack[state.undoStack.length - 1];
      return {
        subtitles: restored.subtitles,
        sentenceGroups: restored.sentenceGroups,
        undoStack: state.undoStack.slice(0, -1),
        translatedCount: restored.subtitles.filter((s) => s.translation).length,
      };
    }),

  reset: () =>
    set({
      subtitles: [],
      translatedCount: 0,
      fileName: "",
      isTranslating: false,
      sentenceGroups: [],
      pendingTranslations: {},
      autoSaveTime: 0,
      undoStack: [],
      editorSubtitles: [],
      splitterResult: [],
    }),

  setEditorSubtitles: (subtitles) => set({ editorSubtitles: subtitles }),
  setSplitterResult: (subtitles) => set({ splitterResult: subtitles }),
}));
