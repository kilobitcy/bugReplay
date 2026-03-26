# BugReplay Chrome Extension — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Chrome Extension (MV3) that records bug reproduction steps and exports structured Markdown + draft Playwright test scripts.

**Architecture:** Content Script captures DOM events (click, input, scroll, navigation) and normalizes them into `RecordingStep` objects. Background Service Worker captures network requests via `chrome.webRequest`. A main-world script captures console errors and detects frameworks. All data flows into a `RecordingStore`, which is exported as Markdown or Playwright scripts.

**Tech Stack:** TypeScript (strict, ES2022), Vite 5 + @crxjs/vite-plugin, Vitest + jsdom, pnpm

**Spec:** `/data/bak20250527/bugreplay/jiggly-wandering-turing.md`

**SnapMark Source (for porting):** `/data/bak20250527/agentation/`

---

## File Structure

```
src/
  manifest.json
  background/
    service-worker.ts
    network-capture.ts
  popup/
    popup.html
    popup.ts
  content/
    main.ts
    main-world.ts
    recorder/
      event-recorder.ts
      step-builder.ts
      input-debouncer.ts
      navigation-detector.ts
    store/
      recording-store.ts
      session-persistence.ts
    capture/
      selector.ts
      element-info.ts
    ui/
      host.ts
      recorder-toolbar.ts
      step-indicator.ts
    export/
      markdown.ts
      playwright.ts
      clipboard.ts
  shared/
    types.ts
    messaging.ts
    constants.ts
```

---

## Phase 1: Project Scaffolding

### Task 1: Initialize project with pnpm and config files

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `vitest.config.ts`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "bugreplay",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest"
  },
  "devDependencies": {
    "@crxjs/vite-plugin": "2.4.0",
    "@types/chrome": "^0.1.38",
    "jsdom": "^29.0.1",
    "typescript": "^5.9.3",
    "vite": "^5.4.21",
    "vitest": "^2.1.9"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "sourceMap": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"]
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 3: Create vite.config.ts**

```typescript
import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './src/manifest.json';
import { resolve } from 'path';

export default defineConfig({
  root: 'src',
  plugins: [crx({ manifest })],
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'content/main-world': resolve(__dirname, 'src/content/main-world.ts'),
      },
    },
  },
});
```

- [ ] **Step 4: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/__tests__/**/*.test.ts'],
    passWithNoTests: true,
  },
});
```

- [ ] **Step 5: Run pnpm install**

Run: `pnpm install`
Expected: lockfile generated, node_modules populated

- [ ] **Step 6: Commit**

```bash
git add package.json tsconfig.json vite.config.ts vitest.config.ts pnpm-lock.yaml
git commit -m "chore: initialize bugreplay project scaffolding"
```

---

### Task 2: Create MV3 manifest.json

**Files:**
- Create: `src/manifest.json`

- [ ] **Step 1: Create manifest.json**

```json
{
  "manifest_version": 3,
  "name": "BugReplay",
  "version": "0.1.0",
  "description": "Record bug reproduction steps as structured Markdown for AI agents and Playwright tests",
  "permissions": ["webRequest", "storage", "activeTab", "clipboardWrite"],
  "host_permissions": ["<all_urls>"],
  "content_scripts": [{
    "matches": ["<all_urls>"],
    "js": ["content/main.ts"],
    "run_at": "document_idle"
  }],
  "background": {
    "service_worker": "background/service-worker.ts",
    "type": "module"
  },
  "action": {
    "default_popup": "popup/popup.html"
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/manifest.json
git commit -m "chore: add MV3 manifest with recording permissions"
```

---

### Task 3: Create shared types, constants, and messaging

**Files:**
- Create: `src/shared/types.ts`
- Create: `src/shared/constants.ts`
- Create: `src/shared/messaging.ts`
- Test: `src/shared/__tests__/types.test.ts`
- Test: `src/shared/__tests__/messaging.test.ts`

- [ ] **Step 1: Write types.ts**

```typescript
export type ActionType =
  | 'navigate' | 'click' | 'fill' | 'select' | 'check'
  | 'scroll' | 'keypress' | 'hover' | 'drag' | 'upload' | 'dialog';

export interface ElementInfo {
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

export interface RecordingStep {
  index: number;
  action: ActionType;
  timestamp: number;
  element?: ElementInfo;
  value?: string;
  url?: string;
  scrollPosition?: { x: number; y: number };
  key?: string;
  navigation?: string;
}

export interface NetworkEntry {
  index: number;
  method: string;
  url: string;
  status: number;
  duration: number;
  size: number;
  responseBody?: string;
  stepIndex: number;
  timestamp: number;
}

export interface ConsoleEntry {
  level: 'error' | 'warn';
  message: string;
  stack?: string;
  stepIndex: number;
  timestamp: number;
}

export interface RecordingSession {
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
```

- [ ] **Step 2: Write constants.ts**

```typescript
export const INPUT_DEBOUNCE_MS = 500;
export const SCROLL_DEBOUNCE_MS = 300;
export const FRAMEWORK_DETECT_TIMEOUT_MS = 2000;
export const SHORT_TEXT_LIMIT = 25;
export const LONG_TEXT_LIMIT = 40;
export const SPECIAL_KEYS = new Set(['Enter', 'Escape', 'Tab']);

export const ACTION_TYPES: Record<string, string> = {
  navigate: 'Navigate',
  click: 'Click',
  fill: 'Fill',
  select: 'Select',
  check: 'Check',
  scroll: 'Scroll',
  keypress: 'Keypress',
  hover: 'Hover',
  drag: 'Drag',
  upload: 'Upload',
  dialog: 'Dialog',
};
```

- [ ] **Step 3: Write messaging.ts**

```typescript
export const BUGREPLAY_SOURCE = 'bugreplay' as const;

// Content Script <-> Background Service Worker
// tabId is resolved by the service worker from sender.tab.id — no need to include in payload
export type ExtensionMessage =
  | { type: 'START_RECORDING'; payload?: undefined }
  | { type: 'STOP_RECORDING'; payload?: undefined }
  | { type: 'PAUSE_RECORDING'; payload?: undefined }
  | { type: 'RESUME_RECORDING'; payload?: undefined }
  | { type: 'NETWORK_ENTRY'; payload: { entry: import('./types').NetworkEntry } }
  | { type: 'GET_RECORDING_STATE'; payload?: undefined }
  | { type: 'RECORDING_STATE'; payload: { status: import('./types').RecordingSession['status'] } };

// Main World <-> Content Script via window.postMessage
export type MainWorldMessagePayload =
  | { type: 'BR_FRAMEWORK_DETECT_RESULT'; payload: { frameworks: string[] } }
  | { type: 'BR_COMPONENT_INFO_REQUEST'; payload: { elementSelector: string } }
  | { type: 'BR_COMPONENT_INFO'; payload: { name: string; componentName: string; componentPath?: string } | null }
  | { type: 'BR_CONSOLE_ERROR'; payload: { level: 'error' | 'warn'; message: string; stack?: string; timestamp: number } };

export type MainWorldMessage = MainWorldMessagePayload & { source: typeof BUGREPLAY_SOURCE };

export function createExtensionMessage<T extends ExtensionMessage['type']>(
  type: T,
  payload: Extract<ExtensionMessage, { type: T }>['payload'],
): Extract<ExtensionMessage, { type: T }> {
  return { type, payload } as Extract<ExtensionMessage, { type: T }>;
}

export function createMainWorldMessage<T extends MainWorldMessagePayload['type']>(
  type: T,
  payload: Extract<MainWorldMessagePayload, { type: T }>['payload'],
): MainWorldMessage {
  return { source: BUGREPLAY_SOURCE, type, payload } as unknown as MainWorldMessage;
}

export function isMainWorldMessage(data: unknown): data is MainWorldMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    'source' in data &&
    (data as Record<string, unknown>).source === BUGREPLAY_SOURCE
  );
}
```

- [ ] **Step 4: Write failing test for types**

```typescript
// src/shared/__tests__/types.test.ts
import { describe, it, expect } from 'vitest';
import type { RecordingSession, RecordingStep, ElementInfo, NetworkEntry, ConsoleEntry, ActionType } from '../types';

describe('RecordingSession type', () => {
  it('should allow creating a valid session object', () => {
    const session: RecordingSession = {
      id: 'test-1',
      title: 'Test Bug',
      startedAt: Date.now(),
      url: 'https://example.com',
      browserInfo: { name: 'Chrome', version: '124.0', userAgent: 'Mozilla/5.0' },
      viewport: { width: 1440, height: 900 },
      steps: [],
      networkLog: [],
      consoleErrors: [],
      status: 'recording',
    };
    expect(session.id).toBe('test-1');
    expect(session.status).toBe('recording');
  });

  it('should allow optional framework field', () => {
    const session: RecordingSession = {
      id: 'test-2',
      title: 'Test',
      startedAt: Date.now(),
      url: 'https://example.com',
      browserInfo: { name: 'Chrome', version: '124.0', userAgent: 'Mozilla/5.0' },
      viewport: { width: 1440, height: 900 },
      framework: { name: 'React', version: '18.2.0' },
      steps: [],
      networkLog: [],
      consoleErrors: [],
      status: 'stopped',
    };
    expect(session.framework?.name).toBe('React');
  });
});

describe('RecordingStep type', () => {
  it('should allow creating a click step with element info', () => {
    const step: RecordingStep = {
      index: 1,
      action: 'click',
      timestamp: 2340,
      element: {
        tag: 'button',
        selector: '[data-testid="submit"]',
        path: 'main > form > button',
        textContent: 'Submit',
        attributes: { type: 'submit' },
        cssClasses: ['btn-primary'],
        role: 'button',
      },
    };
    expect(step.action).toBe('click');
    expect(step.element?.selector).toBe('[data-testid="submit"]');
  });

  it('should allow creating a navigate step without element', () => {
    const step: RecordingStep = {
      index: 0,
      action: 'navigate',
      timestamp: 0,
      url: 'https://example.com/dashboard',
    };
    expect(step.url).toBe('https://example.com/dashboard');
  });
});
```

- [ ] **Step 5: Write failing test for messaging**

```typescript
// src/shared/__tests__/messaging.test.ts
import { describe, it, expect } from 'vitest';
import {
  BUGREPLAY_SOURCE,
  createExtensionMessage,
  createMainWorldMessage,
  isMainWorldMessage,
} from '../messaging';

describe('createExtensionMessage', () => {
  it('should create a START_RECORDING message', () => {
    const msg = createExtensionMessage('START_RECORDING', undefined);
    expect(msg).toEqual({ type: 'START_RECORDING', payload: undefined });
  });

  it('should create a NETWORK_ENTRY message with payload', () => {
    const entry = { index: 0, method: 'GET', url: '/api', status: 200, duration: 100, size: 50, stepIndex: 0, timestamp: 1000 };
    const msg = createExtensionMessage('NETWORK_ENTRY', { entry });
    expect(msg.type).toBe('NETWORK_ENTRY');
    expect(msg.payload.entry.method).toBe('GET');
  });
});

describe('createMainWorldMessage', () => {
  it('should create a message with BUGREPLAY_SOURCE', () => {
    const msg = createMainWorldMessage('BR_CONSOLE_ERROR', {
      level: 'error',
      message: 'TypeError: x is not a function',
      timestamp: 1234,
    });
    expect(msg.source).toBe(BUGREPLAY_SOURCE);
    expect(msg.type).toBe('BR_CONSOLE_ERROR');
  });
});

describe('isMainWorldMessage', () => {
  it('should return true for valid bugreplay messages', () => {
    const msg = { source: 'bugreplay', type: 'BR_CONSOLE_ERROR', payload: {} };
    expect(isMainWorldMessage(msg)).toBe(true);
  });

  it('should return false for non-bugreplay messages', () => {
    expect(isMainWorldMessage({ source: 'other', type: 'FOO' })).toBe(false);
    expect(isMainWorldMessage(null)).toBe(false);
    expect(isMainWorldMessage('string')).toBe(false);
  });
});
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `pnpm test src/shared/__tests__/ --run`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add src/shared/
git commit -m "feat: add shared types, constants, and messaging for BugReplay"
```

---

## Phase 2: Core Capture Engine

### Task 4: Port selector.ts from SnapMark

**Files:**
- Create: `src/content/capture/selector.ts` (port from `/data/bak20250527/agentation/src/content/capture/selector.ts`)
- Test: `src/content/capture/__tests__/selector.test.ts`

- [ ] **Step 1: Port selector.ts as-is from SnapMark**

Copy `/data/bak20250527/agentation/src/content/capture/selector.ts` to `src/content/capture/selector.ts` without modifications. The file exports:
- `isHashClassName(cls: string): boolean`
- `generateElementPath(el: Element, maxDepth?: number): string`
- `generateUniqueSelector(el: Element): string`
- `deepElementFromPoint(x: number, y: number): Element | null`

- [ ] **Step 2: Write tests for selector.ts**

```typescript
// src/content/capture/__tests__/selector.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isHashClassName, generateElementPath, generateUniqueSelector } from '../selector';

describe('isHashClassName', () => {
  it('should detect CSS Modules hash classes', () => {
    expect(isHashClassName('header_abc12de')).toBe(true);
    expect(isHashClassName('nav_xY3Zw9q')).toBe(true);
  });

  it('should detect styled-components classes', () => {
    expect(isHashClassName('sc-abcdef')).toBe(true);
  });

  it('should detect emotion classes', () => {
    expect(isHashClassName('css-1a2b3c')).toBe(true);
  });

  it('should not flag normal classes', () => {
    expect(isHashClassName('btn-primary')).toBe(false);
    expect(isHashClassName('header')).toBe(false);
    expect(isHashClassName('main-content')).toBe(false);
  });
});

describe('generateElementPath', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('should generate a path with tag and classes', () => {
    container.innerHTML = '<main><div class="panel"><button class="btn">Click</button></div></main>';
    const btn = container.querySelector('button')!;
    const path = generateElementPath(btn);
    expect(path).toContain('button.btn');
    expect(path).toContain(' > ');
  });

  it('should include id when present', () => {
    container.innerHTML = '<div id="app"><button>Click</button></div>';
    const btn = container.querySelector('button')!;
    const path = generateElementPath(btn);
    expect(path).toContain('div#app');
  });

  it('should respect maxDepth', () => {
    container.innerHTML = '<div><div><div><div><div><button>Deep</button></div></div></div></div></div>';
    const btn = container.querySelector('button')!;
    const path = generateElementPath(btn, 2);
    const segments = path.split(' > ');
    expect(segments.length).toBeLessThanOrEqual(2);
  });
});

describe('generateUniqueSelector', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('should use id when available', () => {
    container.innerHTML = '<button id="submit-btn">Submit</button>';
    const btn = container.querySelector('button')!;
    expect(generateUniqueSelector(btn)).toBe('#submit-btn');
  });

  it('should use data-testid when available', () => {
    container.innerHTML = '<button data-testid="submit">Submit</button>';
    const btn = container.querySelector('button')!;
    expect(generateUniqueSelector(btn)).toBe('[data-testid="submit"]');
  });

  it('should fall back to class selector', () => {
    container.innerHTML = '<button class="unique-btn">Submit</button>';
    const btn = container.querySelector('button')!;
    const sel = generateUniqueSelector(btn);
    expect(sel).toContain('unique-btn');
  });
});
```

- [ ] **Step 3: Run tests**

Run: `pnpm test src/content/capture/__tests__/selector.test.ts --run`
Expected: All tests PASS

- [ ] **Step 4: Commit**

```bash
git add src/content/capture/selector.ts src/content/capture/__tests__/selector.test.ts
git commit -m "feat: port selector.ts from SnapMark with tests"
```

---

### Task 5: Port and adapt element-info.ts from SnapMark

**Files:**
- Create: `src/content/capture/element-info.ts` (adapted from `/data/bak20250527/agentation/src/content/capture/element-info.ts`)
- Test: `src/content/capture/__tests__/element-info.test.ts`

- [ ] **Step 1: Write failing test for extractElementInfo**

```typescript
// src/content/capture/__tests__/element-info.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { extractElementInfo } from '../element-info';

