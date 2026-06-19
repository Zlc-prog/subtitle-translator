import { Platform, PostLanguage, PostType, PostGenerationConfig } from "../types/socialPost";
import { pinyin } from "pinyin-pro";
import { normalizeQuotes } from "../utils/textNormalizer";

function normalizePost(text: string): string {
  return text
    // Capitalize after punctuation OR at start of any line
    .replace(/(^|[.?!]\s+)([a-z])/gm, (_, prefix, letter) => prefix + letter.toUpperCase());
}

const API_BASE = "https://api.deepseek.com/v1/chat/completions";

// ─────────────────────────────────────────────────────
// Name conversion (Chinese → Pinyin)
// ─────────────────────────────────────────────────────

// Common Chinese compound surnames (复姓)
const COMPOUND_SURNAMES = new Set([
  "欧阳", "司马", "上官", "诸葛", "东方", "独孤", "南宫", "夏侯",
  "尉迟", "公孙", "慕容", "司徒", "司空", "端木", "皇甫", "令狐",
  "宇文", "长孙", "慕容", "鲜于", "闾丘", "澹台", "宗政", "濮阳",
  "淳于", "单于", "太叔", "申屠", "闻人", "仲孙", "轩辕", "巫马",
  "公西", "颛孙", "壤驷", "公良", "漆雕", "乐正", "宰父", "谷梁",
  "拓跋", "夹谷", "段干", "百里", "呼延", "东郭", "南门", "羊舌",
  "微生", "梁丘", "左丘", "东门", "西门",
]);

function toEnglishName(name: string): string {
  const trimmed = name.trim();
  // If already Latin, return as-is
  if (/^[a-zA-Z\s.\-]+$/.test(trimmed)) return trimmed;

  // Detect compound surname vs single-character surname
  let surname: string;
  let given: string;
  if (trimmed.length >= 2 && COMPOUND_SURNAMES.has(trimmed.slice(0, 2))) {
    surname = trimmed.slice(0, 2);
    given = trimmed.slice(2);
  } else {
    surname = trimmed.charAt(0);
    given = trimmed.slice(1);
  }

  // Convert surname: characters joined, first letter uppercase
  const surnamePinyin = pinyin(surname, { toneType: "none", type: "array", v: true }) as string[];
  const surnameStr = surnamePinyin.join("").toLowerCase();
  const surnameFinal = surnameStr.charAt(0).toUpperCase() + surnameStr.slice(1);

  // Convert given name: characters joined without spaces, first letter uppercase
  const givenPinyin = pinyin(given, { toneType: "none", type: "array", v: true }) as string[];
  const givenStr = givenPinyin.join("").toLowerCase();
  const givenFinal = givenStr ? givenStr.charAt(0).toUpperCase() + givenStr.slice(1) : "";

  return givenFinal ? `${surnameFinal} ${givenFinal}` : surnameFinal;
}
const MODEL = "deepseek-chat";
const TEMPERATURE = 0.5;
const MAX_TOKENS = 2048;

// ─────────────────────────────────────────────────────
// Post type instructions
// ─────────────────────────────────────────────────────

