import { BrowserView } from 'electron';
import { PlatformAdapter } from './base';

export default class DeepseekAdapter implements PlatformAdapter {
  readonly id = 'deepseek';
  readonly name = 'DeepSeek';
  readonly icon = '🧠';
  readonly url = 'https://chat.deepseek.com';
  readonly loginUrl = 'https://chat.deepseek.com';

  async isLoggedIn(view: BrowserView): Promise<boolean> {
    try {
      await view.webContents.loadURL(this.url);
      await new Promise(resolve => setTimeout(resolve, 2000));
      const hasInput = await view.webContents.executeJavaScript(`
        document.querySelector('textarea[placeholder*="输入"]') !== null ||
        document.querySelector('[contenteditable="true"]') !== null
      `) as boolean;
      return hasInput;
    } catch {
      return false;
    }
  }

  async login(view: BrowserView): Promise<void> {
    await view.webContents.loadURL(this.loginUrl);
    await new Promise(resolve => setTimeout(resolve, 3000));

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Login timeout')), 120000);
      const checkInterval = setInterval(async () => {
        try {
          const hasInput = await view.webContents.executeJavaScript(`
            document.querySelector('textarea[placeholder*="输入"]') !== null ||
            document.querySelector('[contenteditable="true"]') !== null
          `) as boolean;
          if (hasInput) {
            clearInterval(checkInterval);
            clearTimeout(timeout);
            resolve();
          }
        } catch {
          // Ignore errors during polling
        }
      }, 1000);
    });
  }

  async ask(view: BrowserView, question: string): Promise<string> {
    await view.webContents.loadURL(this.url);
    await new Promise(resolve => setTimeout(resolve, 3000));

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Input not found')), 15000);
      const checkInterval = setInterval(async () => {
        try {
          const hasInput = await view.webContents.executeJavaScript(`
            document.querySelector('textarea[placeholder*="输入"]') !== null ||
            document.querySelector('[contenteditable="true"]') !== null
          `) as boolean;
          if (hasInput) {
            clearInterval(checkInterval);
            clearTimeout(timeout);
            resolve();
          }
        } catch {
          // Ignore errors during polling
        }
      }, 500);
    });

    await view.webContents.executeJavaScript(`
      const input = document.querySelector('textarea[placeholder*="输入"]') ||
                    document.querySelector('[contenteditable="true"]');
      if (input) {
        input.value = ${JSON.stringify(question)};
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    `);

    // Press Enter to send
    await view.webContents.executeJavaScript(`
      const input = document.querySelector('textarea[placeholder*="输入"]') ||
                    document.querySelector('[contenteditable="true"]');
      if (input) {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
      }
    `);

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Response timeout')), 60000);
      const checkInterval = setInterval(async () => {
        try {
          const hasResponse = await view.webContents.executeJavaScript(`
            document.querySelector('[class*="message-assistant"]') !== null
          `) as boolean;
          if (hasResponse) {
            clearInterval(checkInterval);
            clearTimeout(timeout);
            resolve();
          }
        } catch {
          // Ignore errors during polling
        }
      }, 1000);
    });

    const response = await view.webContents.executeJavaScript(`
      const messages = document.querySelectorAll('[class*="message-assistant"]');
      const lastMessage = messages[messages.length - 1];
      return lastMessage ? lastMessage.textContent : '';
    `) as string;

    return response || 'No response received';
  }

  async logout(view: BrowserView): Promise<void> {
    await view.webContents.loadURL(this.url);
    await new Promise(resolve => setTimeout(resolve, 1000));
    await view.webContents.executeJavaScript(`
      const userMenu = document.querySelector('[data-user-menu]');
      if (userMenu) userMenu.click();
    `);
    await new Promise(resolve => setTimeout(resolve, 500));
    await view.webContents.executeJavaScript(`
      const logoutBtn = Array.from(document.querySelectorAll('button, a'))
        .find(el => el.textContent.includes('退出'));
      if (logoutBtn) logoutBtn.click();
    `);
  }
}
