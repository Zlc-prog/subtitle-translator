import React, { useState, useEffect } from "react";
import { useSubtitleStore } from "../stores/subtitleStore";

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

export default function StatusBar() {
  const fileName = useSubtitleStore((s) => s.fileName);
  const subtitles = useSubtitleStore((s) => s.subtitles);
  const apiKey = useSubtitleStore((s) => s.apiKey);
  const autoSaveTime = useSubtitleStore((s) => s.autoSaveTime);

  // Fade indicator after 5 seconds
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (autoSaveTime > 0) {
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 5000);
      return () => clearTimeout(t);
    }
  }, [autoSaveTime]);

  return (
    <div className="flex items-center gap-4 px-4 py-1.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-400">
      {fileName ? (
        <span>
          文件: <span className="text-gray-600">{fileName}</span>
        </span>
      ) : (
        <span>未打开文件</span>
      )}

      {subtitles.length > 0 && (
        <span>
          共 <span className="text-gray-600">{subtitles.length}</span> 条字幕
        </span>
      )}

      <div className="flex-1" />

      {autoSaveTime > 0 && visible && (
        <span className="text-green-500 transition-opacity duration-300">
          已自动保存 {formatTime(autoSaveTime)}
        </span>
      )}

      <span className={apiKey ? "text-green-500" : "text-red-400"}>
        {apiKey ? "● API 已配置" : "○ API 未配置"}
      </span>
    </div>
  );
}
