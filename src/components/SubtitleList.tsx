import React, { useState, useCallback } from "react";
import { useSubtitleStore } from "../stores/subtitleStore";
import SubtitleItem from "./SubtitleItem";
import { RetranslateOptions } from "./RetranslatePopover";

interface SubtitleListProps {
  onRetranslate: (index: number, options: RetranslateOptions) => void;
}

export default function SubtitleList({ onRetranslate }: SubtitleListProps) {
  const subtitles = useSubtitleStore((s) => s.subtitles);
  const isTranslating = useSubtitleStore((s) => s.isTranslating);
  const translatedCount = useSubtitleStore((s) => s.translatedCount);

  const [highlightedIndices, setHighlightedIndices] = useState<Set<number>>(new Set());

  const handleSelectionChange = useCallback((indices: Set<number>) => {
    setHighlightedIndices(indices);
  }, []);

  const total = subtitles.length;
  const pct = total > 0 ? Math.round((translatedCount / total) * 100) : 0;

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      {/* Progress bar */}
      <div className="px-4 py-2 bg-white border-b border-gray-100 flex items-center gap-3 text-xs text-gray-500">
        <span>
          进度: {translatedCount}/{total} ({pct}%)
        </span>
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
        {isTranslating && <span className="text-blue-500">翻译中...</span>}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {subtitles.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            上传 SRT 文件，设置 API Key，即可开始翻译
          </div>
        ) : (
          subtitles.map((sub, idx) => (
            <SubtitleItem
              key={sub.index || idx}
              subtitle={sub}
              index={idx}
              onRetranslate={(options) => onRetranslate(idx, options)}
              isTranslating={isTranslating}
              isHighlighted={highlightedIndices.has(idx)}
              onSelectionChange={handleSelectionChange}
            />
          ))
        )}
      </div>
    </div>
  );
}
