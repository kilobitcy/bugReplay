export const INPUT_DEBOUNCE_MS = 500;
export const SCROLL_DEBOUNCE_MS = 300;
export const FRAMEWORK_DETECT_TIMEOUT_MS = 2000;
export const SHORT_TEXT_LIMIT = 25;
export const LONG_TEXT_LIMIT = 40;
export const SPECIAL_KEYS = new Set(['Enter', 'Escape', 'Tab']);

export const ACTION_TYPES: Record<string, string> = {
  navigate: 'Navigate',
  click: 'Click',
  fill: 'Fill',
  select: 'Select',
  check: 'Check',
  scroll: 'Scroll',
  keypress: 'Keypress',
  hover: 'Hover',
  drag: 'Drag',
  upload: 'Upload',
  dialog: 'Dialog',
};
