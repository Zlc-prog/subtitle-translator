import { Platform, PostLanguage, PostType, PostGenerationConfig } from "../types/socialPost";

const API_BASE = "https://api.deepseek.com/v1/chat/completions";
const MODEL = "deepseek-chat";
const TEMPERATURE = 0.5;
const MAX_TOKENS = 2048;

// ─────────────────────────────────────────────────────
// Post type instructions
// ─────────────────────────────────────────────────────

const POST_TYPE_INSTRUCTIONS: Record<PostType, string> = {
  default: "Infer the most appropriate post style from the source material itself. Do not impose additional type constraints.",

  short: `【Post Type: Short Message】
- Style: Direct, clear, and brisk with high information density. Exclamations may be used to boost emotion but not excessively.
- Structure: First sentence delivers the most important fact (who/what/when). Second sentence adds key details. End with engagement prompt or hashtags.
- Length: No more than 60 words.
- Emojis: Optional, max 2, must be strongly relevant to the content (e.g., ⚽️, 🏀, 🎬, 🍰).
- Hashtags: 1–2 relevant hashtags placed at the end.
- Engagement: If needed, use short directives (e.g., "Read more via link in bio."). No open-ended questions.`,

  in_depth: `【Post Type: In-Depth Report】
- Style: Calm, substantive, with a hint of suspense but not overly dramatic. Use precise, powerful wording (e.g., "revealed", "alleged", "investigates").
- Structure: First sentence names the key figure or event's core action/controversy. Middle summarizes investigative findings, evidence, or unique angle. End with a prompt to read the full story ("Read the full story at link in bio." or mention the publication name).
- Length: 80–120 words.
- Emojis: None, or max 1 neutral emoji (e.g., 📰, 🎥). Avoid making it feel entertainment-oriented.
- Hashtags: Optional, max 2, placed at the end (e.g., #LongRead, #Investigation).
- Proper nouns: Pay special attention to preserving the original format.
- Forbidden: Do not write subjective recommendations like "This is a must-read." Let the facts speak for themselves.`,

  interactive: `【Post Type: Interactive Post】
You are writing a high-engagement social media post. Strictly follow these requirements:
- Style: Light, enthusiastic, and fun. Use conversational phrases ("oh", "who's ready?"), rhetorical questions, and exclamations.
- Structure: First sentence throws out an intriguing phenomenon, fun fact, or direct exclamation. Middle explains or gives examples. End invites users to comment, share their own experience, vote, or join an activity.
- Emojis: Encourage 2–3 emojis to boost emotion and visual appeal.
- Length: 40–80 words.
- Hashtags: 1–2 core hashtags, may pair with campaign hashtags (e.g., #Olympics, #FanArt).
- Engagement: Must include a clear user action invitation (e.g., "Share yours in the comments ⬇️", "Tag a friend who needs to see this.", "Are you ready?").
- Proper nouns: Keep consistent with the source material.`,
};

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
    english: `You are a professional social media content strategist. Based on the provided material, create an English title for a client-side video platform.

【Formatting Rules】
1. Never use dashes (em dash — or en dash –). Use spaces or commas to connect ideas.
2. Use Western punctuation only (periods, commas, question marks, exclamation marks). Never use Chinese full-width punctuation.
3. Capitalization: Use sentence case.
   - Capitalize the first letter of the first word only.
   - Capitalize proper nouns (place names, city names, organization names, department names, brand names, personal names, etc.).
   - All other words (including articles, conjunctions, prepositions) must be lowercase.
   - Never use ALL CAPS format.
4. Proper nouns must match the source material exactly. Do not modify or make up names. Examples:
   - If the source says "New York City", do not change it to "NYC" or "Big Apple".
   - If the source says "OpenAI", do not change it to "Open AI".
   - If the source says "U.S. Department of State", do not change it to "US Department of State".
5. The title must accurately reflect the video's core content and theme.
6. Keep the title concise and engaging, recommended no more than 12 words.

Do not end the title with a period (full stop). Exclamation marks and question marks are allowed.\n\nOutput ONLY the title text. Do not add explanations, quotes, or extra markers.`,
  },
  instagram: {
    chinese: `你是一个视频标题创作专家。根据以下视频字幕内容，为Instagram视频创作一个中文标题。

【核心要求】
1. 标题必须精准反映视频核心内容和主题
2. 使用中文，10-20字之间
3. 简洁有力，适合Instagram的视觉化风格

只输出标题文字，不要任何解释或其他内容。`,
    english: `You are a professional social media content strategist. Based on the provided material, create an English title for an Instagram video.

【Formatting Rules】
1. Never use dashes (em dash — or en dash –). Use spaces or commas to connect ideas.
2. Use Western punctuation only (periods, commas, question marks, exclamation marks). Never use Chinese full-width punctuation.
3. Capitalization: Use sentence case.
   - Capitalize the first letter of the first word only.
   - Capitalize proper nouns (place names, city names, organization names, department names, brand names, personal names, etc.).
   - All other words (including articles, conjunctions, prepositions) must be lowercase.
   - Never use ALL CAPS format.
4. Proper nouns must match the source material exactly. Do not modify or make up names.
5. The title must accurately reflect the video's core content and theme.
6. Keep the title concise, punchy, and scroll-stopping. Recommended no more than 12 words.

Do not end the title with a period (full stop). Exclamation marks and question marks are allowed.\n\nOutput ONLY the title text. Do not add explanations, quotes, or extra markers.`,
  },
  facebook: {
    chinese: `你是一个视频标题创作专家。根据以下视频字幕内容，为Facebook视频创作一个中文标题。

【核心要求】
1. 标题必须精准反映视频核心内容和主题
2. 使用中文，15-25字之间
3. 适合社区分享和讨论的氛围

只输出标题文字，不要任何解释或其他内容。`,
    english: `You are a professional social media content strategist. Based on the provided material, create an English title for a Facebook video.

【Formatting Rules】
1. Never use dashes (em dash — or en dash –). Use spaces or commas to connect ideas.
2. Use Western punctuation only (periods, commas, question marks, exclamation marks). Never use Chinese full-width punctuation.
3. Capitalization: Use sentence case.
   - Capitalize the first letter of the first word only.
   - Capitalize proper nouns (place names, city names, organization names, department names, brand names, personal names, etc.).
   - All other words (including articles, conjunctions, prepositions) must be lowercase.
   - Never use ALL CAPS format.
4. Proper nouns must match the source material exactly. Do not modify or make up names.
5. The title must accurately reflect the video's core content and theme.
6. Keep the title conversational yet intriguing. Recommended no more than 12 words.

Do not end the title with a period (full stop). Exclamation marks and question marks are allowed.\n\nOutput ONLY the title text. Do not add explanations, quotes, or extra markers.`,
  },
  twitter: {
    chinese: `你是一个视频标题创作专家。根据以下视频字幕内容，为Twitter/X视频创作一个中文标题。

【核心要求】
1. 标题必须精准反映视频核心内容
2. 使用中文，8-15字之间
3. 极简有力，适合快节奏浏览

只输出标题文字，不要任何解释或其他内容。`,
    english: `You are a professional social media content strategist. Based on the provided material, create an English title for a Twitter/X video.

【Formatting Rules】
1. Never use dashes (em dash — or en dash –). Use spaces or commas to connect ideas.
2. Use Western punctuation only (periods, commas, question marks, exclamation marks). Never use Chinese full-width punctuation.
3. Capitalization: Use sentence case.
   - Capitalize the first letter of the first word only.
   - Capitalize proper nouns (place names, city names, organization names, department names, brand names, personal names, etc.).
   - All other words (including articles, conjunctions, prepositions) must be lowercase.
   - Never use ALL CAPS format.
4. Proper nouns must match the source material exactly. Do not modify or make up names.
5. The title must accurately reflect the video's core content.
6. Keep the title ultra-concise and impactful. Recommended no more than 12 words.

Do not end the title with a period (full stop). Exclamation marks and question marks are allowed.\n\nOutput ONLY the title text. Do not add explanations, quotes, or extra markers.`,
  },
};

