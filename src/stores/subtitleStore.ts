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

function countChars(text: string): number {
  return text.replace(/[^一-鿿㐀-䶿a-zA-Z]/g, "").length;
}

function timeToSeconds(t: string): number {
  const match = t.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
  if (!match) return 0;
  return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]) + parseInt(match[4]) / 1000;
}

function secondsToTime(s: number): string {
  let h = Math.floor(s / 3600);
  let m = Math.floor((s % 3600) / 60);
  let sec = Math.floor(s % 60);
  let ms = Math.round((s - Math.floor(s)) * 1000);
  if (ms >= 1000) { ms -= 1000; sec += 1; }
  if (sec >= 60) { sec -= 60; m += 1; }
  if (m >= 60) { m -= 60; h += 1; }
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

function pushEditorUndo(state: SubtitleState): Subtitle[][] {
  return [...state.editorUndoStack.slice(-49), state.editorSubtitles.map((s) => ({ ...s }))];
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

  editorSubtitles: Subtitle[];
  splitterResult: Subtitle[];

  editorFileName: string;
  editorUndoStack: Subtitle[][];
  editorReferenceSubtitles: Subtitle[];
  editorReferenceText: string;

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

  loadEditorSubtitles: (subtitles: Subtitle[]) => void;
  setEditorFileName: (name: string) => void;
  setEditorText: (index: number, text: string) => void;
  setEditorTime: (index: number, startTime: string, endTime: string) => void;
  splitEditorLine: (index: number, cursorPos: number) => void;
  mergeEditorLine: (index: number) => void;
  deleteEditorLine: (index: number) => void;
  undoEditor: () => void;
  resetEditor: () => void;
  loadEditorReference: (subtitles: Subtitle[]) => void;
  clearEditorReference: () => void;
  setEditorReferenceText: (text: string) => void;
  insertEditorBlank: (idx: number) => void;
  insertReferenceBlank: (idx: number) => void;
  deleteEditorReference: (idx: number) => void;
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

  editorSubtitles: [],
  splitterResult: [],
  editorFileName: "",
  editorUndoStack: [],
  editorReferenceSubtitles: [],
  editorReferenceText: "",

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

  loadEditorSubtitles: (subtitles) =>
    set({ editorSubtitles: subtitles, editorUndoStack: [] }),

  setEditorFileName: (name) => set({ editorFileName: name }),

  setEditorText: (idx, text) =>
    set((state) => {
      const editorSubtitles = [...state.editorSubtitles];
      editorSubtitles[idx] = { ...editorSubtitles[idx], text };
      return { editorSubtitles, editorUndoStack: pushEditorUndo(state) };
    }),

  setEditorTime: (idx, startTime, endTime) =>
    set((state) => {
      const editorSubtitles = [...state.editorSubtitles];
      editorSubtitles[idx] = { ...editorSubtitles[idx], startTime, endTime };
      return { editorSubtitles, editorUndoStack: pushEditorUndo(state) };
    }),

  splitEditorLine: (idx, cursorPos) =>
    set((state) => {
      const sub = state.editorSubtitles[idx];
      const before = sub.text.slice(0, cursorPos);
      const after = sub.text.slice(cursorPos);
      const beforeChars = countChars(before);
      const afterChars = countChars(after);
      const totalChars = beforeChars + afterChars || 1;
      const startSec = timeToSeconds(sub.startTime);
      const endSec = timeToSeconds(sub.endTime);
      const totalDuration = endSec - startSec;
      const beforeDuration = Math.max(0.5, (beforeChars / totalChars) * totalDuration);
      const splitTime = startSec + beforeDuration;
      const first: Subtitle = { index: sub.index, startTime: sub.startTime, endTime: secondsToTime(splitTime), text: before, translation: sub.translation };
      const second: Subtitle = { index: sub.index + 1, startTime: secondsToTime(splitTime), endTime: sub.endTime, text: after };
      const next = [...state.editorSubtitles];
      next.splice(idx, 1, first, second);
      const editorSubtitles = next.map((s, i) => ({ ...s, index: i + 1 }));
      return { editorSubtitles, editorUndoStack: pushEditorUndo(state) };
    }),

  mergeEditorLine: (idx) =>
    set((state) => {
      if (idx === 0) return {};
      const prevSub = state.editorSubtitles[idx - 1];
      const currSub = state.editorSubtitles[idx];
      const merged: Subtitle = {
        index: prevSub.index,
        startTime: prevSub.startTime,
        endTime: currSub.endTime,
        text: prevSub.text + currSub.text,
        translation: prevSub.translation || currSub.translation ? (prevSub.translation ?? "") + (currSub.translation ?? "") : undefined,
      };
      const next = [...state.editorSubtitles];
      next.splice(idx - 1, 2, merged);
      const editorSubtitles = next.map((s, i) => ({ ...s, index: i + 1 }));
      return { editorSubtitles, editorUndoStack: pushEditorUndo(state) };
    }),

  deleteEditorLine: (idx) =>
    set((state) => {
      const next = [...state.editorSubtitles];
      next.splice(idx, 1);
      const editorSubtitles = next.map((s, i) => ({ ...s, index: i + 1 }));
      return { editorSubtitles, editorUndoStack: pushEditorUndo(state) };
    }),

  undoEditor: () =>
    set((state) => {
      if (state.editorUndoStack.length === 0) return {};
      const restored = state.editorUndoStack[state.editorUndoStack.length - 1];
      return { editorSubtitles: restored, editorUndoStack: state.editorUndoStack.slice(0, -1) };
    }),

  resetEditor: () =>
    set({
      editorSubtitles: [],
      editorFileName: "",
      editorUndoStack: [],
      editorReferenceSubtitles: [],
      editorReferenceText: "",
    }),

  loadEditorReference: (subtitles) => set({ editorReferenceSubtitles: subtitles, editorReferenceText: "" }),
  clearEditorReference: () => set({ editorReferenceSubtitles: [], editorReferenceText: "" }),
  setEditorReferenceText: (text) => set({ editorReferenceText: text, editorReferenceSubtitles: [] }),

  insertEditorBlank: (idx) =>
    set((state) => {
      const blank: Subtitle = { index: 0, startTime: "", endTime: "", text: "", _blank: true };
      const next = [...state.editorSubtitles];
      next.splice(idx, 0, blank);
      const editorSubtitles = next.map((s, i) => ({ ...s, index: i + 1 }));
      return { editorSubtitles, editorUndoStack: pushEditorUndo(state) };
    }),

  insertReferenceBlank: (idx) =>
    set((state) => {
      const blank: Subtitle = { index: 0, startTime: "", endTime: "", text: "", _blank: true };
      const next = [...state.editorReferenceSubtitles];
      next.splice(idx, 0, blank);
      return { editorReferenceSubtitles: next.map((s, i) => ({ ...s, index: i + 1 })) };
    }),

  deleteEditorReference: (idx) =>
    set((state) => {
      const next = [...state.editorReferenceSubtitles];
      next.splice(idx, 1);
      return { editorReferenceSubtitles: next.map((s, i) => ({ ...s, index: i + 1 })) };
    }),
}));
