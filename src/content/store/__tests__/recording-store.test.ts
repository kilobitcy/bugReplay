import { describe, it, expect, beforeEach } from 'vitest';
import { RecordingStore } from '../recording-store';

describe('RecordingStore', () => {
  let store: RecordingStore;
  beforeEach(() => { store = new RecordingStore(); });

  it('should start a new session', () => {
    store.startSession('https://example.com', 'Test Bug');
    const session = store.getSession();
    expect(session).not.toBeNull();
    expect(session!.url).toBe('https://example.com');
    expect(session!.title).toBe('Test Bug');
    expect(session!.status).toBe('recording');
    expect(session!.steps).toEqual([]);
  });

  it('should add steps to the session', () => {
    store.startSession('https://example.com', 'Test');
    store.addStep({ index: 0, action: 'navigate', timestamp: 0, url: 'https://example.com' });
    expect(store.getSession()!.steps).toHaveLength(1);
  });

  it('should add network entries', () => {
    store.startSession('https://example.com', 'Test');
    store.addNetworkEntry({ index: 0, method: 'GET', url: '/api/data', status: 200, duration: 100, size: 1024, stepIndex: 0, timestamp: 500 });
    expect(store.getSession()!.networkLog).toHaveLength(1);
  });

  it('should add console errors', () => {
    store.startSession('https://example.com', 'Test');
    store.addConsoleEntry({ level: 'error', message: 'TypeError', stepIndex: 0, timestamp: 600 });
    expect(store.getSession()!.consoleErrors).toHaveLength(1);
  });

  it('should pause and resume', () => {
    store.startSession('https://example.com', 'Test');
    store.pause();
    expect(store.getSession()!.status).toBe('paused');
    store.resume();
    expect(store.getSession()!.status).toBe('recording');
  });

  it('should stop the session', () => {
    store.startSession('https://example.com', 'Test');
    store.stop();
    expect(store.getSession()!.status).toBe('stopped');
  });

  it('should return null when no session', () => {
    expect(store.getSession()).toBeNull();
  });

  it('should set framework info', () => {
    store.startSession('https://example.com', 'Test');
    store.setFramework({ name: 'React', version: '18.2.0' });
    expect(store.getSession()!.framework).toEqual({ name: 'React', version: '18.2.0' });
  });
});
