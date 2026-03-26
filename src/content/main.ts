import { createBugreplayHost } from './ui/host';
import { RecorderToolbar } from './ui/recorder-toolbar';
import { StepIndicator } from './ui/step-indicator';
import { EventRecorder } from './recorder/event-recorder';
import { NavigationDetector } from './recorder/navigation-detector';
import { RecordingStore } from './store/recording-store';
import { StepBuilder } from './recorder/step-builder';
import { generateMarkdown } from './export/markdown';
import { copyToClipboard, downloadAsFile } from './export/clipboard';
import type { RecordingStep, ConsoleEntry, NetworkEntry } from '../shared/types';
import { isMainWorldMessage } from '../shared/messaging';

const store = new RecordingStore();
let eventRecorder: EventRecorder | null = null;
let navigationDetector: NavigationDetector | null = null;
let stepBuilder: StepBuilder | null = null;
let timeInterval: ReturnType<typeof setInterval> | null = null;

// --- Setup UI ---
const shadow = createBugreplayHost();
const toolbarContainer = shadow.querySelector('#bugreplay-toolbar') as HTMLElement;
const indicatorContainer = shadow.querySelector('#bugreplay-indicator') as HTMLElement;
const toolbar = new RecorderToolbar(toolbarContainer);
const indicator = new StepIndicator(indicatorContainer);

function onStep(step: RecordingStep): void {
  store.addStep(step);
  const session = store.getSession();
  if (session) {
    toolbar.updateStepCount(session.steps.length);
    indicator.flash(step.index, step.action);
  }
}

function showToolbar(): void {
  toolbarContainer.classList.add('br-visible');
}

function hideToolbar(): void {
  toolbarContainer.classList.remove('br-visible');
}

function startRecording(title: string): void {
  store.startSession(window.location.href, title);
  stepBuilder = new StepBuilder(Date.now());

  eventRecorder = new EventRecorder(onStep);
  eventRecorder.start(store.getSession()!.startedAt);

  navigationDetector = new NavigationDetector((url) => {
    if (stepBuilder) {
      const step = stepBuilder.navigate(url);
      onStep(step);
    }
  });
  navigationDetector.start();

  // Auto first step: navigate
  const firstStep = stepBuilder.navigate(window.location.href);
  onStep(firstStep);

  // Start timer
  timeInterval = setInterval(() => {
    const session = store.getSession();
    if (session) {
      toolbar.updateElapsedTime(Date.now() - session.startedAt);
    }
  }, 1000);

  // Notify background (tabId resolved by service worker from sender.tab.id)
  chrome.runtime.sendMessage({ type: 'START_RECORDING' }).catch(() => {});
}

toolbar.on('record', () => {
  const title = prompt('Bug title:') ?? 'Untitled Bug';
  showToolbar();
  startRecording(title);
});

toolbar.on('pause', () => {
  store.pause();
  eventRecorder?.destroy();
  eventRecorder = null;
  if (timeInterval) { clearInterval(timeInterval); timeInterval = null; }
  chrome.runtime.sendMessage({ type: 'PAUSE_RECORDING' }).catch(() => {});
});

toolbar.on('stop', () => {
  store.stop();
  eventRecorder?.destroy();
  eventRecorder = null;
  navigationDetector?.destroy();
  navigationDetector = null;
  if (timeInterval) { clearInterval(timeInterval); timeInterval = null; }
  hideToolbar();
  chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }).catch(() => {});
});

toolbar.on('export', () => {
  const session = store.getSession();
  if (!session) return;
  const md = generateMarkdown(session);
  copyToClipboard(md);
  // Also offer file download
  downloadAsFile(md, `bugreplay-${session.id}.md`);
});

// --- Listen for main-world messages ---
window.addEventListener('message', (event) => {
  if (event.source !== window) return;
  if (!isMainWorldMessage(event.data)) return;

  const msg = event.data;
  switch (msg.type) {
    case 'BR_CONSOLE_ERROR': {
      const session = store.getSession();
      if (!session || session.status !== 'recording') break;
      const entry: ConsoleEntry = {
        level: msg.payload.level,
        message: msg.payload.message,
        stack: msg.payload.stack,
        stepIndex: session.steps.length - 1,
        timestamp: msg.payload.timestamp - session.startedAt,
      };
      store.addConsoleEntry(entry);
      break;
    }
    case 'BR_FRAMEWORK_DETECT_RESULT': {
      const fws = msg.payload.frameworks;
      if (fws.length > 0) {
        const parts = fws[0].split(' ');
        store.setFramework({ name: parts[0], version: parts[1] });
      }
      break;
    }
  }
});

// --- Listen for messages from background / popup ---
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'NETWORK_ENTRY') {
    const session = store.getSession();
    if (!session) return;
    const entry: NetworkEntry = {
      ...message.payload.entry,
      stepIndex: session.steps.length - 1,
    };
    store.addNetworkEntry(entry);
  }

  if (message.type === 'START_FROM_POPUP') {
    const title = prompt('Bug title:') ?? 'Untitled Bug';
    showToolbar();
    startRecording(title);
  }
});
