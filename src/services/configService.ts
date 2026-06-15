import { TranslationRules, Subtitle } from "../types/subtitle";

const STORE_FILE = "config.json";
const API_KEY_KEY = "api-key";
const RULES_KEY = "translation-rules";

type TauriStore = {
  get(key: string): Promise<string | null | undefined>;
  set(key: string, value: string): Promise<void>;
  save(): Promise<void>;
};

function getStore(): Promise<TauriStore> {
  return import("@tauri-apps/plugin-store")
    .then((m) => m.Store.load(STORE_FILE))
    .catch(() => {
      throw new Error("Tauri store not available");
    });
}

export async function loadApiKey(): Promise<string> {
  try {
    const store = await getStore();
    return (await store.get(API_KEY_KEY)) ?? "";
  } catch {
    return "";
  }
}

export async function saveApiKey(key: string): Promise<void> {
  try {
    const store = await getStore();
    await store.set(API_KEY_KEY, key);
    await store.save();
  } catch {
    // Silently fail if store not available
  }
}

export async function loadRules(): Promise<TranslationRules | null> {
  try {
    const store = await getStore();
    const raw = await store.get(RULES_KEY);
    if (raw) {
      const rules = JSON.parse(raw) as TranslationRules;
      // Migrate old data: add baseInstructions if missing
      if (!rules.baseInstructions) {
        const { DEFAULT_BASE_INSTRUCTIONS } = await import("../types/subtitle");
        rules.baseInstructions = DEFAULT_BASE_INSTRUCTIONS;
      }
      return rules;
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveRules(rules: TranslationRules): Promise<void> {
  try {
    const store = await getStore();
    await store.set(RULES_KEY, JSON.stringify(rules));
    await store.save();
  } catch {
    // Silently fail
  }
}

// ─────────────────────────────────────────────────────
// Session persistence (subtitle editing state)
// ─────────────────────────────────────────────────────

const SESSION_FILE = "session.json";
const SESSION_KEY = "subtitle-session";

interface SessionData {
  subtitles: Subtitle[];
  sentenceGroups: number[][];
  fileName: string;
}

function getSessionStore(): Promise<TauriStore> {
  return import("@tauri-apps/plugin-store")
    .then((m) => m.Store.load(SESSION_FILE))
    .catch(() => {
      throw new Error("Tauri store not available");
    });
}

export async function saveSession(data: SessionData): Promise<void> {
  try {
    const store = await getSessionStore();
    await store.set(SESSION_KEY, JSON.stringify(data));
    await store.save();
  } catch {
    // Silently fail
  }
}

export async function loadSession(): Promise<SessionData | null> {
  try {
    const store = await getSessionStore();
    const raw = await store.get(SESSION_KEY);
    if (raw) return JSON.parse(raw) as SessionData;
    return null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────
// Editor session persistence
// ─────────────────────────────────────────────────────

const EDITOR_SESSION_FILE = "editor-session.json";
const EDITOR_SESSION_KEY = "editor-session";

interface EditorSessionData {
  subtitles: Subtitle[];
  fileName: string;
}

function getEditorSessionStore(): Promise<TauriStore> {
  return import("@tauri-apps/plugin-store")
    .then((m) => m.Store.load(EDITOR_SESSION_FILE))
    .catch(() => {
      throw new Error("Tauri store not available");
    });
}

export async function saveEditorSession(data: EditorSessionData): Promise<void> {
  try {
    const store = await getEditorSessionStore();
    await store.set(EDITOR_SESSION_KEY, JSON.stringify(data));
    await store.save();
  } catch {
    // Silently fail
  }
}

export async function loadEditorSession(): Promise<EditorSessionData | null> {
  try {
    const store = await getEditorSessionStore();
    const raw = await store.get(EDITOR_SESSION_KEY);
    if (raw) return JSON.parse(raw) as EditorSessionData;
    return null;
  } catch {
    return null;
  }
}
