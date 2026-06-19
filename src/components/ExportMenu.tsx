import React, { useState, useRef, useEffect } from "react";

interface ExportMenuProps {
  onExportSrt: () => void;
  onExportTxt: () => void;
  disabled?: boolean;
}

export default function ExportMenu({ onExportSrt, onExportTxt, disabled }: ExportMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
      >
        导出
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
          <button
            onClick={() => { setOpen(false); onExportSrt(); }}
            className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-slate-50 transition-colors"
          >
            导出 SRT
          </button>
          <button
            onClick={() => { setOpen(false); onExportTxt(); }}
            className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-slate-50 transition-colors"
          >
            导出 TXT
          </button>
        </div>
      )}
    </div>
  );
}
