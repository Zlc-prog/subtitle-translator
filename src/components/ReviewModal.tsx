import React, { useState, useEffect } from "react";
import { useSubtitleStore } from "../stores/subtitleStore";
import { ProperNoun } from "../types/subtitle";
import { saveRules } from "../services/configService";

const TAG_PATTERN = /\[[^\]]*请人工核校[^\]]*\]/;
const TAG_PATTERN_G = /\[[^\]]*请人工核校[^\]]*\]/g;

// ── Parse English term from before an annotation tag ─────────────────

interface AnnotationEdit {
  english: string;
  chinese: string;
  category: string;
  replacement: string;
}

// Words that mark the boundary between a sentence and the proper noun
// (verbs, prepositions, pronouns — NOT articles/adjectives which may be part of names)
const STOP_WORDS = new Set([
  // be-verbs & auxiliaries
  "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did",
  "will", "would", "can", "could", "may", "might", "must", "shall", "should",
  // speech / reporting verbs
  "said", "says", "told", "tells", "asked", "asks", "replied", "responded",
  "announced", "announces", "reported", "reports",
  // action verbs
  "visited", "saw", "see", "seen", "went", "go", "goes", "gone",
  "came", "come", "comes", "made", "make", "makes",
  "found", "find", "finds", "took", "take", "takes",
  "gave", "give", "gives", "showed", "shows", "show",
  "revealed", "reveals", "began", "begin", "begins",
  "started", "starts", "led", "lead", "leads",
  "became", "become", "becomes", "got", "get", "gets",
  "put", "puts", "set", "sets", "let", "lets",
  "used", "use", "uses", "helped", "help", "helps",
  "worked", "work", "works", "played", "play", "plays",
  "lived", "live", "lives", "died", "die", "dies",
  "met", "meet", "meets", "held", "hold", "holds",
  "built", "build", "builds", "brought", "bring", "brings",
  // prepositions
  "in", "on", "at", "to", "for", "from", "with", "by",
  "about", "into", "onto", "upon", "within", "without",
  "through", "during", "before", "after", "above", "below",
  "between", "among", "of", "over", "under", "against",
  "along", "around", "toward", "towards", "behind", "beyond",
  // pronouns / subjects
  "i", "we", "you", "he", "she", "it", "they",
  "this", "that", "these", "those",
  "me", "him", "her", "us", "them",
  // conjunctions
  "and", "or", "but", "yet", "so", "nor",
  // sentence adverbs
  "not", "also", "just", "only", "now", "then", "still", "already",
  "however", "therefore", "instead", "meanwhile", "furthermore",
  // other function words
  "if", "when", "while", "because", "since", "although", "though",
  "unless", "until", "than", "as", "like", "whether",
  "there", "here", "where", "who", "whom", "whose", "which", "what", "how",
]);

