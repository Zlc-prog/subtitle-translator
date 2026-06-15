import React from "react";
import { Subtitle } from "../types/subtitle";

interface ReferenceLineProps {
  subtitle: Subtitle;
  index: number;
  rows?: number;
  onInsertBlank: (index: number) => void;
  onDelete: (index: number) => void;
}

const ReferenceLine = React.memo(function ReferenceLine({ subtitle, index, rows: propRows, onInsertBlank, onDelete }: ReferenceLineProps) {
  const rows = propRows ?? Math.max(1, Math.ceil(subtitle.text.length / 60));
  const isBlank = subtitle._blank;

  return (
    <div className={`flex items-start gap-2 px-3 py-2 border-b border-gray-100 transition-colors group ${isBlank ? "bg-gray-50/30" : "hover:bg-gray-50/50"}`}>
      {/* Left: delete + insert blank + index, timecodes below */}
      <div className="flex-shrink-0 w-[84px]">
        <div className="flex items-center gap-1 mb-0.5">
          <button
            onClick={() => onDelete(index)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-red-400 hover:text-red-600 leading-none"
            title="删除此行"
          >
            ✕
          </button>
          <button
            onClick={() => onInsertBlank(index)}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-gray-400 hover:text-gray-600 leading-none"
            title="插入空白行"
          >
            +
          </button>
          <span className="text-[10px] font-mono text-gray-400">#{index + 1}</span>
        </div>
        <div className="space-y-0.5">
          <input
            type="text"
            readOnly
            value={isBlank ? "" : subtitle.startTime}
            className={`w-full py-0.5 text-[10px] font-mono text-center border rounded outline-none bg-transparent ${isBlank ? "text-gray-300 border-gray-100" : "text-gray-400 border-transparent"}`}
          />
          <input
            type="text"
            readOnly
            value={isBlank ? "" : subtitle.endTime}
            className={`w-full py-0.5 text-[10px] font-mono text-center border rounded outline-none bg-transparent ${isBlank ? "text-gray-300 border-gray-100" : "text-gray-400 border-transparent"}`}
          />
        </div>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0 pt-[18px]">
        <textarea
          readOnly
          value={isBlank ? "" : subtitle.text}
          rows={isBlank ? 1 : rows}
          className={`w-full px-2 py-1.5 text-sm leading-relaxed border rounded outline-none resize-none ${isBlank ? "text-gray-300 border-gray-100 bg-gray-50/30 cursor-default" : "text-gray-600 border-gray-200 bg-gray-50/50"}`}
        />
        {!isBlank && subtitle.translation && (
          <div className="mt-1 text-xs text-gray-400 leading-relaxed whitespace-pre-wrap px-2">
            {subtitle.translation}
          </div>
        )}
      </div>
    </div>
  );
});

export default ReferenceLine;
