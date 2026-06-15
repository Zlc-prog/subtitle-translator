import React from "react";

interface ClearConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClearOnly: () => void;
  onSaveAndClear: () => void;
  hasSubtitles: boolean;
}

export default function ClearConfirmModal({
  isOpen,
  onClose,
  onClearOnly,
  onSaveAndClear,
  hasSubtitles,
}: ClearConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-[400px]">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-800">清除字幕</h2>
          <p className="text-sm text-gray-500 mt-1">当前字幕数据将被清除，请选择操作方式。</p>
        </div>

        <div className="px-5 py-4 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            取消
          </button>
          {hasSubtitles && (
            <button
              onClick={onSaveAndClear}
              className="px-4 py-2 text-sm bg-slate-600 text-white rounded-lg hover:bg-slate-700"
            >
              保存 SRT 后清除
            </button>
          )}
          <button
            onClick={onClearOnly}
            className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            直接清除
          </button>
        </div>
      </div>
    </div>
  );
}
