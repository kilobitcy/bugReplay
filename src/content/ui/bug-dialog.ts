export interface BugDialogResult {
  title: string;
  description: string;
}

export class BugDescriptionDialog {
  private root: ShadowRoot | HTMLElement;
  private overlay: HTMLDivElement | null = null;

  constructor(root: ShadowRoot | HTMLElement) {
    this.root = root;
  }

  show(defaultTitle: string): Promise<BugDialogResult | null> {
    return new Promise((resolve) => {
      this.overlay = document.createElement('div');
      this.overlay.style.cssText =
        'position:fixed;inset:0;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;z-index:2147483647;';

      const dialog = document.createElement('div');
      dialog.style.cssText =
        'background:var(--br-bg,#fff);border-radius:var(--br-radius,8px);box-shadow:0 8px 32px rgba(0,0,0,0.25);padding:20px;width:420px;max-width:90vw;color:var(--br-text,#1a1a1a);font-family:system-ui,-apple-system,sans-serif;';

      const heading = document.createElement('h3');
      heading.textContent = 'Bug 描述';
      heading.style.cssText = 'margin:0 0 16px;font-size:16px;font-weight:600;';
      dialog.appendChild(heading);

      // Title
      const titleLabel = document.createElement('label');
      titleLabel.textContent = 'Bug 标题';
      titleLabel.style.cssText = 'display:block;font-size:13px;font-weight:500;margin-bottom:4px;';
      dialog.appendChild(titleLabel);

      const titleInput = document.createElement('input');
      titleInput.type = 'text';
      titleInput.value = defaultTitle;
      titleInput.placeholder = '输入 Bug 标题';
      titleInput.style.cssText =
        'width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--br-border,#e5e5e5);border-radius:6px;font-size:14px;margin-bottom:12px;background:var(--br-bg,#fff);color:var(--br-text,#1a1a1a);outline:none;';
      dialog.appendChild(titleInput);

      // Description
      const descLabel = document.createElement('label');
      descLabel.textContent = 'Bug 描述（可选）';
      descLabel.style.cssText = 'display:block;font-size:13px;font-weight:500;margin-bottom:4px;';
      dialog.appendChild(descLabel);

      const descInput = document.createElement('textarea');
      descInput.placeholder = '描述 Bug 的表现、预期行为等';
      descInput.rows = 4;
      descInput.style.cssText =
        'width:100%;box-sizing:border-box;padding:8px 10px;border:1px solid var(--br-border,#e5e5e5);border-radius:6px;font-size:14px;margin-bottom:16px;resize:vertical;background:var(--br-bg,#fff);color:var(--br-text,#1a1a1a);outline:none;font-family:inherit;';
      dialog.appendChild(descInput);

      // Buttons
      const btnRow = document.createElement('div');
      btnRow.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;';

      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = '取消';
      cancelBtn.style.cssText =
        'cursor:pointer;padding:8px 16px;border:1px solid var(--br-border,#e5e5e5);border-radius:6px;background:transparent;color:var(--br-text,#1a1a1a);font-size:14px;';
      cancelBtn.addEventListener('click', () => {
        this.close();
        resolve(null);
      });
      btnRow.appendChild(cancelBtn);

      const confirmBtn = document.createElement('button');
      confirmBtn.textContent = '导出';
      confirmBtn.style.cssText =
        'cursor:pointer;padding:8px 16px;border:none;border-radius:6px;background:var(--br-accent,#ef4444);color:#fff;font-size:14px;font-weight:500;';
      confirmBtn.addEventListener('click', () => {
        const title = titleInput.value.trim() || defaultTitle;
        const description = descInput.value.trim();
        this.close();
        resolve({ title, description });
      });
      btnRow.appendChild(confirmBtn);

      dialog.appendChild(btnRow);
      this.overlay.appendChild(dialog);
      this.root.appendChild(this.overlay);

      // Focus title input and select all
      titleInput.focus();
      titleInput.select();

      // Enter to confirm
      const onKeydown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          this.close();
          resolve(null);
        }
        if (e.key === 'Enter' && e.target === titleInput) {
          confirmBtn.click();
        }
      };
      this.overlay.addEventListener('keydown', onKeydown);
    });
  }

  private close(): void {
    if (this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }
}
