import React, { useState, useMemo, useEffect, useRef } from "react";
import { Subtitle } from "../types/subtitle";

export type RetranslateMode = "single" | "context";

export interface RetranslateOptions {
  mode: RetranslateMode;
  contextIndices: number[];
}

interface RetranslatePopoverProps {
  currentIndex: number;
  subtitles: Subtitle[];
  sentenceGroups: number[][];
  onConfirm: (options: RetranslateOptions) => void;
  onCancel: () => void;
  onSelectionChange?: (indices: Set<number>) => void;
}

const CONTEXT_WINDOW = 3;

export default function RetranslatePopover({
  currentIndex,
  subtitles,
  sentenceGroups,
  onConfirm,
  onCancel,
  onSelectionChange,
}: RetranslatePopoverProps) {
  const [mode, setMode] = useState<RetranslateMode>("context");
  const panelRef = useRef<HTMLDivElement>(null);

  // Find the group containing currentIndex
  const currentGroup = useMemo(
    () => sentenceGroups.find((g) => g.includes(currentIndex)) ?? null,
    [sentenceGroups, currentIndex]
  );

  // Initial checked: other lines in same group; if no group, nothing pre-checked
  const [checkedSet, setCheckedSet] = useState<Set<number>>(() => {
    if (currentGroup) {
      return new Set(currentGroup.filter((i) => i !== currentIndex));
    }
    return new Set<number>();
  });

  // Visible context window around currentIndex
  const visibleRange = useMemo(() => {
    const start = Math.max(0, currentIndex - CONTEXT_WINDOW);
    const end = Math.min(subtitles.length - 1, currentIndex + CONTEXT_WINDOW);
    const indices: number[] = [];
    for (let i = start; i <= end; i++) {
      indices.push(i);
    }
    return indices;
  }, [currentIndex, subtitles.length]);

  // Report selection changes to parent
  useEffect(() => {
    if (mode === "single") {
      onSelectionChange?.(new Set([currentIndex]));
    } else {
      const all = new Set(checkedSet);
      all.add(currentIndex);
      onSelectionChange?.(all);
    }
  }, [mode, checkedSet, currentIndex, onSelectionChange]);

  // Clear on unmount
  useEffect(() => {
    return () => onSelectionChange?.(new Set());
  }, [onSelectionChange]);

  const toggleCheck = (idx: number) => {
    setCheckedSet((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const handleConfirm = () => {
    const contextIndices =
      mode === "context" ? Array.from(checkedSet).sort((a, b) => a - b) : [];
    onConfirm({ mode, contextIndices });
  };

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onCancel();
      }
    };
    // Delay to avoid immediate close from the button click
    const timer = setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [onCancel]);

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-1 z-50 w-80 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-800">选择重新翻译模式</h3>
      </div>

      {/* Mode selection */}
      <div className="px-4 py-3 space-y-2 border-b border-gray-50">
        <label
          className={`flex items-start gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
            mode === "single"
              ? "bg-blue-50 border border-blue-200"
              : "hover:bg-gray-50 border border-transparent"
          }`}
        >
          <input
            type="radio"
            name="retranslateMode"
            value="single"
            checked={mode === "single"}
            onChange={() => setMode("single")}
            className="mt-0.5"
          />
          <div>
            <div className="text-sm font-medium text-gray-700">单行翻译</div>
            <div className="text-xs text-gray-400 mt-0.5">
              仅翻译当前行，不参考上下文
            </div>
          </div>
        </label>

        <label
          className={`flex items-start gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
            mode === "context"
              ? "bg-blue-50 border border-blue-200"
              : "hover:bg-gray-50 border border-transparent"
          }`}
        >
          <input
            type="radio"
            name="retranslateMode"
            value="context"
            checked={mode === "context"}
            onChange={() => setMode("context")}
            className="mt-0.5"
          />
          <div>
            <div className="text-sm font-medium text-gray-700">上下文翻译</div>
            <div className="text-xs text-gray-400 mt-0.5">
              参考勾选的上下文行，优化当前行翻译
            </div>
          </div>
        </label>
      </div>

      {/* Context line selection (only when context mode) */}
      {mode === "context" && (
        <div className="px-4 py-3 max-h-52 overflow-y-auto">
          <p className="text-xs text-gray-400 mb-2">
            勾选作为翻译参考的上下文行：
          </p>
          <div className="space-y-0.5">
            {visibleRange.map((idx) => {
              const isTarget = idx === currentIndex;
              const isChecked = checkedSet.has(idx);
              const inGroup = currentGroup?.includes(idx);
              const sub = subtitles[idx];
              const preview =
                sub.text.length > 40
                  ? sub.text.slice(0, 40) + "…"
                  : sub.text;

              return (
                <label
                  key={idx}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md transition-colors ${
                    isTarget
                      ? "bg-amber-50 border border-amber-200"
                      : isChecked
                      ? "bg-blue-50/50"
                      : "hover:bg-gray-50"
                  } cursor-pointer`}
                >
                  {isTarget ? (
                    <span className="text-amber-500 text-xs font-semibold w-5 text-center">
                      ▶
                    </span>
                  ) : (
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleCheck(idx)}
                      className="w-4 h-4"
                    />
                  )}
                  <span className="text-[10px] text-gray-400 font-mono w-7 flex-shrink-0">
                    #{idx + 1}
                  </span>
                  <span
                    className={`text-xs truncate flex-1 ${
                      isTarget
                        ? "text-amber-800 font-medium"
                        : isChecked
                        ? "text-blue-700"
                        : "text-gray-500"
                    }`}
                  >
                    {preview}
                  </span>
                  {inGroup && !isTarget && (
                    <span className="text-[9px] text-green-500 bg-green-50 px-1 rounded flex-shrink-0">
                      同句
                    </span>
                  )}
                  {isTarget && (
                    <span className="text-[9px] text-amber-500 bg-amber-100 px-1 rounded flex-shrink-0">
                      目标
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-100 flex justify-end gap-2 bg-gray-50/50">
        <button
          onClick={onCancel}
          className="px-4 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
        >
          取消
        </button>
        <button
          onClick={handleConfirm}
          className="px-4 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          确认翻译
        </button>
      </div>
    </div>
  );
}
