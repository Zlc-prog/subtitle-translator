import React, { useState, useCallback, useEffect } from "react";
import ClearConfirmModal from "../components/ClearConfirmModal";
import EditorLine, { countChars, timeToSeconds, secondsToTime } from "../components/EditorLine";
import { Subtitle } from "../types/subtitle";
import { parseSrt, serializeSrt } from "../utils/srtParser";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { open, save } from "@tauri-apps/plugin-dialog";
import { getCurrentWebview } from "@tauri-apps/api/webview";

export default function SubtitleEditorPage() {
  const [subtitles, setLocalSubtitles] = useState<Subtitle[]>([]);
  const [fileName, setLocalFileName] = useState("");
  const [showClear, setShowClear] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Shared file loading
  const loadSrtFile = useCallback(async (filePath: string) => {
    try {
      const content = await readTextFile(filePath);
      const parsed = parseSrt(content);
      if (parsed.length === 0) {
        alert("未解析到有效字幕");
        return;
      }
      setLocalSubtitles(parsed);
      setLocalFileName(filePath.split("/").pop() || "");
    } catch (e: any) {
      alert(`读取文件失败: ${e.message ?? e}`);
    }
  }, []);

  // Upload SRT
  const handleUpload = useCallback(async () => {
    const selected = await open({
      filters: [{ name: "字幕文件", extensions: ["srt"] }],
      multiple: false,
    });
    if (!selected) return;
    await loadSrtFile(selected as string);
  }, [loadSrtFile]);

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
              loadSrtFile(srtFile);
            }
          }
        });
      } catch { /* unavailable */ }
    })();
    return () => { unlisten?.(); };
  }, [loadSrtFile]);

  // Export SRT
  const handleExport = useCallback(async () => {
    if (subtitles.length === 0) return;
    try {
      const srt = serializeSrt(subtitles);
      const defaultName = fileName || "output.srt";
      const savePath = await save({ defaultPath: defaultName, filters: [{ name: "字幕文件", extensions: ["srt"] }] });
      if (!savePath) return;
      await writeTextFile(savePath, srt);
      alert("导出成功!");
    } catch (e: any) {
      alert(`导出失败: ${e.message ?? e}`);
    }
  }, [subtitles, fileName]);

  const handleExportTxt = useCallback(async () => {
    if (subtitles.length === 0) return;
    const lines = subtitles.map((s) => s.text).filter((t) => t.trim());
    if (lines.length === 0) {
      alert("没有可导出的字幕文字");
      return;
    }
    try {
      const txt = lines.join("\n");
      const defaultName = fileName.replace(".srt", ".txt") || "output.txt";
      const savePath = await save({ defaultPath: defaultName, filters: [{ name: "文本文件", extensions: ["txt"] }] });
      if (!savePath) return;
      await writeTextFile(savePath, txt);
      alert("导出成功!");
    } catch (e: any) {
      alert(`导出失败: ${e.message ?? e}`);
    }
  }, [subtitles, fileName]);

  const handleSaveAndClear = useCallback(async () => {
    await handleExport();
    setLocalSubtitles([]);
    setLocalFileName("");
    setShowClear(false);
  }, [handleExport]);

  const handleClearOnly = useCallback(() => {
    setLocalSubtitles([]);
    setLocalFileName("");
    setShowClear(false);
  }, []);

  // Text change
  const handleTextChange = useCallback((idx: number, text: string) => {
    setLocalSubtitles((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], text };
      return next;
    });
  }, []);

  // Time change
  const handleTimeChange = useCallback((idx: number, startTime: string, endTime: string) => {
    setLocalSubtitles((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], startTime, endTime };
      return next;
    });
  }, []);

  // Split at cursor position
  const handleSplit = useCallback((idx: number, cursorPos: number) => {
    setLocalSubtitles((prev) => {
      const sub = prev[idx];
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

      const first: Subtitle = {
        index: sub.index,
        startTime: sub.startTime,
        endTime: secondsToTime(splitTime),
        text: before,
        translation: sub.translation,
      };

      const second: Subtitle = {
        index: sub.index + 1,
        startTime: secondsToTime(splitTime),
        endTime: sub.endTime,
        text: after,
      };

      const next = [...prev];
      next.splice(idx, 1, first, second);
      return next.map((s, i) => ({ ...s, index: i + 1 }));
    });
  }, []);

  // Merge with previous line
  const handleMerge = useCallback((idx: number) => {
    if (idx === 0) return;
    setLocalSubtitles((prev) => {
      const prevSub = prev[idx - 1];
      const currSub = prev[idx];

      const merged: Subtitle = {
        index: prevSub.index,
        startTime: prevSub.startTime,
        endTime: currSub.endTime,
        text: prevSub.text + currSub.text,
        translation: prevSub.translation || currSub.translation
          ? (prevSub.translation ?? "") + (currSub.translation ?? "")
          : undefined,
      };

      const next = [...prev];
      next.splice(idx - 1, 2, merged);
      return next.map((s, i) => ({ ...s, index: i + 1 }));
    });
  }, []);

  return (
    <div className="h-screen flex flex-col bg-white relative">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white">
        <h2 className="text-sm font-semibold text-gray-700">字幕修改</h2>
        {fileName && <span className="text-xs text-gray-400">{fileName}</span>}
        <span className="text-xs text-gray-300">· {subtitles.length} 条</span>

        <div className="flex-1" />

        <span className="text-xs text-gray-400">或拖拽 SRT 文件到窗口</span>

        <button
          onClick={handleUpload}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          上传 SRT
        </button>

        <button
          onClick={handleExport}
          disabled={subtitles.length === 0}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium disabled:opacity-40"
        >
          导出 SRT
        </button>

        <button
          onClick={handleExportTxt}
          disabled={subtitles.length === 0}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-40"
        >
          导出 TXT
        </button>

        {subtitles.length > 0 && (
          <button
            onClick={() => setShowClear(true)}
            className="px-3 py-1.5 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          >
            清除
          </button>
        )}
      </div>

      {/* Hint when empty */}
      {subtitles.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          <div className="text-center">
            <div className="text-4xl mb-3">✏️</div>
            <div>上传 SRT 文件、从其他模块传入或拖拽文件到窗口</div>
            <div className="text-xs text-gray-300 mt-1">支持 Enter 拆分、Backspace 合并</div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {subtitles.map((sub, idx) => (
            <EditorLine
              key={idx}
              subtitle={sub}
              index={idx}
              total={subtitles.length}
              onTextChange={handleTextChange}
              onTimeChange={handleTimeChange}
              onSplit={handleSplit}
              onMerge={handleMerge}
            />
          ))}
        </div>
      )}

      {/* Drag-over overlay */}
      {isDragOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-blue-500/20 border-4 border-blue-500 border-dashed pointer-events-none">
          <div className="bg-white rounded-xl shadow-lg px-8 py-6 text-center">
            <div className="text-4xl mb-2">📂</div>
            <div className="text-lg font-semibold text-blue-600">释放文件以上传</div>
            <div className="text-sm text-gray-400 mt-1">支持 .srt 字幕文件</div>
          </div>
        </div>
      )}

      <ClearConfirmModal
        isOpen={showClear}
        onClose={() => setShowClear(false)}
        onClearOnly={handleClearOnly}
        onSaveAndClear={handleSaveAndClear}
        hasSubtitles={subtitles.length > 0}
      />
    </div>
  );
}