function parseAnnotations(translation: string): AnnotationEdit[] {
  const result: AnnotationEdit[] = [];
  const tagRe = /\[([^：]+)：([^，]+)，请人工核校\]/g;
  let match;

  while ((match = tagRe.exec(translation)) !== null) {
    const category = match[1];
    const chinese = match[2];
    const tagStart = match.index;

    // Get text before this annotation
    const before = translation.slice(0, tagStart);

    // Walk backwards word-by-word, stop at a sentence-boundary word
    const words = before.trim().split(/\s+/);
    const termWords: string[] = [];
    for (let i = words.length - 1; i >= 0; i--) {
      const raw = words[i];
      const clean = raw.replace(/[.,;:!?，。；：！？"'」』】\)]$/, "").toLowerCase();
      if (STOP_WORDS.has(clean)) break;
      termWords.unshift(raw);
    }

    const english = termWords.join(" ").trim();
    if (english) {
      result.push({ english, chinese, category, replacement: english });
    }
  }

  return result;
}

// ── Apply replacements ──────────────────────────────────────────────

function applyReplacements(translation: string, edits: AnnotationEdit[]): string {
  let result = translation;
  for (const edit of edits) {
    const pattern = `${edit.english} [${edit.category}：${edit.chinese}，请人工核校]`;
    result = result.replace(pattern, edit.replacement);
  }
  return result;
}

// ── Component ────────────────────────────────────────────────────────

export default function ReviewModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const subtitles = useSubtitleStore((s) => s.subtitles);
  const sentenceGroups = useSubtitleStore((s) => s.sentenceGroups);
  const setTranslation = useSubtitleStore((s) => s.setTranslation);
  const translationRules = useSubtitleStore((s) => s.translationRules);
  const setTranslationRules = useSubtitleStore((s) => s.setTranslationRules);

  const reviewItems = subtitles
    .map((s, i) => (s.translation && TAG_PATTERN.test(s.translation) ? i : -1))
    .filter((i) => i >= 0);

  const [current, setCurrent] = useState(0);
  const [editing, setEditing] = useState(false);
  const [edits, setEdits] = useState<AnnotationEdit[]>([]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setCurrent(0);
      setEditing(false);
      setEdits([]);
    }
  }, [isOpen]);

  // Auto-close when empty, fix out-of-bounds
  useEffect(() => {
    if (!isOpen) return;
    if (reviewItems.length === 0) {
      onClose();
      return;
    }
    if (current >= reviewItems.length) {
      setCurrent(reviewItems.length - 1);
    }
  }, [reviewItems.length, current, isOpen, onClose]);

  // Re-parse edits when navigating to a different item while editing
  useEffect(() => {
    if (!editing) return;
    const idx = reviewItems[Math.min(current, reviewItems.length - 1)];
    const sub = subtitles[idx];
    if (!sub?.translation) return;
    const parsed = parseAnnotations(sub.translation);
    setEdits(parsed.length > 0 ? parsed : []);
  }, [current, editing]);

  if (!isOpen || reviewItems.length === 0) return null;

  const safeCurrent = Math.min(current, reviewItems.length - 1);
  const idx = reviewItems[safeCurrent];
  const sub = subtitles[idx];
  if (!sub) return null;
  const translation = sub.translation ?? "";

  const group = sentenceGroups.find((g) => g.includes(idx));
  const groupIndices = group ?? [idx];
  const groupFullText = groupIndices.map((i) => subtitles[i]?.text ?? "").join("");

  // Sync proper noun edits to other occurrences and dictionary
  const syncProperNouns = (editsToSync: AnnotationEdit[]) => {
    if (editsToSync.length === 0) return;

    const newNouns: ProperNoun[] = editsToSync
      .filter((e) => e.replacement !== e.english)
      .map((e) => ({ chinese: e.chinese, english: e.replacement }));

    if (newNouns.length > 0) {
      const existingChinese = new Set(translationRules.properNouns.map((n) => n.chinese));
      const merged = [
        ...translationRules.properNouns,
        ...newNouns.filter((n) => !existingChinese.has(n.chinese)),
      ];
      const updatedRules = { ...translationRules, properNouns: merged };
      setTranslationRules(updatedRules);
      saveRules(updatedRules);
    }

    const allSubtitles = useSubtitleStore.getState().subtitles;
    for (const edit of editsToSync) {
      const searchPattern = `${edit.english} [${edit.category}：${edit.chinese}，请人工核校]`;
      for (let i = 0; i < allSubtitles.length; i++) {
        if (i === idx) continue;
        const t = allSubtitles[i].translation;
        if (t && t.includes(searchPattern)) {
          setTranslation(i, t.replace(searchPattern, edit.replacement));
        }
      }
    }
  };

  const handleAccept = () => {
    const currentEdits = parseAnnotations(translation);
    const cleaned = applyReplacements(translation, currentEdits);
    setTranslation(idx, cleaned);
    syncProperNouns(currentEdits);
    advanceOrClose();
  };

  const startEdit = () => {
    const parsed = parseAnnotations(translation);
    setEdits(parsed.length > 0 ? parsed : []);
    setEditing(true);
  };

  const confirmEdit = () => {
    const cleaned = applyReplacements(translation, edits);
    setTranslation(idx, cleaned);
    syncProperNouns(edits);
    setEditing(false);
    advanceOrClose();
  };

  const cancelEdit = () => {
    setEditing(false);
    setEdits([]);
  };

  const navigateTo = (next: number) => {
    setEditing(false);
    setEdits([]);
    setCurrent(next);
  };

  const advanceOrClose = () => {
    if (current >= reviewItems.length - 1) {
      onClose();
    } else {
      navigateTo(current + 1);
    }
  };

  const handleSkip = () => {
    advanceOrClose();
  };

  const renderHighlighted = (text: string) => {
    const parts = text.split(/(\[[^\]]*请人工核校[^\]]*\])/g);
    return (
      <span>
        {parts.map((part, i) =>
          /\[[^\]]*请人工核校[^\]]*\]/.test(part) ? (
            <mark key={i} className="bg-orange-200 text-orange-800 rounded px-0.5">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-[620px] max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">审核专有名词翻译</h2>
          <span className="text-sm text-gray-400">
            第 {safeCurrent + 1}/{reviewItems.length} 条
          </span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">
              原文 {groupIndices.length > 1 && `（第 ${groupIndices[0] + 1}-${groupIndices[groupIndices.length - 1] + 1} 行）`}
            </div>
            <div className="text-sm text-gray-800 bg-gray-50 rounded-lg px-3 py-2 whitespace-pre-wrap leading-relaxed">
              {groupFullText}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-400 mb-1 uppercase tracking-wide">译文</div>
            <div className="text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-2 whitespace-pre-wrap leading-relaxed">
              {renderHighlighted(translation)}
            </div>
          </div>

          {editing && (
            <div className="border border-orange-300 rounded-lg p-4 bg-orange-50">
              <div className="text-xs font-medium text-orange-700 mb-3">
                {edits.length > 0
                  ? "修改专有名词翻译（填入正确的英文词即可）"
                  : "编辑译文"}
              </div>

              {edits.length > 0 ? (
                <div className="space-y-3">
                  {edits.map((edit, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 bg-white rounded px-2 py-1 border border-gray-200 min-w-[60px] text-center">
                        {edit.chinese}
                      </span>
                      <span className="text-xs text-gray-400">{edit.category}</span>
                      <span className="text-gray-300">→</span>
                      <input
                        value={edit.replacement}
                        onChange={(e) => {
                          const next = [...edits];
                          next[i] = { ...next[i], replacement: e.target.value };
                          setEdits(next);
                        }}
                        className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent bg-white"
                        autoFocus={i === 0}
                      />
                    </div>
                  ))}

                  <div className="mt-3 pt-3 border-t border-orange-200">
                    <div className="text-xs text-gray-400 mb-1">替换后预览</div>
                    <div className="text-sm text-gray-800 bg-white rounded-lg px-3 py-2 leading-relaxed">
                      {applyReplacements(translation, edits)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-gray-500">
                  未检测到标注格式，请直接编辑译文。
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={() => navigateTo(Math.max(0, current - 1))}
            disabled={current === 0}
            className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-30"
          >
            ← 上一条
          </button>

          <div className="flex gap-2">
            <button onClick={handleSkip} className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">
              跳过
            </button>
            {editing ? (
              <>
                <button onClick={cancelEdit} className="px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">
                  取消
                </button>
                <button onClick={confirmEdit} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
                  确认替换
                </button>
              </>
            ) : (
              <>
                <button onClick={handleAccept} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  接受
                </button>
                <button onClick={startEdit} className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600">
                  修改
                </button>
              </>
            )}
          </div>

          <button
            onClick={() => navigateTo(Math.min(reviewItems.length - 1, current + 1))}
            disabled={current >= reviewItems.length - 1}
            className="px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 rounded-lg disabled:opacity-30"
          >
            下一条 →
          </button>
        </div>
      </div>
    </div>
  );
}

export function countReviewItems(subtitles: { translation?: string }[]): number {
  return subtitles.filter((s) => s.translation && TAG_PATTERN.test(s.translation)).length;
}
