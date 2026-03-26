# BugReplay

A Chrome Extension (Manifest V3) that records bug reproduction steps and outputs structured Markdown — designed for AI agents (Claude Code) and Playwright test generation.

**No video. No screenshots. Just semantic, machine-readable bug reports.**

[中文文档](README_zh.md)

## Features

- **Step Recording** — Captures clicks, form inputs, scrolls, keyboard shortcuts, and navigation (SPA + traditional)
- **Semantic Capture** — Records CSS selectors, DOM paths, component hierarchy, and text content instead of pixel coordinates
- **Network Logging** — Tracks all HTTP requests/responses during recording via `chrome.webRequest`
- **Console Capture** — Intercepts `console.error`, `console.warn`, `window.onerror`, and unhandled promise rejections
- **Framework Detection** — Auto-detects React, Vue, Svelte, and Angular with version info
- **Markdown Export** — Generates structured Markdown with steps, network log, console errors, and environment info
- **Playwright Script** — Generates draft Playwright test scripts from recorded sessions
- **Session Persistence** — Saves sessions to `chrome.storage` for later review and export
- **Password Masking** — Automatically masks password field inputs
- **Shadow DOM UI** — Toolbar is fully isolated from host page styles

## Quick Start

```bash
# Install dependencies
pnpm install

# Development with HMR
pnpm dev

# Production build
pnpm build

# Run tests
pnpm test
```

### Load in Chrome

1. Run `pnpm build`
2. Open `chrome://extensions/`
3. Enable "Developer mode"
4. Click "Load unpacked" → select `dist/`
5. Navigate to any webpage, the recording toolbar appears automatically

## Usage

1. Click the **Record** button (⏺) on the floating toolbar
2. Enter a title for the bug report
3. Perform the bug reproduction steps on the page
4. Click **Stop** (⏹) when done
5. Click **Export** (⤓) to copy Markdown to clipboard and download as `.md` file

## Output Format

The exported Markdown includes:

```markdown
# Bug Reproduction: [Title]

**URL:** https://example.com/dashboard
**Browser:** Chrome 124.0.6367.91
**Viewport:** 1440x900

## Steps

### Step 1 — Navigate
- **Action:** `navigate`
- **URL:** `https://example.com/dashboard`

### Step 2 — Click
- **Element:** `<button class="btn-primary">` "Submit Order"
- **Selector:** `[data-testid="submit-order"]`
- **Path:** `main > .order-form > button.btn-primary`

## Network Log
| # | Method | URL          | Status | Duration |
|---|--------|--------------|--------|----------|
| 1 | POST   | /api/orders  | 500    | 1240ms   |

## Console Errors
| # | Step | Level | Message                          |
|---|------|-------|----------------------------------|
| 1 | 2    | error | TypeError: Cannot read property… |

## Playwright Script (Draft)
test('Bug: [title]', async ({ page }) => {
  await page.goto('https://example.com/dashboard');
  await page.locator('[data-testid="submit-order"]').click();
});
```

## Tech Stack

| Category | Technology |
|----------|-----------|
| Language | TypeScript (strict mode, ES2022) |
| Bundler | Vite 5 + @crxjs/vite-plugin |
| Test | Vitest + jsdom |
| Package Manager | pnpm |

## Project Structure

```
src/
  manifest.json                 # Chrome Extension Manifest V3
  background/
    service-worker.ts           # Session management, message routing
    network-capture.ts          # chrome.webRequest listener
  popup/
    popup.html / popup.ts       # Session history & export UI
  content/
    main.ts                     # Entry point, lifecycle coordination
    main-world.ts               # Console capture + framework detection
    recorder/
      event-recorder.ts         # DOM event listeners
      step-builder.ts           # Raw event → RecordingStep
      input-debouncer.ts        # Keystroke merging (500ms)
      navigation-detector.ts    # SPA + traditional nav detection
    store/
      recording-store.ts        # In-memory session state
      session-persistence.ts    # chrome.storage persistence
    capture/
      selector.ts               # CSS selector generation
      element-info.ts           # Element metadata extraction
    ui/
      host.ts                   # Shadow DOM host
      recorder-toolbar.ts       # Floating toolbar
      step-indicator.ts         # Live step counter
    export/
      markdown.ts               # Markdown generation
      playwright.ts             # Playwright script generation
      clipboard.ts              # Copy + file download
  shared/
    types.ts                    # Data model definitions
    messaging.ts                # Chrome message types
    constants.ts                # Configuration constants
```

## License

MIT
