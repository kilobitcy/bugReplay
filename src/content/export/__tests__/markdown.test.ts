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
      steps: [{ index: 0, action: 'navigate', timestamp: 0, url: 'https://example.com/dashboard' }],
    }));
    expect(md).toContain('### Step 1 — Navigate');
    expect(md).toContain('`navigate`');
    expect(md).toContain('https://example.com/dashboard');
  });

  it('should render click steps with element info', () => {
    const md = generateMarkdown(createTestSession({
      steps: [{
        index: 0, action: 'click', timestamp: 2340,
        element: {
          tag: 'button', selector: '[data-testid="submit-order"]',
          path: 'main > .order-form > button.btn-primary',
          textContent: 'Submit Order', attributes: {}, cssClasses: ['btn-primary'],
        },
      }],
    }));
    expect(md).toContain('### Step 1 — Click');
    expect(md).toContain('`<button class="btn-primary">`');
    expect(md).toContain('"Submit Order"');
    expect(md).toContain('[data-testid="submit-order"]');
    expect(md).toContain('+2340ms');
  });

  it('should render fill steps with value', () => {
    const md = generateMarkdown(createTestSession({
      steps: [{
        index: 0, action: 'fill', timestamp: 4120,
        element: {
          tag: 'input', selector: '#email-input', path: 'form > input#email-input',
          textContent: '', attributes: { type: 'email', placeholder: 'Enter email' }, cssClasses: [],
        },
        value: 'test@example.com',
      }],
    }));
    expect(md).toContain('### Step 1 — Fill');
    expect(md).toContain('`"test@example.com"`');
  });

  it('should render network log table', () => {
    const md = generateMarkdown(createTestSession({
      networkLog: [{ index: 0, method: 'POST', url: '/api/orders', status: 500, duration: 1240, size: 89, stepIndex: 1, timestamp: 3000 }],
    }));
    expect(md).toContain('## Network Log');
    expect(md).toContain('POST');
    expect(md).toContain('/api/orders');
    expect(md).toContain('500');
  });

  it('should render console errors table', () => {
    const md = generateMarkdown(createTestSession({
      consoleErrors: [{ level: 'error', message: "Cannot read properties of undefined (reading 'id')", stepIndex: 2, timestamp: 5000 }],
    }));
    expect(md).toContain('## Console Errors');
    expect(md).toContain("Cannot read properties of undefined");
  });

  it('should include framework info when present', () => {
    const md = generateMarkdown(createTestSession({ framework: { name: 'React', version: '18.2.0' } }));
    expect(md).toContain('React 18.2.0');
  });

  it('should omit empty sections', () => {
    const md = generateMarkdown(createTestSession());
    expect(md).not.toContain('## Network Log');
    expect(md).not.toContain('## Console Errors');
  });
});
