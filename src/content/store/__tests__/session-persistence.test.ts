import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveSession, loadSession, listSessions, deleteSession } from '../session-persistence';
import type { RecordingSession } from '../../../shared/types';

const storage: Record<string, unknown> = {};
const chromeStorageMock = {
  local: {
    get: vi.fn((keys: string | string[]) => {
      const result: Record<string, unknown> = {};
      const keyList = Array.isArray(keys) ? keys : [keys];
      for (const k of keyList) {
        if (storage[k] !== undefined) result[k] = storage[k];
      }
      return Promise.resolve(result);
    }),
    set: vi.fn((items: Record<string, unknown>) => {
      Object.assign(storage, items);
      return Promise.resolve();
    }),
    remove: vi.fn((keys: string | string[]) => {
      const keyList = Array.isArray(keys) ? keys : [keys];
      for (const k of keyList) delete storage[k];
      return Promise.resolve();
    }),
  },
};

vi.stubGlobal('chrome', { storage: chromeStorageMock });

function createSession(id: string): RecordingSession {
  return {
    id,
    title: `Bug ${id}`,
    startedAt: Date.now(),
    url: 'https://example.com',
    browserInfo: { name: 'Chrome', version: '124', userAgent: '' },
    viewport: { width: 1440, height: 900 },
    steps: [],
    networkLog: [],
    consoleErrors: [],
    status: 'stopped',
  };
}

describe('session-persistence', () => {
  beforeEach(() => {
    Object.keys(storage).forEach(k => delete storage[k]);
  });

  it('should save and load a session', async () => {
    const session = createSession('s1');
    await saveSession(session);
    const loaded = await loadSession('s1');
    expect(loaded).toEqual(session);
  });

  it('should return null for non-existent session', async () => {
    const loaded = await loadSession('nonexistent');
    expect(loaded).toBeNull();
  });

  it('should list saved sessions', async () => {
    await saveSession(createSession('s1'));
    await saveSession(createSession('s2'));
    const list = await listSessions();
    expect(list).toHaveLength(2);
  });

  it('should delete a session', async () => {
    await saveSession(createSession('s1'));
    await deleteSession('s1');
    const loaded = await loadSession('s1');
    expect(loaded).toBeNull();
  });
});
