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
