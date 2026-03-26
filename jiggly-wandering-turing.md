# BugReplay — Bug 复现录制 Chrome 扩展

## Context

SnapMark 通过语义化 DOM 捕获（CSS 选择器、元素路径、组件层级）来标注 UI 问题。用户希望基于相同理念，创建一个**独立的新 Chrome 扩展**，用于录制 bug 复现步骤，输出结构化 Markdown 文本（而非视频），让 Claude Code 能理解如何复现问题，同时可生成 Playwright 回归测试脚本。

## 架构：Content Script 事件拦截

```
┌──────────────────────────────────────────────────┐
│  Content Script (Isolated World)                  │
│  ┌─────────────┐ ┌────────────┐ ┌─────────────┐  │
│  │EventRecorder │ │StepBuilder │ │MarkdownGen  │  │
│  │(listeners)   │ │(normalize) │ │(export)     │  │
│  └──────┬──────┘ └─────┬──────┘ └─────────────┘  │
│         └──────┬───────┘                          │
│         ┌──────▼───────┐                          │
│         │RecordingStore│                          │
│         └──────────────┘                          │
│  ┌─────────────┐ ┌─────────────┐                  │
│  │Shadow DOM UI │ │Main-World   │                  │
│  │(toolbar)     │ │(console/fw) │                  │
│  └─────────────┘ └─────────────┘                  │
└───────────────────────┬──────────────────────────┘
                        │ chrome.runtime.sendMessage
┌───────────────────────▼──────────────────────────┐
│  Background Service Worker                        │
│  ┌──────────────┐ ┌──────────────┐                │
│  │NetworkCapture │ │SessionMgmt   │                │
│  │(webRequest)   │ │(state)       │                │
│  └──────────────┘ └──────────────┘                │
└──────────────────────────────────────────────────┘
```

## 项目结构

```
/data/bak20250527/bugreplay/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── src/
│   ├── manifest.json                    # MV3 manifest
│   ├── background/
│   │   ├── service-worker.ts            # 会话管理、消息路由
│   │   └── network-capture.ts           # chrome.webRequest 监听
│   ├── popup/
│   │   ├── popup.html                   # 设置 & 历史记录
│   │   └── popup.ts
│   ├── content/
│   │   ├── main.ts                      # 入口，生命周期协调
│   │   ├── main-world.ts               # console 捕获 + 框架检测
│   │   ├── recorder/
│   │   │   ├── event-recorder.ts        # DOM 事件监听 (click/input/scroll/nav)
│   │   │   ├── step-builder.ts          # 原始事件 → RecordingStep
│   │   │   ├── input-debouncer.ts       # 按键合并为 fill 操作
│   │   │   └── navigation-detector.ts   # SPA 导航检测
│   │   ├── store/
│   │   │   ├── recording-store.ts       # 内存中的会话状态
│   │   │   └── session-persistence.ts   # chrome.storage 持久化
│   │   ├── capture/
│   │   │   ├── selector.ts              # CSS 选择器生成（移植自 SnapMark）
│   │   │   └── element-info.ts          # 元素元数据提取（移植自 SnapMark）
│   │   ├── ui/
│   │   │   ├── host.ts                  # Shadow DOM 宿主
│   │   │   ├── recorder-toolbar.ts      # 录制/暂停/停止/导出按钮
│   │   │   └── step-indicator.ts        # 实时步骤计数器
│   │   └── export/
│   │       ├── markdown.ts              # Markdown 输出生成
│   │       ├── playwright.ts            # Playwright 测试脚本生成
│   │       └── clipboard.ts             # 剪贴板 + 下载
│   └── shared/
│       ├── types.ts                     # 数据模型定义
│       ├── messaging.ts                 # Chrome 消息类型和工具
│       └── constants.ts                 # 操作类型、防抖参数
```

## 数据模型 (src/shared/types.ts)

