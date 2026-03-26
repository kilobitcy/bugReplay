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

  if (win.__REACT_DEVTOOLS_GLOBAL_HOOK__ || document.querySelector('[data-reactroot]')) {
    const version = (win.__REACT_DEVTOOLS_GLOBAL_HOOK__ as any)?.renderers?.values?.()?.next?.()?.value?.version;
    detected.push(version ? `React ${version}` : 'React');
  }
  if (win.__VUE__ || win.__vue_app__ || document.querySelector('[data-v-]')) {
    detected.push('Vue');
  }
  if (document.querySelector('[class*="svelte-"]')) {
    detected.push('Svelte');
  }
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
