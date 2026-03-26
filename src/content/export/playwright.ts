import type { RecordingSession, RecordingStep } from '../../shared/types';

function escapeString(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function stepToLine(step: RecordingStep): string | null {
  switch (step.action) {
    case 'navigate':
      return step.url ? `  await page.goto('${escapeString(step.url)}');` : null;
    case 'click':
      if (!step.element) return null;
      return `  await page.locator('${escapeString(step.element.selector)}').click();`;
    case 'fill':
      if (!step.element || step.value === undefined) return null;
      return `  await page.locator('${escapeString(step.element.selector)}').fill('${escapeString(step.value)}');`;
    case 'select':
      if (!step.element || step.value === undefined) return null;
      return `  await page.locator('${escapeString(step.element.selector)}').selectOption('${escapeString(step.value)}');`;
    case 'check':
      if (!step.element) return null;
      return `  await page.locator('${escapeString(step.element.selector)}').check();`;
    case 'keypress':
      return step.key ? `  await page.keyboard.press('${escapeString(step.key)}');` : null;
    default:
      return null;
  }
}

export function generatePlaywright(session: RecordingSession): string {
  const lines: string[] = [];
  lines.push("import { test, expect } from '@playwright/test';");
  lines.push('');
  lines.push(`test('Bug: ${escapeString(session.title)}', async ({ page }) => {`);
  for (const step of session.steps) {
    const line = stepToLine(step);
    if (line) lines.push(line);
  }
  lines.push('});');
  lines.push('');
  return lines.join('\n');
}
