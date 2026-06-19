import React, { useCallback, useEffect, useRef, useState } from "react";
import ClearConfirmModal from "../components/ClearConfirmModal";
import EditorLine from "../components/EditorLine";
import ReferenceLine from "../components/ReferenceLine";
import UploadMenu from "../components/UploadMenu";
import ExportMenu from "../components/ExportMenu";
import { ImportSource } from "../components/ImportFromAppMenu";
import { parseSrt, serializeSrt } from "../utils/srtParser";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { open, save } from "@tauri-apps/plugin-dialog";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { useSubtitleStore } from "../stores/subtitleStore";
import { saveEditorSession, loadEditorSession } from "../services/configService";

export default function SubtitleEditorPage() {
  const editorSubtitles = useSubtitleStore((s) => s.editorSubtitles);
  const editorFileName = useSubtitleStore((s) => s.editorFileName);
  const editorUndoStack = useSubtitleStore((s) => s.editorUndoStack);
  const editorReferenceSubtitles = useSubtitleStore((s) => s.editorReferenceSubtitles);
  const editorReferenceText = useSubtitleStore((s) => s.editorReferenceText);
  const loadEditorSubtitles = useSubtitleStore((s) => s.loadEditorSubtitles);
  const setEditorFileName = useSubtitleStore((s) => s.setEditorFileName);
  const setEditorText = useSubtitleStore((s) => s.setEditorText);
  const setEditorTime = useSubtitleStore((s) => s.setEditorTime);
  const splitEditorLine = useSubtitleStore((s) => s.splitEditorLine);
  const mergeEditorLine = useSubtitleStore((s) => s.mergeEditorLine);
  const deleteEditorLine = useSubtitleStore((s) => s.deleteEditorLine);
  const undoEditor = useSubtitleStore((s) => s.undoEditor);
  const resetEditor = useSubtitleStore((s) => s.resetEditor);
  const loadEditorReference = useSubtitleStore((s) => s.loadEditorReference);
  const clearEditorReference = useSubtitleStore((s) => s.clearEditorReference);
  const setEditorReferenceText = useSubtitleStore((s) => s.setEditorReferenceText);
  const insertEditorBlank = useSubtitleStore((s) => s.insertEditorBlank);
  const insertReferenceBlank = useSubtitleStore((s) => s.insertReferenceBlank);
  const deleteEditorReference = useSubtitleStore((s) => s.deleteEditorReference);

  const [showClear, setShowClear] = React.useState(false);
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [showReference, setShowReference] = React.useState(true);
  const [showRefMenu, setShowRefMenu] = React.useState(false);
  const [showPasteModal, setShowPasteModal] = React.useState(false);
  const [pasteText, setPasteText] = React.useState("");
  const [importConfirm, setImportConfirm] = useState<ImportSource | null>(null);
  const refMenuRef = useRef<HTMLDivElement>(null);

  // ── Import from other tabs ──────────────────────────
  const editorSources: ImportSource[] = [
    { key: "translator", label: "字幕翻译" },
    { key: "splitter", label: "字幕分割" },
  ];

  const doImportToEditor = useCallback((sourceKey: string) => {
    const state = useSubtitleStore.getState();

    if (sourceKey === "splitter") {
      if (state.splitterResult.length === 0) {
        alert("「字幕分割」中暂无内容，请先生成字幕");
        return;
      }
      loadEditorSubtitles(state.splitterResult.map((s) => ({ ...s })));
      clearEditorReference();
      setEditorFileName("");
    } else if (sourceKey === "translator") {
      if (state.subtitles.length === 0) {
        alert("「字幕翻译」中暂无内容，请先导入字幕");
        return;
      }
      const hasTranslation = state.subtitles.some((s) => s.translation);
      if (hasTranslation) {
        // Mode: translations → editor text, originals → reference
        // Untranslated lines: reference = original, editor text empty
        const editorSubs = state.subtitles.map((s) => ({
          ...s,
          text: s.translation ?? "",
        }));
        const refSubs = state.subtitles.map((s) => ({ ...s }));
        loadEditorSubtitles(editorSubs);
        loadEditorReference(refSubs);
        setEditorFileName(state.fileName || "");
      } else {
        // No translations: originals → editor, no reference
        loadEditorSubtitles(state.subtitles.map((s) => ({ ...s })));
        clearEditorReference();
        setEditorFileName(state.fileName || "");
      }
    }
    setImportConfirm(null);
  }, [loadEditorSubtitles, clearEditorReference, setEditorFileName, loadEditorReference]);

  const handleImportToEditor = useCallback((sourceKey: string) => {
    if (editorSubtitles.length > 0) {
      const source = editorSources.find((s) => s.key === sourceKey);
      if (source) setImportConfirm(source);
    } else {
      doImportToEditor(sourceKey);
    }
  }, [editorSubtitles.length, doImportToEditor, editorSources]);

  const loadSrtFile = useCallback(async (filePath: string) => {
    try {
      const content = await readTextFile(filePath);
      const parsed = parseSrt(content);
      if (parsed.length === 0) {
        alert("未解析到有效字幕");
        return;
      }
      loadEditorSubtitles(parsed);
      setEditorFileName(filePath.split("/").pop() || "");
    } catch (e: any) {
      alert(`读取文件失败: ${e.message ?? e}`);
    }
  }, [loadEditorSubtitles, setEditorFileName]);

  const handleUpload = useCallback(async () => {
    const selected = await open({
      filters: [{ name: "字幕文件", extensions: ["srt"] }],
      multiple: false,
    });
    if (!selected) return;
    await loadSrtFile(selected as string);
  }, [loadSrtFile]);

  const handleUploadReference = useCallback(async () => {
    const selected = await open({
      filters: [{ name: "字幕文件", extensions: ["srt"] }],
      multiple: false,
    });
    if (!selected) return;
    try {
      const content = await readTextFile(selected as string);
      const parsed = parseSrt(content);
      if (parsed.length === 0) {
        alert("未解析到有效参考字幕");
        return;
      }
      loadEditorReference(parsed);
      setShowReference(true);
    } catch (e: any) {
      alert(`读取参考字幕失败: ${e.message ?? e}`);
    }
  }, [loadEditorReference]);

  const handleUploadText = useCallback(async () => {
    setShowRefMenu(false);
    const selected = await open({
      filters: [{ name: "文本文件", extensions: ["txt"] }],
      multiple: false,
    });
    if (!selected) return;
    try {
      const content = await readTextFile(selected as string);
      if (!content.trim()) {
        alert("文件内容为空");
        return;
      }
      setEditorReferenceText(content.trim());
      setShowReference(true);
    } catch (e: any) {
      alert(`读取文本失败: ${e.message ?? e}`);
    }
  }, [setEditorReferenceText]);

  const handleOpenPaste = useCallback(() => {
    setShowRefMenu(false);
    setPasteText("");
    setShowPasteModal(true);
  }, []);

  const handlePasteConfirm = useCallback(() => {
    if (!pasteText.trim()) return;
    setEditorReferenceText(pasteText.trim());
    setShowPasteModal(false);
    setShowReference(true);
  }, [pasteText, setEditorReferenceText]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (refMenuRef.current && !refMenuRef.current.contains(e.target as Node)) {
        setShowRefMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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

  useEffect(() => {
    (async () => {
      const session = await loadEditorSession();
      if (session && session.subtitles.length > 0) {
        const current = useSubtitleStore.getState();
        if (current.editorSubtitles.length === 0) {
          current.loadEditorSubtitles(session.subtitles);
          current.setEditorFileName(session.fileName);
        }
      }
    })();
  }, []);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveEditorSession({
        subtitles: useSubtitleStore.getState().editorSubtitles,
        fileName: useSubtitleStore.getState().editorFileName,
      });
    }, 2000);
    return () => clearTimeout(saveTimer.current);
  }, [editorSubtitles]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleExport();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editorSubtitles, editorFileName]);

  const handleExport = useCallback(async () => {
    try {
      const srt = serializeSrt(editorSubtitles);
      const defaultName = editorFileName || "output.srt";
      const savePath = await save({ defaultPath: defaultName, filters: [{ name: "字幕文件", extensions: ["srt"] }] });
      if (!savePath) return;
      await writeTextFile(savePath, srt);
      alert("导出成功!");
    } catch (e: any) {
      alert(`导出失败: ${e.message ?? e}`);
    }
  }, [editorSubtitles, editorFileName]);

  const handleExportTxt = useCallback(async () => {
    const lines = editorSubtitles.filter((s) => !s._blank).map((s) => s.text).filter((t) => t.trim());
    if (lines.length === 0) {
      alert("没有可导出的字幕文字");
      return;
    }
    try {
      const txt = lines.join("\n");
      const defaultName = editorFileName.replace(".srt", ".txt") || "output.txt";
      const savePath = await save({ defaultPath: defaultName, filters: [{ name: "文本文件", extensions: ["txt"] }] });
      if (!savePath) return;
      await writeTextFile(savePath, txt);
      alert("导出成功!");
    } catch (e: any) {
      alert(`导出失败: ${e.message ?? e}`);
    }
  }, [editorSubtitles, editorFileName]);

  const handleSaveAndClear = useCallback(async () => {
    await handleExport();
    resetEditor();
    setShowClear(false);
  }, [handleExport, resetEditor]);

  const handleClearOnly = useCallback(() => {
    resetEditor();
    setShowClear(false);
  }, [resetEditor]);

  const refMode = editorReferenceText ? "text" : editorReferenceSubtitles.length > 0 ? "srt" : null;

  // Compute unified rows per index for SRT mode alignment
  const getRows = useCallback((idx: number, editorText: string) => {
    if (refMode !== "srt") return undefined;
    const refText = editorReferenceSubtitles[idx]?.text ?? "";
    const editorRows = Math.max(1, Math.ceil(editorText.length / 60));
    const refRows = Math.max(1, Math.ceil(refText.length / 60));
    return Math.max(editorRows, refRows);
  }, [refMode, editorReferenceSubtitles]);
  const hasReference = refMode !== null && showReference;

  return (
    <div className="h-screen flex flex-col bg-white relative">
      <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100 bg-white">
        <h2 className="text-sm font-semibold text-gray-700 flex-shrink-0">字幕修改</h2>
        {editorFileName && (
          <input
            type="text"
            value={editorFileName}
            onChange={(e) => setEditorFileName(e.target.value)}
            className="text-xs text-gray-600 bg-transparent border-b border-gray-300 hover:border-gray-400 focus:border-blue-400 outline-none px-1 py-0.5 w-36 flex-shrink-0"
            title="可修改文件名，导出时作为默认名称"
          />
        )}
        <span className="text-xs text-gray-300 flex-shrink-0">· {editorSubtitles.length} 条</span>
        <div className="flex-1" />
        <UploadMenu
          onUploadFile={handleUpload}
          importSources={editorSources}
          onImport={handleImportToEditor}
        />
        <ExportMenu
          onExportSrt={handleExport}
          onExportTxt={handleExportTxt}
          disabled={editorSubtitles.length === 0}
        />
        <span className="text-gray-200 flex-shrink-0">|</span>
        {/* Reference dropdown */}
        <div className="relative flex-shrink-0" ref={refMenuRef}>
          <button
            onClick={() => setShowRefMenu(!showRefMenu)}
            className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1"
          >
            参考字幕
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showRefMenu && (
            <div className="absolute top-full left-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
              <button onClick={handleUploadReference} className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                上传 SRT 参考
              </button>
              <button onClick={handleUploadText} className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                上传 TXT 文本
              </button>
              <button onClick={handleOpenPaste} className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors">
                粘贴纯文本
              </button>
            </div>
          )}
        </div>
        {(editorReferenceSubtitles.length > 0 || editorReferenceText) && (
          <button
            onClick={() => setShowReference(!showReference)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex-shrink-0 ${showReference ? "bg-gray-100 text-gray-600 hover:bg-gray-200" : "bg-amber-100 text-amber-700 hover:bg-amber-200"}`}
          >
            {showReference ? "隐藏参考" : "显示参考"}
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 px-4 py-1 border-b border-gray-100 bg-white">
        <span className="text-xs text-gray-400 flex-shrink-0">
          拖拽 SRT 到窗口 · Enter 拆分 · 句首 Backspace 合并
        </span>
        <div className="flex-1" />
        <button
          onClick={undoEditor}
          disabled={editorUndoStack.length === 0}
          className="px-2 py-0.5 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ↩ 撤回
        </button>
        {editorSubtitles.length > 0 && (
          <button onClick={() => setShowClear(true)} className="px-2 py-0.5 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
            清除字幕
          </button>
        )}
        {editorReferenceSubtitles.length > 0 && (
          <button onClick={() => clearEditorReference()} className="px-2 py-0.5 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors">
            清除参考
          </button>
        )}
      </div>

      {editorSubtitles.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-1">上传 SRT 字幕文件</div>
            <div className="text-xs text-gray-400">支持点击上传或拖拽文件到窗口</div>
            <div className="text-xs text-gray-400 mt-0.5">支持 Enter 拆分、Backspace 合并、悬浮删除、Cmd+Z 撤回、Cmd+S 导出</div>
          </div>
        </div>
      ) : refMode === "text" ? (
        /* ── Text reference mode: independent scroll ── */
        <div className="flex-1 flex min-h-0 divide-x divide-gray-200">
          {hasReference && (
            <div className="w-1/3 flex-shrink-0 bg-gray-50/50 flex flex-col min-h-0">
              <div className="flex-shrink-0 bg-gray-100 border-b border-gray-200 px-4 py-1.5 text-xs text-gray-500 font-medium">
                参考文本
              </div>
              <textarea
                readOnly
                value={editorReferenceText}
                className="flex-1 w-full p-4 text-sm text-gray-600 leading-relaxed resize-none outline-none bg-transparent"
              />
            </div>
          )}
          <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
            <div className="sticky top-0 z-10 bg-gray-100 border-b border-gray-200 px-4 py-1.5 text-xs text-gray-500 font-medium flex-shrink-0">
              编辑字幕 · {editorSubtitles.length} 条
            </div>
            {editorSubtitles.map((sub, idx) => (
              <EditorLine
                key={idx}
                subtitle={sub}
                index={idx}
                total={editorSubtitles.length}
                onTextChange={setEditorText}
                onTimeChange={setEditorTime}
                onSplit={splitEditorLine}
                onMerge={mergeEditorLine}
                onDelete={deleteEditorLine}
                onInsertBlank={insertEditorBlank}
              />
            ))}
          </div>
        </div>
      ) : (
        /* ── SRT reference mode: unified scroll ── */
        <div className={`flex-1 flex min-h-0 overflow-y-auto ${hasReference ? "divide-x divide-gray-200" : ""}`}>
          {hasReference && (
            <div className="w-1/3 flex-shrink-0 bg-gray-50/50">
              <div className="sticky top-0 z-10 bg-gray-100 border-b border-gray-200 px-4 py-1.5 text-xs text-gray-500 font-medium">
                参考字幕 · {editorReferenceSubtitles.length} 条
              </div>
              {editorReferenceSubtitles.map((sub, idx) => {
                const editorText = editorSubtitles[idx]?.text ?? "";
                const rows = getRows(idx, editorText);
                return <ReferenceLine key={idx} subtitle={sub} index={idx} rows={rows} onInsertBlank={insertReferenceBlank} onDelete={deleteEditorReference} />;
              })}
            </div>
          )}
          <div className="flex-1">
            <div className="sticky top-0 z-10 bg-gray-100 border-b border-gray-200 px-4 py-1.5 text-xs text-gray-500 font-medium">
              编辑字幕 · {editorSubtitles.length} 条
            </div>
            {editorSubtitles.map((sub, idx) => (
              <EditorLine
                key={idx}
                subtitle={sub}
                index={idx}
                total={editorSubtitles.length}
                rows={getRows(idx, sub.text)}
                onTextChange={setEditorText}
                onTimeChange={setEditorTime}
                onSplit={splitEditorLine}
                onMerge={mergeEditorLine}
                onDelete={deleteEditorLine}
                onInsertBlank={insertEditorBlank}
              />
            ))}
          </div>
        </div>
      )}

      {/* Paste modal */}
      {showPasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-[500px] max-h-[80vh] flex flex-col">
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-800">粘贴参考文本</h2>
            </div>
            <div className="flex-1 p-5">
              <textarea
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder="在此粘贴纯文本内容作为字幕参考..."
                className="w-full h-48 px-3 py-2 text-sm text-gray-800 border border-gray-300 rounded-lg outline-none resize-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent leading-relaxed"
              />
            </div>
            <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
              <button onClick={() => setShowPasteModal(false)} className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">
                取消
              </button>
              <button onClick={handlePasteConfirm} className="px-4 py-1.5 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
                确认
              </button>
            </div>
          </div>
        </div>
      )}

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
        hasSubtitles={editorSubtitles.length > 0}
      />

      {/* Import confirmation */}
      {importConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-2xl w-[400px]">
            <div className="px-5 py-4 border-b border-gray-200">
              <h2 className="text-base font-semibold text-gray-800">从软件获取字幕</h2>
              <p className="text-sm text-gray-500 mt-1">
                当前已有 {editorSubtitles.length} 条字幕，从「{importConfirm.label}」导入将覆盖现有内容。是否继续？
              </p>
            </div>
            <div className="px-5 py-4 flex justify-end gap-2">
              <button
                onClick={() => setImportConfirm(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                onClick={() => doImportToEditor(importConfirm.key)}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                确认覆盖
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
