import { describe, it, expect, afterEach } from 'vitest';
import { createBugreplayHost, getBugreplayShadow, _resetBugreplayHost } from '../host';

describe('BugReplay Shadow DOM host', () => {
  afterEach(() => {
    document.querySelector('bugreplay-root')?.remove();
    _resetBugreplayHost();
  });

  it('should create a shadow root with toolbar and indicator zones', () => {
    const shadow = createBugreplayHost();
    expect(shadow).toBeDefined();
    expect(shadow.querySelector('#bugreplay-toolbar')).not.toBeNull();
    expect(shadow.querySelector('#bugreplay-indicator')).not.toBeNull();
  });

  it('should return the same shadow root on second call', () => {
    const shadow1 = createBugreplayHost();
    const shadow2 = createBugreplayHost();
    expect(shadow1).toBe(shadow2);
  });

  it('should be retrievable via getBugreplayShadow', () => {
    createBugreplayHost();
    expect(getBugreplayShadow()).not.toBeNull();
  });

  it('should return null before creation', () => {
    expect(getBugreplayShadow()).toBeNull();
  });
});
