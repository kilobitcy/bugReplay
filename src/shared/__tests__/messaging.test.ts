import { describe, it, expect } from 'vitest';
import {
  BUGREPLAY_SOURCE,
  createExtensionMessage,
  createMainWorldMessage,
  isMainWorldMessage,
} from '../messaging';

describe('createExtensionMessage', () => {
  it('should create a START_RECORDING message', () => {
    const msg = createExtensionMessage('START_RECORDING', undefined);
    expect(msg).toEqual({ type: 'START_RECORDING', payload: undefined });
  });

  it('should create a NETWORK_ENTRY message with payload', () => {
    const entry = { index: 0, method: 'GET', url: '/api', status: 200, duration: 100, size: 50, stepIndex: 0, timestamp: 1000 };
    const msg = createExtensionMessage('NETWORK_ENTRY', { entry });
    expect(msg.type).toBe('NETWORK_ENTRY');
    expect(msg.payload.entry.method).toBe('GET');
  });
});

describe('createMainWorldMessage', () => {
  it('should create a message with BUGREPLAY_SOURCE', () => {
    const msg = createMainWorldMessage('BR_CONSOLE_ERROR', {
      level: 'error',
      message: 'TypeError: x is not a function',
      timestamp: 1234,
    });
    expect(msg.source).toBe(BUGREPLAY_SOURCE);
    expect(msg.type).toBe('BR_CONSOLE_ERROR');
  });
});

describe('isMainWorldMessage', () => {
  it('should return true for valid bugreplay messages', () => {
    const msg = { source: 'bugreplay', type: 'BR_CONSOLE_ERROR', payload: {} };
    expect(isMainWorldMessage(msg)).toBe(true);
  });

  it('should return false for non-bugreplay messages', () => {
    expect(isMainWorldMessage({ source: 'other', type: 'FOO' })).toBe(false);
    expect(isMainWorldMessage(null)).toBe(false);
    expect(isMainWorldMessage('string')).toBe(false);
  });
});
