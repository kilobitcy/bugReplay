import type { RecordingSession, RecordingStep, NetworkEntry, ConsoleEntry } from '../../shared/types';

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try { return crypto.randomUUID(); } catch { /* non-secure context */ }
  }
  // Fallback for non-secure contexts (e.g. HTTP on LAN IP)
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  const hex = Array.from(buf, b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export class RecordingStore {
  private session: RecordingSession | null = null;

  startSession(url: string, title: string): void {
    this.session = {
      id: generateId(),
      title,
      startedAt: Date.now(),
      url,
      browserInfo: {
        name: 'Chrome',
        version: navigator.userAgent.match(/Chrome\/([\d.]+)/)?.[1] ?? 'unknown',
        userAgent: navigator.userAgent,
      },
      viewport: { width: window.innerWidth, height: window.innerHeight },
      steps: [],
      networkLog: [],
      consoleErrors: [],
      status: 'recording',
    };
  }

  getSession(): RecordingSession | null { return this.session; }

  addStep(step: RecordingStep): void {
    if (!this.session || this.session.status !== 'recording') return;
    this.session.steps.push(step);
  }

  addNetworkEntry(entry: NetworkEntry): void {
    if (!this.session) return;
    this.session.networkLog.push(entry);
  }

  addConsoleEntry(entry: ConsoleEntry): void {
    if (!this.session) return;
    this.session.consoleErrors.push(entry);
  }

  setFramework(fw: { name: string; version?: string }): void {
    if (!this.session) return;
    this.session.framework = fw;
  }

  pause(): void {
    if (this.session?.status === 'recording') this.session.status = 'paused';
  }

  resume(): void {
    if (this.session?.status === 'paused') this.session.status = 'recording';
  }

  stop(): void {
    if (this.session) this.session.status = 'stopped';
  }
}
