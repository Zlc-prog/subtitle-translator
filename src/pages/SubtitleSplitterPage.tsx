import React, { useState, useCallback, useEffect, useRef } from "react";
import SplitterConfig from "../components/SplitterConfig";
import SplitterPreview from "../components/SplitterPreview";
import ClearConfirmModal from "../components/ClearConfirmModal";
import DisclaimerModal from "../components/DisclaimerModal";
import { useSubtitleStore } from "../stores/subtitleStore";
import { splitTextWithAI, generateTimestamps } from "../services/splitterService";
import { serializeSrt } from "../utils/srtParser";
import { Subtitle } from "../types/subtitle";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import { save } from "@tauri-apps/plugin-dialog";

export default function SubtitleSplitterPage() {
  const apiKey = useSubtitleStore((s) => s.apiKey);
  const setSplitterResult = useSubtitleStore((s) => s.setSplitterResult);

  const [inputText, setInputText] = useState("");
  const [maxWords, setMaxWords] = useState(15);
  const [timingMode, setTimingMode] = useState<"wpm" | "duration">("wpm");
  const [wpm, setWpm] = useState(160);
  const [durMin, setDurMin] = useState(0);
  const [durSec, setDurSec] = useState(30);
  const storeSetSubtitles = useSubtitleStore((s) => s.setSubtitles);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showClear, setShowClear] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  // Sync to store for cross-page access
  useEffect(() => {
    setSplitterResult(subtitles);
  }, [subtitles, setSplitterResult]);

  const handleGenerate = useCallback(async () => {
    if (!inputText.trim() || !apiKey) return;

    setIsGenerating(true);
    try {
      // Step 1: AI split
      const lines = await splitTextWithAI(inputText.trim(), maxWords, apiKey);

      if (lines.length === 0) {
        alert("AI 未返回有效的分割结果");
        return;
      }

      // Step 2: Calculate timestamps
      const totalSeconds = durMin * 60 + durSec;
      const result = generateTimestamps(lines, timingMode, wpm, totalSeconds);

      setSubtitles(result);
      storeSetSubtitles(result);
    } catch (e: any) {
      alert(`生成字幕出错: ${e.message ?? e}`);
    } finally {
      setIsGenerating(false);
    }
  }, [inputText, maxWords, timingMode, wpm, durMin, durSec, apiKey]);

  const pendingExportAction = useRef<(() => void) | null>(null);

  const doExport = useCallback(async () => {
    const currentSubtitles = useSubtitleStore.getState().splitterResult;
    // fallback to local state if store is empty
    const subs = currentSubtitles.length > 0 ? currentSubtitles : subtitles;
    if (subs.length === 0) return;

    try {
      const srt = serializeSrt(subs);
      const savePath = await save({
        defaultPath: "subtitles.srt",
        filters: [{ name: "字幕文件", extensions: ["srt"] }],
      });
      if (!savePath) return;
      await writeTextFile(savePath, srt);
    } catch (e: any) {
      alert(`导出失败: ${e.message ?? e}`);
    }
  }, [subtitles]);

  const handleExport = useCallback(() => {
    if (subtitles.length === 0) return;
    pendingExportAction.current = doExport;
    setShowDisclaimer(true);
  }, [subtitles, doExport]);

  const handleDisclaimerConfirm = useCallback(() => {
    setShowDisclaimer(false);
    pendingExportAction.current?.();
    pendingExportAction.current = null;
  }, []);

  const handleSaveAndClear = useCallback(() => {
    if (subtitles.length === 0) return;
    setShowClear(false);
    pendingExportAction.current = () => {
      doExport().then(() => {
        setSubtitles([]);
        storeSetSubtitles([]);
      });
    };
    setShowDisclaimer(true);
  }, [subtitles, doExport, storeSetSubtitles]);

  const handleClearOnly = useCallback(() => {
    setSubtitles([]);
    storeSetSubtitles([]);
    setShowClear(false);
  }, [storeSetSubtitles]);

  const hasText = inputText.trim().length > 0;

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-700">字幕分割</h2>
          <p className="text-xs text-gray-400 mt-0.5">输入文字，AI 自动分割为字幕并计算时长</p>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-1">
            AI 结果仅供参考，请务必手动编辑核验
          </p>
          {subtitles.length > 0 && (
            <button
              onClick={() => setShowClear(true)}
              className="px-3 py-1.5 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            >
              清除
            </button>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 min-h-0">
        {/* Text input area */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="px-4 pt-3 pb-2 text-xs text-gray-400 uppercase tracking-wide">
            原文本
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="在此粘贴或输入要分割的文字..."
            className="flex-1 mx-4 mb-3 px-4 py-3 border border-gray-200 rounded-lg resize-none text-sm text-gray-800 leading-relaxed outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            spellCheck={false}
          />

          {/* Preview */}
          <SplitterPreview subtitles={subtitles} onExport={handleExport} />
        </div>

        {/* Config panel */}
        <SplitterConfig
          maxWords={maxWords}
          onMaxWordsChange={setMaxWords}
          timingMode={timingMode}
          onTimingModeChange={setTimingMode}
          wpm={wpm}
          onWpmChange={setWpm}
          durationMinutes={durMin}
          durationSeconds={durSec}
          onDurationChange={(m, s) => { setDurMin(m); setDurSec(s); }}
          onGenerate={handleGenerate}
          isGenerating={isGenerating}
          hasText={hasText}
          hasApiKey={!!apiKey}
        />
      </div>

      <ClearConfirmModal
        isOpen={showClear}
        onClose={() => setShowClear(false)}
        onClearOnly={handleClearOnly}
        onSaveAndClear={handleSaveAndClear}
        hasSubtitles={subtitles.length > 0}
      />

      <DisclaimerModal isOpen={showDisclaimer} onConfirm={handleDisclaimerConfirm} />
    </div>
  );
}
