export class NavigationDetector {
  private onNavigate: (url: string) => void;
  private popstateHandler: (() => void) | null = null;
  private hashchangeHandler: (() => void) | null = null;
  private beforeunloadHandler: (() => void) | null = null;
  private titleObserver: MutationObserver | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private lastUrl: string = '';

  constructor(onNavigate: (url: string) => void) {
    this.onNavigate = onNavigate;
  }

  start(): void {
    this.lastUrl = window.location.href;
    this.popstateHandler = () => { this.checkNavigation(); };
    this.hashchangeHandler = () => { this.checkNavigation(); };
    this.beforeunloadHandler = () => { this.checkNavigation(); };

    window.addEventListener('popstate', this.popstateHandler);
    window.addEventListener('hashchange', this.hashchangeHandler);
    window.addEventListener('beforeunload', this.beforeunloadHandler);

    const titleEl = document.querySelector('title');
    if (titleEl) {
      this.titleObserver = new MutationObserver(() => { this.checkNavigation(); });
      this.titleObserver.observe(titleEl, { childList: true, characterData: true, subtree: true });
    }

    this.pollTimer = setInterval(() => { this.checkNavigation(); }, 500);
  }

  destroy(): void {
    if (this.popstateHandler) { window.removeEventListener('popstate', this.popstateHandler); this.popstateHandler = null; }
    if (this.hashchangeHandler) { window.removeEventListener('hashchange', this.hashchangeHandler); this.hashchangeHandler = null; }
    if (this.beforeunloadHandler) { window.removeEventListener('beforeunload', this.beforeunloadHandler); this.beforeunloadHandler = null; }
    if (this.titleObserver) { this.titleObserver.disconnect(); this.titleObserver = null; }
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = null; }
  }

  private checkNavigation(): void {
    const currentUrl = window.location.href;
    if (currentUrl !== this.lastUrl) {
      this.lastUrl = currentUrl;
      this.onNavigate(currentUrl);
    }
  }
}
