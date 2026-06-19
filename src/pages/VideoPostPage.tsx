import React, { useState, useCallback, useEffect, useRef } from "react";
import { useSubtitleStore } from "../stores/subtitleStore";
import { Platform, PostLanguage, PostType, PlatformTag, PostGenerationConfig } from "../types/socialPost";
import { generateTitle, generatePost } from "../services/socialPostService";
import VideoPostConfig from "../components/VideoPostConfig";
import VideoPostResults from "../components/VideoPostResults";
import DisclaimerModal from "../components/DisclaimerModal";
import ImportFromAppMenu from "../components/ImportFromAppMenu";
import { parseSrt } from "../utils/srtParser";
import { readTextFile, readFile } from "@tauri-apps/plugin-fs";
import { open } from "@tauri-apps/plugin-dialog";
import mammoth from "mammoth";

interface VideoPostPageProps {
  onOpenApiKey: () => void;
}

type ImportSource = "translator" | "splitter" | "editor" | null;

const SOURCE_LABELS: Record<string, string> = {
  translator: "字幕翻译",
  splitter: "字幕分割",
  editor: "字幕修改",
};

interface TitleHistoryEntry {
  titles: string[];
  timestamp: number;
}

interface PostHistoryEntry {
  content: string;
  timestamp: number;
}

