# CLAUDE.md — 字幕翻译工具（subtitle-translator）

## 项目概述

macOS 本地桌面应用，用于中文 SRT 字幕文件的 AI 翻译。调用 DeepSeek API 进行批量翻译，支持自定义翻译规则（专有名词、标点规范等），翻译结果导出为 SRT 格式。

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 桌面框架 | Tauri 2.x（Rust 后端） |
| 前端框架 | React 19 + TypeScript |
| 构建工具 | Vite 6 |
| 样式 | TailwindCSS v4 |
| 状态管理 | Zustand 5 |
| 翻译 API | DeepSeek Chat API（OpenAI 兼容） |
| 存储 | Tauri Store 插件（API Key、翻译规则持久化） |

---

## 目录结构

```
src/
├── components/
│   ├── Toolbar.tsx           # 工具栏：上传、翻译、导出、设置入口
│   ├── SubtitleList.tsx      # 字幕列表容器 + 翻译进度条
│   ├── SubtitleItem.tsx      # 单条字幕（原文 + 译文 + 重新翻译按钮）
│   ├── RuleConfigModal.tsx   # 翻译规则配置弹窗
│   ├── ApiKeyModal.tsx       # API Key 设置弹窗
│   └── StatusBar.tsx         # 状态栏（文件名、字幕数、API 状态）
├── services/
│   ├── translateService.ts   # DeepSeek API 调用（批量 + 单句）
│   └── configService.ts      # Tauri Store 读写（Key、规则持久化）
├── stores/
│   └── subtitleStore.ts      # Zustand store
├── types/
│   └── subtitle.ts           # Subtitle、TranslationRules 类型
├── utils/
│   └── srtParser.ts          # SRT 解析/序列化
├── App.tsx                   # 主入口组件
├── main.tsx                  # React 挂载入口
└── index.css                 # TailwindCSS + 全局样式
```

---

## SRT 格式

```
1
00:00:01,000 --> 00:00:04,000
字幕文本（可跨多行）

2
00:00:05,000 --> 00:00:08,000
第二句字幕
```

- 索引号 + 时间戳 `HH:MM:SS,mmm` + 文本，块之间空行分隔
- parseSrt 解析，serializeSrt 序列化

---

## DeepSeek API

- 端点：`https://api.deepseek.com/v1/chat/completions`
- 系统提示词包含用户自定义翻译规则
- 批量翻译：每批 12 条，要求按 `[N] text` 格式返回
- 单句重译：带前后 2 句上下文
- 温度 0.3，模型 deepseek-chat

---

## 编码规范

1. 所有类型写在 types/ 目录，不使用 any
2. Tauri Store 用于 API Key 和翻译规则持久化
3. TailwindCSS v4，无需配置文件
4. 写操作用顺序的单条 async 调用

---

## 最后更新

2026-06-08 — 项目初始创建，完成核心翻译流程。
