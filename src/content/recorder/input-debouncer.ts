import { INPUT_DEBOUNCE_MS } from '../../shared/constants';

const PASSWORD_MASK = '••••••••';

export class InputDebouncer {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private lastValue: string | null = null;
  private isPassword = false;
  private onFill: (value: string) => void;

  constructor(onFill: (value: string) => void) {
    this.onFill = onFill;
  }

  handleInput(value: string, isPassword = false): void {
    this.lastValue = value;
    this.isPassword = isPassword;
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.emit(); }, INPUT_DEBOUNCE_MS);
  }

  flush(): void {
    if (this.timer !== null) { clearTimeout(this.timer); this.timer = null; }
    this.emit();
  }

  private emit(): void {
    if (this.lastValue === null) return;
    const value = this.isPassword ? PASSWORD_MASK : this.lastValue;
    this.lastValue = null;
    this.timer = null;
    this.onFill(value);
  }
}