// ─────────────────────────────────────────────────────
// Platform post prompts
// ─────────────────────────────────────────────────────

const COMMON_ENGLISH_POST_RULES = `You are a professional social media content writer. Based on the provided video transcript, create an English post following these rules.

【Language & Style】
- Write concisely and conversationally, but not overly casual.
- Use short sentences, questions, and exclamations to create impact.
- Avoid obscure vocabulary or excessively formal expressions.

【Punctuation】
- Use Western punctuation only: periods (.), commas (,), exclamation marks (!), question marks (?), ellipsis (...).
- Avoid dashes (— or –) in the post unless absolutely necessary.

【Capitalization】
- Use standard sentence case: capitalize the first letter of sentences and proper nouns. Keep all other words lowercase.
- Never use ALL CAPS format.
- Hashtag words must be all lowercase. For multi-word hashtags use camelCase (e.g., #newYorkCity) if needed for readability, but prefer all lowercase.

【Proper Nouns】
- Match the source material exactly. Do not modify, abbreviate, or invent names.

【Special Elements】
- Use emojis sparingly, no more than 3 per post.
- Place hashtags at the end of the post or embedded inline where natural.
- Arrow symbols (⬇️, ➡️) may be used to guide clicks or comments.

【Engagement】
- Encourage users to comment, share, click links, vote, etc.
- Common CTAs: "Share your thoughts below.", "Click the link in bio.", "Tag a friend who...".

【Structure】
- Keep the post to 3 paragraphs or fewer. Do not break content into too many short fragments.
- Each paragraph should be substantive and well-developed.

【Length】
- Keep the post between 40–120 words, suitable for Instagram, Facebook, Threads, etc.

【Closing CTA】
- End with an engagement invitation, link prompt, or hashtags.
- Include at least one clear user action cue (comment, like, click, share).

【Output Format】
- Output ONLY the post body. No title, explanations, quotes, or extra markers.
- Separate paragraphs with blank lines.`;

