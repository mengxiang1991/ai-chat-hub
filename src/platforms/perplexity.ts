import { BrowserView } from 'electron';
import { PlatformAdapter } from './base';

export default class PerplexityAdapter implements PlatformAdapter {
  readonly id = 'perplexity';
  readonly name = 'Perplexity';
  readonly icon = '🔍';
  readonly url = 'https://www.perplexity.ai';
  readonly loginUrl = 'https://www.perplexity.ai';

  async isLoggedIn(view: BrowserView): Promise<boolean> {
    try {
      await view.webContents.loadURL(this.url);
      await new Promise(resolve => setTimeout(resolve, 2000));
      const isLoggedIn = await view.webContents.executeJavaScript(`
        // Check for user avatar/menu which indicates logged in state
        document.querySelector('[class*="avatar"]') !== null ||
        document.querySelector('[class*="user-menu"]') !== null ||
        document.querySelector('[class*="user-info"]') !== null ||
        // Fallback: check for search input not disabled
        (document.querySelector('input[placeholder*="Search"]') !== null &&
         document.querySelector('input[placeholder*="Search"]').disabled === false)
      `) as boolean;
      return isLoggedIn;
    } catch {
      return false;
    }
  }

  async login(view: BrowserView): Promise<void> {
    await view.webContents.loadURL(this.loginUrl);
    await new Promise(resolve => setTimeout(resolve, 3000));

    let checkInterval: NodeJS.Timeout | null = null;
    let timeout: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (checkInterval) clearInterval(checkInterval);
      if (timeout) clearTimeout(timeout);
    };

    await new Promise<void>((resolve, reject) => {
      timeout = setTimeout(() => reject(new Error('Login timeout')), 120000);
      checkInterval = setInterval(async () => {
        try {
          const hasInput = await view.webContents.executeJavaScript(`
            document.querySelector('input[placeholder*="Search"]') !== null ||
            document.querySelector('textarea') !== null
          `) as boolean;
          if (hasInput) {
            cleanup();
            resolve();
          }
        } catch {
          // Ignore errors during polling
        }
      }, 1000);
    }).finally(cleanup);
  }

  async ask(view: BrowserView, question: string): Promise<string> {
    await view.webContents.loadURL(this.url);
    await new Promise(resolve => setTimeout(resolve, 3000));

    let checkInterval: NodeJS.Timeout | null = null;
    let timeout: NodeJS.Timeout | null = null;

    const cleanup = () => {
      if (checkInterval) clearInterval(checkInterval);
      if (timeout) clearTimeout(timeout);
    };

    await new Promise<void>((resolve, reject) => {
      timeout = setTimeout(() => reject(new Error('Input not found')), 15000);
      checkInterval = setInterval(async () => {
        try {
          const hasInput = await view.webContents.executeJavaScript(`
            document.querySelector('input[placeholder*="Search"]') !== null ||
            document.querySelector('textarea') !== null
          `) as boolean;
          if (hasInput) {
            cleanup();
            resolve();
          }
        } catch {
          // Ignore errors during polling
        }
      }, 500);
    }).finally(cleanup);

    await view.webContents.executeJavaScript(`
      const input = document.querySelector('input[placeholder*="Search"]') ||
                    document.querySelector('textarea');
      if (input) {
        input.value = ${JSON.stringify(question)};
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    `);

    await view.webContents.executeJavaScript(`
      const input = document.querySelector('input[placeholder*="Search"]') ||
                    document.querySelector('textarea');
      if (input) {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true }));
      }
    `);

    let responseInterval: NodeJS.Timeout | null = null;
    let responseTimeout: NodeJS.Timeout | null = null;

    const cleanupResponse = () => {
      if (responseInterval) clearInterval(responseInterval);
      if (responseTimeout) clearTimeout(responseTimeout);
    };

    await new Promise<void>((resolve, reject) => {
      responseTimeout = setTimeout(() => reject(new Error('Response timeout')), 60000);
      responseInterval = setInterval(async () => {
        try {
          const hasResponse = await view.webContents.executeJavaScript(`
            document.querySelector('[class*="message-assistant"]') !== null ||
            document.querySelector('[class*="result"]') !== null
          `) as boolean;
          if (hasResponse) {
            cleanupResponse();
            resolve();
          }
        } catch {
          // Ignore errors during polling
        }
      }, 1000);
    }).finally(cleanupResponse);

    const response = await view.webContents.executeJavaScript(`
      const messages = document.querySelectorAll('[class*="message-assistant"], [class*="result"]');
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
        .find(el => el.textContent.includes('Log out'));
      if (logoutBtn) logoutBtn.click();
    `);
  }
}