const POST_TYPE_INSTRUCTIONS: Record<PostType, string> = {
  default: `【Post Type: News Brief】
- Style: Professional, measured, and authoritative — the voice of a newsroom on social media. Present facts clearly without sensationalism or forced excitement.
- Structure: Lead with the most newsworthy element. Develop with essential context in 1–2 substantive paragraphs. Do NOT fragment into many short, choppy lines — this is a news digest, not a chat thread.
- Tone: Calm and credible. Avoid casual chatter, slang, rhetorical questions, and exclamations. Let the news speak for itself.
- Length: Match the scope of the source material. A brief news clip warrants a concise post (30–50 words); richer material may justify up to 100 words. Do not pad to reach a word count — let the content dictate the length.
- Hashtags: 1–3 relevant hashtags at the end.
- Emojis: Allowed when the source material's event type, setting, or expressive style naturally calls for them (e.g., ⚽️ for sports, 🎬 for film, 🌍 for geography, 🍰 for food). Use up to 2 emojis where they add meaningful visual context. Do not force emojis on purely serious or somber content — let the material guide the choice.
- Engagement: Do NOT add CTAs, engagement prompts, or interaction invitations. The post should inform, not solicit.`,

  short: `【Post Type: Short Message】
- Style: Direct, clear, and brisk with high information density. Exclamations are allowed here (overriding the baseline restraint) to add energy, but use them in moderation.
- Structure: First sentence delivers the most important fact (who/what/when). Second sentence adds key details. End with hashtags or the closing fact.
- Length: No more than 60 words.
- Emojis: Optional, max 2, must be strongly relevant to the content (e.g., ⚽️, 🏀, 🎬, 🍰).
- Hashtags: 1–2 relevant hashtags placed at the end.
- Engagement: Do NOT add any CTA (call to action), engagement prompt, or interaction invitation. Short messages are purely informational — deliver the facts and stop. No "read more", no "share your thoughts", no "drop a like", no questions. End naturally with hashtags or the last fact.`,

  in_depth: `【Post Type: In-Depth Report】
- Style: Calm, substantive, with a hint of suspense but not overly dramatic. Use precise, powerful wording (e.g., "revealed", "alleged", "investigates").
- Structure: First sentence names the key figure or event's core action/controversy. Middle summarizes investigative findings, evidence, or unique angle. End with a prompt to read the full story ("Read the full story at link in bio." or mention the publication name).
- Length: 80–120 words.
- Emojis: None, or max 1 neutral emoji (e.g., 📰, 🎥). Avoid making it feel entertainment-oriented.
- Hashtags: Optional, max 2, placed at the end (e.g., #LongRead, #Investigation).
- Proper nouns: Pay special attention to preserving the original format.
- Forbidden: Do not write subjective recommendations like "This is a must-read." Let the facts speak for themselves.`,

  interactive: `【Post Type: Interactive Post】
You are writing a high-engagement social media post. This post type intentionally overrides the baseline newsroom tone — it is meant to be lighter and more conversational.

Strictly follow these requirements:
- Style: Light, enthusiastic, and fun. Use conversational phrases ("oh", "who's ready?"), rhetorical questions, and exclamations.
- Structure: First sentence throws out an intriguing phenomenon, fun fact, or direct exclamation. Middle explains or gives examples. End invites users to comment, share their own experience, vote, or join an activity.
- Emojis: Encourage 2–3 emojis to boost emotion and visual appeal.
- Length: 40–80 words.
- Hashtags: 1–2 core hashtags, may pair with campaign hashtags (e.g., #Olympics, #FanArt).
- Engagement: Must include a clear user action invitation (e.g., "Share yours in the comments ⬇️", "Tag a friend who needs to see this.", "Are you ready?").
- Proper nouns: Keep consistent with the source material.`,
};

// ─────────────────────────────────────────────────────
// Shared English title formatting rules
// ─────────────────────────────────────────────────────

const ENGLISH_TITLE_RULES = `【Formatting Rules】
1. Never use dashes (em dash — or en dash –). Use spaces or commas to connect ideas.
2. Use Western punctuation only (periods, commas, question marks, exclamation marks). Never use Chinese full-width punctuation.
3. Capitalization: Use sentence case.
   - Capitalize the first letter of the first word.
   - Proper nouns (place names, city names, organization names, department names, brand names, personal names, etc.) MUST retain their original capitalization from the source material. This rule overrides sentence case — never lowercasify a proper noun. Examples: "iPhone" stays "iPhone", "New York" stays "New York", "NASA" stays "NASA".
   - All other common words (including articles, conjunctions, prepositions) must be lowercase.
   - Never use ALL CAPS format.
4. Proper nouns must match the source material exactly. Do not modify or make up names. Examples:
   - If the source says "New York City", do not change it to "NYC" or "Big Apple".
   - If the source says "OpenAI", do not change it to "Open AI".
   - If the source says "U.S. Department of State", do not change it to "US Department of State".
5. The title must accurately reflect the video's core content and theme.`;

