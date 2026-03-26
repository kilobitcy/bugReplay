type ToolbarEvent = 'record' | 'pause' | 'stop' | 'export';

export class RecorderToolbar {
  private container: HTMLElement;
  private listeners = new Map<ToolbarEvent, Set<() => void>>();
  private stepCountEl: HTMLSpanElement;
  private timeEl: HTMLSpanElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.stepCountEl = document.createElement('span');
    this.stepCountEl.className = 'br-step-count';
    this.stepCountEl.textContent = '0';
    this.timeEl = document.createElement('span');
    this.timeEl.className = 'br-time';
    this.timeEl.textContent = '0:00';
    this.render();
  }

  on(event: ToolbarEvent, callback: () => void): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback);
  }

  updateStepCount(count: number): void {
    this.stepCountEl.textContent = String(count);
  }

  updateElapsedTime(ms: number): void {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    this.timeEl.textContent = `${minutes}:${String(seconds).padStart(2, '0')}`;
  }

  private render(): void {
    this.container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--br-bg,#fff);border:1px solid var(--br-border,#e5e5e5);border-radius:var(--br-radius,8px);box-shadow:var(--br-shadow);';

    const actions: ToolbarEvent[] = ['record', 'pause', 'stop', 'export'];
    const labels: Record<ToolbarEvent, string> = {
      record: '\u23FA',
      pause: '\u23F8',
      stop: '\u23F9',
      export: '\u2913',
    };

    for (const action of actions) {
      const btn = document.createElement('button');
      btn.setAttribute('data-action', action);
      btn.textContent = labels[action];
      btn.style.cssText = 'cursor:pointer;border:none;background:transparent;font-size:18px;padding:4px 8px;border-radius:4px;';
      btn.addEventListener('click', () => {
        this.listeners.get(action)?.forEach(cb => cb());
      });
      wrapper.appendChild(btn);
    }

    const info = document.createElement('span');
    info.style.cssText = 'font-size:13px;color:var(--br-text,#1a1a1a);';
    info.appendChild(this.stepCountEl);
    info.appendChild(document.createTextNode(' steps \u00B7 '));
    info.appendChild(this.timeEl);
    wrapper.appendChild(info);
    this.container.appendChild(wrapper);
  }
}
