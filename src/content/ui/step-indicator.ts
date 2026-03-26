export class StepIndicator {
  private container: HTMLElement;
  private badge: HTMLDivElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.badge = document.createElement('div');
    this.badge.style.cssText =
      'position:fixed;top:12px;right:12px;background:var(--br-accent,#ef4444);color:#fff;' +
      'font-size:12px;font-weight:600;padding:4px 10px;border-radius:12px;font-family:system-ui;' +
      'pointer-events:none;opacity:0;transition:opacity 0.2s;';
    this.container.appendChild(this.badge);
  }

  flash(stepIndex: number, action: string): void {
    this.badge.textContent = `Step ${stepIndex + 1}: ${action}`;
    this.badge.style.opacity = '1';
    setTimeout(() => {
      this.badge.style.opacity = '0';
    }, 1500);
  }
}
