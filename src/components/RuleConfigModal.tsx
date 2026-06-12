import React, { useState, useEffect } from "react";
import { useSubtitleStore } from "../stores/subtitleStore";
import { TranslationRules, ProperNoun, DEFAULT_RULES } from "../types/subtitle";
import { saveRules } from "../services/configService";

interface RuleConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RuleConfigModal({ isOpen, onClose }: RuleConfigModalProps) {
  const { translationRules, setTranslationRules } = useSubtitleStore();
  const [rules, setRules] = useState<TranslationRules>(translationRules);
  const [newNoun, setNewNoun] = useState<ProperNoun>({ chinese: "", english: "" });

  useEffect(() => {
    setRules(translationRules);
  }, [translationRules, isOpen]);

  if (!isOpen) return null;

  const addNoun = () => {
    if (!newNoun.chinese.trim() || !newNoun.english.trim()) return;
    setRules((prev) => ({
      ...prev,
      properNouns: [...prev.properNouns, { ...newNoun }],
    }));
    setNewNoun({ chinese: "", english: "" });
  };

  const removeNoun = (idx: number) => {
    setRules((prev) => ({
      ...prev,
      properNouns: prev.properNouns.filter((_, i) => i !== idx),
    }));
  };

  const handleSave = async () => {
    setTranslationRules(rules);
    await saveRules(rules);
    onClose();
  };

  const resetDefaults = () => {
    setRules({ ...DEFAULT_RULES });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-[640px] max-h-[80vh] flex flex-col">
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">翻译规则配置</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Base translation instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              默认翻译规则
              <span className="text-xs text-gray-400 font-normal ml-2">发送给 AI 的核心翻译指令</span>
            </label>
            <textarea
              value={rules.baseInstructions}
              onChange={(e) =>
                setRules((prev) => ({ ...prev, baseInstructions: e.target.value }))
              }
              rows={12}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono text-xs leading-relaxed"
            />
          </div>

          {/* Custom instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              附加翻译要求
              <span className="text-xs text-gray-400 font-normal ml-2">追加在默认规则之后</span>
            </label>
            <textarea
              value={rules.customInstructions}
              onChange={(e) =>
                setRules((prev) => ({ ...prev, customInstructions: e.target.value }))
              }
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              placeholder="例如：使用西文半角标点符号、专有名词标注等..."
            />
          </div>

          {/* Proper nouns */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              专有名词对照表
            </label>

            <div className="space-y-1 mb-3 max-h-40 overflow-y-auto">
              {rules.properNouns.length === 0 && (
                <div className="text-xs text-gray-400 py-2">尚未添加专有名词</div>
              )}
              {rules.properNouns.map((noun, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm px-2 py-1 bg-gray-50 rounded"
                >
                  <span className="text-gray-700 flex-1">{noun.chinese}</span>
                  <span className="text-gray-400">→</span>
                  <span className="text-blue-600 flex-1">{noun.english}</span>
                  <button
                    onClick={() => removeNoun(i)}
                    className="text-red-400 hover:text-red-600 text-xs px-1"
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <input
                value={newNoun.chinese}
                onChange={(e) => setNewNoun((prev) => ({ ...prev, chinese: e.target.value }))}
                placeholder="中文"
                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyDown={(e) => e.key === "Enter" && addNoun()}
              />
              <input
                value={newNoun.english}
                onChange={(e) => setNewNoun((prev) => ({ ...prev, english: e.target.value }))}
                placeholder="英文"
                className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                onKeyDown={(e) => e.key === "Enter" && addNoun()}
              />
              <button
                onClick={addNoun}
                className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"
              >
                添加
              </button>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={resetDefaults}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            恢复默认
          </button>
          <div className="flex gap-2">
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
    </div>
  );
}
