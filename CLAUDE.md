# BugReplay

## Profile
- Language: chinese

## Project Overview

BugReplay is a Chrome Extension (Manifest V3) that records bug reproduction steps and outputs structured Markdown text (not video). The output is designed for Claude Code to understand how to reproduce issues, and can also generate draft Playwright regression test scripts. Core capture modules (selector, element-info) are ported from the sibling project SnapMark.

## Tech Stack

- **Language**: TypeScript (strict mode, ES2022)
- **Bundler**: Vite 5 + `@crxjs/vite-plugin` for Chrome Extension bundling
- **Test**: Vitest with jsdom environment
- **Package Manager**: pnpm — do NOT use npm or yarn

## Commands

```bash
pnpm dev        # Start dev server with HMR
pnpm build      # Production build → dist/
pnpm test       # Run all tests (vitest)
```

## Architecture Notes

- Content scripts use **Shadow DOM** for UI isolation from host pages
- `main-world.ts` runs in the page's main world (not isolated) for console error capture and framework detection — bundled separately via `rollupOptions.input`
- Communication: content script ↔ background via `chrome.runtime.sendMessage`; main-world ↔ content script via `window.postMessage`
- Recording session state is kept in-memory (`recording-store.ts`) and persisted to `chrome.storage` for recovery

### Design Principle: Semantic Capture

All captured data must provide **semantic DOM information** (CSS selectors, element paths, component hierarchy, text content) rather than pixel coordinates. The output targets AI agents (Claude Code) and test generators (Playwright), both of which need selectors and structure, not screen positions.

## Porting from SnapMark

Source project: `/data/bak20250527/agentation/`

| Source File | Port To | Modifications |
|-------------|---------|---------------|
| `src/content/capture/selector.ts` | `src/content/capture/selector.ts` | Port as-is |
| `src/content/capture/element-info.ts` | `src/content/capture/element-info.ts` | Remove boundingBox, viewport, computedStyles, nearbyElements; keep tag/selector/path/text/attributes/accessibility/framework |
| `src/content/ui/host.ts` | `src/content/ui/host.ts` | Simplify zones (toolbar + indicator only) |
| `src/shared/messaging.ts` | `src/shared/messaging.ts` | Replace annotation message types with recording message types |
| `src/content/main-world.ts` | `src/content/main-world.ts` | Add console.error/window.onerror/unhandledrejection capture |

## Testing

- Tests live in `__tests__/` directories adjacent to source files
- Pattern: `src/**/__tests__/**/*.test.ts`
- Environment: jsdom (configured in `vitest.config.ts`)
- Run a single test file: `pnpm test src/content/capture/__tests__/selector.test.ts`
- Key modules to test: selector generation, step-builder normalization, markdown output generation

## Code Conventions

- ESM only (`"type": "module"` in package.json)
- No default exports — use named exports
- TypeScript strict mode — no `any` unless absolutely necessary
- Vite root is `src/` — paths in vite.config.ts are relative to `src/`
- Build output goes to `dist/` (gitignored)

## github info
- repo url：https://github.com/kilobitcy/bugReplay.git