import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RecorderToolbar } from '../recorder-toolbar';

describe('RecorderToolbar', () => {
  let container: HTMLDivElement;
  let toolbar: RecorderToolbar;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    toolbar = new RecorderToolbar(container);
  });
  afterEach(() => { container.remove(); });

  it('should render pause and stop buttons', () => {
    expect(container.querySelector('[data-action="pause"]')).not.toBeNull();
    expect(container.querySelector('[data-action="stop"]')).not.toBeNull();
  });

  it('should emit pause event on first click', () => {
    const onPause = vi.fn();
    toolbar.on('pause', onPause);
    (container.querySelector('[data-action="pause"]') as HTMLElement).click();
    expect(onPause).toHaveBeenCalledOnce();
  });

  it('should toggle to resume on second click', () => {
    const onPause = vi.fn();
    const onResume = vi.fn();
    toolbar.on('pause', onPause);
    toolbar.on('resume', onResume);
    const pauseBtn = container.querySelector('[data-action="pause"]') as HTMLElement;

    // First click: pause
    pauseBtn.click();
    expect(onPause).toHaveBeenCalledOnce();
    expect(pauseBtn.textContent).toBe('\u25B6');

    // Second click: resume
    pauseBtn.click();
    expect(onResume).toHaveBeenCalledOnce();
    expect(pauseBtn.textContent).toBe('\u23F8');
  });

  it('should emit stop event', () => {
    const onStop = vi.fn();
    toolbar.on('stop', onStop);
    (container.querySelector('[data-action="stop"]') as HTMLElement).click();
    expect(onStop).toHaveBeenCalledOnce();
  });

  it('should update step count display', () => {
    toolbar.updateStepCount(5);
    expect(container.textContent).toContain('5');
  });

  it('should update elapsed time display', () => {
    toolbar.updateElapsedTime(65000);
    expect(container.textContent).toContain('1:05');
  });

  it('should reset pause state', () => {
    const pauseBtn = container.querySelector('[data-action="pause"]') as HTMLElement;
    pauseBtn.click(); // pause → shows ▶
    expect(pauseBtn.textContent).toBe('\u25B6');

    toolbar.resetPauseState();
    expect(pauseBtn.textContent).toBe('\u23F8');
  });
});