export default function VideoPostPage({ onOpenApiKey }: VideoPostPageProps) {
  const subtitles = useSubtitleStore((s) => s.subtitles);
  const editorSubtitles = useSubtitleStore((s) => s.editorSubtitles);
  const splitterResult = useSubtitleStore((s) => s.splitterResult);
  const apiKey = useSubtitleStore((s) => s.apiKey);

  // Source text (user-provided)
  const [sourceText, setSourceText] = useState("");
  const [importedFrom, setImportedFrom] = useState<ImportSource>(null);

  // Configuration state
  const [platform, setPlatform] = useState<Platform>("instagram");
  const [postType, setPostType] = useState<PostType>("default");
  const [language, setLanguage] = useState<PostLanguage>("english");
  const [customInstructions, setCustomInstructions] = useState("");
  const [platformTag, setPlatformTag] = useState<PlatformTag>(null);

  // Photographers
  const [photographers, setPhotographers] = useState<string[]>([]);
  const [newPhotographer, setNewPhotographer] = useState("");

  // Generation state
  const [generatedTitles, setGeneratedTitles] = useState<string[]>([]);
  const [selectedTitleIndex, setSelectedTitleIndex] = useState(0);
  const [generatedPost, setGeneratedPost] = useState("");
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [isGeneratingPost, setIsGeneratingPost] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<"title" | "post" | null>(null);
  const [lastGeneratedType, setLastGeneratedType] = useState<"title" | "post" | null>(null);

  // Title history
  const [titleHistory, setTitleHistory] = useState<TitleHistoryEntry[]>([]);
  const [postHistory, setPostHistory] = useState<PostHistoryEntry[]>([]);

  // Disclaimer
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Clear copy feedback timer on unmount
  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const hasSource = sourceText.trim().length > 0;

  // Apply platform tag prefix to titles
  const displayTitles = platformTag
    ? generatedTitles.map((t) => `(${platformTag === "instagram" ? "Instagram" : "FlyOverChina"}) ${t}`)
    : generatedTitles;

  const config: PostGenerationConfig = { platform, language, postType, customInstructions, photographers };
  const canGenerate = !!apiKey && hasSource;

  // ── Clear history when source changes ────────────────
  const clearSourceRelated = useCallback(() => {
    setGeneratedTitles([]);
    setGeneratedPost("");
    setTitleHistory([]);
    setPostHistory([]);
    setError(null);
  }, []);

  // ── File upload ────────────────────────────────────
  const handleUpload = useCallback(async () => {
    const selected = await open({
      filters: [
        { name: "支持的文件", extensions: ["srt", "txt", "docx"] },
      ],
      multiple: false,
    });
    if (!selected) return;

    try {
      const filePath = selected as string;
      const ext = filePath.split(".").pop()?.toLowerCase();

      if (ext === "docx") {
        const bytes = await readFile(filePath);
        const arrayBuffer = bytes.buffer.slice(
          bytes.byteOffset,
          bytes.byteOffset + bytes.byteLength
        ) as ArrayBuffer;
        const result = await mammoth.extractRawText({ arrayBuffer });
        setSourceText(result.value.trim());
      } else if (ext === "srt") {
        const content = await readTextFile(filePath);
        const parsed = parseSrt(content);
        setSourceText(parsed.map((s) => s.text).join("\n"));
      } else {
        const content = await readTextFile(filePath);
        setSourceText(content.trim());
      }
      setImportedFrom(null);
      clearSourceRelated();
    } catch (e: any) {
      alert(`读取文件失败: ${e.message ?? e}`);
    }
  }, [clearSourceRelated]);

  // ── Import from other pages ────────────────────────
  const videoPostSources = [
    { key: "translator", label: SOURCE_LABELS.translator },
    { key: "splitter", label: SOURCE_LABELS.splitter },
    { key: "editor", label: SOURCE_LABELS.editor },
  ];

  const handleImportFromApp = useCallback((sourceKey: string) => {
    let text = "";
    let found = false;

    switch (sourceKey) {
      case "translator": {
        const lines = subtitles
          .filter((s) => s.translation && s.translation.trim())
          .map((s) => s.translation!.trim());
        if (lines.length > 0) {
          text = lines.join("\n");
          found = true;
        }
        break;
      }
      case "splitter": {
        if (splitterResult.length > 0) {
          text = splitterResult.map((s) => s.text).join("\n");
          found = true;
        }
        break;
      }
      case "editor": {
        if (editorSubtitles.length > 0) {
          text = editorSubtitles.map((s) => s.text).join("\n");
          found = true;
        }
        break;
      }
    }

    if (found) {
      setSourceText(text);
      setImportedFrom(sourceKey as ImportSource);
      clearSourceRelated();
    } else {
      alert(`「${SOURCE_LABELS[sourceKey]}」中暂无内容，请先在该功能中导入或生成字幕`);
    }
  }, [subtitles, editorSubtitles, splitterResult, clearSourceRelated]);

  // ── Generation ─────────────────────────────────────
  const handleGenerateTitle = useCallback(async (previousTitles?: string[]) => {
    if (!canGenerate) return;
    setError(null);
    setIsGeneratingTitle(true);
    setLastGeneratedType("title");
    try {
      const text = sourceText.trim();
      const result = await generateTitle([text], config, apiKey, previousTitles);

      // Push current titles to history before replacing
      if (generatedTitles.length > 0) {
        setTitleHistory((prev) => [
          { titles: [...generatedTitles], timestamp: Date.now() },
          ...prev.slice(0, 19), // keep last 20 entries
        ]);
      }

      setGeneratedTitles(result);
      setSelectedTitleIndex(0);
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setIsGeneratingTitle(false);
    }
  }, [canGenerate, sourceText, config, apiKey, generatedTitles]);

  const handleGeneratePost = useCallback(async () => {
    if (!canGenerate) return;
    setError(null);
    setIsGeneratingPost(true);
    setLastGeneratedType("post");
    try {
      const text = sourceText.trim();
      const result = await generatePost([text], config, apiKey);

      // Push current post to history before replacing
      if (generatedPost) {
        setPostHistory((prev) => [
          { content: generatedPost, timestamp: Date.now() },
          ...prev.slice(0, 19),
        ]);
      }

      setGeneratedPost(result);
    } catch (e: any) {
      setError(e.message ?? String(e));
    } finally {
      setIsGeneratingPost(false);
    }
  }, [canGenerate, sourceText, config, apiKey]);

  const handleCopy = useCallback(async (text: string, field: "title" | "post") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopiedField(null), 1500);
      setShowDisclaimer(true);
    } catch { /* clipboard unavailable */ }
  }, []);

  const handleCopyTitle = useCallback(() => {
    const title = displayTitles[selectedTitleIndex];
    if (title) handleCopy(title, "title");
  }, [displayTitles, selectedTitleIndex, handleCopy]);

  const handleRegenerateTitle = useCallback(() => {
    handleGenerateTitle(generatedTitles);
  }, [handleGenerateTitle, generatedTitles]);

  const handleRegeneratePost = useCallback(() => {
    setGeneratedPost("");
    handleGeneratePost();
  }, [handleGeneratePost]);

  const handleRetry = useCallback(() => {
    if (lastGeneratedType === "title") handleGenerateTitle();
    else if (lastGeneratedType === "post") handleGeneratePost();
  }, [lastGeneratedType, handleGenerateTitle, handleGeneratePost]);

  const charCount = sourceText.length;

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 bg-white">
        <h2 className="text-sm font-semibold text-gray-700">视频标题和贴文生成</h2>
        <span className="text-xs text-gray-300">·</span>
        <span className="text-xs text-gray-400">基于字幕内容 AI 自动生成</span>
        <span className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-0.5">AI 结果仅供参考，请务必手动编辑核验</span>
        <div className="flex-1" />
        {!apiKey && (
          <button
            onClick={onOpenApiKey}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium"
          >
            设置 API Key
          </button>
        )}
      </div>

      {/* Body: Config (left) | Results + Source (right) */}
      <div className="flex-1 flex overflow-hidden">
        <VideoPostConfig
          platform={platform}
          onPlatformChange={setPlatform}
          postType={postType}
          onPostTypeChange={setPostType}
          language={language}
          onLanguageChange={setLanguage}
          customInstructions={customInstructions}
          onCustomInstructionsChange={setCustomInstructions}
          onGenerateTitle={handleGenerateTitle}
          onGeneratePost={handleGeneratePost}
          isGeneratingTitle={isGeneratingTitle}
          isGeneratingPost={isGeneratingPost}
          canGenerate={canGenerate}
          hasApiKey={!!apiKey}
          hasSource={hasSource}
          platformTag={platformTag}
          onPlatformTagChange={setPlatformTag}
        />

        {/* Right side: Results (top) + Source Input (bottom) */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Results */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <VideoPostResults
              generatedTitles={displayTitles}
              selectedTitleIndex={selectedTitleIndex}
              onSelectTitle={setSelectedTitleIndex}
              generatedPost={generatedPost}
              isGeneratingTitle={isGeneratingTitle}
              isGeneratingPost={isGeneratingPost}
              onCopyTitle={handleCopyTitle}
              onCopyPost={(text) => handleCopy(text, "post")}
              onRegenerateTitle={handleRegenerateTitle}
              onRegeneratePost={handleRegeneratePost}
              copiedField={copiedField}
              hasSubtitles={hasSource}
              error={error}
              onRetry={handleRetry}
              titleHistory={titleHistory}
              postHistory={postHistory}
              apiKey={apiKey}
            />
          </div>

          {/* Source Input */}
          <div className="px-4 pt-3 pb-3 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-medium text-gray-500">素材内容</span>
              {importedFrom && (
                <span className="text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded">
                  来自「{SOURCE_LABELS[importedFrom]}」
                </span>
              )}
            </div>
            <textarea
              value={sourceText}
              onChange={(e) => { setSourceText(e.target.value); setImportedFrom(null); }}
              placeholder="在此粘贴或输入字幕文字作为生成素材..."
              rows={4}
              className="w-full border border-gray-200 rounded-lg text-sm px-3 py-2 resize-none leading-relaxed outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              spellCheck={false}
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleUpload}
                className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"
              >
                上传文件
              </button>

              <ImportFromAppMenu
                sources={videoPostSources}
                onImport={handleImportFromApp}
              />

              <span className="flex-1 text-right text-xs text-gray-400">
                {charCount > 0 ? `${charCount.toLocaleString()} 字` : ""}
              </span>
            </div>


            {/* Photographer credit */}
            <div className="mt-3 pt-3 border-t border-gray-100">
              <div className="text-xs font-medium text-gray-500 mb-2">摄影师署名</div>
              {photographers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {photographers.map((name, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-xs text-gray-700"
                    >
                      {name}
                      <button
                        onClick={() => setPhotographers(photographers.filter((_, j) => j !== i))}
                        className="text-gray-400 hover:text-red-500 leading-none"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newPhotographer}
                  onChange={(e) => setNewPhotographer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newPhotographer.trim()) {
                      setPhotographers([...photographers, newPhotographer.trim()]);
                      setNewPhotographer("");
                    }
                  }}
                  placeholder="输入摄影师姓名后按回车添加"
                  className="flex-1 border border-gray-300 rounded-lg text-xs px-2 py-1.5 outline-none focus:border-blue-400"
                />
                <button
                  onClick={() => {
                    if (newPhotographer.trim()) {
                      setPhotographers([...photographers, newPhotographer.trim()]);
                      setNewPhotographer("");
                    }
                  }}
                  disabled={!newPhotographer.trim()}
                  className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition-colors"
                >
                  添加
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <DisclaimerModal isOpen={showDisclaimer} onConfirm={() => setShowDisclaimer(false)} />
    </div>
  );
}
