import type { NetworkEntry } from '../shared/types';

interface PendingRequest {
  method: string;
  url: string;
  startTime: number;
  tabId: number;
}

const pendingRequests = new Map<string, PendingRequest>();
const tabListeners = new Map<number, boolean>();
let networkIndex = 0;

function onBeforeRequest(details: chrome.webRequest.WebRequestBodyDetails): void {
  if (!tabListeners.has(details.tabId)) return;
  pendingRequests.set(details.requestId, {
    method: details.method,
    url: details.url,
    startTime: Date.now(),
    tabId: details.tabId,
  });
}

function onCompleted(details: chrome.webRequest.WebResponseCacheDetails): void {
  const pending = pendingRequests.get(details.requestId);
  if (!pending) return;
  pendingRequests.delete(details.requestId);

  const entry: NetworkEntry = {
    index: networkIndex++,
    method: pending.method,
    url: pending.url,
    status: details.statusCode,
    duration: Date.now() - pending.startTime,
    size: 0,
    stepIndex: -1,
    timestamp: Date.now(),
  };

  chrome.tabs.sendMessage(pending.tabId, {
    type: 'NETWORK_ENTRY',
    payload: { entry },
  }).catch(() => {});
}

function onErrorOccurred(details: chrome.webRequest.WebResponseErrorDetails): void {
  const pending = pendingRequests.get(details.requestId);
  if (!pending) return;
  pendingRequests.delete(details.requestId);

  const entry: NetworkEntry = {
    index: networkIndex++,
    method: pending.method,
    url: pending.url,
    status: 0,
    duration: Date.now() - pending.startTime,
    size: 0,
    stepIndex: -1,
    timestamp: Date.now(),
  };

  chrome.tabs.sendMessage(pending.tabId, {
    type: 'NETWORK_ENTRY',
    payload: { entry },
  }).catch(() => {});
}

export function startNetworkCapture(tabId: number): void {
  if (tabListeners.has(tabId)) return;
  tabListeners.set(tabId, true);

  if (tabListeners.size === 1) {
    chrome.webRequest.onBeforeRequest.addListener(onBeforeRequest, { urls: ['<all_urls>'] }, []);
    chrome.webRequest.onCompleted.addListener(onCompleted, { urls: ['<all_urls>'] }, []);
    chrome.webRequest.onErrorOccurred.addListener(onErrorOccurred, { urls: ['<all_urls>'] });
  }
}

export function stopNetworkCapture(tabId: number): void {
  tabListeners.delete(tabId);

  if (tabListeners.size === 0) {
    chrome.webRequest.onBeforeRequest.removeListener(onBeforeRequest);
    chrome.webRequest.onCompleted.removeListener(onCompleted);
    chrome.webRequest.onErrorOccurred.removeListener(onErrorOccurred);
    pendingRequests.clear();
  }
}
