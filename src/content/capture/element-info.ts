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
