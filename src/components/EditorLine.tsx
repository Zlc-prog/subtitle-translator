import React, { useRef, useCallback } from "react";
import { Subtitle } from "../types/subtitle";

interface EditorLineProps {
  subtitle: Subtitle;
  index: number;
  total: number;
  rows?: number;
  onTextChange: (index: number, text: string) => void;
  onTimeChange: (index: number, startTime: string, endTime: string) => void;
  onSplit: (index: number, cursorPos: number) => void;
  onMerge: (index: number) => void;
  onDelete: (index: number) => void;
  onInsertBlank: (index: number) => void;
}

const EditorLine = React.memo(function EditorLine({
  subtitle,
  index,
  total,
  rows: propRows,
  onTextChange,
  onTimeChange,
  onSplit,
  onMerge,
  onDelete,
  onInsertBlank,
}: EditorLineProps) {
  const textRef = useRef<HTMLTextAreaElement>(null);
  const isBlank = subtitle._blank;
  const rows = propRows ?? Math.max(1, Math.ceil(subtitle.text.length / 60));

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (isBlank) return;
      const textarea = e.currentTarget;
      const cursor = textarea.selectionStart ?? 0;

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        if (cursor > 0 && cursor < textarea.value.length) {
          onSplit(index, cursor);
        }
      } else if (e.key === "Backspace" && cursor === 0 && textarea.selectionStart === textarea.selectionEnd) {
        e.preventDefault();
        onMerge(index);
      }
    },
    [index, onSplit, onMerge, isBlank]
  );

  return (
    <div className={`flex items-start gap-2 px-3 py-2 border-b border-gray-100 transition-colors group ${isBlank ? "bg-gray-50/30" : "hover:bg-gray-50"}`}>
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
            value={isBlank ? "" : subtitle.startTime}
            onChange={(e) => onTimeChange(index, e.target.value, subtitle.endTime)}
            className={`w-full py-0.5 text-[10px] font-mono text-center border rounded outline-none bg-gray-50 ${isBlank ? "text-gray-300 border-gray-100 cursor-default" : "text-gray-600 border-gray-200 focus:ring-1 focus:ring-blue-400"}`}
            placeholder="00:00:00,000"
            readOnly={isBlank}
          />
          <input
            type="text"
            value={isBlank ? "" : subtitle.endTime}
            onChange={(e) => onTimeChange(index, subtitle.startTime, e.target.value)}
            className={`w-full py-0.5 text-[10px] font-mono text-center border rounded outline-none bg-gray-50 ${isBlank ? "text-gray-300 border-gray-100 cursor-default" : "text-gray-600 border-gray-200 focus:ring-1 focus:ring-blue-400"}`}
            placeholder="00:00:00,000"
            readOnly={isBlank}
          />
        </div>
      </div>

      {/* Text — top edge aligned with first timecode */}
      <div className="flex-1 min-w-0 pt-[18px]">
        <textarea
          ref={textRef}
          value={isBlank ? "" : subtitle.text}
          onChange={(e) => onTextChange(index, e.target.value)}
          onKeyDown={handleKeyDown}
          className={`w-full px-2 py-1.5 text-sm border rounded outline-none resize-none leading-relaxed ${isBlank ? "text-gray-300 border-gray-100 bg-gray-50/30 cursor-default" : "text-gray-800 border-gray-200 focus:ring-1 focus:ring-blue-400"}`}
          rows={isBlank ? 1 : rows}
          spellCheck={false}
          readOnly={isBlank}
        />
        {!isBlank && subtitle.translation && (
          <div className="mt-1 text-sm text-blue-700 bg-blue-50/50 border border-blue-100 rounded px-2 py-1 leading-relaxed whitespace-pre-wrap">
            {subtitle.translation}
          </div>
        )}
      </div>
    </div>
  );
});

export default EditorLine;
