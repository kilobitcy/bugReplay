export type ActionType =
  | 'navigate' | 'click' | 'fill' | 'select' | 'check'
  | 'scroll' | 'keypress' | 'hover' | 'drag' | 'upload' | 'dialog';

export interface ElementInfo {
  tag: string;
  selector: string;
  path: string;
  textContent: string;
  attributes: Record<string, string>;
  cssClasses: string[];
  role?: string;
  ariaLabel?: string;
  framework?: {
    name: string;
    componentName: string;
    componentPath?: string;
  };
}

export interface RecordingStep {
  index: number;
  action: ActionType;
  timestamp: number;
  element?: ElementInfo;
  value?: string;
  url?: string;
  scrollPosition?: { x: number; y: number };
  key?: string;
  navigation?: string;
}

export interface NetworkEntry {
  index: number;
  method: string;
  url: string;
  status: number;
  duration: number;
  size: number;
  responseBody?: string;
  stepIndex: number;
  timestamp: number;
}

export interface ConsoleEntry {
  level: 'error' | 'warn';
  message: string;
  stack?: string;
  stepIndex: number;
  timestamp: number;
}

export interface RecordingSession {
  id: string;
  title: string;
  startedAt: number;
  url: string;
  browserInfo: { name: string; version: string; userAgent: string };
  viewport: { width: number; height: number };
  framework?: { name: string; version?: string };
  steps: RecordingStep[];
  networkLog: NetworkEntry[];
  consoleErrors: ConsoleEntry[];
  status: 'recording' | 'paused' | 'stopped';
}