const ENGLISH_TITLE_ENDING = `Never end the title with a period (full stop). If the title naturally forms a complete declarative sentence, remove the trailing period — titles are headlines, not sentences. Exclamation marks and question marks are allowed.\n\nOutput ONLY the title text. Do not add explanations, quotes, or extra markers.`;

// ─────────────────────────────────────────────────────
// Platform title prompts
// ─────────────────────────────────────────────────────

const TITLE_PROMPTS: Record<Platform, Record<PostLanguage, string>> = {
  wechat: {
    chinese: `你是一个视频标题创作专家。根据以下视频字幕内容，为视频创作一个中文标题。

【核心要求】
1. 标题必须精准反映视频核心内容和主题
2. 使用中文，15-25字之间
3. 简洁有力，能激发观众好奇心
4. 可用设问、对比、数字、热点等技巧

只输出标题文字，不要任何解释或其他内容。`,
    english: `You are a news media editor. Based on the provided material, create an English title for a client-side video platform.

${ENGLISH_TITLE_RULES}
6. Keep the title concise and engaging, recommended no more than 12 words.

${ENGLISH_TITLE_ENDING}`,
  },
  instagram: {
    chinese: `你是一个视频标题创作专家。根据以下视频字幕内容，为Instagram视频创作一个中文标题。

【核心要求】
1. 标题必须精准反映视频核心内容和主题
2. 使用中文，10-20字之间
3. 简洁有力，适合Instagram的视觉化风格

只输出标题文字，不要任何解释或其他内容。`,
    english: `You are a news media editor. Based on the provided material, create an English title for an Instagram video.

${ENGLISH_TITLE_RULES}
6. Keep the title concise, punchy, and scroll-stopping. Recommended no more than 12 words.

${ENGLISH_TITLE_ENDING}`,
  },
  facebook: {
    chinese: `你是一个视频标题创作专家。根据以下视频字幕内容，为Facebook视频创作一个中文标题。

【核心要求】
1. 标题必须精准反映视频核心内容和主题
2. 使用中文，15-25字之间
3. 适合社区分享和讨论的氛围

只输出标题文字，不要任何解释或其他内容。`,
    english: `You are a news media editor. Based on the provided material, create an English title for a Facebook video.

${ENGLISH_TITLE_RULES}
6. Keep the title conversational yet intriguing. Recommended no more than 12 words.

${ENGLISH_TITLE_ENDING}`,
  },
  twitter: {
    chinese: `你是一个视频标题创作专家。根据以下视频字幕内容，为Twitter/X视频创作一个中文标题。

【核心要求】
1. 标题必须精准反映视频核心内容
2. 使用中文，8-15字之间
3. 极简有力，适合快节奏浏览

只输出标题文字，不要任何解释或其他内容。`,
    english: `You are a news media editor. Based on the provided material, create an English title for a Twitter/X video.

${ENGLISH_TITLE_RULES}
6. Keep the title ultra-concise and impactful. Recommended no more than 12 words.

${ENGLISH_TITLE_ENDING}`,
  },
};

// ─────────────────────────────────────────────────────
// Platform post prompts
// ─────────────────────────────────────────────────────

