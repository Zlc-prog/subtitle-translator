import { Subtitle, TranslationRules } from "../types/subtitle";
import { parseSentenceGroups, isFillerLine } from "../utils/sentenceGrouper";

const API_BASE = "https://api.deepseek.com/v1/chat/completions";

function buildSystemPrompt(rules: TranslationRules): string {
  let prompt = `You are a professional subtitle colloquialization assistant. Your task is to translate Chinese sentences into natural, fluent, colloquial English suitable for subtitle reading.

【Core Rules】
1. Holistic understanding — no mechanical splitting: DO NOT translate by mechanically splitting at commas, clauses, or line breaks in the original text. You must first understand the complete logical structure of the entire sentence (including run-on sentences, topic-comment structures, omitted subjects, implicit causality, etc.), then restructure it into a coherent English colloquial expression using proper conjunctions, relative clauses, or by breaking it into multiple short sentences.

2. Word order restructuring:
   - Convert Chinese topic-comment structures (e.g., "那部电影我们昨晚看的") to English SVO order: "We watched that movie last night."
   - Place conditional and temporal clauses where they sound natural in English (before or after the main clause), using correct conjunctions (if, when, because, although).
   - Express Chinese implicit passive constructions (e.g., "房子建好了") using English active voice or natural passive forms: "The house is finished."

3. Colloquial requirements:
   - Use contractions (don't, can't, I'll, gonna, wanna — naturally, not forced), phrasal verbs (pick up, find out, run into).
   - Break long Chinese run-on sentences (3+ short clauses) into two or three concise English sentences separated by periods.
   - Preserve tone: questions, exclamations, hesitations ("well", "uh", "you know", "like").
   - Add appropriate subjects for omitted ones (it, you, we, they).

4. Proper nouns: On first occurrence, append the Chinese term in brackets with review marker, e.g., "Beijing [地名：北京，请人工核校]" or "Controlled nuclear fusion [名词：可控核聚变，请人工核校]". Use appropriate category labels (名词/人名/地名/机构名). On later occurrences, omit the annotation.

5. Punctuation: Use Western half-width punctuation (.,?!;:).

6. Output only: Output only the translated English text. No explanations, notes, or blank lines.`;

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
  apiKey: string
): Promise<string[]> {
  if (group.length === 0) return [];

  const systemPrompt = buildSystemPrompt(rules);

  // Clean standalone filler lines before sending
  const cleaned = group.map((s) =>
    isFillerLine(s.text) ? "[语气词]" : s.text
  );

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
          { role: "system", content: systemPrompt },
          { role: "user", content: cleaned[0] },
        ],
        temperature: 0.3,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) return [""];
    const data = await response.json();
    return [data.choices?.[0]?.message?.content?.trim() ?? ""];
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
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
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
        segments[idx] = match[2].trim();
      }
    }
  }

  // If parsing produced no results, use whole text for first segment
  if (segments.every((s) => !s)) {
    segments[0] = raw.trim();
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
      results[idx] = match[2].trim();
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
  return (data.choices?.[0]?.message?.content ?? "").trim();
}