```typescript
interface RecordingSession {
  id: string;
  title: string;
  startedAt: number;
  url: string;
  browserInfo: { name: string; version: string; userAgent: string };
  viewport: { width: number; height: number };
  framework?: { name: string; version?: string };
  steps: RecordingStep[];
  networkLog: NetworkEntry[];
  consoleErrors: ConsoleEntry[];
  status: 'recording' | 'paused' | 'stopped';
}

type ActionType = 'navigate' | 'click' | 'fill' | 'select' | 'check'
  | 'scroll' | 'keypress' | 'hover' | 'drag' | 'upload' | 'dialog';

interface RecordingStep {
  index: number;
  action: ActionType;
  timestamp: number;          // ms offset from session start
  element?: ElementInfo;
  value?: string;
  url?: string;
  scrollPosition?: { x: number; y: number };
  key?: string;
  navigation?: string;       // 如果操作触发了导航
}

interface ElementInfo {
  tag: string;
  selector: string;
  path: string;
  textContent: string;
  attributes: Record<string, string>;
  cssClasses: string[];
  role?: string;
  ariaLabel?: string;
  framework?: {
    name: string;
    componentName: string;
    componentPath?: string;
  };
}

interface NetworkEntry {
  index: number;
  method: string;
  url: string;
  status: number;
  duration: number;
  size: number;
  responseBody?: string;     // 仅失败请求，截断
  stepIndex: number;         // 关联到步骤
  timestamp: number;
}

interface ConsoleEntry {
  level: 'error' | 'warn';
  message: string;
  stack?: string;
  stepIndex: number;
  timestamp: number;
}
```

## 事件捕获策略

### 用户操作（content/recorder/event-recorder.ts）
- **click**: `document.addEventListener('click', handler, { capture: true, passive: true })` — 提取目标元素语义信息
- **input/change**: 监听 `input`/`change`/`select` 事件，500ms 防抖合并为 `fill` 步骤，密码字段掩码
- **scroll**: `window.addEventListener('scroll', ...)` — 300ms 防抖，仅记录最终位置
- **navigation**: `popstate` + `hashchange` + `beforeunload` + MutationObserver 监测 `<title>` + 轮询 `location.href`（SPA）
- **keyboard**: 仅捕获特殊键（Enter、Escape、Tab）

### 网络请求（background/network-capture.ts）
- `chrome.webRequest.onBeforeRequest` / `onCompleted` / `onErrorOccurred`
- 每个请求关联到当前活跃步骤的 index

### 控制台错误（content/main-world.ts）
- 在 main world 中覆写 `console.error`、监听 `window.onerror` + `unhandledrejection`
- 通过 `postMessage` 发送回 content script

### 框架检测（content/main-world.ts）
- 复用 SnapMark 的检测逻辑（React/Vue/Svelte/Angular）
- 2s 超时回退

## 选择器生成（移植自 SnapMark）

从 `/data/bak20250527/agentation/src/content/capture/selector.ts` 移植：
- 优先级: `#id` → `[data-testid]` → `[data-*]` → `.classes` → `nth-child`
- 过滤 CSS-in-JS hash 类名（CSS Modules、styled-components、emotion）
- Shadow DOM 穿透
- 4 级元素路径生成

从 `/data/bak20250527/agentation/src/content/capture/element-info.ts` 移植：
- 属性白名单提取（id, role, href, name, type, placeholder, data-*, aria-*）
- 文本内容截断（交互元素 25 字符，其他 40 字符）
- 无障碍信息提取

## 录制生命周期

1. **Start**: 点击录制按钮 → 注册所有事件监听器 → Background 启动网络捕获 → 自动生成第一步 `navigate`
2. **Record**: 每个用户操作生成 RecordingStep，网络/控制台条目并行积累，工具栏显示步骤计数+已用时间
3. **Pause**: 暂停事件监听，Background 暂停网络捕获
4. **Stop**: 移除所有监听器，完成会话，显示导出面板
5. **Export**: 生成 Markdown → 复制到剪贴板或下载为 .md 文件

## Markdown 输出格式

```markdown
# Bug 复现: [用户输入的标题]

**URL:** https://example.com/dashboard
**Date:** 2026-03-26T14:30:00.000Z
**Browser:** Chrome 124.0.6367.91
**Viewport:** 1440x900

## Environment
- **Framework:** React 18.2.0
- **Console Errors (pre-existing):** 2

---

## Steps

### Step 1 — Navigate
- **Action:** `navigate`
- **URL:** `https://example.com/dashboard`
- **Timestamp:** +0ms

### Step 2 — Click
- **Action:** `click`
- **Element:** `<button class="btn-primary">` "Submit Order"
- **Selector:** `[data-testid="submit-order"]`
- **Path:** `main > .order-form > div.actions > button.btn-primary`
- **Component:** `<OrderActions>` (React)
- **Timestamp:** +2340ms

### Step 3 — Fill
- **Action:** `fill`
- **Element:** `<input type="email">` placeholder="Enter email"
- **Selector:** `#email-input`
- **Path:** `form.signup > div.field > input#email-input`
- **Value:** `"test@example.com"`
- **Timestamp:** +4120ms

