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

  it('should render record, pause, stop, and export buttons', () => {
    expect(container.querySelector('[data-action="record"]')).not.toBeNull();
    expect(container.querySelector('[data-action="pause"]')).not.toBeNull();
    expect(container.querySelector('[data-action="stop"]')).not.toBeNull();
    expect(container.querySelector('[data-action="export"]')).not.toBeNull();
  });

  it('should emit events on button click', () => {
    const onRecord = vi.fn();
    toolbar.on('record', onRecord);
    (container.querySelector('[data-action="record"]') as HTMLElement).click();
    expect(onRecord).toHaveBeenCalledOnce();
  });

  it('should emit pause event', () => {
    const onPause = vi.fn();
    toolbar.on('pause', onPause);
    (container.querySelector('[data-action="pause"]') as HTMLElement).click();
    expect(onPause).toHaveBeenCalledOnce();
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
});
