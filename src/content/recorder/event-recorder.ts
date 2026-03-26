import { extractElementInfo } from '../capture/element-info';
import { StepBuilder } from './step-builder';
import { InputDebouncer } from './input-debouncer';
import type { RecordingStep } from '../../shared/types';
import { SCROLL_DEBOUNCE_MS, SPECIAL_KEYS } from '../../shared/constants';

export class EventRecorder {
  private onStep: (step: RecordingStep) => void;
  private stepBuilder: StepBuilder | null = null;
  private inputDebouncer: InputDebouncer | null = null;
  private scrollTimer: ReturnType<typeof setTimeout> | null = null;
  private lastInputElement: Element | null = null;

  private clickHandler: ((e: MouseEvent) => void) | null = null;
  private inputHandler: ((e: Event) => void) | null = null;
  private changeHandler: ((e: Event) => void) | null = null;
  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private scrollHandler: (() => void) | null = null;

  constructor(onStep: (step: RecordingStep) => void) {
    this.onStep = onStep;
  }

  start(sessionStart: number): void {
    this.stepBuilder = new StepBuilder(sessionStart);

    this.inputDebouncer = new InputDebouncer((value: string) => {
      if (!this.stepBuilder || !this.lastInputElement) return;
      const info = extractElementInfo(this.lastInputElement);
      const step = this.stepBuilder.fill(info, value);
      this.onStep(step);
    });

    this.clickHandler = (e: MouseEvent) => {
      const target = e.target as Element;
      if (!target || !this.stepBuilder) return;
      // Ignore clicks on BugReplay's own UI (Shadow DOM host)
      if (target.closest('bugreplay-root') || target.tagName.toLowerCase() === 'bugreplay-root') return;
      this.inputDebouncer?.flush();
      const info = extractElementInfo(target);
      const step = this.stepBuilder.click(info);
      this.onStep(step);
    };

    this.inputHandler = (e: Event) => {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      if (!target || !this.inputDebouncer) return;
      if ((target as Element).closest?.('bugreplay-root') || (target as Element).tagName?.toLowerCase() === 'bugreplay-root') return;
      this.lastInputElement = target;
      const isPassword = target instanceof HTMLInputElement && target.type === 'password';
      this.inputDebouncer.handleInput(target.value, isPassword);
    };

    this.changeHandler = (e: Event) => {
      const target = e.target as HTMLSelectElement;
      if (!target || !this.stepBuilder) return;
      if ((target as Element).closest?.('bugreplay-root') || (target as Element).tagName?.toLowerCase() === 'bugreplay-root') return;
      if (target.tagName.toLowerCase() === 'select') {
        const info = extractElementInfo(target);
        const step = this.stepBuilder.select(info, target.value);
        this.onStep(step);
      }
    };

    this.keydownHandler = (e: KeyboardEvent) => {
      if (!this.stepBuilder || !SPECIAL_KEYS.has(e.key)) return;
      const step = this.stepBuilder.keypress(e.key);
      this.onStep(step);
    };

    this.scrollHandler = () => {
      if (this.scrollTimer) clearTimeout(this.scrollTimer);
      this.scrollTimer = setTimeout(() => {
        if (!this.stepBuilder) return;
        const step = this.stepBuilder.scroll(window.scrollX, window.scrollY);
        this.onStep(step);
      }, SCROLL_DEBOUNCE_MS);
    };

    document.addEventListener('click', this.clickHandler, { capture: true, passive: true });
    document.addEventListener('input', this.inputHandler, { capture: true, passive: true });
    document.addEventListener('change', this.changeHandler, { capture: true, passive: true });
    document.addEventListener('keydown', this.keydownHandler, { capture: true, passive: true });
    window.addEventListener('scroll', this.scrollHandler, { passive: true });
  }

  destroy(): void {
    if (this.clickHandler) { document.removeEventListener('click', this.clickHandler, { capture: true }); this.clickHandler = null; }
    if (this.inputHandler) { document.removeEventListener('input', this.inputHandler, { capture: true }); this.inputHandler = null; }
    if (this.changeHandler) { document.removeEventListener('change', this.changeHandler, { capture: true }); this.changeHandler = null; }
    if (this.keydownHandler) { document.removeEventListener('keydown', this.keydownHandler, { capture: true }); this.keydownHandler = null; }
    if (this.scrollHandler) { window.removeEventListener('scroll', this.scrollHandler); this.scrollHandler = null; }
    if (this.scrollTimer) { clearTimeout(this.scrollTimer); this.scrollTimer = null; }
    this.inputDebouncer?.flush();
    this.inputDebouncer = null;
    this.stepBuilder = null;
  }
}
