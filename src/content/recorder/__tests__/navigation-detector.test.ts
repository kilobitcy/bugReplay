import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NavigationDetector } from '../navigation-detector';

describe('NavigationDetector', () => {
  let onNavigate: ReturnType<typeof vi.fn>;
  let detector: NavigationDetector;

  beforeEach(() => {
    onNavigate = vi.fn();
    detector = new NavigationDetector(onNavigate);
  });

  afterEach(() => {
    detector.destroy();
  });

  it('should detect popstate events after URL change', () => {
    detector.start();
    history.pushState({}, '', '/new-page');
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(onNavigate).toHaveBeenCalledWith(expect.stringContaining('/new-page'));
    history.pushState({}, '', '/');
  });

  it('should detect hashchange events', () => {
    detector.start();
    const oldHref = window.location.href;
    window.location.hash = '#new-section';
    window.dispatchEvent(new HashChangeEvent('hashchange', {
      newURL: window.location.href,
      oldURL: oldHref,
    }));
    expect(onNavigate).toHaveBeenCalled();
    window.location.hash = '';
  });

  it('should not fire after destroy()', () => {
    detector.start();
    detector.destroy();
    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(onNavigate).not.toHaveBeenCalled();
  });
});
