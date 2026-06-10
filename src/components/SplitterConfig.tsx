import React, { useState, useEffect } from "react";

interface SplitterConfigProps {
  maxWords: number;
  onMaxWordsChange: (v: number) => void;
  timingMode: "wpm" | "duration";
  onTimingModeChange: (v: "wpm" | "duration") => void;
  wpm: number;
  onWpmChange: (v: number) => void;
  durationMinutes: number;
  durationSeconds: number;
  onDurationChange: (minutes: number, seconds: number) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  hasText: boolean;
  hasApiKey: boolean;
}

function clampInt(raw: string, min: number, max: number, fallback: number): number {
  const n = parseInt(raw, 10);
  if (isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

export default function SplitterConfig({
  maxWords,
  onMaxWordsChange,
  timingMode,
  onTimingModeChange,
  wpm,
  onWpmChange,
  durationMinutes,
  durationSeconds,
  onDurationChange,
  onGenerate,
  isGenerating,
  hasText,
  hasApiKey,
}: SplitterConfigProps) {
  // Local string state for smooth editing
  const [wordsStr, setWordsStr] = useState(String(maxWords));
  const [wpmStr, setWpmStr] = useState(String(wpm));
  const [durMinStr, setDurMinStr] = useState(String(durationMinutes));
  const [durSecStr, setDurSecStr] = useState(String(durationSeconds));

  // Sync from parent props
  useEffect(() => { setWordsStr(String(maxWords)); }, [maxWords]);
  useEffect(() => { setWpmStr(String(wpm)); }, [wpm]);
  useEffect(() => { setDurMinStr(String(durationMinutes)); }, [durationMinutes]);
  useEffect(() => { setDurSecStr(String(durationSeconds)); }, [durationSeconds]);

  return (
    <div className="w-64 flex-shrink-0 bg-white border-l border-gray-200 p-4 flex flex-col gap-5 overflow-y-auto">
      <h3 className="text-sm font-semibold text-gray-700">配置</h3>

      {/* Max words per line */}
      <div>
        <label className="block text-xs text-gray-500 mb-1">每行词数上限</label>
        <input
          type="text"
          inputMode="numeric"
          value={wordsStr}
          onChange={(e) => setWordsStr(e.target.value)}
          onBlur={() => onMaxWordsChange(clampInt(wordsStr, 5, 40, 15))}
          className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="text-xs text-gray-400 mt-0.5">建议 10-20 字</div>
      </div>

      {/* Timing mode */}
      <div>
        <label className="block text-xs text-gray-500 mb-2">时长设置</label>
        <div className="space-y-2">
          <label className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer ${timingMode === "wpm" ? "bg-blue-50 text-blue-700" : "text-gray-600"}`}>
            <input
              type="radio"
              name="mode"
              checked={timingMode === "wpm"}
              onChange={() => onTimingModeChange("wpm")}
              className="text-blue-600"
            />
            阅读速度
          </label>
          <label className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer ${timingMode === "duration" ? "bg-blue-50 text-blue-700" : "text-gray-600"}`}>
            <input
              type="radio"
              name="mode"
              checked={timingMode === "duration"}
              onChange={() => onTimingModeChange("duration")}
              className="text-blue-600"
            />
            字幕总时长
          </label>
        </div>
      </div>

      {/* WPM mode */}
      {timingMode === "wpm" && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">阅读速度（字/分钟）</label>
          <div className="flex gap-2 mb-2">
            <button
              onClick={() => { onWpmChange(100); setWpmStr("100"); }}
              className={`px-2 py-1 text-xs rounded border ${wpm === 100 ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
            >
              慢速 100
            </button>
            <button
              onClick={() => { onWpmChange(200); setWpmStr("200"); }}
              className={`px-2 py-1 text-xs rounded border ${wpm === 200 ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
            >
              快速 200
            </button>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              value={wpmStr}
              onChange={(e) => setWpmStr(e.target.value)}
              onBlur={() => onWpmChange(clampInt(wpmStr, 50, 500, 160))}
              className="flex-1 px-2 py-1.5 text-sm border border-gray-300 rounded outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-400">字/分钟</span>
          </div>
        </div>
      )}

      {/* Total duration mode */}
      {timingMode === "duration" && (
        <div>
          <label className="block text-xs text-gray-500 mb-1">字幕总时长</label>
          <div className="flex items-center gap-1">
            <input
              type="text"
              inputMode="numeric"
              value={durMinStr}
              onChange={(e) => setDurMinStr(e.target.value)}
              onBlur={() => onDurationChange(clampInt(durMinStr, 0, 999, 0), durationSeconds)}
              className="w-16 px-2 py-1.5 text-sm border border-gray-300 rounded outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-400">分</span>
            <input
              type="text"
              inputMode="numeric"
              value={durSecStr}
              onChange={(e) => setDurSecStr(e.target.value)}
              onBlur={() => onDurationChange(durationMinutes, clampInt(durSecStr, 0, 59, 0))}
              className="w-16 px-2 py-1.5 text-sm border border-gray-300 rounded outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-xs text-gray-400">秒</span>
          </div>
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={onGenerate}
        disabled={isGenerating || !hasText || !hasApiKey}
        className="w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed mt-auto"
      >
        {isGenerating ? "生成中..." : "生成字幕"}
      </button>

      {!hasApiKey && (
        <p className="text-xs text-red-400">请先在翻译页面设置 API Key</p>
      )}
    </div>
  );
}
