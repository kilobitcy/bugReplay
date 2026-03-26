import { startNetworkCapture, stopNetworkCapture } from './network-capture';
import type { ExtensionMessage } from '../shared/messaging';

const recordingTabs = new Set<number>();

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, sender, sendResponse) => {
    const tabId = sender.tab?.id ?? -1;

    switch (message.type) {
      case 'START_RECORDING': {
        recordingTabs.add(tabId);
        startNetworkCapture(tabId);
        sendResponse({ ok: true, tabId });
        break;
      }
      case 'STOP_RECORDING': {
        recordingTabs.delete(tabId);
        stopNetworkCapture(tabId);
        sendResponse({ ok: true });
        break;
      }
      case 'PAUSE_RECORDING': {
        stopNetworkCapture(tabId);
        sendResponse({ ok: true });
        break;
      }
      case 'RESUME_RECORDING': {
        startNetworkCapture(tabId);
        sendResponse({ ok: true });
        break;
      }
      case 'GET_RECORDING_STATE': {
        sendResponse({ status: recordingTabs.has(tabId) ? 'recording' : 'stopped' });
        break;
      }
    }
    return true;
  },
);
