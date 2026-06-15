import React, { useState, useEffect } from "react";
import AppLayout from "./components/layout/AppLayout";
import TranslatorPage from "./pages/TranslatorPage";
import SubtitleSplitterPage from "./pages/SubtitleSplitterPage";
import SubtitleEditorPage from "./pages/SubtitleEditorPage";
import VideoPostPage from "./pages/VideoPostPage";
import ApiKeyModal from "./components/ApiKeyModal";
import { useSubtitleStore } from "./stores/subtitleStore";
import { loadApiKey, loadRules } from "./services/configService";

export default function App() {
  const [page, setPage] = useState("editor");
  const [showApiKey, setShowApiKey] = useState(false);

  // Load persisted API key and rules on startup
  useEffect(() => {
    (async () => {
      const savedKey = await loadApiKey();
      if (savedKey) useSubtitleStore.getState().setApiKey(savedKey);
      const savedRules = await loadRules();
      if (savedRules) useSubtitleStore.getState().setTranslationRules(savedRules);
    })();
  }, []);

  // Global Cmd+Z undo shortcut (page-aware)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        const store = useSubtitleStore.getState();
        if (page === "editor") {
          store.undoEditor();
        } else {
          store.undo();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [page]);

  const openApiKey = () => setShowApiKey(true);

  return (
    <AppLayout activePage={page} onPageChange={setPage} onOpenApiKey={openApiKey}>
      {page === "translator" && <TranslatorPage onOpenApiKey={openApiKey} />}
      {page === "splitter" && <SubtitleSplitterPage />}
      {page === "editor" && <SubtitleEditorPage />}
      {page === "social-post" && <VideoPostPage onOpenApiKey={openApiKey} />}
      <ApiKeyModal isOpen={showApiKey} onClose={() => setShowApiKey(false)} />
    </AppLayout>
  );
}
