import React, { useState, useCallback, useEffect, useRef } from "react";
import Toolbar from "../components/Toolbar";
import SubtitleList from "../components/SubtitleList";
import RuleConfigModal from "../components/RuleConfigModal";
import ReviewModal from "../components/ReviewModal";
import ClearConfirmModal from "../components/ClearConfirmModal";
import StatusBar from "../components/StatusBar";
import { useSubtitleStore } from "../stores/subtitleStore";
import { splitSentences, translateGroup } from "../services/translateService";
import { loadRules, loadApiKey, saveSession, loadSession } from "../services/configService";
import { parseSrt, serializeSrt } from "../utils/srtParser";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { open, save } from "@tauri-apps/plugin-dialog";
import { getCurrentWebview } from "@tauri-apps/api/webview";

export default function TranslatorPage({ onOpenApiKey }: { onOpenApiKey: () => void }) {
  const [showRules, setShowRules] = useState(false);
  const [showReview, setShowReview] = useState(false);
  const [showClear, setShowClear] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const {
    subtitles,
    translationRules,
    apiKey,
    setTranslation,
    setIsTranslating,
    setTranslatedCount,
    setSubtitles,
    fileName,
    setFileName,
    setApiKey,
    setTranslationRules,
    setSentenceGroups,
    setPendingTranslation,
    // sentenceGroups unused directly here but needed in retranslate via getState
    reset,
  } = useSubtitleStore();

  // Shared file loading
  const handleLoadFile = useCallback(async (filePath: string) => {
    try {
      const content = await readTextFile(filePath);
      const parsed = parseSrt(content);

      if (parsed.length === 0) {
        alert("未解析到有效字幕");
        return;
      }

      reset();
      setSubtitles(parsed);
      setFileName(filePath.split("/").pop() || filePath);

      const savedKey = await loadApiKey();
      if (savedKey) setApiKey(savedKey);
      const savedRules = await loadRules();
      if (savedRules) setTranslationRules(savedRules);
    } catch (e: any) {
      alert(`读取文件失败: ${e.message ?? e}`);
    }
  }, [reset, setSubtitles, setFileName, setApiKey, setTranslationRules]);

  const handleUpload = useCallback(async () => {
    const selected = await open({
      filters: [{ name: "字幕文件", extensions: ["srt"] }],
      multiple: false,
    });
    if (!selected) return;
    await handleLoadFile(selected as string);
  }, [handleLoadFile]);

  // Drag-and-drop
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        unlisten = await getCurrentWebview().onDragDropEvent((event) => {
          const { type } = event.payload;
          if (type === "over") {
            setIsDragOver(true);
          } else if (type === "leave") {
            setIsDragOver(false);
          } else if (type === "drop") {
            setIsDragOver(false);
            const paths = event.payload.paths;
            if (paths.length > 0) {
              const srtFile = paths.find((p) => p.toLowerCase().endsWith(".srt")) ?? paths[0];
              handleLoadFile(srtFile);
            }
          }
        });
      } catch { /* unavailable */ }
    })();
    return () => { unlisten?.(); };
  }, [handleLoadFile]);

  // Auto-save: debounce save session 2 seconds after any change
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const savedCount = useRef(0);

  useEffect(() => {
    // Skip saving during initial load or translation
    if (subtitles.length === 0) return;

    // Don't save newly loaded files immediately (let initial translate run)
    if (savedCount.current === 0 && subtitles.filter((s) => s.translation).length === 0) return;

    // Store the current snapshot to avoid stale closures
    const snapshot = useSubtitleStore.getState();

    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await saveSession({
        subtitles: snapshot.subtitles,
        sentenceGroups: snapshot.sentenceGroups,
        fileName: snapshot.fileName,
      });
      useSubtitleStore.getState().setAutoSaveTime(Date.now());
      savedCount.current++;
    }, 2000);

    return () => clearTimeout(saveTimer.current);
  }, [subtitles]);

  // Restore previous session on mount if no file loaded
  useEffect(() => {
    (async () => {
      const session = await loadSession();
      if (session && session.subtitles.length > 0) {
        // Only restore if no file is currently loaded
        const current = useSubtitleStore.getState();
        if (current.subtitles.length === 0) {
          current.setSubtitles(session.subtitles);
          current.setSentenceGroups(session.sentenceGroups);
          current.setFileName(session.fileName);
        }
      }
    })();
  }, []);

  // Translate all
  const translateAll = useCallback(async () => {
    if (subtitles.length === 0) return;
    if (!apiKey) {
      alert("请先设置 DeepSeek API Key");
      onOpenApiKey();
      return;
    }

    setIsTranslating(true);

    try {
      const storedGroups = useSubtitleStore.getState().sentenceGroups;
      const groups = storedGroups.length > 0
        ? storedGroups
        : await splitSentences(subtitles, translationRules, apiKey);
      setSentenceGroups(groups);

      const remaining = groups.filter((g) => g.some((idx) => !subtitles[idx].translation));

      for (const group of remaining) {
        const groupSubtitles = group.map((idx) => subtitles[idx]);
        const translations = await translateGroup(groupSubtitles, translationRules, apiKey);

        for (let j = 0; j < group.length; j++) {
          if (translations[j]) {
            setTranslation(group[j], translations[j]);
          }
        }
      }
    } catch (e: any) {
      alert(`翻译出错: ${e.message ?? e}`);
    } finally {
      setIsTranslating(false);
      setTranslatedCount(subtitles.filter((s) => s.translation).length);
    }
  }, [subtitles, apiKey, translationRules, setTranslation, setIsTranslating, setTranslatedCount, setSentenceGroups]);

  // Re-translate a sentence group
  const handleRetranslate = useCallback(
    async (idx: number) => {
      if (!apiKey) {
        alert("请先设置 DeepSeek API Key");
        return;
      }

      const currentGroups = useSubtitleStore.getState().sentenceGroups;
      const group = currentGroups.find((g) => g.includes(idx));

      if (!group) {
        try {
          const fromStore = useSubtitleStore.getState();
          const [result] = await translateGroup([fromStore.subtitles[idx]], translationRules, apiKey);
          if (result) {
            setPendingTranslation(idx, result);
          }
        } catch (e: any) {
          alert(`重新翻译出错: ${e.message ?? e}`);
        }
        return;
      }

      try {
        const fromStore = useSubtitleStore.getState();
        const groupSubtitles = group.map((i) => fromStore.subtitles[i]);
        const translations = await translateGroup(groupSubtitles, translationRules, apiKey);

        for (let j = 0; j < group.length; j++) {
          if (translations[j]) {
            setPendingTranslation(group[j], translations[j]);
          }
        }
      } catch (e: any) {
        alert(`重新翻译出错: ${e.message ?? e}`);
      }
    },
    [apiKey, translationRules, setPendingTranslation]
  );

  const handleExportSrt = useCallback(async () => {
    if (subtitles.length === 0) return;

    const translated = subtitles.filter((s) => s.translation);
    if (translated.length === 0) {
      alert("没有已翻译的字幕可导出");
      return;
    }

    try {
      const srt = serializeSrt(subtitles);
      const defaultName = useSubtitleStore.getState().fileName || "output.srt";
      const savePath = await save({
        defaultPath: defaultName,
        filters: [{ name: "字幕文件", extensions: ["srt"] }],
      });

      if (!savePath) return;

      await writeTextFile(savePath, srt);
      alert("导出成功!");
    } catch (e: any) {
      alert(`导出失败: ${e.message ?? e}`);
    }
  }, [subtitles]);

  const handleExportTxt = useCallback(async () => {
    if (subtitles.length === 0) return;

    const lines = subtitles
      .map((s) => s.translation || s.text)
      .filter((t) => t.trim());

    if (lines.length === 0) {
      alert("没有可导出的字幕文字");
      return;
    }

    try {
      const txt = lines.join("\n");
      const defaultName = useSubtitleStore.getState().fileName.replace(".srt", ".txt") || "output.txt";
      const savePath = await save({
        defaultPath: defaultName,
        filters: [{ name: "文本文件", extensions: ["txt"] }],
      });

      if (!savePath) return;

      await writeTextFile(savePath, txt);
      alert("导出成功!");
    } catch (e: any) {
      alert(`导出失败: ${e.message ?? e}`);
    }
  }, [subtitles]);

  const handleSaveAndClear = useCallback(async () => {
    await handleExportSrt();
    setShowClear(false);
    reset();
  }, [handleExportSrt, reset]);

  const handleClearOnly = useCallback(() => {
    reset();
    setShowClear(false);
  }, [reset]);

  return (
    <div className="h-screen flex flex-col bg-white relative">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 bg-white">
        <h2 className="text-sm font-semibold text-gray-700">字幕翻译</h2>
        {fileName && (
          <span className="text-xs text-gray-400">{fileName}</span>
        )}
      </div>

      <Toolbar
        onUpload={handleUpload}
        onOpenRules={() => setShowRules(true)}
        onTranslateAll={translateAll}
        onExportSrt={handleExportSrt}
        onExportTxt={handleExportTxt}
        onOpenReview={() => setShowReview(true)}
        onClear={() => setShowClear(true)}
      />

      <SubtitleList onRetranslate={handleRetranslate} />

      <StatusBar />

      {isDragOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-blue-500/20 border-4 border-blue-500 border-dashed pointer-events-none">
          <div className="bg-white rounded-xl shadow-lg px-8 py-6 text-center">
            <div className="text-4xl mb-2">📂</div>
            <div className="text-lg font-semibold text-blue-600">释放文件以上传</div>
            <div className="text-sm text-gray-400 mt-1">支持 .srt 字幕文件</div>
          </div>
        </div>
      )}

      <RuleConfigModal isOpen={showRules} onClose={() => setShowRules(false)} />
      <ReviewModal isOpen={showReview} onClose={() => setShowReview(false)} />
      <ClearConfirmModal
        isOpen={showClear}
        onClose={() => setShowClear(false)}
        onClearOnly={handleClearOnly}
        onSaveAndClear={handleSaveAndClear}
        hasSubtitles={subtitles.filter((s) => s.translation).length > 0}
      />
    </div>
  );
}
