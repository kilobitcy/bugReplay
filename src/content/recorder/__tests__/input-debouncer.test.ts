import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { InputDebouncer } from '../input-debouncer';

describe('InputDebouncer', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('should merge rapid keystrokes into a single fill value', () => {
    const onFill = vi.fn();
    const debouncer = new InputDebouncer(onFill);
    debouncer.handleInput('h');
    debouncer.handleInput('he');
    debouncer.handleInput('hel');
    debouncer.handleInput('hello');
    expect(onFill).not.toHaveBeenCalled();
    vi.advanceTimersByTime(500);
    expect(onFill).toHaveBeenCalledOnce();
    expect(onFill).toHaveBeenCalledWith('hello');
  });

  it('should emit separate fills after debounce gap', () => {
    const onFill = vi.fn();
    const debouncer = new InputDebouncer(onFill);
    debouncer.handleInput('abc');
    vi.advanceTimersByTime(500);
    expect(onFill).toHaveBeenCalledWith('abc');
    debouncer.handleInput('xyz');
    vi.advanceTimersByTime(500);
    expect(onFill).toHaveBeenCalledTimes(2);
    expect(onFill).toHaveBeenLastCalledWith('xyz');
  });

  it('should flush pending value on flush()', () => {
    const onFill = vi.fn();
    const debouncer = new InputDebouncer(onFill);
    debouncer.handleInput('partial');
    debouncer.flush();
    expect(onFill).toHaveBeenCalledWith('partial');
  });

  it('should mask password fields', () => {
    const onFill = vi.fn();
    const debouncer = new InputDebouncer(onFill);
    debouncer.handleInput('secret123', true);
    vi.advanceTimersByTime(500);
    expect(onFill).toHaveBeenCalledWith('••••••••');
  });

  it('should do nothing when flushed with no pending input', () => {
    const onFill = vi.fn();
    const debouncer = new InputDebouncer(onFill);
    debouncer.flush();
    expect(onFill).not.toHaveBeenCalled();
  });
});
