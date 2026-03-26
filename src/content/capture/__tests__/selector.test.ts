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
  beforeEach(() => { container = document.createElement('div'); document.body.appendChild(container); });
  afterEach(() => { container.remove(); });

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
  beforeEach(() => { container = document.createElement('div'); document.body.appendChild(container); });
  afterEach(() => { container.remove(); });

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