const POST_PROMPTS: Record<Platform, Record<PostLanguage, string>> = {
  wechat: {
    chinese: `你是一个客户端内容创作专家。根据以下视频字幕内容，创作一篇客户端帖子。

【核心要求】
1. 使用中文，300-500字
2. 结构清晰，段落分明
3. 结尾要有总结和互动引导
4. 可适当使用与内容相关的emoji

只输出帖子正文，不需要额外说明。`,
    english: `${COMMON_ENGLISH_POST_RULES}\n\nTarget platform: client-side video platform.`,
  },
  instagram: {
    chinese: `你是一个Instagram内容创作专家。根据以下视频字幕内容，创作一条Instagram帖子。

【核心要求】
1. 使用中文，150-300字
2. 结尾包含3-5个相关的中文话题标签（#标签）
3. 适当分段，便于阅读
4. 可适当使用emoji

只输出帖子正文和话题标签，不需要额外说明。`,
    english: `${COMMON_ENGLISH_POST_RULES}\n\nTarget platform: Instagram. Include 3–5 relevant hashtags on the final line.`,
  },
  facebook: {
    chinese: `你是一个Facebook内容创作专家。根据以下视频字幕内容，创作一条Facebook帖子。

【核心要求】
1. 使用中文，150-300字
2. 语气亲和，鼓励互动和分享
3. 可以适当提出问题引发讨论
4. 可适当使用emoji

只输出帖子正文，不需要额外说明。`,
    english: `${COMMON_ENGLISH_POST_RULES}\n\nTarget platform: Facebook. Emphasize community engagement and shareability.`,
  },
  twitter: {
    chinese: `你是一个Twitter/X内容创作专家。根据以下视频字幕内容，创作一条推文。

【严格限制】整条推文必须在280个字符以内（包括所有内容：文字、标签、空格、换行）。

【核心要求】
1. 使用中文
2. 精炼有力，一击即中
3. 最多1-2个中文话题标签

只输出推文正文，不需要额外说明。`,
    english: `You are a professional social media content writer. Based on the provided video transcript, create a tweet.

【CRITICAL】The ENTIRE tweet must be under 280 characters including ALL content (hashtags, emojis, spaces, line breaks).

【Language & Style】
- Punchy, concise, and attention-grabbing.
- Use Western punctuation only. Never use ALL CAPS.
- Proper nouns must match the source material exactly.

【Special Elements】
- Maximum 1 emoji if appropriate.
- Maximum 1–2 hashtags if needed.

【Output Format】
- Output ONLY the tweet text. No title, explanations, quotes, or extra markers.`,
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

  if (type === "post" && postType !== "default") {
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
  const content = data.choices?.[0]?.message?.content?.trim() ?? "";
  if (!content) throw new Error("AI 返回内容为空，请重试");
  return content;
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

  return titles.slice(0, 3);
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
  if (hasCredit) {
    const names = config.photographers.join(", ");
    systemPrompt += `\n\n【Photographer Credit】The photographer(s) for this video: ${names}. After writing the caption, include a credit line in this exact format above the hashtags (no blank line between credit and hashtags):\n📷 ${names}`;
  }

  const userMessage = buildUserMessage(translations, config.language);
  const result = await callApi(systemPrompt, userMessage, apiKey);

  // Post-process: ensure credit line is placed correctly before hashtags
  if (hasCredit) {
    const names = config.photographers.join(", ");
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
