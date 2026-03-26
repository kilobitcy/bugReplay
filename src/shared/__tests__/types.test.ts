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
