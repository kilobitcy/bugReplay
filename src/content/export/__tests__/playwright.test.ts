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
      steps: [{ index: 0, action: 'navigate', timestamp: 0, url: 'https://example.com/dashboard' }],
    }));
    expect(script).toContain("await page.goto('https://example.com/dashboard')");
  });

  it('should generate locator.click for click steps', () => {
    const script = generatePlaywright(createTestSession({
      steps: [{
        index: 0, action: 'click', timestamp: 100,
        element: { tag: 'button', selector: '[data-testid="submit"]', path: '', textContent: 'Submit', attributes: {}, cssClasses: [] },
      }],
    }));
    expect(script).toContain("await page.locator('[data-testid=\"submit\"]').click()");
  });

  it('should generate locator.fill for fill steps', () => {
    const script = generatePlaywright(createTestSession({
      steps: [{
        index: 0, action: 'fill', timestamp: 200,
        element: { tag: 'input', selector: '#email', path: '', textContent: '', attributes: {}, cssClasses: [] },
        value: 'test@example.com',
      }],
    }));
    expect(script).toContain("await page.locator('#email').fill('test@example.com')");
  });

  it('should generate keyboard.press for keypress steps', () => {
    const script = generatePlaywright(createTestSession({
      steps: [{ index: 0, action: 'keypress', timestamp: 300, key: 'Enter' }],
    }));
    expect(script).toContain("await page.keyboard.press('Enter')");
  });

  it('should skip scroll steps in Playwright output', () => {
    const script = generatePlaywright(createTestSession({
      steps: [{ index: 0, action: 'scroll', timestamp: 100, scrollPosition: { x: 0, y: 500 } }],
    }));
    expect(script).not.toContain('scroll');
  });
});
