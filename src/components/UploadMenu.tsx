import React, { useState, useRef, useEffect } from "react";
import { ImportSource } from "./ImportFromAppMenu";

interface UploadMenuProps {
  onUploadFile: () => void;
  importSources: ImportSource[];
  onImport: (sourceKey: string) => void;
}

export default function UploadMenu({ onUploadFile, importSources, onImport }: UploadMenuProps) {
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
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center gap-1"
      >
        上传 SRT
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
          <button
            onClick={() => { setOpen(false); onUploadFile(); }}
            className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-800 transition-colors"
          >
            📂 本地上传
          </button>
          {importSources.length > 0 && (
            <>
              <div className="border-t border-gray-100 my-1" />
              {importSources.map((s) => (
                <button
                  key={s.key}
                  onClick={() => { setOpen(false); onImport(s.key); }}
                  className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-blue-50 hover:text-blue-800 transition-colors"
                >
                  {s.label}
                </button>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
