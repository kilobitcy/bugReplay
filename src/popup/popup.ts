import { listSessions, deleteSession, loadSession } from '../content/store/session-persistence';
import { generateMarkdown } from '../content/export/markdown';

// --- Start Recording button ---
const startBtn = document.getElementById('start-btn') as HTMLButtonElement;

startBtn.addEventListener('click', async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;
  await chrome.tabs.sendMessage(tab.id, { type: 'START_FROM_POPUP' });
  window.close();
});

async function render(): Promise<void> {
  const list = document.getElementById('session-list')!;
  const sessions = await listSessions();

  if (sessions.length === 0) {
    list.innerHTML = '<li class="empty">No recorded sessions yet.</li>';
    return;
  }

  list.innerHTML = '';
  for (const session of sessions.reverse()) {
    const li = document.createElement('li');
    li.className = 'session-item';

    const title = document.createElement('div');
    title.className = 'session-title';
    title.textContent = session.title;

    const meta = document.createElement('div');
    meta.className = 'session-meta';
    meta.textContent = `${session.steps.length} steps · ${new Date(session.startedAt).toLocaleString()}`;

    const actions = document.createElement('div');
    actions.className = 'actions';

    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy MD';
    copyBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const full = await loadSession(session.id);
      if (full) {
        const md = generateMarkdown(full);
        await navigator.clipboard.writeText(md);
        copyBtn.textContent = 'Copied!';
        setTimeout(() => { copyBtn.textContent = 'Copy MD'; }, 1500);
      }
    });

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await deleteSession(session.id);
      render();
    });

    actions.appendChild(copyBtn);
    actions.appendChild(deleteBtn);
    li.appendChild(title);
    li.appendChild(meta);
    li.appendChild(actions);
    list.appendChild(li);
  }
}

render();
