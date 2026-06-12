export type Platform = "wechat" | "instagram" | "facebook" | "twitter";

export type PostLanguage = "chinese" | "english";

export type PostType = "default" | "short" | "in_depth" | "interactive";

export interface PostGenerationConfig {
  platform: Platform;
  language: PostLanguage;
  postType: PostType;
  customInstructions: string;
  photographers: string[];
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  wechat: "客户端",
  instagram: "Instagram",
  facebook: "Facebook",
  twitter: "Twitter/X",
};

export const POST_TYPE_LABELS: Record<PostType, string> = {
  default: "默认",
  short: "短消息",
  in_depth: "深度报道",
  interactive: "互动贴文",
};

export type PlatformTag = "instagram" | "flyoverchina" | null;

export const PLATFORM_TAG_LABELS: Record<string, string> = {
  instagram: "Instagram",
  flyoverchina: "FlyOverChina",
};
