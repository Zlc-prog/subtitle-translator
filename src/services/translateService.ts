import { Subtitle, TranslationRules, DEFAULT_BASE_INSTRUCTIONS } from "../types/subtitle";
import { parseSentenceGroups, isFillerLine } from "../utils/sentenceGrouper";
import { normalizeQuotes } from "../utils/textNormalizer";

const API_BASE = "https://api.deepseek.com/v1/chat/completions";

function buildSystemPrompt(rules: TranslationRules): string {
  const base = rules.baseInstructions || DEFAULT_BASE_INSTRUCTIONS;
  let prompt = base;

  if (rules.properNouns.length > 0) {
    prompt += "\n\n【User-provided Proper Noun Dictionary】\n";
    for (const noun of rules.properNouns) {
      prompt += `  ${noun.chinese} → ${noun.english}\n`;
    }
  }

  if (rules.customInstructions.trim()) {
    prompt += `\n【Additional Instructions】\n${rules.customInstructions}\n`;
  }

  return prompt;
}

// ─────────────────────────────────────────────────────
// Step 1: AI sentence splitting
// ─────────────────────────────────────────────────────

export async function splitSentences(
  subtitles: Subtitle[],
  rules: TranslationRules,
  apiKey: string
): Promise<number[][]> {
  if (subtitles.length <= 1) return [subtitles.map((_, i) => i)];

  const lines = subtitles
    .map((s, i) => `[${i}] ${s.text}`)
    .join("\n");

  const response = await fetch(API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        {
          role: "system",
          content:
            "你是中文字幕分析专家。请分析以下字幕行，将语义上属于同一句完整话的连续行归为一组。判断标准：如果前一行语义未完（话没说完），就和下一行属于同一句。\n\n返回格式：每行一个分组，格式为 起始行-结束行（如 0-2 表示第0到第2行属于同一句话）。只返回分组信息，不要任何解释。",
        },
        { role: "user", content: lines },
      ],
      temperature: 0.1,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    // On error, fallback to one-per-line
    return subtitles.map((_, i) => [i]);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content ?? "";
  return parseSentenceGroups(raw, subtitles.length);
}

// ─────────────────────────────────────────────────────
// Step 2: Group translation with segment splitting
// ─────────────────────────────────────────────────────

export async function translateGroup(
  group: Subtitle[],
  rules: TranslationRules,
  apiKey: string,
  retranslate = false
): Promise<string[]> {
  if (group.length === 0) return [];

  const systemPrompt = buildSystemPrompt(rules);
  const retranslateHint = retranslate
    ? "\n\n【Important】This is a re-translation. Produce a DIFFERENT translation from the typical rendering — vary sentence structure, word choice, and phrasing. Avoid repeating the same expressions."
    : "";

  // Clean standalone filler lines before sending
  const cleaned = group.map((s) =>
    isFillerLine(s.text) ? "[语气词]" : s.text
  );

  const temperature = retranslate ? 0.7 : 0.3;

  if (group.length === 1) {
    // Single line: normal translate
    const response = await fetch(API_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [
          { role: "system", content: systemPrompt + retranslateHint },
          { role: "user", content: cleaned[0] },
        ],
        temperature,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) return [""];
    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
    return [normalizeQuotes(raw)];
  }

  // Multi-line group: translate together, split into N segments
  const segmentCount = group.length;
  const userLines = cleaned.map((t, i) => `[${i}] ${t}`).join("\n");

  const userPrompt = `The following ${segmentCount} consecutive subtitle lines form one complete sentence. Translate it into natural colloquial English, then split the translation into ${segmentCount} segments (marked [0] [1] ... [${segmentCount - 1}]) matching the original line breaks.\n\n${userLines}`;

  const response = await fetch(API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt + retranslateHint },
        { role: "user", content: userPrompt },
      ],
      temperature,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    return group.map(() => "");
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content ?? "";

  // Parse segments
  const segments: string[] = new Array(segmentCount).fill("");
  const segLines = raw.split("\n");
  for (const line of segLines) {
    const match = line.match(/^\[(\d+)\]\s*(.+)/);
    if (match) {
      const idx = parseInt(match[1], 10);
      if (idx >= 0 && idx < segmentCount) {
        segments[idx] = normalizeQuotes(match[2].trim());
      }
    }
  }

  // If parsing produced no results, use whole text for first segment
  if (segments.every((s) => !s)) {
    segments[0] = normalizeQuotes(raw.trim());
  }

  return segments;
}

// ─────────────────────────────────────────────────────
// Legacy: batch translate (kept for compatibility)
// ─────────────────────────────────────────────────────

export async function translateBatch(
  subtitles: Subtitle[],
  rules: TranslationRules,
  apiKey: string
): Promise<string[]> {
  if (subtitles.length === 0) return [];

  const userMessages = subtitles
    .map((s, i) => `[${i}] ${s.text}`)
    .join("\n");

  const systemPrompt = buildSystemPrompt(rules);

  const response = await fetch(API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Translate each line below. Keep the [0] [1] [2] markers aligned:\n\n${userMessages}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API 请求失败 (${response.status}): ${err}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content ?? "";

  const results: string[] = [];
  const lines = raw.split("\n");
  for (const line of lines) {
    const match = line.match(/^\[(\d+)\]\s*(.+)/);
    if (match) {
      const idx = parseInt(match[1], 10);
      results[idx] = normalizeQuotes(match[2].trim());
    }
  }

  const final: string[] = [];
  for (let i = 0; i < subtitles.length; i++) {
    final[i] = results[i] ?? "";
  }

  return final;
}

// ─────────────────────────────────────────────────────
// Single re-translate (unchanged)
// ─────────────────────────────────────────────────────

export async function translateOne(
  subtitle: Subtitle,
  contextBefore: Subtitle[],
  contextAfter: Subtitle[],
  rules: TranslationRules,
  apiKey: string
): Promise<string> {
  const systemPrompt = buildSystemPrompt(rules);

  let contextText = "";
  if (contextBefore.length > 0) {
    contextText += "Context before:\n" + contextBefore.map((s) => s.text).join("\n") + "\n\n";
  }
  contextText += `Translate:\n${subtitle.text}`;
  if (contextAfter.length > 0) {
    contextText += "\n\nContext after:\n" + contextAfter.map((s) => s.text).join("\n");
  }

  const response = await fetch(API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: contextText },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API 请求失败 (${response.status}): ${err}`);
  }

  const data = await response.json();
  return normalizeQuotes((data.choices?.[0]?.message?.content ?? "").trim());
}
