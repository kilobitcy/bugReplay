export const BUGREPLAY_SOURCE = 'bugreplay' as const;

// tabId is resolved by the service worker from sender.tab.id
export type ExtensionMessage =
  | { type: 'START_RECORDING'; payload?: undefined }
  | { type: 'STOP_RECORDING'; payload?: undefined }
  | { type: 'PAUSE_RECORDING'; payload?: undefined }
  | { type: 'RESUME_RECORDING'; payload?: undefined }
  | { type: 'NETWORK_ENTRY'; payload: { entry: import('./types').NetworkEntry } }
  | { type: 'GET_RECORDING_STATE'; payload?: undefined }
  | { type: 'RECORDING_STATE'; payload: { status: import('./types').RecordingSession['status'] } }
  | { type: 'START_FROM_POPUP'; payload?: undefined };

export type MainWorldMessagePayload =
  | { type: 'BR_FRAMEWORK_DETECT_RESULT'; payload: { frameworks: string[] } }
  | { type: 'BR_COMPONENT_INFO_REQUEST'; payload: { elementSelector: string } }
  | { type: 'BR_COMPONENT_INFO'; payload: { name: string; componentName: string; componentPath?: string } | null }
  | { type: 'BR_CONSOLE_ERROR'; payload: { level: 'error' | 'warn'; message: string; stack?: string; timestamp: number } };

export type MainWorldMessage = MainWorldMessagePayload & { source: typeof BUGREPLAY_SOURCE };

export function createExtensionMessage<T extends ExtensionMessage['type']>(
  type: T,
  payload: Extract<ExtensionMessage, { type: T }>['payload'],
): Extract<ExtensionMessage, { type: T }> {
  return { type, payload } as Extract<ExtensionMessage, { type: T }>;
}

export function createMainWorldMessage<T extends MainWorldMessagePayload['type']>(
  type: T,
  payload: Extract<MainWorldMessagePayload, { type: T }>['payload'],
): MainWorldMessage {
  return { source: BUGREPLAY_SOURCE, type, payload } as unknown as MainWorldMessage;
}

export function isMainWorldMessage(data: unknown): data is MainWorldMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    'source' in data &&
    (data as Record<string, unknown>).source === BUGREPLAY_SOURCE
  );
}
