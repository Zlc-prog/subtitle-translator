import React, { useState, useRef, useEffect } from "react";

export interface ImportSource {
  key: string;
  label: string;
}

interface ImportFromAppMenuProps {
  sources: ImportSource[];
  onImport: (sourceKey: string) => void;
  disabled?: boolean;
}

export default function ImportFromAppMenu({ sources, onImport, disabled }: ImportFromAppMenuProps) {
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

  if (sources.length === 0) return null;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        disabled={disabled}
        className="px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-40 transition-colors flex items-center gap-1"
      >
        从软件获取
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
          {sources.map((s) => (
            <button
              key={s.key}
              onClick={() => {
                setOpen(false);
                onImport(s.key);
              }}
              className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-800 transition-colors"
            >
              {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
