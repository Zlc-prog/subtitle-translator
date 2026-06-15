import React, { useEffect, useRef } from "react";

interface DisclaimerModalProps {
  isOpen: boolean;
  onConfirm: () => void;
}

export default function DisclaimerModal({ isOpen, onConfirm }: DisclaimerModalProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (isOpen) {
      timerRef.current = setTimeout(onConfirm, 5000);
      return () => clearTimeout(timerRef.current);
    }
  }, [isOpen, onConfirm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-[420px]">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-amber-700">AI 结果提示</h2>
        </div>

        <div className="px-5 py-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">⚠️</span>
            <div>
              <p className="text-sm text-gray-700 leading-relaxed">
                AI 生成结果仅供参考，请务必手动编辑核验内容的准确性、合规性和适用性后再对外发布。
              </p>
              <p className="text-xs text-gray-400 mt-2">
                此提示将在 5 秒后自动关闭
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-200 flex justify-end">
          <button
            onClick={onConfirm}
            className="px-4 py-1.5 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
          >
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
}