const COMMON_ENGLISH_POST_RULES = `You are a news media social media editor. Based on the provided video transcript, create an English social media post suitable for a news organization's official account.

【Tone & Style】
- Professional, measured, and substantive. This is a newsroom post, not personal social media.
- Write with journalistic authority and restraint. Avoid casual chatter, slang, and overly conversational phrasing.
- Do NOT use rhetorical questions or exclamations to manufacture excitement. Let the facts engage the reader.
- Prefer clear declarative sentences. If a question is used, it must serve a genuine journalistic purpose.

【Punctuation】
- Use Western punctuation only: periods (.), commas (,), exclamation marks (!), question marks (?).
- Use exclamation marks sparingly — only when genuinely warranted by the news content itself.
- Avoid dashes (— or –).

【Capitalization — CRITICAL】
- Use standard sentence case: capitalize the first letter of each sentence.
- Proper nouns (place names, personal names, organization names, brand names, event names, etc.) MUST retain their original capitalization from the source material. Never lowercasify a proper noun.
  Examples: "iPhone" stays "iPhone", "New York" stays "New York", "NASA" stays "NASA", "Taylor Swift" stays "Taylor Swift".
- All other common words must be lowercase unless they start a sentence.
- Never use ALL CAPS format.
- Hashtags: Use lowercase for common words. For proper nouns inside hashtags, preserve capitalization using camelCase (e.g., #NewYorkCity, #StanfordUniversity). Never lowercasify a proper noun inside a hashtag.

【Proper Nouns】
- Match the source material exactly. Do not modify, abbreviate, or invent names.

【Structure】
- Write 1–2 well-developed paragraphs. Do NOT fragment the post into many short, choppy lines.
- Each paragraph should be substantive and flow naturally. Avoid the "one sentence per line" casual social media style — this is a news brief, not a chat message.

【Length】
- Match the scope of the source material. Do not pad to reach a word count — let the content dictate the length. Brief news clips may yield shorter posts; richer material may go up to 120 words.

【Hashtags & Emojis】
- Emojis: Use sparingly, max 1–2 per post, only if genuinely relevant to the news content.
- Hashtags: 1–3 relevant hashtags placed at the end of the post.

【Output Format】
- Output ONLY the post body. No title, explanations, quotes, or extra markers.
- Separate paragraphs with a single blank line.`;

const POST_PROMPTS: Record<Platform, Record<PostLanguage, string>> = {
  wechat: {
    chinese: `你是一个新闻媒体编辑。根据以下视频字幕内容，创作一篇客户端帖子。

【核心要求】
1. 使用中文，300-500字
2. 结构清晰，段落分明，避免过于碎片化的短句分行
3. 结尾自然收束，点到为止
4. 可适当使用与内容相关的emoji，最多2个

只输出帖子正文，不需要额外说明。`,
    english: `${COMMON_ENGLISH_POST_RULES}\n\nTarget platform: client-side video platform.`,
  },
  instagram: {
    chinese: `你是一个新闻媒体编辑。根据以下视频字幕内容，创作一条Instagram帖子。

【核心要求】
1. 使用中文，150-300字
2. 结尾包含3-5个相关的中文话题标签（#标签）
3. 适当分段，便于阅读，但避免过于碎片化
4. 可适当使用emoji，最多2个

只输出帖子正文和话题标签，不需要额外说明。`,
    english: `${COMMON_ENGLISH_POST_RULES}\n\nTarget platform: Instagram.`,
  },
  facebook: {
    chinese: `你是一个新闻媒体编辑。根据以下视频字幕内容，创作一条Facebook帖子。

【核心要求】
1. 使用中文，150-300字
2. 语气沉稳专业，适合新闻发布
3. 可适当使用emoji，最多2个

只输出帖子正文，不需要额外说明。`,
    english: `${COMMON_ENGLISH_POST_RULES}\n\nTarget platform: Facebook.`,
  },
  twitter: {
    chinese: `你是一个新闻媒体编辑。根据以下视频字幕内容，创作一条推文。

【严格限制】整条推文必须在280个字符以内（包括所有内容：文字、标签、空格、换行）。

【核心要求】
1. 使用中文
2. 精炼有力，一击即中
3. 最多1-2个中文话题标签

只输出推文正文，不需要额外说明。`,
    english: `You are a news media social media editor. Based on the provided video transcript, create a tweet suitable for a news organization's official account.

【CRITICAL】The ENTIRE tweet must be under 280 characters including ALL content (hashtags, emojis, spaces, line breaks).

【Tone & Style】
- Punchy, concise, and attention-grabbing, but still professional and measured — this is a newsroom tweet, not a personal account.
- Use Western punctuation only. Never use ALL CAPS.
- Avoid dashes (— or –).

【Capitalization】
- Use sentence case: capitalize the first letter of each sentence and proper nouns. All other common words lowercase.
- Proper nouns MUST retain their original capitalization from the source material (e.g., "iPhone" stays "iPhone", "New York" stays "New York"). Never lowercasify proper nouns.
- Hashtags: lowercase for common words, camelCase for proper nouns (e.g., #NewYorkCity).

【Special Elements】
- Maximum 1 emoji if genuinely relevant to the news content.
- Maximum 1–2 hashtags if needed.

Never end the tweet with a period. Exclamation marks and question marks are allowed.

Output ONLY the tweet text. No title, explanations, quotes, or extra markers.`,
  },
};