describe('extractElementInfo', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('should extract tag, selector, path, and textContent', () => {
    container.innerHTML = '<button id="save-btn" class="btn">Save</button>';
    const btn = container.querySelector('button')!;
    const info = extractElementInfo(btn);
    expect(info.tag).toBe('button');
    expect(info.selector).toBe('#save-btn');
    expect(info.textContent).toBe('Save');
    expect(info.path).toContain('button');
  });

  it('should extract whitelisted attributes', () => {
    container.innerHTML = '<input type="email" name="email" placeholder="Enter email" data-testid="email-input">';
    const input = container.querySelector('input')!;
    const info = extractElementInfo(input);
    expect(info.attributes['type']).toBe('email');
    expect(info.attributes['name']).toBe('email');
    expect(info.attributes['placeholder']).toBe('Enter email');
    expect(info.attributes['data-testid']).toBe('email-input');
  });

  it('should filter out hash CSS classes', () => {
    container.innerHTML = '<div class="header sc-abc123 main-nav css-xyz99">Nav</div>';
    const el = container.querySelector('div.header')!;
    const info = extractElementInfo(el);
    expect(info.cssClasses).toContain('header');
    expect(info.cssClasses).toContain('main-nav');
    expect(info.cssClasses).not.toContain('sc-abc123');
    expect(info.cssClasses).not.toContain('css-xyz99');
  });

  it('should extract accessibility info', () => {
    container.innerHTML = '<button role="tab" aria-label="Settings tab">Settings</button>';
    const btn = container.querySelector('button')!;
    const info = extractElementInfo(btn);
    expect(info.role).toBe('tab');
    expect(info.ariaLabel).toBe('Settings tab');
  });

  it('should truncate long text content', () => {
    container.innerHTML = `<button>${'A'.repeat(100)}</button>`;
    const btn = container.querySelector('button')!;
    const info = extractElementInfo(btn);
    expect(info.textContent.length).toBeLessThanOrEqual(28); // 25 + "..."
  });

  it('should NOT include boundingBox, viewport, computedStyles, or nearbyElements', () => {
    container.innerHTML = '<button>Test</button>';
    const btn = container.querySelector('button')!;
    const info = extractElementInfo(btn);
    expect(info).not.toHaveProperty('boundingBox');
    expect(info).not.toHaveProperty('viewport');
    expect(info).not.toHaveProperty('computedStyles');
    expect(info).not.toHaveProperty('nearbyElements');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/content/capture/__tests__/element-info.test.ts --run`
Expected: FAIL — module not found

- [ ] **Step 3: Implement element-info.ts (adapted from SnapMark)**

Port from SnapMark's `element-info.ts` with these changes:
- Return `ElementInfo` type (from `shared/types.ts`) instead of `Partial<Annotation>`
- Remove: `boundingBox`, `viewport`, `computedStyles`, `nearbyText`, `nearbyElements`, `isFixed`
- Keep: `tag`, `selector`, `path`, `textContent`, `attributes`, `cssClasses`, `role`, `ariaLabel`
- Add: `framework` field (populated later via main-world messages)

```typescript
// src/content/capture/element-info.ts
import { generateElementPath, generateUniqueSelector, isHashClassName } from './selector';
import type { ElementInfo } from '../../shared/types';
import { SHORT_TEXT_LIMIT, LONG_TEXT_LIMIT } from '../../shared/constants';

const SHORT_TEXT_TAGS = new Set(['button', 'a', 'input']);
const ALLOWED_ATTR_PREFIXES = ['data-', 'aria-'];
const ALLOWED_ATTR_EXACT = new Set(['id', 'role', 'href', 'name', 'type', 'placeholder']);
const SKIP_ATTRS = new Set(['class', 'style']);

function truncateText(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return text.slice(0, limit) + '...';
}

function filterClasses(el: Element): string[] {
  return Array.from(el.classList).filter(c => !isHashClassName(c));
}

function extractAttributes(el: Element): Record<string, string> {
  const result: Record<string, string> = {};
  for (const attr of Array.from(el.attributes)) {
    if (SKIP_ATTRS.has(attr.name)) continue;
    if (ALLOWED_ATTR_EXACT.has(attr.name)) {
      result[attr.name] = attr.value;
      continue;
    }
    if (ALLOWED_ATTR_PREFIXES.some(p => attr.name.startsWith(p))) {
      result[attr.name] = attr.value;
    }
  }
  return result;
}

function extractTextContent(el: Element): string {
  const raw = (el.textContent ?? '').trim();
  const tag = el.tagName.toLowerCase();
  const limit = SHORT_TEXT_TAGS.has(tag) ? SHORT_TEXT_LIMIT : LONG_TEXT_LIMIT;
  return truncateText(raw, limit);
}

export function extractElementInfo(el: Element): ElementInfo {
  return {
    tag: el.tagName.toLowerCase(),
    selector: generateUniqueSelector(el),
    path: generateElementPath(el),
    textContent: extractTextContent(el),
    attributes: extractAttributes(el),
    cssClasses: filterClasses(el),
    role: el.getAttribute('role') ?? undefined,
    ariaLabel: el.getAttribute('aria-label') ?? undefined,
  };
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test src/content/capture/__tests__/element-info.test.ts --run`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/content/capture/element-info.ts src/content/capture/__tests__/element-info.test.ts
git commit -m "feat: port element-info.ts from SnapMark, stripped to semantic fields only"
```

---

### Task 6: Implement input-debouncer

**Files:**
- Create: `src/content/recorder/input-debouncer.ts`
- Test: `src/content/recorder/__tests__/input-debouncer.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/content/recorder/__tests__/input-debouncer.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InputDebouncer } from '../input-debouncer';

describe('InputDebouncer', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('should merge rapid keystrokes into a single fill value', () => {
    const onFill = vi.fn();
    const debouncer = new InputDebouncer(onFill);

    debouncer.handleInput('h');
    debouncer.handleInput('he');
    debouncer.handleInput('hel');
    debouncer.handleInput('hello');

    expect(onFill).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(onFill).toHaveBeenCalledOnce();
    expect(onFill).toHaveBeenCalledWith('hello');
  });

  it('should emit separate fills after debounce gap', () => {
    const onFill = vi.fn();
    const debouncer = new InputDebouncer(onFill);

    debouncer.handleInput('abc');
    vi.advanceTimersByTime(500);
    expect(onFill).toHaveBeenCalledWith('abc');

    debouncer.handleInput('xyz');
    vi.advanceTimersByTime(500);
    expect(onFill).toHaveBeenCalledTimes(2);
    expect(onFill).toHaveBeenLastCalledWith('xyz');
  });

  it('should flush pending value on flush()', () => {
    const onFill = vi.fn();
    const debouncer = new InputDebouncer(onFill);

    debouncer.handleInput('partial');
    debouncer.flush();
    expect(onFill).toHaveBeenCalledWith('partial');
  });

  it('should mask password fields', () => {
    const onFill = vi.fn();
    const debouncer = new InputDebouncer(onFill);

    debouncer.handleInput('secret123', true);
    vi.advanceTimersByTime(500);
    expect(onFill).toHaveBeenCalledWith('••••••••');
  });

  it('should do nothing when flushed with no pending input', () => {
    const onFill = vi.fn();
    const debouncer = new InputDebouncer(onFill);

    debouncer.flush();
    expect(onFill).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/content/recorder/__tests__/input-debouncer.test.ts --run`
Expected: FAIL — module not found

- [ ] **Step 3: Implement input-debouncer.ts**

```typescript
// src/content/recorder/input-debouncer.ts
import { INPUT_DEBOUNCE_MS } from '../../shared/constants';

const PASSWORD_MASK = '••••••••';

export class InputDebouncer {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private lastValue: string | null = null;
  private isPassword = false;
  private onFill: (value: string) => void;

  constructor(onFill: (value: string) => void) {
    this.onFill = onFill;
  }

  handleInput(value: string, isPassword = false): void {
    this.lastValue = value;
    this.isPassword = isPassword;

    if (this.timer !== null) {
      clearTimeout(this.timer);
    }

    this.timer = setTimeout(() => {
      this.emit();
    }, INPUT_DEBOUNCE_MS);
  }

  flush(): void {
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.emit();
  }

  private emit(): void {
    if (this.lastValue === null) return;
    const value = this.isPassword ? PASSWORD_MASK : this.lastValue;
    this.lastValue = null;
    this.timer = null;
    this.onFill(value);
  }
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test src/content/recorder/__tests__/input-debouncer.test.ts --run`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/content/recorder/input-debouncer.ts src/content/recorder/__tests__/input-debouncer.test.ts
git commit -m "feat: add InputDebouncer with 500ms keystroke merging and password masking"
```

---

### Task 7: Implement navigation-detector

**Files:**
- Create: `src/content/recorder/navigation-detector.ts`
- Test: `src/content/recorder/__tests__/navigation-detector.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/content/recorder/__tests__/navigation-detector.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NavigationDetector } from '../navigation-detector';

describe('NavigationDetector', () => {
  let onNavigate: ReturnType<typeof vi.fn>;
  let detector: NavigationDetector;

  beforeEach(() => {
    onNavigate = vi.fn();
    detector = new NavigationDetector(onNavigate);
  });

  afterEach(() => {
    detector.destroy();
  });

  it('should detect popstate events after URL change', () => {
    detector.start();
    // Simulate SPA navigation: pushState changes URL, then popstate fires
    history.pushState({}, '', '/new-page');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(onNavigate).toHaveBeenCalledWith(expect.stringContaining('/new-page'));
    // Restore
    history.pushState({}, '', '/');
  });

  it('should detect hashchange events', () => {
    detector.start();
    // Simulate hash change
    const oldHref = window.location.href;
    window.location.hash = '#new-section';
    window.dispatchEvent(new HashChangeEvent('hashchange', {
      newURL: window.location.href,
      oldURL: oldHref,
    }));
    expect(onNavigate).toHaveBeenCalled();
    window.location.hash = '';
  });

  it('should not fire after destroy()', () => {
    detector.start();
    detector.destroy();
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/content/recorder/__tests__/navigation-detector.test.ts --run`
Expected: FAIL

- [ ] **Step 3: Implement navigation-detector.ts**

```typescript
// src/content/recorder/navigation-detector.ts
export class NavigationDetector {
  private onNavigate: (url: string) => void;
  private popstateHandler: (() => void) | null = null;
  private hashchangeHandler: (() => void) | null = null;
  private beforeunloadHandler: (() => void) | null = null;
  private titleObserver: MutationObserver | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private lastUrl: string = '';

  constructor(onNavigate: (url: string) => void) {
    this.onNavigate = onNavigate;
  }

  start(): void {
    this.lastUrl = window.location.href;

    this.popstateHandler = () => {
      this.checkNavigation();
    };

    this.hashchangeHandler = () => {
      this.checkNavigation();
    };

    this.beforeunloadHandler = () => {
      this.checkNavigation();
    };

    window.addEventListener('popstate', this.popstateHandler);
    window.addEventListener('hashchange', this.hashchangeHandler);
    window.addEventListener('beforeunload', this.beforeunloadHandler);

    // Observe <title> changes (common in SPAs)
    const titleEl = document.querySelector('title');
    if (titleEl) {
      this.titleObserver = new MutationObserver(() => {
        this.checkNavigation();
      });
      this.titleObserver.observe(titleEl, { childList: true, characterData: true, subtree: true });
    }

    // Poll for SPA navigations that don't trigger any events
    this.pollTimer = setInterval(() => {
      this.checkNavigation();
    }, 500);
  }

  destroy(): void {
    if (this.popstateHandler) {
      window.removeEventListener('popstate', this.popstateHandler);
      this.popstateHandler = null;
    }
    if (this.hashchangeHandler) {
      window.removeEventListener('hashchange', this.hashchangeHandler);
      this.hashchangeHandler = null;
    }
    if (this.beforeunloadHandler) {
      window.removeEventListener('beforeunload', this.beforeunloadHandler);
      this.beforeunloadHandler = null;
    }
    if (this.titleObserver) {
      this.titleObserver.disconnect();
      this.titleObserver = null;
    }
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private checkNavigation(): void {
    const currentUrl = window.location.href;
    if (currentUrl !== this.lastUrl) {
      this.lastUrl = currentUrl;
      this.onNavigate(currentUrl);
    }
  }
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test src/content/recorder/__tests__/navigation-detector.test.ts --run`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/content/recorder/navigation-detector.ts src/content/recorder/__tests__/navigation-detector.test.ts
git commit -m "feat: add NavigationDetector with popstate, hashchange, and SPA polling"
```

---

### Task 8: Implement step-builder

**Files:**
- Create: `src/content/recorder/step-builder.ts`
- Test: `src/content/recorder/__tests__/step-builder.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/content/recorder/__tests__/step-builder.test.ts
import { describe, it, expect } from 'vitest';
import { StepBuilder } from '../step-builder';
import type { RecordingStep } from '../../../shared/types';

describe('StepBuilder', () => {
  it('should create a navigate step', () => {
    const builder = new StepBuilder(1000);
    const step = builder.navigate('https://example.com');
    expect(step).toEqual<RecordingStep>({
      index: 0,
      action: 'navigate',
      timestamp: expect.any(Number),
      url: 'https://example.com',
    });
  });

  it('should increment index for each step', () => {
    const builder = new StepBuilder(1000);
    const s1 = builder.navigate('https://example.com');
    const s2 = builder.click({
      tag: 'button', selector: '#btn', path: 'div > button',
      textContent: 'Click', attributes: {}, cssClasses: [],
    });
    expect(s1.index).toBe(0);
    expect(s2.index).toBe(1);
  });

  it('should create a click step with element info', () => {
    const builder = new StepBuilder(Date.now());
    const step = builder.click({
      tag: 'button', selector: '[data-testid="save"]', path: 'form > button',
      textContent: 'Save', attributes: { type: 'submit' }, cssClasses: ['btn'],
    });
    expect(step.action).toBe('click');
    expect(step.element?.selector).toBe('[data-testid="save"]');
  });

  it('should create a fill step', () => {
    const builder = new StepBuilder(Date.now());
    const step = builder.fill(
      { tag: 'input', selector: '#email', path: 'form > input', textContent: '', attributes: { type: 'email' }, cssClasses: [] },
      'test@example.com',
    );
    expect(step.action).toBe('fill');
    expect(step.value).toBe('test@example.com');
  });

  it('should create a scroll step', () => {
    const builder = new StepBuilder(Date.now());
    const step = builder.scroll(0, 500);
    expect(step.action).toBe('scroll');
    expect(step.scrollPosition).toEqual({ x: 0, y: 500 });
  });

  it('should create a keypress step', () => {
    const builder = new StepBuilder(Date.now());
    const step = builder.keypress('Enter');
    expect(step.action).toBe('keypress');
    expect(step.key).toBe('Enter');
  });

  it('should compute timestamp as offset from session start', () => {
    const sessionStart = 1000;
    const builder = new StepBuilder(sessionStart);
    const now = Date.now();
    const step = builder.navigate('https://example.com');
    expect(step.timestamp).toBeGreaterThanOrEqual(now - sessionStart - 100);
  });

  it('should return current step index', () => {
    const builder = new StepBuilder(Date.now());
    expect(builder.currentIndex).toBe(0);
    builder.navigate('https://example.com');
    expect(builder.currentIndex).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/content/recorder/__tests__/step-builder.test.ts --run`
Expected: FAIL

- [ ] **Step 3: Implement step-builder.ts**

```typescript
// src/content/recorder/step-builder.ts
import type { RecordingStep, ElementInfo } from '../../shared/types';

export class StepBuilder {
  private nextIndex = 0;
  private sessionStart: number;

  constructor(sessionStart: number) {
    this.sessionStart = sessionStart;
  }

  get currentIndex(): number {
    return this.nextIndex;
  }

  navigate(url: string): RecordingStep {
    return this.createStep({ action: 'navigate', url });
  }

  click(element: ElementInfo): RecordingStep {
    return this.createStep({ action: 'click', element });
  }

  fill(element: ElementInfo, value: string): RecordingStep {
    return this.createStep({ action: 'fill', element, value });
  }

  select(element: ElementInfo, value: string): RecordingStep {
    return this.createStep({ action: 'select', element, value });
  }

  check(element: ElementInfo): RecordingStep {
    return this.createStep({ action: 'check', element });
  }

  scroll(x: number, y: number): RecordingStep {
    return this.createStep({ action: 'scroll', scrollPosition: { x, y } });
  }

  keypress(key: string): RecordingStep {
    return this.createStep({ action: 'keypress', key });
  }

  private createStep(fields: Partial<RecordingStep>): RecordingStep {
    return {
      ...fields,
      index: this.nextIndex++,
      action: fields.action!,
      timestamp: Date.now() - this.sessionStart,
    } as RecordingStep;
  }
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test src/content/recorder/__tests__/step-builder.test.ts --run`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/content/recorder/step-builder.ts src/content/recorder/__tests__/step-builder.test.ts
git commit -m "feat: add StepBuilder for normalizing raw events into RecordingSteps"
```

---

### Task 9: Implement recording-store

**Files:**
- Create: `src/content/store/recording-store.ts`
- Test: `src/content/store/__tests__/recording-store.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/content/store/__tests__/recording-store.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { RecordingStore } from '../recording-store';

describe('RecordingStore', () => {
  let store: RecordingStore;

  beforeEach(() => {
    store = new RecordingStore();
  });

  it('should start a new session', () => {
    store.startSession('https://example.com', 'Test Bug');
    const session = store.getSession();
    expect(session).not.toBeNull();
    expect(session!.url).toBe('https://example.com');
    expect(session!.title).toBe('Test Bug');
    expect(session!.status).toBe('recording');
    expect(session!.steps).toEqual([]);
  });

  it('should add steps to the session', () => {
    store.startSession('https://example.com', 'Test');
    store.addStep({
      index: 0, action: 'navigate', timestamp: 0, url: 'https://example.com',
    });
    expect(store.getSession()!.steps).toHaveLength(1);
  });

  it('should add network entries', () => {
    store.startSession('https://example.com', 'Test');
    store.addNetworkEntry({
      index: 0, method: 'GET', url: '/api/data', status: 200,
      duration: 100, size: 1024, stepIndex: 0, timestamp: 500,
    });
    expect(store.getSession()!.networkLog).toHaveLength(1);
  });

  it('should add console errors', () => {
    store.startSession('https://example.com', 'Test');
    store.addConsoleEntry({
      level: 'error', message: 'TypeError', stepIndex: 0, timestamp: 600,
    });
    expect(store.getSession()!.consoleErrors).toHaveLength(1);
  });

  it('should pause and resume', () => {
    store.startSession('https://example.com', 'Test');
    store.pause();
    expect(store.getSession()!.status).toBe('paused');
    store.resume();
    expect(store.getSession()!.status).toBe('recording');
  });

  it('should stop the session', () => {
    store.startSession('https://example.com', 'Test');
    store.stop();
    expect(store.getSession()!.status).toBe('stopped');
  });

  it('should return null when no session', () => {
    expect(store.getSession()).toBeNull();
  });

  it('should set framework info', () => {
    store.startSession('https://example.com', 'Test');
    store.setFramework({ name: 'React', version: '18.2.0' });
    expect(store.getSession()!.framework).toEqual({ name: 'React', version: '18.2.0' });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/content/store/__tests__/recording-store.test.ts --run`
Expected: FAIL

- [ ] **Step 3: Implement recording-store.ts**

```typescript
// src/content/store/recording-store.ts
import type { RecordingSession, RecordingStep, NetworkEntry, ConsoleEntry } from '../../shared/types';

export class RecordingStore {
  private session: RecordingSession | null = null;

  startSession(url: string, title: string): void {
    this.session = {
      id: crypto.randomUUID(),
      title,
      startedAt: Date.now(),
      url,
      browserInfo: {
        name: 'Chrome',
        version: navigator.userAgent.match(/Chrome\/([\d.]+)/)?.[1] ?? 'unknown',
        userAgent: navigator.userAgent,
      },
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      steps: [],
      networkLog: [],
      consoleErrors: [],
      status: 'recording',
    };
  }

  getSession(): RecordingSession | null {
    return this.session;
  }

  addStep(step: RecordingStep): void {
    if (!this.session || this.session.status !== 'recording') return;
    this.session.steps.push(step);
  }

  addNetworkEntry(entry: NetworkEntry): void {
    if (!this.session) return;
    this.session.networkLog.push(entry);
  }

  addConsoleEntry(entry: ConsoleEntry): void {
    if (!this.session) return;
    this.session.consoleErrors.push(entry);
  }

  setFramework(fw: { name: string; version?: string }): void {
    if (!this.session) return;
    this.session.framework = fw;
  }

  pause(): void {
    if (this.session?.status === 'recording') {
      this.session.status = 'paused';
    }
  }

  resume(): void {
    if (this.session?.status === 'paused') {
      this.session.status = 'recording';
    }
  }

  stop(): void {
    if (this.session) {
      this.session.status = 'stopped';
    }
  }
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test src/content/store/__tests__/recording-store.test.ts --run`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/content/store/recording-store.ts src/content/store/__tests__/recording-store.test.ts
git commit -m "feat: add RecordingStore for in-memory session state management"
```

---

### Task 10: Implement event-recorder

**Files:**
- Create: `src/content/recorder/event-recorder.ts`
- Test: `src/content/recorder/__tests__/event-recorder.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/content/recorder/__tests__/event-recorder.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventRecorder } from '../event-recorder';
import type { RecordingStep } from '../../../shared/types';

describe('EventRecorder', () => {
  let onStep: ReturnType<typeof vi.fn>;
  let recorder: EventRecorder;

  beforeEach(() => {
    vi.useFakeTimers();
    onStep = vi.fn();
    recorder = new EventRecorder(onStep);
  });

  afterEach(() => {
    recorder.destroy();
    vi.useRealTimers();
  });

  it('should capture click events', () => {
    document.body.innerHTML = '<button id="test-btn">Click me</button>';
    recorder.start(Date.now());

    const btn = document.querySelector('#test-btn')!;
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(onStep).toHaveBeenCalledOnce();
    const step: RecordingStep = onStep.mock.calls[0][0];
    expect(step.action).toBe('click');
    expect(step.element?.tag).toBe('button');
  });

  it('should capture input events with debouncing', () => {
    document.body.innerHTML = '<input id="test-input" type="text">';
    recorder.start(Date.now());

    const input = document.querySelector('#test-input') as HTMLInputElement;
    input.value = 'h';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.value = 'hello';
    input.dispatchEvent(new Event('input', { bubbles: true }));

    expect(onStep).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);

    expect(onStep).toHaveBeenCalledOnce();
    const step: RecordingStep = onStep.mock.calls[0][0];
    expect(step.action).toBe('fill');
    expect(step.value).toBe('hello');
  });

  it('should capture special key presses', () => {
    recorder.start(Date.now());
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));

    expect(onStep).toHaveBeenCalledOnce();
    const step: RecordingStep = onStep.mock.calls[0][0];
    expect(step.action).toBe('keypress');
    expect(step.key).toBe('Enter');
  });

  it('should ignore non-special key presses', () => {
    recorder.start(Date.now());
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true }));
    expect(onStep).not.toHaveBeenCalled();
  });

  it('should capture scroll events with debouncing', () => {
    recorder.start(Date.now());
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('scroll'));

    expect(onStep).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);

    expect(onStep).toHaveBeenCalledOnce();
    const step: RecordingStep = onStep.mock.calls[0][0];
    expect(step.action).toBe('scroll');
  });

  it('should not capture events after destroy()', () => {
    recorder.start(Date.now());
    recorder.destroy();

    document.body.innerHTML = '<button id="btn">X</button>';
    document.querySelector('#btn')!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onStep).not.toHaveBeenCalled();
  });

  it('should mask password input values', () => {
    document.body.innerHTML = '<input id="pw" type="password">';
    recorder.start(Date.now());

    const input = document.querySelector('#pw') as HTMLInputElement;
    input.value = 'secret';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    vi.advanceTimersByTime(500);

    const step: RecordingStep = onStep.mock.calls[0][0];
    expect(step.value).toBe('••••••••');
  });

  it('should capture select change events', () => {
    document.body.innerHTML = '<select id="color"><option value="red">Red</option><option value="blue">Blue</option></select>';
    recorder.start(Date.now());

    const select = document.querySelector('#color') as HTMLSelectElement;
    select.value = 'blue';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    vi.advanceTimersByTime(500);

    expect(onStep).toHaveBeenCalledOnce();
    const step: RecordingStep = onStep.mock.calls[0][0];
    expect(step.action).toBe('select');
    expect(step.value).toBe('blue');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/content/recorder/__tests__/event-recorder.test.ts --run`
Expected: FAIL

- [ ] **Step 3: Implement event-recorder.ts**

```typescript
// src/content/recorder/event-recorder.ts
import { extractElementInfo } from '../capture/element-info';
import { StepBuilder } from './step-builder';
import { InputDebouncer } from './input-debouncer';
import type { RecordingStep } from '../../shared/types';
import { SCROLL_DEBOUNCE_MS, SPECIAL_KEYS } from '../../shared/constants';

export class EventRecorder {
  private onStep: (step: RecordingStep) => void;
  private stepBuilder: StepBuilder | null = null;
  private inputDebouncer: InputDebouncer | null = null;
  private scrollTimer: ReturnType<typeof setTimeout> | null = null;
  private lastInputElement: Element | null = null;

  private clickHandler: ((e: MouseEvent) => void) | null = null;
  private inputHandler: ((e: Event) => void) | null = null;
  private changeHandler: ((e: Event) => void) | null = null;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private scrollHandler: (() => void) | null = null;

  constructor(onStep: (step: RecordingStep) => void) {
    this.onStep = onStep;
  }

  start(sessionStart: number): void {
    this.stepBuilder = new StepBuilder(sessionStart);

    this.inputDebouncer = new InputDebouncer((value: string) => {
      if (!this.stepBuilder || !this.lastInputElement) return;
      const info = extractElementInfo(this.lastInputElement);
      const step = this.stepBuilder.fill(info, value);
      this.onStep(step);
    });

    this.clickHandler = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target || !this.stepBuilder) return;
      // Flush any pending input before recording click
      this.inputDebouncer?.flush();
      const info = extractElementInfo(target);
      const step = this.stepBuilder.click(info);
      this.onStep(step);
    };

    this.inputHandler = (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (!target || !this.inputDebouncer) return;
      this.lastInputElement = target;
      const isPassword = target instanceof HTMLInputElement && target.type === 'password';
      this.inputDebouncer.handleInput(target.value, isPassword);
    };

    this.changeHandler = (e: Event) => {
      const target = e.target as HTMLSelectElement;
      if (!target || !this.stepBuilder) return;
      if (target.tagName.toLowerCase() === 'select') {
        const info = extractElementInfo(target);
        const step = this.stepBuilder.select(info, target.value);
        this.onStep(step);
      }
    };

    this.keydownHandler = (e: KeyboardEvent) => {
      if (!this.stepBuilder || !SPECIAL_KEYS.has(e.key)) return;
      const step = this.stepBuilder.keypress(e.key);
      this.onStep(step);
    };

    this.scrollHandler = () => {
      if (this.scrollTimer) clearTimeout(this.scrollTimer);
      this.scrollTimer = setTimeout(() => {
        if (!this.stepBuilder) return;
        const step = this.stepBuilder.scroll(window.scrollX, window.scrollY);
        this.onStep(step);
      }, SCROLL_DEBOUNCE_MS);
    };

    document.addEventListener('click', this.clickHandler, { capture: true, passive: true });
    document.addEventListener('input', this.inputHandler, { capture: true, passive: true });
    document.addEventListener('change', this.changeHandler, { capture: true, passive: true });
    document.addEventListener('keydown', this.keydownHandler, { capture: true, passive: true });
    window.addEventListener('scroll', this.scrollHandler, { passive: true });
  }

  destroy(): void {
    if (this.clickHandler) {
      document.removeEventListener('click', this.clickHandler, { capture: true });
      this.clickHandler = null;
    }
    if (this.inputHandler) {
      document.removeEventListener('input', this.inputHandler, { capture: true });
      this.inputHandler = null;
    }
    if (this.changeHandler) {
      document.removeEventListener('change', this.changeHandler, { capture: true });
      this.changeHandler = null;
    }
    if (this.keydownHandler) {
      document.removeEventListener('keydown', this.keydownHandler, { capture: true });
      this.keydownHandler = null;
    }
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler);
      this.scrollHandler = null;
    }
    if (this.scrollTimer) {
      clearTimeout(this.scrollTimer);
      this.scrollTimer = null;
    }
    this.inputDebouncer?.flush();
    this.inputDebouncer = null;
    this.stepBuilder = null;
  }
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test src/content/recorder/__tests__/event-recorder.test.ts --run`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/content/recorder/event-recorder.ts src/content/recorder/__tests__/event-recorder.test.ts
git commit -m "feat: add EventRecorder with click, input, keypress, and scroll capture"
```

---

## Phase 3: Background + Network/Console

### Task 11: Implement background service-worker

**Files:**
- Create: `src/background/service-worker.ts`

- [ ] **Step 1: Implement service-worker.ts**

```typescript
// src/background/service-worker.ts
import { startNetworkCapture, stopNetworkCapture } from './network-capture';
import type { ExtensionMessage } from '../shared/messaging';

const recordingTabs = new Set<number>();

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    // Use sender.tab.id for tab identification (content scripts don't know their own tabId)
    const tabId = sender.tab?.id ?? -1;

    switch (message.type) {
      case 'START_RECORDING': {
        recordingTabs.add(tabId);
        startNetworkCapture(tabId);
        sendResponse({ ok: true, tabId });
        break;
      }
      case 'STOP_RECORDING': {
        recordingTabs.delete(tabId);
        stopNetworkCapture(tabId);
        sendResponse({ ok: true });
        break;
      }
      case 'PAUSE_RECORDING': {
        stopNetworkCapture(tabId);
        sendResponse({ ok: true });
        break;
      }
      case 'RESUME_RECORDING': {
        startNetworkCapture(tabId);
        sendResponse({ ok: true });
        break;
      }
      case 'GET_RECORDING_STATE': {
        sendResponse({ status: recordingTabs.has(tabId) ? 'recording' : 'stopped' });
        break;
      }
    }
    return true; // async response
  },
);
```

- [ ] **Step 2: Commit**

```bash
git add src/background/service-worker.ts
git commit -m "feat: add background service worker for session and network routing"
```

---

### Task 12: Implement network-capture

**Files:**
- Create: `src/background/network-capture.ts`

- [ ] **Step 1: Implement network-capture.ts**

```typescript
// src/background/network-capture.ts
import type { NetworkEntry } from '../shared/types';

interface PendingRequest {
  method: string;
  url: string;
  startTime: number;
  tabId: number;
}

const pendingRequests = new Map<string, PendingRequest>();
const tabListeners = new Map<number, boolean>();
let networkIndex = 0;

function onBeforeRequest(details: chrome.webRequest.WebRequestBodyDetails): void {
  if (!tabListeners.has(details.tabId)) return;
  pendingRequests.set(details.requestId, {
    method: details.method,
    url: details.url,
    startTime: Date.now(),
    tabId: details.tabId,
  });
}

function onCompleted(details: chrome.webRequest.WebResponseCacheDetails): void {
  const pending = pendingRequests.get(details.requestId);
  if (!pending) return;
  pendingRequests.delete(details.requestId);

  const entry: NetworkEntry = {
    index: networkIndex++,
    method: pending.method,
    url: pending.url,
    status: details.statusCode,
    duration: Date.now() - pending.startTime,
    size: 0, // Not available from webRequest alone
    stepIndex: -1, // Will be correlated by content script
    timestamp: Date.now(),
  };

  chrome.tabs.sendMessage(pending.tabId, {
    type: 'NETWORK_ENTRY',
    payload: { entry },
  }).catch(() => {});
}

function onErrorOccurred(details: chrome.webRequest.WebResponseErrorDetails): void {
  const pending = pendingRequests.get(details.requestId);
  if (!pending) return;
  pendingRequests.delete(details.requestId);

  const entry: NetworkEntry = {
    index: networkIndex++,
    method: pending.method,
    url: pending.url,
    status: 0,
    duration: Date.now() - pending.startTime,
    size: 0,
    stepIndex: -1,
    timestamp: Date.now(),
  };

  chrome.tabs.sendMessage(pending.tabId, {
    type: 'NETWORK_ENTRY',
    payload: { entry },
  }).catch(() => {});
}

export function startNetworkCapture(tabId: number): void {
  if (tabListeners.has(tabId)) return;
  tabListeners.set(tabId, true);

  if (tabListeners.size === 1) {
    chrome.webRequest.onBeforeRequest.addListener(onBeforeRequest, { urls: ['<all_urls>'] }, []);
    chrome.webRequest.onCompleted.addListener(onCompleted, { urls: ['<all_urls>'] }, []);
    chrome.webRequest.onErrorOccurred.addListener(onErrorOccurred, { urls: ['<all_urls>'] });
  }
}

export function stopNetworkCapture(tabId: number): void {
  tabListeners.delete(tabId);

  if (tabListeners.size === 0) {
    chrome.webRequest.onBeforeRequest.removeListener(onBeforeRequest);
    chrome.webRequest.onCompleted.removeListener(onCompleted);
    chrome.webRequest.onErrorOccurred.removeListener(onErrorOccurred);
    pendingRequests.clear();
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/background/network-capture.ts
git commit -m "feat: add network capture via chrome.webRequest in background worker"
```

---

### Task 13: Implement main-world.ts (console capture + framework detection)

**Files:**
- Create: `src/content/main-world.ts`

- [ ] **Step 1: Implement main-world.ts**

Adapted from SnapMark's `main-world.ts` — adds console error capture and simplified framework detection (no separate framework module files for now; detect via global checks).

```typescript
// src/content/main-world.ts
const BUGREPLAY_SOURCE = 'bugreplay';

// Duplicated from shared/messaging.ts because main-world runs in a separate JS context

// --- Console Error + Warn Capture ---

const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

console.error = function (...args: unknown[]) {
  originalConsoleError.apply(console, args);
  const message = args.map(a => (typeof a === 'string' ? a : String(a))).join(' ');
  window.postMessage({
    source: BUGREPLAY_SOURCE,
    type: 'BR_CONSOLE_ERROR',
    payload: { level: 'error' as const, message, timestamp: Date.now() },
  }, '*');
};

console.warn = function (...args: unknown[]) {
  originalConsoleWarn.apply(console, args);
  const message = args.map(a => (typeof a === 'string' ? a : String(a))).join(' ');
  window.postMessage({
    source: BUGREPLAY_SOURCE,
    type: 'BR_CONSOLE_ERROR',
    payload: { level: 'warn' as const, message, timestamp: Date.now() },
  }, '*');
};

window.addEventListener('error', (event) => {
  window.postMessage({
    source: BUGREPLAY_SOURCE,
    type: 'BR_CONSOLE_ERROR',
    payload: {
      level: 'error' as const,
      message: event.message,
      stack: event.error?.stack,
      timestamp: Date.now(),
    },
  }, '*');
});

window.addEventListener('unhandledrejection', (event) => {
  const message = event.reason instanceof Error
    ? event.reason.message
    : String(event.reason);
  const stack = event.reason instanceof Error ? event.reason.stack : undefined;
  window.postMessage({
    source: BUGREPLAY_SOURCE,
    type: 'BR_CONSOLE_ERROR',
    payload: { level: 'error' as const, message, stack, timestamp: Date.now() },
  }, '*');
});

// --- Framework Detection ---

function detectFrameworks(): string[] {
  const detected: string[] = [];
  const win = window as Record<string, unknown>;

  // React
  if (win.__REACT_DEVTOOLS_GLOBAL_HOOK__ || document.querySelector('[data-reactroot]')) {
    const version = (win.__REACT_DEVTOOLS_GLOBAL_HOOK__ as any)?.renderers?.values?.()?.next?.()?.value?.version;
    detected.push(version ? `React ${version}` : 'React');
  }
  // Vue
  if (win.__VUE__ || win.__vue_app__ || document.querySelector('[data-v-]')) {
    detected.push('Vue');
  }
  // Svelte
  if (document.querySelector('[class*="svelte-"]')) {
    detected.push('Svelte');
  }
  // Angular
  if (win.ng || document.querySelector('[ng-version]')) {
    const version = document.querySelector('[ng-version]')?.getAttribute('ng-version');
    detected.push(version ? `Angular ${version}` : 'Angular');
  }

  return detected;
}

let pollCount = 0;
const maxPolls = 3;

function pollDetection() {
  const detected = detectFrameworks();
  window.postMessage({
    source: BUGREPLAY_SOURCE,
    type: 'BR_FRAMEWORK_DETECT_RESULT',
    payload: { frameworks: detected },
  }, '*');

  pollCount++;
  if (pollCount < maxPolls && detected.length === 0) {
    setTimeout(pollDetection, 2000);
  }
}

setTimeout(pollDetection, 500);

// --- Component Info Request Handler ---

window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  const data = event.data;
  if (!data || data.source !== BUGREPLAY_SOURCE) return;

  if (data.type === 'BR_COMPONENT_INFO_REQUEST') {
    const selector = data.payload?.elementSelector;
    if (!selector) return;
    const el = document.querySelector(selector);
    if (!el) {
      window.postMessage({ source: BUGREPLAY_SOURCE, type: 'BR_COMPONENT_INFO', payload: null }, '*');
      return;
    }

    // Try React fiber
    const fiberKey = Object.keys(el).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
    if (fiberKey) {
      const fiber = (el as any)[fiberKey];
      let current = fiber;
      while (current) {
        if (typeof current.type === 'function' || typeof current.type === 'object') {
          const name = current.type?.displayName || current.type?.name || 'Anonymous';
          window.postMessage({
            source: BUGREPLAY_SOURCE,
            type: 'BR_COMPONENT_INFO',
            payload: { name: 'React', componentName: name },
          }, '*');
          return;
        }
        current = current.return;
      }
    }

    window.postMessage({ source: BUGREPLAY_SOURCE, type: 'BR_COMPONENT_INFO', payload: null }, '*');
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add src/content/main-world.ts
git commit -m "feat: add main-world script with console capture and framework detection"
```

---

## Phase 4: UI

### Task 14: Implement Shadow DOM host

**Files:**
- Create: `src/content/ui/host.ts` (adapted from SnapMark)
- Test: `src/content/ui/__tests__/host.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/content/ui/__tests__/host.test.ts
import { describe, it, expect, afterEach } from 'vitest';
import { createBugreplayHost, getBugreplayShadow, _resetBugreplayHost } from '../host';

describe('BugReplay Shadow DOM host', () => {
  afterEach(() => {
    document.querySelector('bugreplay-root')?.remove();
    _resetBugreplayHost();
  });

  it('should create a shadow root with toolbar and indicator zones', () => {
    const shadow = createBugreplayHost();
    expect(shadow).toBeDefined();
    expect(shadow.querySelector('#bugreplay-toolbar')).not.toBeNull();
    expect(shadow.querySelector('#bugreplay-indicator')).not.toBeNull();
  });

  it('should return the same shadow root on second call', () => {
    const shadow1 = createBugreplayHost();
    const shadow2 = createBugreplayHost();
    expect(shadow1).toBe(shadow2);
  });

  it('should be retrievable via getBugreplayShadow', () => {
    createBugreplayHost();
    expect(getBugreplayShadow()).not.toBeNull();
  });

  it('should return null before creation', () => {
    expect(getBugreplayShadow()).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/content/ui/__tests__/host.test.ts --run`
Expected: FAIL

- [ ] **Step 3: Implement host.ts**

```typescript
// src/content/ui/host.ts
const STYLES = `
:host {
  all: initial;
  font-family: system-ui, -apple-system, sans-serif;
  --br-bg: #ffffff;
  --br-text: #1a1a1a;
  --br-accent: #ef4444;
  --br-accent-hover: #dc2626;
  --br-border: #e5e5e5;
  --br-radius: 8px;
  --br-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

@media (prefers-color-scheme: dark) {
  :host {
    --br-bg: #1e1e1e;
    --br-text: #e5e5e5;
    --br-accent: #f87171;
    --br-accent-hover: #ef4444;
    --br-border: #404040;
  }
}

#bugreplay-toolbar,
#bugreplay-indicator {
  position: fixed;
  z-index: 2147483647;
  pointer-events: auto;
}
`;

let shadowRoot: ShadowRoot | null = null;

export function createBugreplayHost(): ShadowRoot {
  if (shadowRoot) return shadowRoot;

  const existing = document.querySelector('bugreplay-root');
  if (existing) existing.remove();

  const host = document.createElement('bugreplay-root');
  host.setAttribute('data-bugreplay', '');
  shadowRoot = host.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = STYLES;
  shadowRoot.appendChild(style);

  for (const id of ['bugreplay-toolbar', 'bugreplay-indicator']) {
    const div = document.createElement('div');
    div.id = id;
    shadowRoot.appendChild(div);
  }

  document.body.appendChild(host);
  return shadowRoot;
}

export function getBugreplayShadow(): ShadowRoot | null {
  return shadowRoot;
}

export function _resetBugreplayHost(): void {
  shadowRoot = null;
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test src/content/ui/__tests__/host.test.ts --run`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/content/ui/host.ts src/content/ui/__tests__/host.test.ts
git commit -m "feat: add Shadow DOM host with toolbar and indicator zones"
```

---

### Task 15: Implement recorder-toolbar

**Files:**
- Create: `src/content/ui/recorder-toolbar.ts`
- Test: `src/content/ui/__tests__/recorder-toolbar.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/content/ui/__tests__/recorder-toolbar.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RecorderToolbar } from '../recorder-toolbar';

describe('RecorderToolbar', () => {
  let container: HTMLDivElement;
  let toolbar: RecorderToolbar;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    toolbar = new RecorderToolbar(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('should render record, pause, stop, and export buttons', () => {
    expect(container.querySelector('[data-action="record"]')).not.toBeNull();
    expect(container.querySelector('[data-action="pause"]')).not.toBeNull();
    expect(container.querySelector('[data-action="stop"]')).not.toBeNull();
    expect(container.querySelector('[data-action="export"]')).not.toBeNull();
  });

  it('should emit events on button click', () => {
    const onRecord = vi.fn();
    toolbar.on('record', onRecord);
    (container.querySelector('[data-action="record"]') as HTMLElement).click();
    expect(onRecord).toHaveBeenCalledOnce();
  });

  it('should emit pause event', () => {
    const onPause = vi.fn();
    toolbar.on('pause', onPause);
    (container.querySelector('[data-action="pause"]') as HTMLElement).click();
    expect(onPause).toHaveBeenCalledOnce();
  });

  it('should emit stop event', () => {
    const onStop = vi.fn();
    toolbar.on('stop', onStop);
    (container.querySelector('[data-action="stop"]') as HTMLElement).click();
    expect(onStop).toHaveBeenCalledOnce();
  });

  it('should update step count display', () => {
    toolbar.updateStepCount(5);
    expect(container.textContent).toContain('5');
  });

  it('should update elapsed time display', () => {
    toolbar.updateElapsedTime(65000); // 1m 5s
    expect(container.textContent).toContain('1:05');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/content/ui/__tests__/recorder-toolbar.test.ts --run`
Expected: FAIL

- [ ] **Step 3: Implement recorder-toolbar.ts**

```typescript
// src/content/ui/recorder-toolbar.ts
type ToolbarEvent = 'record' | 'pause' | 'stop' | 'export';

export class RecorderToolbar {
  private container: HTMLElement;
  private listeners = new Map<ToolbarEvent, Set<() => void>>();
  private stepCountEl: HTMLSpanElement;
  private timeEl: HTMLSpanElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.stepCountEl = document.createElement('span');
    this.stepCountEl.className = 'br-step-count';
    this.stepCountEl.textContent = '0';

    this.timeEl = document.createElement('span');
    this.timeEl.className = 'br-time';
    this.timeEl.textContent = '0:00';

    this.render();
  }

  on(event: ToolbarEvent, callback: () => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  updateStepCount(count: number): void {
    this.stepCountEl.textContent = String(count);
  }

  updateElapsedTime(ms: number): void {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    this.timeEl.textContent = `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  private render(): void {
    this.container.innerHTML = '';

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--br-bg,#fff);border:1px solid var(--br-border,#e5e5e5);border-radius:var(--br-radius,8px);box-shadow:var(--br-shadow);';

    const actions: ToolbarEvent[] = ['record', 'pause', 'stop', 'export'];
    const labels: Record<ToolbarEvent, string> = {
      record: '\u23FA', // ⏺
      pause: '\u23F8', // ⏸
      stop: '\u23F9', // ⏹
      export: '\u2913', // ⤓
    };

    for (const action of actions) {
      const btn = document.createElement('button');
      btn.setAttribute('data-action', action);
      btn.textContent = labels[action];
      btn.style.cssText = 'cursor:pointer;border:none;background:transparent;font-size:18px;padding:4px 8px;border-radius:4px;';
      btn.addEventListener('click', () => {
        this.listeners.get(action)?.forEach(cb => cb());
      });
      wrapper.appendChild(btn);
    }

    const info = document.createElement('span');
    info.style.cssText = 'font-size:13px;color:var(--br-text,#1a1a1a);';
    info.appendChild(this.stepCountEl);
    info.appendChild(document.createTextNode(' steps \u00B7 '));
    info.appendChild(this.timeEl);
    wrapper.appendChild(info);

    this.container.appendChild(wrapper);
  }
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test src/content/ui/__tests__/recorder-toolbar.test.ts --run`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/content/ui/recorder-toolbar.ts src/content/ui/__tests__/recorder-toolbar.test.ts
git commit -m "feat: add RecorderToolbar with record/pause/stop/export buttons and step counter"
```

---

### Task 16: Implement step-indicator

**Files:**
- Create: `src/content/ui/step-indicator.ts`

- [ ] **Step 1: Implement step-indicator.ts**

```typescript
// src/content/ui/step-indicator.ts
export class StepIndicator {
  private container: HTMLElement;
  private badge: HTMLDivElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.badge = document.createElement('div');
    this.badge.style.cssText =
      'position:fixed;top:12px;right:12px;background:var(--br-accent,#ef4444);color:#fff;' +
      'font-size:12px;font-weight:600;padding:4px 10px;border-radius:12px;font-family:system-ui;' +
      'pointer-events:none;opacity:0;transition:opacity 0.2s;';
    this.container.appendChild(this.badge);
  }

  flash(stepIndex: number, action: string): void {
    this.badge.textContent = `Step ${stepIndex + 1}: ${action}`;
    this.badge.style.opacity = '1';
    setTimeout(() => {
      this.badge.style.opacity = '0';
    }, 1500);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/content/ui/step-indicator.ts
git commit -m "feat: add StepIndicator for live step flash notifications"
```

---

## Phase 5: Export

### Task 18: Implement Markdown export

> **Dependency:** Task 19 (Playwright export) must be implemented first, as `markdown.ts` imports `generatePlaywright` to embed the script in Markdown output. Implement Task 19 before this task.

**Files:**
- Create: `src/content/export/markdown.ts`
- Test: `src/content/export/__tests__/markdown.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/content/export/__tests__/markdown.test.ts
import { describe, it, expect } from 'vitest';
import { generateMarkdown } from '../markdown';
import type { RecordingSession } from '../../../shared/types';

function createTestSession(overrides?: Partial<RecordingSession>): RecordingSession {
  return {
    id: 'test-1',
    title: 'Login button 500 error',
    startedAt: 1700000000000,
    url: 'https://example.com/dashboard',
    browserInfo: { name: 'Chrome', version: '124.0.6367.91', userAgent: 'Mozilla/5.0' },
    viewport: { width: 1440, height: 900 },
    steps: [],
    networkLog: [],
    consoleErrors: [],
    status: 'stopped',
    ...overrides,
  };
}

describe('generateMarkdown', () => {
  it('should include title, URL, browser, and viewport in header', () => {
    const md = generateMarkdown(createTestSession());
    expect(md).toContain('# Bug Reproduction: Login button 500 error');
    expect(md).toContain('https://example.com/dashboard');
    expect(md).toContain('Chrome 124.0.6367.91');
    expect(md).toContain('1440x900');
  });

  it('should render navigate steps', () => {
    const md = generateMarkdown(createTestSession({
      steps: [
        { index: 0, action: 'navigate', timestamp: 0, url: 'https://example.com/dashboard' },
      ],
    }));
    expect(md).toContain('### Step 1 — Navigate');
    expect(md).toContain('`navigate`');
    expect(md).toContain('https://example.com/dashboard');
  });

  it('should render click steps with element info', () => {
    const md = generateMarkdown(createTestSession({
      steps: [
        {
          index: 0, action: 'click', timestamp: 2340,
          element: {
            tag: 'button', selector: '[data-testid="submit-order"]',
            path: 'main > .order-form > button.btn-primary',
            textContent: 'Submit Order', attributes: {}, cssClasses: ['btn-primary'],
          },
        },
      ],
    }));
    expect(md).toContain('### Step 1 — Click');
    expect(md).toContain('`<button class="btn-primary">`');
    expect(md).toContain('"Submit Order"');
    expect(md).toContain('[data-testid="submit-order"]');
    expect(md).toContain('+2340ms');
  });

  it('should render fill steps with value', () => {
    const md = generateMarkdown(createTestSession({
      steps: [
        {
          index: 0, action: 'fill', timestamp: 4120,
          element: {
            tag: 'input', selector: '#email-input',
            path: 'form > input#email-input',
            textContent: '', attributes: { type: 'email', placeholder: 'Enter email' }, cssClasses: [],
          },
          value: 'test@example.com',
        },
      ],
    }));
    expect(md).toContain('### Step 1 — Fill');
    expect(md).toContain('`"test@example.com"`');
  });

  it('should render network log table', () => {
    const md = generateMarkdown(createTestSession({
      networkLog: [
        { index: 0, method: 'POST', url: '/api/orders', status: 500, duration: 1240, size: 89, stepIndex: 1, timestamp: 3000 },
      ],
    }));
    expect(md).toContain('## Network Log');
    expect(md).toContain('POST');
    expect(md).toContain('/api/orders');
    expect(md).toContain('500');
  });

  it('should render console errors table', () => {
    const md = generateMarkdown(createTestSession({
      consoleErrors: [
        { level: 'error', message: "Cannot read properties of undefined (reading 'id')", stepIndex: 2, timestamp: 5000 },
      ],
    }));
    expect(md).toContain('## Console Errors');
    expect(md).toContain("Cannot read properties of undefined");
  });

  it('should include framework info when present', () => {
    const md = generateMarkdown(createTestSession({
      framework: { name: 'React', version: '18.2.0' },
    }));
    expect(md).toContain('React 18.2.0');
  });

  it('should omit empty sections', () => {
    const md = generateMarkdown(createTestSession());
    expect(md).not.toContain('## Network Log');
    expect(md).not.toContain('## Console Errors');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/content/export/__tests__/markdown.test.ts --run`
Expected: FAIL

- [ ] **Step 3: Implement markdown.ts**

```typescript
// src/content/export/markdown.ts
import type { RecordingSession, RecordingStep } from '../../shared/types';
import { ACTION_TYPES } from '../../shared/constants';
import { generatePlaywright } from './playwright';

function formatTimestamp(ms: number): string {
  return `+${ms}ms`;
}

function formatElementTag(step: RecordingStep): string {
  if (!step.element) return '';
  const el = step.element;
  const classes = el.cssClasses.length > 0 ? ` class="${el.cssClasses.join(' ')}"` : '';
  return `\`<${el.tag}${classes}>\``;
}

function renderStep(step: RecordingStep): string {
  const label = ACTION_TYPES[step.action] ?? step.action;
  const lines: string[] = [];
  lines.push(`### Step ${step.index + 1} — ${label}`);
  lines.push(`- **Action:** \`${step.action}\``);

  if (step.element) {
    lines.push(`- **Element:** ${formatElementTag(step)} "${step.element.textContent}"`);
    lines.push(`- **Selector:** \`${step.element.selector}\``);
    lines.push(`- **Path:** \`${step.element.path}\``);

    if (step.element.framework) {
      lines.push(`- **Component:** \`<${step.element.framework.componentName}>\` (${step.element.framework.name})`);
    }
  }

  if (step.url) lines.push(`- **URL:** \`${step.url}\``);
  if (step.value !== undefined) lines.push(`- **Value:** \`"${step.value}"\``);
  if (step.key) lines.push(`- **Key:** \`${step.key}\``);
  if (step.scrollPosition) lines.push(`- **Scroll:** (${step.scrollPosition.x}, ${step.scrollPosition.y})`);

  lines.push(`- **Timestamp:** ${formatTimestamp(step.timestamp)}`);

  return lines.join('\n');
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  return `${(bytes / 1024).toFixed(1)}KB`;
}

export function generateMarkdown(session: RecordingSession): string {
  const lines: string[] = [];

  // Header
  lines.push(`# Bug Reproduction: ${session.title}`);
  lines.push('');
  lines.push(`**URL:** ${session.url}`);
  lines.push(`**Date:** ${new Date(session.startedAt).toISOString()}`);
  lines.push(`**Browser:** ${session.browserInfo.name} ${session.browserInfo.version}`);
  lines.push(`**Viewport:** ${session.viewport.width}x${session.viewport.height}`);

  // Environment
  if (session.framework) {
    lines.push('');
    lines.push('## Environment');
    lines.push(`- **Framework:** ${session.framework.name} ${session.framework.version ?? ''}`);
  }

  // Steps
  if (session.steps.length > 0) {
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## Steps');
    lines.push('');
    for (const step of session.steps) {
      lines.push(renderStep(step));
      lines.push('');
    }
  }

  // Network Log
  if (session.networkLog.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## Network Log');
    lines.push('');
    lines.push('| # | Method | URL | Status | Duration | Size |');
    lines.push('|---|--------|-----|--------|----------|------|');
    for (const entry of session.networkLog) {
      lines.push(`| ${entry.index + 1} | ${entry.method} | ${entry.url} | ${entry.status} | ${entry.duration}ms | ${formatSize(entry.size)} |`);
    }

    // Failed requests detail
    const failed = session.networkLog.filter(e => e.status >= 400 || e.status === 0);
    if (failed.length > 0) {
      lines.push('');
      lines.push('### Failed Requests');
      for (const entry of failed) {
        lines.push(`${entry.method} ${entry.url} → ${entry.status || 'Network Error'}`);
        if (entry.responseBody) {
          lines.push(`Response: ${entry.responseBody}`);
        }
      }
    }
    lines.push('');
  }

  // Console Errors
  if (session.consoleErrors.length > 0) {
    lines.push('## Console Errors');
    lines.push('');
    lines.push('| # | Step | Level | Message |');
    lines.push('|---|------|-------|---------|');
    for (let i = 0; i < session.consoleErrors.length; i++) {
      const entry = session.consoleErrors[i];
      lines.push(`| ${i + 1} | ${entry.stepIndex + 1} | ${entry.level} | ${entry.message} |`);
    }
    lines.push('');
  }

  // Playwright Script (Draft)
  if (session.steps.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## Playwright Script (Draft)');
    lines.push('');
    lines.push('```typescript');
    lines.push(generatePlaywright(session).trim());
    lines.push('```');
    lines.push('');
  }

  return lines.join('\n');
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test src/content/export/__tests__/markdown.test.ts --run`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/content/export/markdown.ts src/content/export/__tests__/markdown.test.ts
git commit -m "feat: add Markdown export with steps, network log, and console errors"
```

---

### Task 19: Implement Playwright export

**Files:**
- Create: `src/content/export/playwright.ts`
- Test: `src/content/export/__tests__/playwright.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/content/export/__tests__/playwright.test.ts
import { describe, it, expect } from 'vitest';
import { generatePlaywright } from '../playwright';
import type { RecordingSession } from '../../../shared/types';

function createTestSession(overrides?: Partial<RecordingSession>): RecordingSession {
  return {
    id: 'test-1',
    title: 'Login 500 error',
    startedAt: Date.now(),
    url: 'https://example.com',
    browserInfo: { name: 'Chrome', version: '124', userAgent: '' },
    viewport: { width: 1440, height: 900 },
    steps: [],
    networkLog: [],
    consoleErrors: [],
    status: 'stopped',
    ...overrides,
  };
}

describe('generatePlaywright', () => {
  it('should generate a valid test file with imports', () => {
    const script = generatePlaywright(createTestSession());
    expect(script).toContain("import { test, expect } from '@playwright/test'");
    expect(script).toContain("test('Bug: Login 500 error'");
  });

  it('should generate page.goto for navigate steps', () => {
    const script = generatePlaywright(createTestSession({
      steps: [
        { index: 0, action: 'navigate', timestamp: 0, url: 'https://example.com/dashboard' },
      ],
    }));
    expect(script).toContain("await page.goto('https://example.com/dashboard')");
  });

  it('should generate locator.click for click steps', () => {
    const script = generatePlaywright(createTestSession({
      steps: [
        {
          index: 0, action: 'click', timestamp: 100,
          element: {
            tag: 'button', selector: '[data-testid="submit"]',
            path: '', textContent: 'Submit', attributes: {}, cssClasses: [],
          },
        },
      ],
    }));
    expect(script).toContain("await page.locator('[data-testid=\"submit\"]').click()");
  });

  it('should generate locator.fill for fill steps', () => {
    const script = generatePlaywright(createTestSession({
      steps: [
        {
          index: 0, action: 'fill', timestamp: 200,
          element: {
            tag: 'input', selector: '#email',
            path: '', textContent: '', attributes: {}, cssClasses: [],
          },
          value: 'test@example.com',
        },
      ],
    }));
    expect(script).toContain("await page.locator('#email').fill('test@example.com')");
  });

  it('should generate keyboard.press for keypress steps', () => {
    const script = generatePlaywright(createTestSession({
      steps: [
        { index: 0, action: 'keypress', timestamp: 300, key: 'Enter' },
      ],
    }));
    expect(script).toContain("await page.keyboard.press('Enter')");
  });

  it('should skip scroll steps in Playwright output', () => {
    const script = generatePlaywright(createTestSession({
      steps: [
        { index: 0, action: 'scroll', timestamp: 100, scrollPosition: { x: 0, y: 500 } },
      ],
    }));
    expect(script).not.toContain('scroll');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/content/export/__tests__/playwright.test.ts --run`
Expected: FAIL

- [ ] **Step 3: Implement playwright.ts**

```typescript
// src/content/export/playwright.ts
import type { RecordingSession, RecordingStep } from '../../shared/types';

function escapeString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function stepToLine(step: RecordingStep): string | null {
  switch (step.action) {
    case 'navigate':
      return step.url ? `  await page.goto('${escapeString(step.url)}');` : null;
    case 'click':
      if (!step.element) return null;
      return `  await page.locator('${escapeString(step.element.selector)}').click();`;
    case 'fill':
      if (!step.element || step.value === undefined) return null;
      return `  await page.locator('${escapeString(step.element.selector)}').fill('${escapeString(step.value)}');`;
    case 'select':
      if (!step.element || step.value === undefined) return null;
      return `  await page.locator('${escapeString(step.element.selector)}').selectOption('${escapeString(step.value)}');`;
    case 'check':
      if (!step.element) return null;
      return `  await page.locator('${escapeString(step.element.selector)}').check();`;
    case 'keypress':
      return step.key ? `  await page.keyboard.press('${escapeString(step.key)}');` : null;
    default:
      return null; // scroll, hover, drag, upload, dialog — skip or add later
  }
}

export function generatePlaywright(session: RecordingSession): string {
  const lines: string[] = [];
  lines.push("import { test, expect } from '@playwright/test';");
  lines.push('');
  lines.push(`test('Bug: ${escapeString(session.title)}', async ({ page }) => {`);

  for (const step of session.steps) {
    const line = stepToLine(step);
    if (line) lines.push(line);
  }

  lines.push('});');
  lines.push('');

  return lines.join('\n');
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test src/content/export/__tests__/playwright.test.ts --run`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/content/export/playwright.ts src/content/export/__tests__/playwright.test.ts
git commit -m "feat: add Playwright test script generation from recorded sessions"
```

---

### Task 20: Implement clipboard export

**Files:**
- Create: `src/content/export/clipboard.ts`

- [ ] **Step 1: Implement clipboard.ts**

```typescript
// src/content/export/clipboard.ts
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers / restricted contexts
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.cssText = 'position:fixed;left:-9999px;';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  }
}

export function downloadAsFile(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/content/export/clipboard.ts
git commit -m "feat: add clipboard copy and markdown file download utilities"
```

---

### Task 20b: Implement content/main.ts (entry point and lifecycle)

> **Note:** This task comes after export modules because it imports from `export/markdown.ts` and `export/clipboard.ts`.

**Files:**
- Create: `src/content/main.ts`

- [ ] **Step 1: Implement main.ts**

This is the entry point that wires everything together: creates the Shadow DOM host, toolbar, event recorder, recording store, and handles the lifecycle.

```typescript
// src/content/main.ts
import { createBugreplayHost } from './ui/host';
import { RecorderToolbar } from './ui/recorder-toolbar';
import { StepIndicator } from './ui/step-indicator';
import { EventRecorder } from './recorder/event-recorder';
import { NavigationDetector } from './recorder/navigation-detector';
import { RecordingStore } from './store/recording-store';
import { StepBuilder } from './recorder/step-builder';
import { generateMarkdown } from './export/markdown';
import { copyToClipboard, downloadAsFile } from './export/clipboard';
import type { RecordingStep, ConsoleEntry, NetworkEntry } from '../shared/types';
import { isMainWorldMessage } from '../shared/messaging';

const store = new RecordingStore();
let eventRecorder: EventRecorder | null = null;
let navigationDetector: NavigationDetector | null = null;
let stepBuilder: StepBuilder | null = null;
let timeInterval: ReturnType<typeof setInterval> | null = null;

// --- Setup UI ---
const shadow = createBugreplayHost();
const toolbarContainer = shadow.querySelector('#bugreplay-toolbar') as HTMLElement;
const indicatorContainer = shadow.querySelector('#bugreplay-indicator') as HTMLElement;
const toolbar = new RecorderToolbar(toolbarContainer);
const indicator = new StepIndicator(indicatorContainer);

function onStep(step: RecordingStep): void {
  store.addStep(step);
  const session = store.getSession();
  if (session) {
    toolbar.updateStepCount(session.steps.length);
    indicator.flash(step.index, step.action);
  }
}

toolbar.on('record', () => {
  const title = prompt('Bug title:') ?? 'Untitled Bug';
  store.startSession(window.location.href, title);
  stepBuilder = new StepBuilder(Date.now());

  eventRecorder = new EventRecorder(onStep);
  eventRecorder.start(store.getSession()!.startedAt);

  navigationDetector = new NavigationDetector((url) => {
    if (stepBuilder) {
      const step = stepBuilder.navigate(url);
      onStep(step);
    }
  });
  navigationDetector.start();

  // Auto first step: navigate
  const firstStep = stepBuilder.navigate(window.location.href);
  onStep(firstStep);

  // Start timer
  timeInterval = setInterval(() => {
    const session = store.getSession();
    if (session) {
      toolbar.updateElapsedTime(Date.now() - session.startedAt);
    }
  }, 1000);

  // Notify background (tabId resolved by service worker from sender.tab.id)
  chrome.runtime.sendMessage({ type: 'START_RECORDING' }).catch(() => {});
});

toolbar.on('pause', () => {
  store.pause();
  eventRecorder?.destroy();
  eventRecorder = null;
  if (timeInterval) { clearInterval(timeInterval); timeInterval = null; }
  chrome.runtime.sendMessage({ type: 'PAUSE_RECORDING' }).catch(() => {});
});

toolbar.on('stop', () => {
  store.stop();
  eventRecorder?.destroy();
  eventRecorder = null;
  navigationDetector?.destroy();
  navigationDetector = null;
  if (timeInterval) { clearInterval(timeInterval); timeInterval = null; }
  chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }).catch(() => {});
});

toolbar.on('export', () => {
  const session = store.getSession();
  if (!session) return;
  const md = generateMarkdown(session);
  copyToClipboard(md);
  // Also offer file download
  downloadAsFile(md, `bugreplay-${session.id}.md`);
});

// --- Listen for main-world messages ---
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (!isMainWorldMessage(event.data)) return;

  const msg = event.data;
  switch (msg.type) {
    case 'BR_CONSOLE_ERROR': {
      const session = store.getSession();
      if (!session || session.status !== 'recording') break;
      const entry: ConsoleEntry = {
        level: msg.payload.level,
        message: msg.payload.message,
        stack: msg.payload.stack,
        stepIndex: session.steps.length - 1,
        timestamp: msg.payload.timestamp - session.startedAt,
      };
      store.addConsoleEntry(entry);
      break;
    }
    case 'BR_FRAMEWORK_DETECT_RESULT': {
      const fws = msg.payload.frameworks;
      if (fws.length > 0) {
        const parts = fws[0].split(' ');
        store.setFramework({ name: parts[0], version: parts[1] });
      }
      break;
    }
  }
});

// --- Listen for network entries from background ---
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'NETWORK_ENTRY') {
    const session = store.getSession();
    if (!session) return;
    const entry: NetworkEntry = {
      ...message.payload.entry,
      stepIndex: session.steps.length - 1,
    };
    store.addNetworkEntry(entry);
  }
});
```

- [ ] **Step 2: Commit**

```bash
git add src/content/main.ts
git commit -m "feat: add content script entry point wiring UI, recorder, store, and messaging"
```

---

## Phase 6: Persistence + Popup

### Task 21: Implement session-persistence

**Files:**
- Create: `src/content/store/session-persistence.ts`
- Test: `src/content/store/__tests__/session-persistence.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// src/content/store/__tests__/session-persistence.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveSession, loadSession, listSessions, deleteSession } from '../session-persistence';
import type { RecordingSession } from '../../../shared/types';

// Mock chrome.storage.local
const storage: Record<string, unknown> = {};
const chromeStorageMock = {
  local: {
    get: vi.fn((keys: string | string[]) => {
      const result: Record<string, unknown> = {};
      const keyList = Array.isArray(keys) ? keys : [keys];
      for (const k of keyList) {
        if (storage[k] !== undefined) result[k] = storage[k];
      }
      return Promise.resolve(result);
    }),
    set: vi.fn((items: Record<string, unknown>) => {
      Object.assign(storage, items);
      return Promise.resolve();
    }),
    remove: vi.fn((keys: string | string[]) => {
      const keyList = Array.isArray(keys) ? keys : [keys];
      for (const k of keyList) delete storage[k];
      return Promise.resolve();
    }),
  },
};

vi.stubGlobal('chrome', { storage: chromeStorageMock });

function createSession(id: string): RecordingSession {
  return {
    id,
    title: `Bug ${id}`,
    startedAt: Date.now(),
    url: 'https://example.com',
    browserInfo: { name: 'Chrome', version: '124', userAgent: '' },
    viewport: { width: 1440, height: 900 },
    steps: [],
    networkLog: [],
    consoleErrors: [],
    status: 'stopped',
  };
}

describe('session-persistence', () => {
  beforeEach(() => {
    Object.keys(storage).forEach(k => delete storage[k]);
  });

  it('should save and load a session', async () => {
    const session = createSession('s1');
    await saveSession(session);
    const loaded = await loadSession('s1');
    expect(loaded).toEqual(session);
  });

  it('should return null for non-existent session', async () => {
    const loaded = await loadSession('nonexistent');
    expect(loaded).toBeNull();
  });

  it('should list saved sessions', async () => {
    await saveSession(createSession('s1'));
    await saveSession(createSession('s2'));
    const list = await listSessions();
    expect(list).toHaveLength(2);
  });

  it('should delete a session', async () => {
    await saveSession(createSession('s1'));
    await deleteSession('s1');
    const loaded = await loadSession('s1');
    expect(loaded).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test src/content/store/__tests__/session-persistence.test.ts --run`
Expected: FAIL

- [ ] **Step 3: Implement session-persistence.ts**

```typescript
// src/content/store/session-persistence.ts
import type { RecordingSession } from '../../shared/types';

const SESSION_PREFIX = 'br_session_';
const SESSION_INDEX_KEY = 'br_session_index';

export async function saveSession(session: RecordingSession): Promise<void> {
  const key = SESSION_PREFIX + session.id;
  await chrome.storage.local.set({ [key]: session });

  // Update index
  const result = await chrome.storage.local.get(SESSION_INDEX_KEY);
  const index: string[] = result[SESSION_INDEX_KEY] ?? [];
  if (!index.includes(session.id)) {
    index.push(session.id);
    await chrome.storage.local.set({ [SESSION_INDEX_KEY]: index });
  }
}

export async function loadSession(id: string): Promise<RecordingSession | null> {
  const key = SESSION_PREFIX + id;
  const result = await chrome.storage.local.get(key);
  return (result[key] as RecordingSession) ?? null;
}

export async function listSessions(): Promise<RecordingSession[]> {
  const result = await chrome.storage.local.get(SESSION_INDEX_KEY);
  const index: string[] = result[SESSION_INDEX_KEY] ?? [];
  const keys = index.map(id => SESSION_PREFIX + id);
  if (keys.length === 0) return [];

  const data = await chrome.storage.local.get(keys);
  return keys.map(k => data[k] as RecordingSession).filter(Boolean);
}

export async function deleteSession(id: string): Promise<void> {
  const key = SESSION_PREFIX + id;
  await chrome.storage.local.remove(key);

  const result = await chrome.storage.local.get(SESSION_INDEX_KEY);
  const index: string[] = result[SESSION_INDEX_KEY] ?? [];
  const updated = index.filter(i => i !== id);
  await chrome.storage.local.set({ [SESSION_INDEX_KEY]: updated });
}
```

- [ ] **Step 4: Run tests**

Run: `pnpm test src/content/store/__tests__/session-persistence.test.ts --run`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/content/store/session-persistence.ts src/content/store/__tests__/session-persistence.test.ts
git commit -m "feat: add chrome.storage session persistence with save/load/list/delete"
```

---

### Task 22: Implement popup HTML and TS

**Files:**
- Create: `src/popup/popup.html`
- Create: `src/popup/popup.ts`

- [ ] **Step 1: Create popup.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: 320px; font-family: system-ui, sans-serif; padding: 16px; color: #1a1a1a; }
    h1 { font-size: 16px; margin-bottom: 12px; }
    .session-list { list-style: none; }
    .session-item { padding: 8px; border: 1px solid #e5e5e5; border-radius: 6px; margin-bottom: 8px; cursor: pointer; }
    .session-item:hover { background: #f5f5f5; }
    .session-title { font-weight: 600; font-size: 14px; }
    .session-meta { font-size: 12px; color: #666; margin-top: 4px; }
    .empty { text-align: center; color: #999; padding: 24px 0; }
    .actions { display: flex; gap: 4px; margin-top: 6px; }
    .actions button { font-size: 11px; padding: 2px 8px; border: 1px solid #ddd; border-radius: 4px; background: #fff; cursor: pointer; }
    .actions button:hover { background: #f0f0f0; }
  </style>
</head>
<body>
  <h1>BugReplay Sessions</h1>
  <ul id="session-list" class="session-list"></ul>
  <script type="module" src="popup.ts"></script>
</body>
</html>
```

- [ ] **Step 2: Create popup.ts**

```typescript
// src/popup/popup.ts
import { listSessions, deleteSession, loadSession } from '../content/store/session-persistence';
import { generateMarkdown } from '../content/export/markdown';

async function render(): Promise<void> {
  const list = document.getElementById('session-list')!;
  const sessions = await listSessions();

  if (sessions.length === 0) {
    list.innerHTML = '<li class="empty">No recorded sessions yet.</li>';
    return;
  }

  list.innerHTML = '';
  for (const session of sessions.reverse()) {
    const li = document.createElement('li');
    li.className = 'session-item';

    const title = document.createElement('div');
    title.className = 'session-title';
    title.textContent = session.title;

    const meta = document.createElement('div');
    meta.className = 'session-meta';
    meta.textContent = `${session.steps.length} steps · ${new Date(session.startedAt).toLocaleString()}`;

    const actions = document.createElement('div');
    actions.className = 'actions';

    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy MD';
    copyBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const full = await loadSession(session.id);
      if (full) {
        const md = generateMarkdown(full);
        await navigator.clipboard.writeText(md);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy MD'; }, 1500);
      }
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await deleteSession(session.id);
      render();
    });

    actions.appendChild(copyBtn);
    actions.appendChild(deleteBtn);
    li.appendChild(title);
    li.appendChild(meta);
    li.appendChild(actions);
    list.appendChild(li);
  }
}

render();
```

- [ ] **Step 3: Commit**

```bash
git add src/popup/popup.html src/popup/popup.ts
git commit -m "feat: add popup with session history list, copy, and delete"
```

---

### Task 23: Build verification and final test run

**Files:**
- No new files

- [ ] **Step 1: Run all tests**

Run: `pnpm test --run`
Expected: All tests PASS

- [ ] **Step 2: Run build**

Run: `pnpm build`
Expected: Build succeeds, output in `dist/`

- [ ] **Step 3: Fix any issues found**

If tests or build fail, fix the issues and re-run.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: verify build and all tests pass"
```
