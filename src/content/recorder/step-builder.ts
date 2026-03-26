import type { RecordingStep, ElementInfo } from '../../shared/types';

export class StepBuilder {
  private nextIndex = 0;
  private sessionStart: number;

  constructor(sessionStart: number) {
    this.sessionStart = sessionStart;
  }

  get currentIndex(): number {
    return this.nextIndex;
  }

  navigate(url: string): RecordingStep {
    return this.createStep({ action: 'navigate', url });
  }

  click(element: ElementInfo): RecordingStep {
    return this.createStep({ action: 'click', element });
  }

  fill(element: ElementInfo, value: string): RecordingStep {
    return this.createStep({ action: 'fill', element, value });
  }

  select(element: ElementInfo, value: string): RecordingStep {
    return this.createStep({ action: 'select', element, value });
  }

  check(element: ElementInfo): RecordingStep {
    return this.createStep({ action: 'check', element });
  }

  scroll(x: number, y: number): RecordingStep {
    return this.createStep({ action: 'scroll', scrollPosition: { x, y } });
  }

  keypress(key: string): RecordingStep {
    return this.createStep({ action: 'keypress', key });
  }

  private createStep(fields: Partial<RecordingStep>): RecordingStep {
    return {
      ...fields,
      index: this.nextIndex++,
      action: fields.action!,
      timestamp: Date.now() - this.sessionStart,
    } as RecordingStep;
  }
}
