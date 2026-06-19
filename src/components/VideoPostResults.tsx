import React, { useState, useCallback } from "react";
import SocialVerifyPopover from "./SocialVerifyPopover";
import { SocialVerificationResult, verifyTitle, verifyPost } from "../services/socialPostService";

interface TitleHistoryEntry {
  titles: string[];
  timestamp: number;
}

interface PostHistoryEntry {
  content: string;
  timestamp: number;
}

interface VideoPostResultsProps {
  generatedTitles: string[];
  selectedTitleIndex: number;
  onSelectTitle: (index: number) => void;
  generatedPost: string;
  isGeneratingTitle: boolean;
  isGeneratingPost: boolean;
  onCopyTitle: () => void;
  onCopyPost: (text: string) => void;
  onRegenerateTitle: () => void;
  onRegeneratePost: () => void;
  copiedField: "title" | "post" | null;
  hasSubtitles: boolean;
  error: string | null;
  onRetry: () => void;
  titleHistory: TitleHistoryEntry[];
  postHistory: PostHistoryEntry[];
  apiKey: string;
}

function formatHistoryTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

function TitleCard({
  titles,
  selectedIndex,
  onSelect,
  isLoading,
  onCopy,
  onRegenerate,
  copied,
  titleHistory,
  apiKey,
}: {
  titles: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  isLoading: boolean;
  onCopy: () => void;
  onRegenerate: () => void;
  copied: boolean;
  titleHistory: TitleHistoryEntry[];
  apiKey: string;
}) {
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [showVerify, setShowVerify] = useState(false);

  const selectedTitle = titles[selectedIndex] ?? "";

  const handleVerify = useCallback(async (): Promise<SocialVerificationResult> => {
    return verifyTitle(selectedTitle, apiKey);
  }, [selectedTitle, apiKey]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <span className="text-base">🏷️</span>
        <span className="text-sm font-medium text-gray-700">视频标题</span>
        <div className="flex-1" />
        {titles.length > 0 && !isLoading && (
          <>
            <div className="relative">
              <button
                onClick={() => setShowVerify(!showVerify)}
                className="px-3 py-1 rounded text-xs font-medium text-emerald-600 hover:bg-emerald-50 transition-colors"
              >
                核校
              </button>
              {showVerify && (
                <SocialVerifyPopover
                  content={selectedTitle}
                  onVerify={handleVerify}
                  onClose={() => setShowVerify(false)}
                />
              )}
            </div>
            <button
              onClick={onCopy}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                copied
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {copied ? "已复制!" : "复制选中"}
            </button>
            <button
              onClick={onRegenerate}
              className="px-3 py-1 rounded text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
            >
              重新生成
            </button>
          </>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        {isLoading ? (
          <div className="space-y-3 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-5/6" />
            <div className="h-4 bg-gray-200 rounded w-4/6" />
          </div>
        ) : titles.length > 0 ? (
          <div className="space-y-2">
            {titles.map((title, i) => (
              <label
                key={i}
                className={`flex items-start gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors border ${
                  selectedIndex === i
                    ? "border-blue-300 bg-blue-50"
                    : "border-gray-100 hover:bg-gray-50"
                }`}
              >
                <input
                  type="radio"
                  name="titleOption"
                  checked={selectedIndex === i}
                  onChange={() => onSelect(i)}
                  className="mt-0.5 w-3.5 h-3.5 text-blue-600 accent-blue-600"
                />
                <span className="text-sm text-gray-800 leading-relaxed">{title}</span>
              </label>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">点击左侧「生成标题」按钮开始</p>
        )}
      </div>

      {/* History */}
      {titleHistory.length > 0 && (
        <div className="border-t border-gray-100">
          <button
            onClick={() => setHistoryExpanded(!historyExpanded)}
            className="w-full flex items-center gap-2 px-4 py-2 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <svg
              className={`w-3 h-3 transition-transform ${historyExpanded ? "rotate-90" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            历史生成记录 ({titleHistory.length})
          </button>
          {historyExpanded && (
            <div className="px-4 pb-3 space-y-2 max-h-60 overflow-y-auto">
              {titleHistory.map((entry, i) => (
                <div key={i} className="border border-gray-100 rounded-lg p-2">
                  <div className="text-[10px] text-gray-400 mb-1">
                    {formatHistoryTime(entry.timestamp)}
                  </div>
                  {entry.titles.map((t, j) => (
                    <div key={j} className="text-xs text-gray-600 leading-relaxed pl-2 border-l-2 border-gray-200 mb-0.5 last:mb-0">
                      {t}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PostCard({
  content,
  isLoading,
  onCopy,
  onRegenerate,
  copied,
  postHistory,
  apiKey,
}: {
  content: string;
  isLoading: boolean;
  onCopy: () => void;
  onRegenerate: () => void;
  copied: boolean;
  postHistory: PostHistoryEntry[];
  apiKey: string;
}) {
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [showVerify, setShowVerify] = useState(false);

  const handleVerify = useCallback(async (): Promise<SocialVerificationResult> => {
    return verifyPost(content, apiKey);
  }, [content, apiKey]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <span className="text-base">📝</span>
        <span className="text-sm font-medium text-gray-700">社交媒体贴文</span>
        <div className="flex-1" />
        {content && !isLoading && (
          <>
            <div className="relative">
              <button
                onClick={() => setShowVerify(!showVerify)}
                className="px-3 py-1 rounded text-xs font-medium text-emerald-600 hover:bg-emerald-50 transition-colors"
              >
                核校
              </button>
              {showVerify && (
                <SocialVerifyPopover
                  content={content}
                  onVerify={handleVerify}
                  onClose={() => setShowVerify(false)}
                />
              )}
            </div>
            <button
              onClick={onCopy}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                copied
                  ? "bg-green-100 text-green-700"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {copied ? "已复制!" : "复制"}
            </button>
            <button
              onClick={onRegenerate}
              className="px-3 py-1 rounded text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
            >
              重新生成
            </button>
          </>
        )}
      </div>

      {/* Body */}
      <div className="px-4 py-3">
        {isLoading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-5/6" />
            <div className="h-4 bg-gray-200 rounded w-4/6" />
          </div>
        ) : content ? (
          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{content}</p>
        ) : (
          <p className="text-sm text-gray-400">点击左侧「生成贴文」按钮开始</p>
        )}
      </div>

      {/* History */}
      {postHistory.length > 0 && (
        <div className="border-t border-gray-100">
          <button
            onClick={() => setHistoryExpanded(!historyExpanded)}
            className="w-full flex items-center gap-2 px-4 py-2 text-xs text-gray-500 hover:bg-gray-50 transition-colors"
          >
            <svg
              className={`w-3 h-3 transition-transform ${historyExpanded ? "rotate-90" : ""}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            历史生成记录 ({postHistory.length})
          </button>
          {historyExpanded && (
            <div className="px-4 pb-3 space-y-2 max-h-60 overflow-y-auto">
              {postHistory.map((entry, i) => (
                <div key={i} className="border border-gray-100 rounded-lg p-2">
                  <div className="text-[10px] text-gray-400 mb-1">
                    {formatHistoryTime(entry.timestamp)}
                  </div>
                  <p className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed">{entry.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function VideoPostResults({
  generatedTitles,
  selectedTitleIndex,
  onSelectTitle,
  generatedPost,
  isGeneratingTitle,
  isGeneratingPost,
  onCopyTitle,
  onCopyPost,
  onRegenerateTitle,
  onRegeneratePost,
  copiedField,
  hasSubtitles,
  error,
  onRetry,
  titleHistory,
  postHistory,
  apiKey,
}: VideoPostResultsProps) {
  if (!hasSubtitles) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">✍️</div>
          <div className="text-sm text-gray-600 mb-1">暂无素材内容</div>
          <div className="text-xs text-gray-400">
            在下方输入文字、上传文件或从软件其他功能获取素材
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <span className="text-sm text-red-700 flex-1">{error}</span>
          <button
            onClick={onRetry}
            className="px-3 py-1 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition-colors"
          >
            重试
          </button>
        </div>
      )}

      <TitleCard
        titles={generatedTitles}
        selectedIndex={selectedTitleIndex}
        onSelect={onSelectTitle}
        isLoading={isGeneratingTitle}
        onCopy={onCopyTitle}
        onRegenerate={onRegenerateTitle}
        copied={copiedField === "title"}
        titleHistory={titleHistory}
        apiKey={apiKey}
      />

      <PostCard
        content={generatedPost}
        isLoading={isGeneratingPost}
        onCopy={() => onCopyPost(generatedPost)}
        onRegenerate={onRegeneratePost}
        copied={copiedField === "post"}
        postHistory={postHistory}
        apiKey={apiKey}
      />
    </div>
  );
}
