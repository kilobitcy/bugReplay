import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { extractElementInfo } from '../element-info';

describe('extractElementInfo', () => {
  let container: HTMLElement;
  beforeEach(() => { container = document.createElement('div'); document.body.appendChild(container); });
  afterEach(() => { container.remove(); });

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
    expect(info.textContent.length).toBeLessThanOrEqual(28);
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
