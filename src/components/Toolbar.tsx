import React from "react";
import { useSubtitleStore } from "../stores/subtitleStore";
import { countReviewItems } from "./ReviewModal";
import UploadMenu from "./UploadMenu";
import ExportMenu from "./ExportMenu";
import { ImportSource } from "./ImportFromAppMenu";

interface ToolbarProps {
  onUpload: () => void;
  importSources: ImportSource[];
  onImport: (sourceKey: string) => void;
  onOpenRules: () => void;
  onTranslateAll: () => void;
  onExportSrt: () => void;
  onExportTxt: () => void;
  onOpenReview: () => void;
  onClear?: () => void;
}

export default function Toolbar({
  onUpload,
  importSources,
  onImport,
  onOpenRules,
  onTranslateAll,
  onExportSrt,
  onExportTxt,
  onOpenReview,
  onClear,
}: ToolbarProps) {
  const subtitles = useSubtitleStore((s) => s.subtitles);
  const translatedCount = useSubtitleStore((s) => s.translatedCount);
  const undoStack = useSubtitleStore((s) => s.undoStack);
  const undo = useSubtitleStore((s) => s.undo);

  const total = subtitles.length;
  const isResume = translatedCount > 0 && translatedCount < total;
  const reviewCount = countReviewItems(subtitles);

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
      <UploadMenu
        onUploadFile={onUpload}
        importSources={importSources}
        onImport={onImport}
      />

      <button
        onClick={onTranslateAll}
        disabled={total === 0}
        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isResume ? `继续翻译 (${total - translatedCount} 条)` : "一键翻译"}
      </button>

      <button
        onClick={onOpenRules}
        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
      >
        翻译规则
      </button>

      {reviewCount > 0 && (
        <button
          onClick={onOpenReview}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
        >
          审核 ({reviewCount})
        </button>
      )}

      <button
        onClick={undo}
        disabled={undoStack.length === 0}
        className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title={`可撤回 ${undoStack.length} 步`}
      >
        ↩ 撤回
      </button>

      {onClear && subtitles.length > 0 && (
        <button
          onClick={onClear}
          className="px-2 py-1 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
        >
          清除
        </button>
      )}

      <div className="flex-1" />

      <ExportMenu
        onExportSrt={onExportSrt}
        onExportTxt={onExportTxt}
        disabled={subtitles.length === 0}
      />
    </div>
  );
}
