import React from "react";

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
}

function TitleCard({
  titles,
  selectedIndex,
  onSelect,
  isLoading,
  onCopy,
  onRegenerate,
  copied,
}: {
  titles: string[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  isLoading: boolean;
  onCopy: () => void;
  onRegenerate: () => void;
  copied: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <span className="text-base">🏷️</span>
        <span className="text-sm font-medium text-gray-700">视频标题</span>
        <div className="flex-1" />
        {titles.length > 0 && !isLoading && (
          <>
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
    </div>
  );
}

function PostCard({
  content,
  isLoading,
  onCopy,
  onRegenerate,
  copied,
}: {
  content: string;
  isLoading: boolean;
  onCopy: () => void;
  onRegenerate: () => void;
  copied: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <span className="text-base">📝</span>
        <span className="text-sm font-medium text-gray-700">社交媒体贴文</span>
        <div className="flex-1" />
        {content && !isLoading && (
          <>
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
      />

      <PostCard
        content={generatedPost}
        isLoading={isGeneratingPost}
        onCopy={() => onCopyPost(generatedPost)}
        onRegenerate={onRegeneratePost}
        copied={copiedField === "post"}
      />
    </div>
  );
}
