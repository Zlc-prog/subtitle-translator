import React from "react";
import { Platform, PostLanguage, PostType, PlatformTag, PLATFORM_LABELS, POST_TYPE_LABELS, PLATFORM_TAG_LABELS } from "../types/socialPost";

interface VideoPostConfigProps {
  platform: Platform;
  onPlatformChange: (p: Platform) => void;
  postType: PostType;
  onPostTypeChange: (t: PostType) => void;
  language: PostLanguage;
  onLanguageChange: (l: PostLanguage) => void;
  customInstructions: string;
  onCustomInstructionsChange: (v: string) => void;
  onGenerateTitle: () => void;
  onGeneratePost: () => void;
  isGeneratingTitle: boolean;
  isGeneratingPost: boolean;
  canGenerate: boolean;
  hasApiKey: boolean;
  hasSource: boolean;
  platformTag: PlatformTag;
  onPlatformTagChange: (tag: PlatformTag) => void;
}

const platforms: Platform[] = ["instagram", "facebook", "twitter", "wechat"];
const postTypes: PostType[] = ["default", "short", "in_depth", "interactive"];

export default function VideoPostConfig({
  platform,
  onPlatformChange,
  postType,
  onPostTypeChange,
  language,
  onLanguageChange,
  customInstructions,
  onCustomInstructionsChange,
  onGenerateTitle,
  onGeneratePost,
  isGeneratingTitle,
  isGeneratingPost,
  canGenerate,
  hasApiKey,
  hasSource,
  platformTag,
  onPlatformTagChange,
}: VideoPostConfigProps) {
  const isBusy = isGeneratingTitle || isGeneratingPost;

  return (
    <div className="w-72 flex-shrink-0 border-r border-gray-200 p-4 space-y-5 overflow-y-auto">
      {/* Platform */}
      <div>
        <div className="text-xs font-medium text-gray-500 mb-2">目标平台</div>
        <div className="grid grid-cols-2 gap-1.5">
          {platforms.map((p) => (
            <button
              key={p}
              onClick={() => onPlatformChange(p)}
              disabled={isBusy}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                platform === p
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {PLATFORM_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Platform Tag */}
      <div>
        <div className="text-xs font-medium text-gray-500 mb-2">平台标记</div>
        <div className="flex flex-wrap gap-1.5">
          {(["instagram", "flyoverchina"] as const).map((tag) => (
            <button
              key={tag}
              onClick={() => onPlatformTagChange(platformTag === tag ? null : tag)}
              disabled={isBusy}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                platformTag === tag
                  ? "bg-purple-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {PLATFORM_TAG_LABELS[tag]}
            </button>
          ))}
        </div>
      </div>

      {/* Language */}
      <div>
        <div className="text-xs font-medium text-gray-500 mb-2">输出语言</div>
        <div className="flex gap-1.5">
          <button
            onClick={() => onLanguageChange("english")}
            disabled={isBusy}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              language === "english"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            English
          </button>
          <button
            onClick={() => onLanguageChange("chinese")}
            disabled={isBusy}
            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
              language === "chinese"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            中文
          </button>
        </div>
      </div>

      {/* Post Type */}
      <div>
        <div className="text-xs font-medium text-gray-500 mb-2">贴文类型</div>
        <div className="flex flex-wrap gap-1.5">
          {postTypes.map((t) => (
            <button
              key={t}
              onClick={() => onPostTypeChange(t)}
              disabled={isBusy}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                postType === t
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {POST_TYPE_LABELS[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Custom instructions */}
      <div>
        <div className="text-xs font-medium text-gray-500 mb-2">附加要求</div>
        <textarea
          value={customInstructions}
          onChange={(e) => onCustomInstructionsChange(e.target.value)}
          placeholder="例如：强调科技感、加入热门话题..."
          rows={3}
          disabled={isBusy}
          className="w-full border border-gray-300 rounded-lg text-xs px-3 py-2 resize-none focus:outline-none focus:border-blue-400 disabled:opacity-50"
        />
      </div>

      {/* API Key warning */}
      {!hasApiKey && (
        <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          请先设置 DeepSeek API Key
        </div>
      )}

      {/* Generate buttons */}
      <div className="space-y-2">
        <button
          onClick={onGenerateTitle}
          disabled={!canGenerate || isBusy}
          className="w-full py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isGeneratingTitle ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              生成中...
            </>
          ) : (
            "生成标题"
          )}
        </button>

        <button
          onClick={onGeneratePost}
          disabled={!canGenerate || isBusy}
          className="w-full py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isGeneratingPost ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              生成中...
            </>
          ) : (
            "生成贴文"
          )}
        </button>
      </div>

      {/* Status */}
      {!hasSource && (
        <div className="text-xs text-gray-400 text-center">
          请先输入或导入素材内容
        </div>
      )}
    </div>
  );
}
