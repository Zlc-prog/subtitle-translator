# CLAUDE.md — SubEditor 字幕翻译工具

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
├── pages/                        # 页面级组件（4 个 Tab）
│   ├── TranslatorPage.tsx        # 翻译页面：上传 SRT → AI 翻译 → 导出
│   ├── SubtitleSplitterPage.tsx  # 字幕拆分页面：AI 智能分组句子
│   ├── SubtitleEditorPage.tsx    # 字幕编辑器：逐行编辑/拆分/合并/时间调整
│   └── VideoPostPage.tsx         # 社媒发帖页面：AI 生成视频标题+社媒文
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx         # 4 Tab 主布局（翻译/拆分/编辑/发帖）
│   │   └── Sidebar.tsx           # 侧边栏导航
│   ├── Toolbar.tsx               # 工具栏：上传、翻译、导出、设置入口
│   ├── SubtitleList.tsx          # 字幕列表容器 + 翻译进度条
│   ├── SubtitleItem.tsx          # 单条字幕（原文 + 译文 + 重新翻译按钮）
│   ├── RuleConfigModal.tsx       # 翻译规则配置弹窗
│   ├── ApiKeyModal.tsx           # API Key 设置弹窗
│   ├── StatusBar.tsx             # 状态栏（文件名、字幕数、API 状态）
│   ├── ClearConfirmModal.tsx     # 清除确认弹窗
│   ├── DisclaimerModal.tsx       # 免责声明弹窗
│   ├── ReviewModal.tsx           # 翻译审阅弹窗
│   ├── EditorLine.tsx            # 编辑器单行组件
│   ├── ReferenceLine.tsx         # 参考字幕行组件
│   ├── SplitterConfig.tsx        # 拆分器配置
│   ├── SplitterPreview.tsx       # 拆分器预览
│   ├── VideoPostConfig.tsx       # 社媒发帖配置
│   └── VideoPostResults.tsx      # 社媒发帖结果展示
├── services/
│   ├── translateService.ts       # DeepSeek API（AI 分组 + 组翻译 + 单句重译）
│   ├── configService.ts          # Tauri Store 读写（Key、规则持久化）
│   ├── splitterService.ts        # 句子拆分 AI 服务
│   └── socialPostService.ts      # 社媒发帖 AI 生成服务
├── stores/
│   └── subtitleStore.ts          # Zustand store（翻译+编辑器+拆分器状态）
├── types/
│   ├── subtitle.ts               # Subtitle、TranslationRules 类型
│   └── socialPost.ts             # 社媒发帖相关类型
├── utils/
│   ├── srtParser.ts              # SRT 解析/序列化
│   ├── sentenceGrouper.ts        # AI 句子分组解析
│   └── textNormalizer.ts         # 标点规范/文本清洗
├── App.tsx                       # 主入口：页面路由 + API Key 加载
├── main.tsx                      # React 挂载入口
└── index.css                     # TailwindCSS v4 + 全局样式
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
- 模型：`deepseek-chat`
- 系统提示词包含用户自定义翻译规则（专有名词词典 + 自定义指令）

### 翻译流程（两阶段）

1. **AI 智能分句**（`splitSentences`）：将连续的中文字幕行按语义完整性分组，同一句被切分的多行归为一组。温度 0.1，失败时回退为每行一组。
2. **逐组翻译**（`translateGroup`）：对每个分组整体翻译后再拆分为对应行数的英文片段，保持每组内行间语义连贯。单行组温度 0.3，多行组 max_tokens 4096。

### 重新翻译

- **单行翻译**：仅翻译当前行，不带上下文，temperature=0.7 生成不同表达
- **上下文翻译**：用户手动勾选上下文行作为参考（默认勾选同组其他行），调用 `translateOne` 带上下文翻译目标行
- 结果进入 `pendingTranslations`，用户可「接受」或「拒绝」
- 全部重新翻译：重新分句 + 全量重译，temperature=0.7

---

## 编码规范

1. 所有类型写在 types/ 目录，不使用 any
2. Tauri Store 用于 API Key 和翻译规则持久化
3. TailwindCSS v4，无需配置文件
4. 写操作用顺序的单条 async 调用

---

## 最后更新

2026-06-19 — v1.2.0：目录结构更新 + 翻译流程描述修正 + 重译支持单行/上下文模式选择
