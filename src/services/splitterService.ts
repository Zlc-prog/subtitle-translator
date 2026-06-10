import { Subtitle } from "../types/subtitle";

const API_BASE = "https://api.deepseek.com/v1/chat/completions";

/**
 * Count "words" for timing: each Chinese char = 1 word, English words by space.
 */
function countWords(text: string): number {
  let count = 0;
  // Match Chinese characters and English words
  const chinese = text.match(/[一-鿿㐀-䶿]/g);
  const english = text.match(/[a-zA-Z]+/g);
  count += chinese ? chinese.length : 0;
  count += english ? english.length : 0;
  return count;
}

function secondsToSrtTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const ms = Math.round((totalSeconds - Math.floor(totalSeconds)) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

/**
 * Send text to DeepSeek for semantic subtitle splitting.
 */
export async function splitTextWithAI(
  text: string,
  maxWordsPerLine: number,
  apiKey: string
): Promise<string[]> {
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
          content: `You are a subtitle splitting expert. Split the following text into subtitle-sized lines suitable for on-screen display.

Rules:
- Each line must NOT exceed ${maxWordsPerLine} characters/words
- Split at natural semantic and sentence boundaries — never break in the middle of a phrase
- Keep each line as a coherent reading unit
- Do NOT translate the text — output in the SAME language as the input
- Preserve filler words and hesitations as-is

Output format: plain text, one subtitle per line, separated by newlines. No numbering, no explanations.`,
        },
        { role: "user", content: text },
      ],
      temperature: 0.2,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI 分割失败 (${response.status}): ${err}`);
  }

  const data = await response.json();
  const raw: string = data.choices?.[0]?.message?.content ?? "";

  // Parse lines, filter empty
  return raw
    .split("\n")
    .map((l: string) => l.trim())
    .filter((l: string) => l.length > 0);
}

/**
 * Generate subtitle array with timestamps from text lines.
 * @param mode "wpm" | "duration"
 */
export function generateTimestamps(
  lines: string[],
  mode: "wpm" | "duration",
  wpm: number,
  totalDurationSeconds?: number
): Subtitle[] {
  const wordCounts = lines.map(countWords);
  const totalWords = wordCounts.reduce((a, b) => a + b, 0);

  // Determine effective WPM
  let effectiveWpm = wpm;
  if (mode === "duration" && totalDurationSeconds && totalDurationSeconds > 0) {
    effectiveWpm = totalWords / (totalDurationSeconds / 60);
  }

  if (effectiveWpm <= 0) effectiveWpm = 100;

  let currentTime = 0;
  return lines.map((text, i) => {
    const wc = wordCounts[i] || 1;
    const duration = Math.max(0.5, (wc / effectiveWpm) * 60);
    const start = secondsToSrtTime(currentTime);
    currentTime += duration;
    const end = secondsToSrtTime(currentTime);
    return { index: i + 1, startTime: start, endTime: end, text };
  });
}
