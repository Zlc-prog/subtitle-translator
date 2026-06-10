import React, { useState, useEffect } from "react";
import { useSubtitleStore } from "../stores/subtitleStore";
import { saveApiKey } from "../services/configService";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ApiKeyModal({ isOpen, onClose }: ApiKeyModalProps) {
  const { apiKey, setApiKey } = useSubtitleStore();
  const [key, setKey] = useState(apiKey);

  useEffect(() => {
    setKey(apiKey);
  }, [apiKey, isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setApiKey(key.trim());
    await saveApiKey(key.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-[480px]">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">DeepSeek API Key</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-xs text-gray-400 mb-3">
            API Key 将安全存储在本地，不会上传到任何服务器。
          </p>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="sk-..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
        </div>

        <div className="px-5 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
