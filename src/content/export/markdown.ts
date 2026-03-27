import type { RecordingSession, RecordingStep } from '../../shared/types';
import { ACTION_TYPES } from '../../shared/constants';
import { generatePlaywright } from './playwright';

function formatTimestamp(ms: number): string {
  return `+${ms}ms`;
}

function formatElementTag(step: RecordingStep): string {
  if (!step.element) return '';
  const el = step.element;
  const classes = el.cssClasses.length > 0 ? ` class="${el.cssClasses.join(' ')}"` : '';
  return `\`<${el.tag}${classes}>\``;
}

function renderStep(step: RecordingStep): string {
  const label = ACTION_TYPES[step.action] ?? step.action;
  const lines: string[] = [];
  lines.push(`### Step ${step.index + 1} — ${label}`);
  lines.push(`- **Action:** \`${step.action}\``);

  if (step.element) {
    lines.push(`- **Element:** ${formatElementTag(step)} "${step.element.textContent}"`);
    lines.push(`- **Selector:** \`${step.element.selector}\``);
    lines.push(`- **Path:** \`${step.element.path}\``);
    if (step.element.framework) {
      lines.push(`- **Component:** \`<${step.element.framework.componentName}>\` (${step.element.framework.name})`);
    }
  }

  if (step.url) lines.push(`- **URL:** \`${step.url}\``);
  if (step.value !== undefined) lines.push(`- **Value:** \`"${step.value}"\``);
  if (step.key) lines.push(`- **Key:** \`${step.key}\``);
  if (step.scrollPosition) lines.push(`- **Scroll:** (${step.scrollPosition.x}, ${step.scrollPosition.y})`);
  lines.push(`- **Timestamp:** ${formatTimestamp(step.timestamp)}`);

  return lines.join('\n');
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  return `${(bytes / 1024).toFixed(1)}KB`;
}

export function generateMarkdown(session: RecordingSession): string {
  const lines: string[] = [];

  lines.push(`# Bug Reproduction: ${session.title}`);
  lines.push('');
  lines.push(`**URL:** ${session.url}`);
  lines.push(`**Date:** ${new Date(session.startedAt).toISOString()}`);
  lines.push(`**Browser:** ${session.browserInfo.name} ${session.browserInfo.version}`);
  lines.push(`**Viewport:** ${session.viewport.width}x${session.viewport.height}`);

  if (session.description) {
    lines.push('');
    lines.push('## Description');
    lines.push(session.description);
  }

  if (session.framework) {
    lines.push('');
    lines.push('## Environment');
    lines.push(`- **Framework:** ${session.framework.name} ${session.framework.version ?? ''}`);
  }

  if (session.steps.length > 0) {
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## Steps');
    lines.push('');
    for (const step of session.steps) {
      lines.push(renderStep(step));
      lines.push('');
    }
  }

  if (session.networkLog.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## Network Log');
    lines.push('');
    lines.push('| # | Method | URL | Status | Duration | Size |');
    lines.push('|---|--------|-----|--------|----------|------|');
    for (const entry of session.networkLog) {
      lines.push(`| ${entry.index + 1} | ${entry.method} | ${entry.url} | ${entry.status} | ${entry.duration}ms | ${formatSize(entry.size)} |`);
    }
    const failed = session.networkLog.filter(e => e.status >= 400 || e.status === 0);
    if (failed.length > 0) {
      lines.push('');
      lines.push('### Failed Requests');
      for (const entry of failed) {
        lines.push(`${entry.method} ${entry.url} → ${entry.status || 'Network Error'}`);
        if (entry.responseBody) lines.push(`Response: ${entry.responseBody}`);
      }
    }
    lines.push('');
  }

  if (session.consoleErrors.length > 0) {
    lines.push('## Console Errors');
    lines.push('');
    lines.push('| # | Step | Level | Message |');
    lines.push('|---|------|-------|---------|');
    for (let i = 0; i < session.consoleErrors.length; i++) {
      const entry = session.consoleErrors[i];
      lines.push(`| ${i + 1} | ${entry.stepIndex + 1} | ${entry.level} | ${entry.message} |`);
    }
    lines.push('');
  }

  if (session.steps.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## Playwright Script (Draft)');
    lines.push('');
    lines.push('```typescript');
    lines.push(generatePlaywright(session).trim());
    lines.push('```');
    lines.push('');
  }

  return lines.join('\n');
}
