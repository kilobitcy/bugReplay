# BugReplay

一个 Chrome 扩展（Manifest V3），用于录制 Bug 复现步骤并输出结构化 Markdown —— 专为 AI 代理（Claude Code）和 Playwright 测试生成而设计。

**不录视频，不截图。只输出语义化、机器可读的 Bug 报告。**

[English](README.md)

## 功能特性

- **步骤录制** — 捕获点击、表单输入、滚动、键盘快捷键和导航（SPA + 传统页面）
- **语义化捕获** — 记录 CSS 选择器、DOM 路径、组件层级和文本内容，而非像素坐标
- **网络日志** — 通过 `chrome.webRequest` 追踪录制期间的所有 HTTP 请求/响应
- **控制台捕获** — 拦截 `console.error`、`console.warn`、`window.onerror` 和未处理的 Promise 异常
- **框架检测** — 自动检测 React、Vue、Svelte、Angular 及版本信息
- **Markdown 导出** — 生成包含步骤、网络日志、控制台错误和环境信息的结构化 Markdown
- **Playwright 脚本** — 从录制的会话生成 Playwright 测试脚本草稿
- **会话持久化** — 将会话保存到 `chrome.storage`，支持稍后查看和导出
- **密码脱敏** — 自动对密码字段输入进行掩码处理
- **Shadow DOM UI** — 工具栏与宿主页面样式完全隔离

## 快速开始

```bash
# 安装依赖
pnpm install

# 开发模式（支持热更新）
pnpm dev

# 生产构建
pnpm build

# 运行测试
pnpm test
```

### 在 Chrome 中加载

1. 运行 `pnpm build`
2. 打开 `chrome://extensions/`
3. 开启「开发者模式」
4. 点击「加载已解压的扩展程序」→ 选择 `dist/` 目录
5. 访问任意网页，录制工具栏会自动出现

## 使用方法

1. 点击浮动工具栏上的**录制**按钮（⏺）
2. 输入 Bug 报告标题
3. 在页面上执行 Bug 复现步骤
4. 完成后点击**停止**（⏹）
5. 点击**导出**（⤓）将 Markdown 复制到剪贴板并下载为 `.md` 文件

## 输出格式

导出的 Markdown 包含：

```markdown
# Bug 复现: [标题]

**URL:** https://example.com/dashboard
**浏览器:** Chrome 124.0.6367.91
**视窗:** 1440x900

## 步骤

### 步骤 1 — 导航
- **操作:** `navigate`
- **URL:** `https://example.com/dashboard`

### 步骤 2 — 点击
- **元素:** `<button class="btn-primary">` "提交订单"
- **选择器:** `[data-testid="submit-order"]`
- **路径:** `main > .order-form > button.btn-primary`

## 网络日志
| # | 方法 | URL          | 状态码 | 耗时    |
|---|------|--------------|--------|---------|
| 1 | POST | /api/orders  | 500    | 1240ms  |

## 控制台错误
| # | 步骤 | 级别  | 消息                              |
|---|------|-------|-----------------------------------|
| 1 | 2    | error | TypeError: Cannot read property…  |

## Playwright 脚本（草稿）
test('Bug: [标题]', async ({ page }) => {
  await page.goto('https://example.com/dashboard');
  await page.locator('[data-testid="submit-order"]').click();
});
```

## 技术栈

| 类别 | 技术 |
|------|------|
| 语言 | TypeScript（严格模式，ES2022） |
| 构建工具 | Vite 5 + @crxjs/vite-plugin |
| 测试 | Vitest + jsdom |
| 包管理器 | pnpm |

## 项目结构

```
src/
  manifest.json                 # Chrome 扩展 Manifest V3
  background/
    service-worker.ts           # 会话管理、消息路由
    network-capture.ts          # chrome.webRequest 监听
  popup/
    popup.html / popup.ts       # 会话历史与导出界面
  content/
    main.ts                     # 入口，生命周期协调
    main-world.ts               # 控制台捕获 + 框架检测
    recorder/
      event-recorder.ts         # DOM 事件监听
      step-builder.ts           # 原始事件 → RecordingStep
      input-debouncer.ts        # 按键合并（500ms）
      navigation-detector.ts    # SPA + 传统导航检测
    store/
      recording-store.ts        # 内存中的会话状态
      session-persistence.ts    # chrome.storage 持久化
    capture/
      selector.ts               # CSS 选择器生成
      element-info.ts           # 元素元数据提取
    ui/
      host.ts                   # Shadow DOM 宿主
      recorder-toolbar.ts       # 浮动工具栏
      step-indicator.ts         # 实时步骤计数器
    export/
      markdown.ts               # Markdown 生成
      playwright.ts             # Playwright 脚本生成
      clipboard.ts              # 复制 + 文件下载
  shared/
    types.ts                    # 数据模型定义
    messaging.ts                # Chrome 消息类型
    constants.ts                # 配置常量
```

## 许可证

MIT
