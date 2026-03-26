const STYLES = `
:host {
  all: initial;
  font-family: system-ui, -apple-system, sans-serif;
  --br-bg: #ffffff;
  --br-text: #1a1a1a;
  --br-accent: #ef4444;
  --br-accent-hover: #dc2626;
  --br-border: #e5e5e5;
  --br-radius: 8px;
  --br-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

@media (prefers-color-scheme: dark) {
  :host {
    --br-bg: #1e1e1e;
    --br-text: #e5e5e5;
    --br-accent: #f87171;
    --br-accent-hover: #ef4444;
    --br-border: #404040;
  }
}

#bugreplay-toolbar,
#bugreplay-indicator {
  position: fixed;
  z-index: 2147483647;
  pointer-events: auto;
}

#bugreplay-toolbar {
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: none;
}

#bugreplay-toolbar.br-visible {
  display: block;
}

#bugreplay-indicator {
  top: 12px;
  right: 12px;
}
`;

let shadowRoot: ShadowRoot | null = null;

export function createBugreplayHost(): ShadowRoot {
  if (shadowRoot) return shadowRoot;
  const existing = document.querySelector('bugreplay-root');
  if (existing) existing.remove();
  const host = document.createElement('bugreplay-root');
  host.setAttribute('data-bugreplay', '');
  shadowRoot = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = STYLES;
  shadowRoot.appendChild(style);
  for (const id of ['bugreplay-toolbar', 'bugreplay-indicator']) {
    const div = document.createElement('div');
    div.id = id;
    shadowRoot.appendChild(div);
  }
  document.body.appendChild(host);
  return shadowRoot;
}

export function getBugreplayShadow(): ShadowRoot | null {
  return shadowRoot;
}

export function _resetBugreplayHost(): void {
  shadowRoot = null;
}
