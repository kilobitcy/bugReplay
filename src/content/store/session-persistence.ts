import type { RecordingSession } from '../../shared/types';

const SESSION_PREFIX = 'br_session_';
const SESSION_INDEX_KEY = 'br_session_index';

export async function saveSession(session: RecordingSession): Promise<void> {
  const key = SESSION_PREFIX + session.id;
  await chrome.storage.local.set({ [key]: session });
  const result = await chrome.storage.local.get(SESSION_INDEX_KEY);
  const index: string[] = result[SESSION_INDEX_KEY] ?? [];
  if (!index.includes(session.id)) {
    index.push(session.id);
    await chrome.storage.local.set({ [SESSION_INDEX_KEY]: index });
  }
}

export async function loadSession(id: string): Promise<RecordingSession | null> {
  const key = SESSION_PREFIX + id;
  const result = await chrome.storage.local.get(key);
  return (result[key] as RecordingSession) ?? null;
}

export async function listSessions(): Promise<RecordingSession[]> {
  const result = await chrome.storage.local.get(SESSION_INDEX_KEY);
  const index: string[] = result[SESSION_INDEX_KEY] ?? [];
  const keys = index.map(id => SESSION_PREFIX + id);
  if (keys.length === 0) return [];
  const data = await chrome.storage.local.get(keys);
  return keys.map(k => data[k] as RecordingSession).filter(Boolean);
}

export async function deleteSession(id: string): Promise<void> {
  const key = SESSION_PREFIX + id;
  await chrome.storage.local.remove(key);
  const result = await chrome.storage.local.get(SESSION_INDEX_KEY);
  const index: string[] = result[SESSION_INDEX_KEY] ?? [];
  const updated = index.filter(i => i !== id);
  await chrome.storage.local.set({ [SESSION_INDEX_KEY]: updated });
}
