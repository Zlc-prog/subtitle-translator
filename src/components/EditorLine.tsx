import React, { useRef, useCallback } from "react";
import { Subtitle } from "../types/subtitle";

interface EditorLineProps {
  subtitle: Subtitle;
  index: number;
  total: number;
  onTextChange: (index: number, text: string) => void;
  onTimeChange: (index: number, startTime: string, endTime: string) => void;
  onSplit: (index: number, cursorPos: number) => void;
  onMerge: (index: number) => void;
}

function countChars(text: string): number {
  return text.replace(/[^一-鿿㐀-䶿a-zA-Z]/g, "").length;
}

function timeToSeconds(t: string): number {
  const match = t.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
  if (!match) return 0;
  return parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseInt(match[3]) + parseInt(match[4]) / 1000;
}

function secondsToTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  const ms = Math.round((s - Math.floor(s)) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

export default function EditorLine({
  subtitle,
  index,
  total,
  onTextChange,
  onTimeChange,
  onSplit,
  onMerge,
}: EditorLineProps) {
  const textRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
    [index, onSplit, onMerge]
  );

  return (
    <div className="flex items-start gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors">
      {/* Index */}
      <div className="flex-shrink-0 w-8 pt-2 text-xs text-gray-400 font-medium">
        #{index + 1}
      </div>

      {/* Timecodes */}
      <div className="flex-shrink-0 flex items-center gap-1 pt-1">
        <input
          type="text"
          value={subtitle.startTime}
          onChange={(e) => onTimeChange(index, e.target.value, subtitle.endTime)}
          className="w-28 px-1.5 py-1 text-xs font-mono text-gray-600 border border-gray-200 rounded outline-none focus:ring-1 focus:ring-blue-400 bg-gray-50"
          placeholder="00:00:00,000"
        />
        <span className="text-xs text-gray-300">→</span>
        <input
          type="text"
          value={subtitle.endTime}
          onChange={(e) => onTimeChange(index, subtitle.startTime, e.target.value)}
          className="w-28 px-1.5 py-1 text-xs font-mono text-gray-600 border border-gray-200 rounded outline-none focus:ring-1 focus:ring-blue-400 bg-gray-50"
          placeholder="00:00:00,000"
        />
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <textarea
          ref={textRef}
          value={subtitle.text}
          onChange={(e) => onTextChange(index, e.target.value)}
          onKeyDown={handleKeyDown}
          className="w-full px-2 py-1.5 text-sm text-gray-800 border border-gray-200 rounded outline-none resize-none focus:ring-1 focus:ring-blue-400 leading-relaxed"
          rows={Math.max(1, Math.ceil(subtitle.text.length / 60))}
          spellCheck={false}
        />
        <div className="text-xs text-gray-400 mt-0.5">
          {subtitle.text.length} 字符 · Enter 拆分 · 开头 Backspace 合并
        </div>
      </div>
    </div>
  );
}

export { countChars, timeToSeconds, secondsToTime };
