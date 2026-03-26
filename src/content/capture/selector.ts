/**
 * Escape a string for use in a CSS selector (mirrors CSS.escape spec).
 */
function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && CSS.escape) return CSS.escape(value);
  // Minimal polyfill for environments without CSS.escape (e.g., jsdom in tests)
  return value.replace(/([^\w-])/g, '\\$1');
}

/**
 * Determines if a CSS class name is a generated hash (CSS Modules, styled-components, emotion).
 */
export function isHashClassName(cls: string): boolean {
  // CSS Modules: word_hashchars (5+ alphanumeric after underscore)
  if (/^[a-zA-Z][\w-]*_[a-zA-Z0-9]{5,}$/.test(cls)) return true;
  // styled-components: sc-xxxxx
  if (/^sc-[a-zA-Z0-9]+$/.test(cls)) return true;
  // emotion/css-in-js: css-xxxxx
  if (/^css-[a-zA-Z0-9]+$/.test(cls)) return true;
  return false;
}

/**
 * Get meaningful classes from an element (filtering out hash classes).
 */
function getMeaningfulClasses(el: Element): string[] {
  return Array.from(el.classList).filter(c => !isHashClassName(c));
}

/**
 * Generate a human-readable segment for one element in the path.
 */
function elementSegment(el: Element): string {
  if (el.id) return `${el.tagName.toLowerCase()}#${el.id}`;
  const classes = getMeaningfulClasses(el);
  if (classes.length > 0) {
    return `${el.tagName.toLowerCase()}.${classes.join('.')}`;
  }
  return el.tagName.toLowerCase();
}

/**
 * Generate a human-readable element path (max 4 levels, bottom-up).
 * Format: "main > .user-panel > button.btn-primary"
 */
export function generateElementPath(el: Element, maxDepth = 4): string {
  const segments: string[] = [];
  let current: Element | null = el;

  while (current && current !== document.body && current !== document.documentElement && segments.length < maxDepth) {
    // Check for shadow DOM boundary
    const root = current.getRootNode();
    if (root instanceof ShadowRoot) {
      segments.push('⟨shadow⟩');
      current = (root as ShadowRoot).host;
      continue;
    }
    segments.push(elementSegment(current));
    current = current.parentElement;
  }

  return segments.reverse().join(' > ');
}

/**
 * Check if a selector uniquely identifies one element.
 */
function isUnique(selector: string): boolean {
  try {
    return document.querySelectorAll(selector).length === 1;
  } catch {
    return false;
  }
}

/**
 * Generate a unique CSS selector for an element.
 * Priority: #id → [data-testid] → [data-*] → .classes → nth-child
 */
export function generateUniqueSelector(el: Element): string {
  // 1. ID
  if (el.id) {
    const sel = `#${cssEscape(el.id)}`;
    if (isUnique(sel)) return sel;
  }

  // 2. data-testid
  const testId = el.getAttribute('data-testid');
  if (testId) {
    const sel = `[data-testid="${cssEscape(testId)}"]`;
    if (isUnique(sel)) return sel;
  }

  // 3. Other data attributes
  for (const attr of Array.from(el.attributes)) {
    if (attr.name.startsWith('data-') && attr.name !== 'data-testid') {
      const sel = `[${attr.name}="${cssEscape(attr.value)}"]`;
      if (isUnique(sel)) return sel;
    }
  }

  // 4. Class combination
  const classes = getMeaningfulClasses(el);
  if (classes.length > 0) {
    const classSel = `${el.tagName.toLowerCase()}.${classes.map(c => cssEscape(c)).join('.')}`;
    if (isUnique(classSel)) return classSel;
  }

  // 5. nth-child with parent context
  return buildNthChildSelector(el);
}

/**
 * Build a selector using nth-child, adding parent context until unique.
 */
function buildNthChildSelector(el: Element): string {
  const parts: string[] = [];
  let current: Element | null = el;

  while (current && current !== document.body && current !== document.documentElement) {
    const parent = current.parentElement;
    if (!parent) break;

    const siblings = Array.from(parent.children);
    const index = siblings.indexOf(current) + 1;
    const tag = current.tagName.toLowerCase();
    parts.unshift(`${tag}:nth-child(${index})`);

    const selector = parts.join(' > ');
    if (isUnique(selector)) return selector;

    current = parent;
  }

  return parts.join(' > ');
}

/**
 * Find the deepest element at a point, piercing through Shadow DOMs.
 */
export function deepElementFromPoint(x: number, y: number): Element | null {
  let el = document.elementFromPoint(x, y);
  if (!el) return null;

  // Pierce shadow DOMs
  while (el.shadowRoot) {
    const deeper = el.shadowRoot.elementFromPoint(x, y);
    if (!deeper || deeper === el) break;
    el = deeper;
  }

  return el;
}
