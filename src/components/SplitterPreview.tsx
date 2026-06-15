import React from "react";
import { Subtitle } from "../types/subtitle";

interface SplitterPreviewProps {
  subtitles: Subtitle[];
  onExport: () => void;
}

export default function SplitterPreview({ subtitles, onExport }: SplitterPreviewProps) {
  if (subtitles.length === 0) return null;

  const totalDuration = subtitles.length > 0
    ? subtitles[subtitles.length - 1].endTime
    : "00:00:00,000";

  return (
    <div className="border-t border-gray-200 flex flex-col flex-1 min-h-0">
      {/* Header */}
      <div className="px-4 py-2 bg-white border-b border-gray-100 flex items-center justify-between">
        <span className="text-xs text-gray-500">
          共 {subtitles.length} 条字幕 · 总时长 {totalDuration}
        </span>
        <button
          onClick={onExport}
          className="px-3 py-1 bg-slate-600 text-white rounded text-xs font-medium hover:bg-slate-700 transition-colors"
        >
          导出 SRT
        </button>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {subtitles.map((sub, idx) => (
          <div
            key={idx}
            className="flex items-start gap-3 px-4 py-2 border-b border-gray-50 hover:bg-gray-50"
          >
            <div className="flex-shrink-0 w-24 text-xs text-gray-400 pt-0.5 font-mono">
              <div className="text-gray-500">#{idx + 1}</div>
              <div>{sub.startTime}</div>
              <div>→ {sub.endTime}</div>
            </div>
            <div className="flex-1 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
              {sub.text}
            </div>
            <div className="flex-shrink-0 text-xs text-gray-400">
              {sub.text.replace(/[^一-鿿㐀-䶿a-zA-Z]/g, "").length} 字
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
