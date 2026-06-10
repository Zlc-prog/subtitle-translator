import React, { useState, useEffect } from "react";
import AppLayout from "./components/layout/AppLayout";
import TranslatorPage from "./pages/TranslatorPage";
import SubtitleSplitterPage from "./pages/SubtitleSplitterPage";
import SubtitleEditorPage from "./pages/SubtitleEditorPage";
import ApiKeyModal from "./components/ApiKeyModal";
import { useSubtitleStore } from "./stores/subtitleStore";

export default function App() {
  const [page, setPage] = useState("editor");
  const [showApiKey, setShowApiKey] = useState(false);

  // Global Cmd+Z undo shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        e.preventDefault();
        useSubtitleStore.getState().undo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const openApiKey = () => setShowApiKey(true);

  return (
    <AppLayout activePage={page} onPageChange={setPage} onOpenApiKey={openApiKey}>
      {page === "translator" && <TranslatorPage onOpenApiKey={openApiKey} />}
      {page === "splitter" && <SubtitleSplitterPage />}
      {page === "editor" && <SubtitleEditorPage />}
      <ApiKeyModal isOpen={showApiKey} onClose={() => setShowApiKey(false)} />
    </AppLayout>
  );
}