// ─────────────────────────────────────────────────────
// Prompt builders
// ─────────────────────────────────────────────────────

function buildUserMessage(translations: string[], language: PostLanguage): string {
  const joined = translations.map((t, i) => `${i + 1}. ${t}`).join("\n");

  if (language === "chinese") {
    return `以下是视频字幕内容，请根据这些内容生成所需文案：\n\n---\n${joined}\n---`;
  }

  return `The following is the transcript of the video. Use this content to generate the requested copy:\n\n---\n${joined}\n---`;
}

function buildSystemPrompt(
  platform: Platform,
  type: "title" | "post",
  language: PostLanguage,
  postType: PostType,
  customInstructions: string
): string {
  const basePrompts = type === "title" ? TITLE_PROMPTS : POST_PROMPTS;
  let prompt = basePrompts[platform][language];

  if (type === "post") {
    prompt += `\n\n${POST_TYPE_INSTRUCTIONS[postType]}`;
  }

  if (customInstructions.trim()) {
    prompt += `\n\n【User Additional Requirements】\n${customInstructions.trim()}`;
  }

  return prompt;
}

async function callApi(systemPrompt: string, userMessage: string, apiKey: string): Promise<string> {
  const response = await fetch(API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: TEMPERATURE,
      max_tokens: MAX_TOKENS,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API 请求失败 (${response.status}): ${err}`);
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!raw) throw new Error("AI 返回内容为空，请重试");
  return normalizeQuotes(raw);
}

// ─────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────

export async function generateTitle(
  translations: string[],
  config: PostGenerationConfig,
  apiKey: string,
  previousTitles?: string[]
): Promise<string[]> {
  if (translations.length === 0) throw new Error("没有可用的字幕译文");
  if (!apiKey) throw new Error("请先设置 API Key");

  let systemPrompt = buildSystemPrompt(config.platform, "title", config.language, config.postType, config.customInstructions);

  // Request 3 different options
  if (config.language === "chinese") {
    systemPrompt += "\n\n请提供3个不同风格或角度的标题选项，用[1] [2] [3]标记，每个标题独占一行。确保3个选项之间有明显的风格差异（如：一个设问式、一个陈述式、一个悬念式）。";
  } else {
    systemPrompt += "\n\nProvide 3 different title options with varying styles or angles. Mark them as [1] [2] [3], one title per line. Ensure clear stylistic differences (e.g., one question-based, one declarative, one curiosity-driven). All 3 titles must follow the same formatting rules (sentence case, no dashes, Western punctuation only).";
  }

  // Avoid duplicates on regenerate
  if (previousTitles && previousTitles.length > 0) {
    const avoidList = previousTitles.map((t) => `"${t}"`).join("、");
    if (config.language === "chinese") {
      systemPrompt += `\n\n【重要】请确保新生成的标题与以下已有标题完全不同，避免任何重复或相似表达：${avoidList}`;
    } else {
      systemPrompt += `\n\n【IMPORTANT】Ensure new titles are completely different from these existing ones: ${avoidList}. Avoid any repetition or similar phrasing.`;
    }
  }

  const userMessage = buildUserMessage(translations, config.language);
  const raw = await callApi(systemPrompt, userMessage, apiKey);

  // Parse [1] [2] [3] markers
  const titles: string[] = [];
  const lines = raw.split("\n");
  for (const line of lines) {
    const match = line.match(/^\[(\d)\]\s*(.+)/);
    if (match) {
      const idx = parseInt(match[1], 10);
      const text = match[2].trim();
      if (idx >= 1 && idx <= 3 && text) {
        titles[idx - 1] = text;
      }
    }
  }

  // Fallback: if parsing failed, try splitting by numbered lines
  if (titles.length === 0) {
    const numbered = raw.match(/^[1-3][\.\)、]\s*(.+)/gm);
    if (numbered) {
      for (const m of numbered) {
        const text = m.replace(/^[1-3][\.\)、]\s*/, "").trim();
        if (text) titles.push(text);
      }
    }
  }

  // Last fallback: return as single item
  if (titles.length === 0) {
    titles.push(raw.trim());
  }

  // Strip trailing periods (safety net — titles are headlines, not sentences)
  const cleaned = titles.slice(0, 3).map((t) => t.replace(/\.$/, "").trim());

  return cleaned;
}

export async function generatePost(
  translations: string[],
  config: PostGenerationConfig,
  apiKey: string
): Promise<string> {
  if (translations.length === 0) throw new Error("没有可用的字幕译文");
  if (!apiKey) throw new Error("请先设置 API Key");

  let systemPrompt = buildSystemPrompt(config.platform, "post", config.language, config.postType, config.customInstructions);

  // Photographer credit for Instagram English posts
  const hasCredit = config.platform === "instagram" && config.language === "english" && config.photographers.length > 0;
  const creditNames = hasCredit ? config.photographers.map(toEnglishName).join(", ") : "";
  if (hasCredit) {
    systemPrompt += `\n\n【Photographer Credit】The photographer(s) for this video: ${creditNames}. After writing the caption, include a credit line in this exact format above the hashtags (no blank line between credit and hashtags):\n📷 ${creditNames}`;
  }

  const userMessage = buildUserMessage(translations, config.language);
  const raw = await callApi(systemPrompt, userMessage, apiKey);
  const result = normalizePost(raw);

  // Post-process: ensure credit line is placed correctly before hashtags
  if (hasCredit) {
    const names = creditNames;
    const creditLine = `📷 ${names}`;

    // If credit line already exists (correctly or incorrectly placed), skip insertion
    if (!result.includes(creditLine)) {
      // Find hashtag lines and insert credit before them
      const hashtagIdx = result.search(/#\w/);
      if (hashtagIdx !== -1) {
        // Find start of hashtag line
        const lineStart = result.lastIndexOf("\n", hashtagIdx);
        const before = lineStart !== -1 ? result.slice(0, lineStart) : "";
        const after = lineStart !== -1 ? result.slice(lineStart) : result;
        return `${before}\n\n${creditLine}${after}`;
      }
      // No hashtags found, append credit at end
      return `${result}\n\n${creditLine}`;
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────
// Translation verification for social posts & titles
// ─────────────────────────────────────────────────────

export interface SocialVerificationResult {
  naturalness: string;
  grammar: string;
  backTranslation: string;
  extra: string;
  suggestion: string;
}

async function callVerifyApi(systemPrompt: string, userMessage: string, apiKey: string): Promise<string> {
  const response = await fetch(API_BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 0.1,
      max_tokens: 1536,
    }),
  });

  if (!response.ok) {
    throw new Error(`核校请求失败 (${response.status})`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

function parseVerifyResult(raw: string): SocialVerificationResult {
  // Split by [Section Header]\n boundaries and build a map
  const sections: Record<string, string> = {};
  const headerRe = /^\[([^\]]+)\]\s*$/gm;
  let lastIdx = 0;
  let lastKey = "";

  let m;
  while ((m = headerRe.exec(raw)) !== null) {
    if (lastKey) {
      sections[lastKey] = raw.slice(lastIdx, m.index).trim();
    }
    lastKey = m[1];
    lastIdx = m.index + m[0].length;
  }
  if (lastKey) {
    sections[lastKey] = raw.slice(lastIdx).trim();
  }

  // Collect extra sections (not in known keys)
  const knownKeys = ["是否地道", "是否有语病", "回译", "优化建议"];
  const extraParts: string[] = [];
  for (const key of Object.keys(sections)) {
    if (!knownKeys.includes(key)) {
      extraParts.push(`【${key}】\n${sections[key]}`);
    }
  }

  return {
    naturalness: sections["是否地道"] || "",
    grammar: sections["是否有语病"] || "",
    backTranslation: sections["回译"] || "",
    extra: extraParts.join("\n"),
    suggestion: sections["优化建议"] || "",
  };
}

const TITLE_VERIFY_PROMPT = `你是一个英文社交媒体标题审校员。请核校以下英文视频标题的质量。

评估维度：
1. 是否地道：英文表达是否自然、符合英语母语习惯？有无翻译腔？
2. 是否有语病：语法、拼写、标点是否正确？
3. 吸引力：标题是否足够吸引点击？是否平淡无力？
4. 准确性：标题是否准确反映视频内容？有无夸大或误导？
5. 简洁度：是否简洁有力？有无冗余词汇？（建议不超过12词）
6. 格式合规：是否符合 sentence case？是否误用破折号、句号、全大写？

输出格式（严格遵守）：
[是否地道]
- （如无问题则写"无"）
[是否有语病]
- （如无问题则写"无"）
[回译]
（将英文标题独立回译成中文，仅作参考）
[吸引力]
（一句话评估）
[准确性]
（一句话评估）
[简洁度]
（一句话评估）
[格式合规]
（一句话评估）
[优化建议]
（如有问题，给出更地道的英文标题；如无问题则写"无需优化"）

只输出以上部分，不要额外说明。`;

const POST_VERIFY_PROMPT = `你是一个英文新闻社交媒体贴文审校员。请核校以下英文贴文的质量。

评估维度：
1. 是否地道：英文表达是否自然、符合英语母语习惯？有无翻译腔？
2. 是否有语病：语法、拼写、标点是否正确？
3. 新闻语调：是否沉稳专业？有无过于轻浮、口语化的表达？
4. 结构逻辑：段落是否充实不碎片化？信息流是否清晰合理？
5. 可读性：句子长度是否合理？信息密度是否合适？
6. 合规性：是否有不当的CTA、主观断言或煽动性语言？

输出格式（严格遵守）：
[是否地道]
- （如无问题则写"无"）
[是否有语病]
- （如无问题则写"无"）
[回译]
（将英文贴文独立回译成中文，仅作参考）
[新闻语调]
（一句话评估）
[结构逻辑]
（一句话评估）
[可读性]
（一句话评估）
[合规性]
（一句话评估）
[优化建议]
（如有问题，给出更地道的英文表达；如无问题则写"无需优化"）

只输出以上部分，不要额外说明。`;

export async function verifyTitle(
  englishTitle: string,
  apiKey: string
): Promise<SocialVerificationResult> {
  const raw = await callVerifyApi(
    TITLE_VERIFY_PROMPT,
    `请核校以下英文标题：\n\n${englishTitle}`,
    apiKey
  );
  return parseVerifyResult(raw);
}

export async function verifyPost(
  englishPost: string,
  apiKey: string
): Promise<SocialVerificationResult> {
  const raw = await callVerifyApi(
    POST_VERIFY_PROMPT,
    `请核校以下英文贴文：\n\n${englishPost}`,
    apiKey
  );
  return parseVerifyResult(raw);
}
