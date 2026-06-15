import React, { useState, useRef, useEffect } from "react";
import { Subtitle } from "../types/subtitle";
import { useSubtitleStore } from "../stores/subtitleStore";

const TAG_PATTERN = /\[[^\]]*请人工核校[^\]]*\]/;
const TAG_PATTERN_G = /\[[^\]]*请人工核校[^\]]*\]/g;

function renderHighlighted(text: string, onTagClick: () => void) {
  const parts = text.split(/(\[[^\]]*请人工核校[^\]]*\])/g);
  return parts.map((part, i) =>
    /\[[^\]]*请人工核校[^\]]*\]/.test(part) ? (
      <mark
        key={i}
        onClick={(e) => { e.stopPropagation(); onTagClick(); }}
        className="bg-orange-200 text-orange-800 rounded px-0.5 cursor-pointer hover:bg-orange-300 transition-colors"
        title="点击确认此标记"
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

interface SubtitleItemProps {
  subtitle: Subtitle;
  index: number;
  onRetranslate: () => void;
  isTranslating: boolean;
}

export default function SubtitleItem({
  subtitle,
  index,
  onRetranslate,
  isTranslating,
}: SubtitleItemProps) {
  const setSubtitleText = useSubtitleStore((s) => s.setSubtitleText);
  const setTranslation = useSubtitleStore((s) => s.setTranslation);
  const deleteSubtitle = useSubtitleStore((s) => s.deleteSubtitle);
  const applyPendingTranslations = useSubtitleStore((s) => s.applyPendingTranslations);
  const clearPendingTranslations = useSubtitleStore((s) => s.clearPendingTranslations);
  const pendingTranslation = useSubtitleStore((s) => s.pendingTranslations[index]);

  const [editingField, setEditingField] = useState<"text" | "translation" | null>(null);
  const [editValue, setEditValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editingField && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [editingField]);

  const startEdit = (field: "text" | "translation") => {
    if (isTranslating) return;
    setEditingField(field);
    setEditValue(field === "text" ? subtitle.text : (subtitle.translation ?? ""));
  };

  const saveEdit = () => {
    if (editingField === "text") {
      setSubtitleText(index, editValue.trim() || subtitle.text);
    } else if (editingField === "translation") {
      setTranslation(index, editValue.trim());
    }
    setEditingField(null);
  };

  const cancelEdit = () => setEditingField(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") cancelEdit();
    else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") saveEdit();
  };

  const hasPending = !!pendingTranslation;

  const acceptTag = (text: string) => {
    return text.replace(TAG_PATTERN_G, "").replace(/\s{2,}/g, " ").trim();
  };

  return (
    <div className="flex items-start gap-2 px-3 py-2 border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
      {/* Delete + Meta */}
      <div className="flex-shrink-0 w-20 pt-0.5">
        <div className="flex items-center justify-between">
          <button
            onClick={() => deleteSubtitle(index)}
            disabled={isTranslating}
            className="opacity-0 group-hover:opacity-100 transition-opacity px-1 py-0.5 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 rounded disabled:cursor-not-allowed"
            title="删除此行"
          >
            ✕
          </button>
          <span className="text-xs text-gray-400 font-medium">#{index + 1}</span>
        </div>
        <div className="text-[10px] text-gray-400 font-mono mt-0.5 leading-tight">
          {subtitle.startTime}
          <br />
          {subtitle.endTime}
        </div>
      </div>

      {/* Original text */}
      <div className="flex-1 min-w-0">
        {editingField === "text" ? (
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1 text-sm text-blue-900 border border-blue-400 rounded outline-none resize-none bg-blue-50"
            rows={1}
          />
        ) : (
          <div
            onClick={() => startEdit("text")}
            className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed cursor-pointer rounded px-1 -mx-1 hover:bg-yellow-100 hover:text-yellow-900 transition-colors"
            title="点击编辑原文"
          >
            {subtitle.text}
          </div>
        )}
      </div>

      {/* Translation */}
      <div className="flex-1 min-w-0">
        {editingField === "translation" ? (
          <textarea
            ref={textareaRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={handleKeyDown}
            className="w-full px-2 py-1 text-sm text-blue-700 border border-blue-400 rounded outline-none resize-none bg-blue-50"
            rows={1}
          />
        ) : hasPending ? (
          <div className="space-y-1">
            <div className="text-sm text-gray-400 whitespace-pre-wrap leading-relaxed line-through">
              {subtitle.translation ? renderHighlighted(subtitle.translation, () => {}) : "（无）"}
            </div>
            <div className="text-sm text-green-700 whitespace-pre-wrap leading-relaxed bg-green-50 rounded px-1.5 py-0.5 border border-green-200">
              {renderHighlighted(pendingTranslation, () => {})}
            </div>
          </div>
        ) : subtitle.translation ? (
          <div className="text-sm text-blue-700 whitespace-pre-wrap leading-relaxed rounded px-1 -mx-1">
            <span
              onClick={() => startEdit("translation")}
              className="cursor-pointer hover:bg-yellow-100 transition-colors rounded"
              title="点击编辑译文"
            >
              {TAG_PATTERN.test(subtitle.translation)
                ? renderHighlighted(subtitle.translation, () => setTranslation(index, acceptTag(subtitle.translation!)))
                : subtitle.translation}
            </span>
          </div>
        ) : (
          <div className="text-sm text-gray-300 italic">待翻译</div>
        )}
      </div>

      {/* Actions */}
      <div className="flex-shrink-0 flex flex-col gap-1 items-end pt-0.5">
        {hasPending ? (
          <>
            <button
              onClick={applyPendingTranslations}
              className="px-2 py-0.5 text-xs text-green-700 bg-green-100 hover:bg-green-200 rounded transition-colors"
              title="应用新译文"
            >
              接受
            </button>
            <button
              onClick={clearPendingTranslations}
              className="px-2 py-0.5 text-xs text-red-500 hover:bg-red-50 rounded transition-colors"
              title="拒绝新译文"
            >
              拒绝
            </button>
          </>
        ) : (
          <button
            onClick={onRetranslate}
            disabled={isTranslating || !subtitle.translation}
            className="px-2 py-0.5 text-xs text-gray-400 hover:text-blue-700 hover:bg-blue-50 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="重新翻译"
          >
            重新翻译
          </button>
        )}
      </div>
    </div>
  );
}
