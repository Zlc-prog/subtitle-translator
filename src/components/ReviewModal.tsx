import React, { useState, useEffect } from "react";
import { useSubtitleStore } from "../stores/subtitleStore";

const TAG_PATTERN = /\[[^\]]*请人工核校[^\]]*\]/;
const TAG_PATTERN_G = /\[[^\]]*请人工核校[^\]]*\]/g;

export default function ReviewModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const subtitles = useSubtitleStore((s) => s.subtitles);
  const sentenceGroups = useSubtitleStore((s) => s.sentenceGroups);
  const setTranslation = useSubtitleStore((s) => s.setTranslation);

  const reviewItems = subtitles
    .map((s, i) => (s.translation && TAG_PATTERN.test(s.translation) ? i : -1))
    .filter((i) => i >= 0);

  const [current, setCurrent] = useState(0);
  const [editValue, setEditValue] = useState("");
  const [editing, setEditing] = useState(false);

  // Reset current on open, auto-close when empty, fix out-of-bounds
  useEffect(() => {
    if (isOpen) {
      setCurrent(0);
      setEditing(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (reviewItems.length === 0) {
      onClose();
      return;
    }
    if (current >= reviewItems.length) {
      setCurrent(reviewItems.length - 1);
    }
  }, [reviewItems.length, current, isOpen, onClose]);

  if (!isOpen || reviewItems.length === 0) return null;

  // Guard against out-of-bounds current (may happen briefly after accept)
  const safeCurrent = Math.min(current, reviewItems.length - 1);
  const idx = reviewItems[safeCurrent];
  const sub = subtitles[idx];
  if (!sub) return null;
  const translation = sub.translation ?? "";

  // Find the full sentence group containing this line
  const group = sentenceGroups.find((g) => g.includes(idx));
  const groupIndices = group ?? [idx];
  const groupFullText = groupIndices.map((i) => subtitles[i]?.text ?? "").join("");

  const handleAccept = () => {
    const cleaned = translation.replace(TAG_PATTERN_G, "").replace(/\s{2,}/g, " ").trim();
    setTranslation(idx, cleaned);
  };

  const startEdit = () => {
    setEditValue(translation);
    setEditing(true);
  };

  const saveEdit = () => {
    setTranslation(idx, editValue.trim() || translation);
    setEditing(false);
  };

  const cancelEdit = () => {
    setEditing(false);
  };

  const handleSkip = () => {
    if (current >= reviewItems.length - 1) {
      onClose();
    } else {
      setCurrent((c) => c + 1);
    }
  };

  // Render translation with highlighted tags
  const renderHighlighted = (text: string) => {
    const parts = text.split(/(\[[^\]]*请人工核校[^\]]*\])/g);
    return (
      <span>
        {parts.map((part, i) =>
          /\[[^\]]*请人工核校[^\]]*\]/.test(part) ? (
            <mark key={i} className="bg-orange-200 text-orange-800 rounded px-0.5">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-[600px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">审核专有名词翻译</h2>
          <span className="text-sm text-gray-400">
            第 {safeCurrent + 1}/{reviewItems.length} 条
          </span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Original text — full sentence group */}
          <div>
            <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">
              原文 {groupIndices.length > 1 && `（第 ${groupIndices[0] + 1}-${groupIndices[groupIndices.length - 1] + 1} 行）`}
            </div>
            <div className="text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-2 whitespace-pre-wrap leading-relaxed">
              {groupFullText}
            </div>
          </div>

          {/* Translation */}
          <div>
            <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">译文</div>
            {editing ? (
              <textarea
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                className="w-full px-3 py-2 text-sm text-blue-700 border border-blue-400 rounded-lg outline-none resize-none bg-blue-50 min-h-[80px]"
                autoFocus
              />
            ) : (
              <div className="text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-2 whitespace-pre-wrap leading-relaxed">
                {renderHighlighted(translation)}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0}
            className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-30"
          >
            ← 上一条
          </button>

          <div className="flex gap-2">
            <button onClick={handleSkip} className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">
              跳过
            </button>
            {editing ? (
              <>
                <button onClick={cancelEdit} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">
                  返回
                </button>
                <button onClick={saveEdit} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
                  保存修改
                </button>
              </>
            ) : (
              <>
                <button onClick={handleAccept} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  接受
                </button>
                <button onClick={startEdit} className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600">
                  修改
                </button>
              </>
            )}
          </div>

          <button
            onClick={() => setCurrent((c) => Math.min(reviewItems.length - 1, c + 1))}
            disabled={current >= reviewItems.length - 1}
            className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-30"
          >
            下一条 →
          </button>
        </div>
      </div>
    </div>
  );
}

export function countReviewItems(subtitles: { translation?: string }[]): number {
  return subtitles.filter((s) => s.translation && TAG_PATTERN.test(s.translation)).length;
}