---

## Network Log

| # | Method | URL | Status | Duration | Size |
|---|--------|-----|--------|----------|------|
| 1 | POST | /api/orders | 500 | 1240ms | 89B |
| 2 | GET | /api/user | 200 | 340ms | 2.1KB |

### Failed Requests
POST /api/orders → 500 Internal Server Error
Response: {"error":"duplicate_key","message":"Order already exists"}

## Console Errors

| # | Step | Level | Message |
|---|------|-------|---------|
| 1 | 5 | error | Uncaught TypeError: Cannot read properties of undefined (reading 'id') |

---

## Playwright Script (Draft)

```typescript
import { test, expect } from '@playwright/test';

test('Bug: [title]', async ({ page }) => {
  await page.goto('https://example.com/dashboard');
  await page.locator('[data-testid="submit-order"]').click();
  await page.locator('#email-input').fill('test@example.com');
});
```
```

## 实施分阶段

### Phase 1: 项目脚手架
1. 创建 `/data/bak20250527/bugreplay/` 目录
2. 初始化 package.json (pnpm, TypeScript, Vite 5, @crxjs/vite-plugin)
3. 配置 tsconfig.json, vite.config.ts, vitest.config.ts
4. 创建 MV3 manifest.json（permissions: webRequest, storage, activeTab, clipboardWrite）
5. 创建 shared/types.ts, shared/constants.ts, shared/messaging.ts

### Phase 2: 核心捕获引擎
1. 移植 selector.ts 和 element-info.ts（适配 BugReplay 需求，去掉 boundingBox/viewport 等不需要的字段）
2. 实现 event-recorder.ts（click, input, scroll, keypress 监听）
3. 实现 input-debouncer.ts（500ms 防抖合并击键）
4. 实现 navigation-detector.ts（SPA + 传统导航检测）
5. 实现 step-builder.ts（原始事件 → RecordingStep 标准化）
6. 实现 recording-store.ts（内存状态管理）

### Phase 3: Background + 网络/控制台
1. 实现 service-worker.ts（会话状态、消息路由）
2. 实现 network-capture.ts（webRequest 监听、请求/响应关联）
3. 实现 main-world.ts（console.error 覆写、window.onerror、框架检测）
4. 实现 messaging.ts（content ↔ background ↔ main-world 通信）

### Phase 4: UI
1. 实现 host.ts（Shadow DOM 宿主容器）
2. 实现 recorder-toolbar.ts（录制/暂停/停止按钮、步骤计数、时间显示）
3. 实现 step-indicator.ts（实时步骤指示器）
4. 实现 content/main.ts（入口、生命周期协调）

### Phase 5: 导出
1. 实现 markdown.ts（完整 Markdown 输出生成）
2. 实现 playwright.ts（Playwright 测试脚本生成）
3. 实现 clipboard.ts（剪贴板复制 + .md 文件下载）

### Phase 6: 持久化 + Popup
1. 实现 session-persistence.ts（chrome.storage 保存/恢复会话）
2. 实现 popup.html/popup.ts（设置页、历史会话列表）

## 从 SnapMark 移植的文件

| 源文件 | 移植到 | 修改 |
|--------|--------|------|
| `src/content/capture/selector.ts` | `src/content/capture/selector.ts` | 原样移植 |
| `src/content/capture/element-info.ts` | `src/content/capture/element-info.ts` | 精简：去掉 boundingBox/viewport/computedStyles/nearbyElements，保留 tag/selector/path/text/attributes/accessibility/framework |
| `src/content/ui/host.ts` | `src/content/ui/host.ts` | 简化分区（仅 toolbar + indicator） |
| `src/shared/messaging.ts` | `src/shared/messaging.ts` | 消息类型改为录制相关 |
| `src/content/main-world.ts` | `src/content/main-world.ts` | 增加 console 错误捕获 |

## Verification

1. `pnpm build` — 构建成功，输出到 dist/
2. 在 Chrome 加载 dist/ 作为未打包扩展
3. 打开任意网页，点击录制按钮
4. 执行一系列操作：点击按钮、填写表单、滚动、导航
5. 点击停止 → 导出 Markdown
6. 验证 Markdown 包含完整步骤、网络日志、控制台错误
7. 验证生成的 Playwright 脚本可运行
8. `pnpm test` — 单元测试通过（selector、step-builder、markdown 生成）
