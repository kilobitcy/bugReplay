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
