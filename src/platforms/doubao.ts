import { BrowserView } from 'electron';
import { PlatformAdapter } from './base';

export default class DoubaoAdapter implements PlatformAdapter {
  readonly id = 'doubao';
  readonly name = '豆包';
  readonly icon = '🤖';
  readonly url = 'https://www.doubao.com/chat';
  readonly loginUrl = 'https://www.doubao.com/chat';

  async isLoggedIn(view: BrowserView): Promise<boolean> {
    try {
      await view.webContents.loadURL('https://www.doubao.com/chat');
      await new Promise(resolve => setTimeout(resolve, 2000));
      const hasInput = await view.webContents.executeJavaScript(`
        document.querySelector('textarea[placeholder*="输入"]') !== null ||
        document.querySelector('div[contenteditable="true"]') !== null
      `) as boolean;
      return hasInput;
    } catch {
      return false;
    }
  }

  async login(view: BrowserView): Promise<void> {
    await view.webContents.loadURL(this.loginUrl);
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Wait for the input to appear
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Login timeout')), 120000);

      const checkInterval = setInterval(async () => {
        try {
          const hasInput = await view.webContents.executeJavaScript(`
            document.querySelector('textarea[placeholder*="输入"]') !== null ||
            document.querySelector('div[contenteditable="true"]') !== null
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
    // First load the chat page
    await view.webContents.loadURL(this.url);
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Wait for input to be ready
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Input not found')), 15000);
      const checkInterval = setInterval(async () => {
        try {
          const hasInput = await view.webContents.executeJavaScript(`
            document.querySelector('textarea[placeholder*="输入"]') !== null ||
            document.querySelector('div[contenteditable="true"]') !== null
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

    // Fill the input with the question
    await view.webContents.executeJavaScript(`
      const input = document.querySelector('textarea[placeholder*="输入"]') ||
                    document.querySelector('div[contenteditable="true"]');
      if (input) {
        input.textContent = ${JSON.stringify(question)};
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    `);

    // Click the send button
    await view.webContents.executeJavaScript(`
      const buttons = Array.from(document.querySelectorAll('button'));
      const sendButton = buttons.find(btn =>
        btn.textContent.includes('发送') ||
        btn.className.includes('send')
      );
      if (sendButton) sendButton.click();
    `);

    // Wait for response
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Response timeout')), 60000);
      const checkInterval = setInterval(async () => {
        try {
          const hasResponse = await view.webContents.executeJavaScript(`
            document.querySelector('[class*="message-assistant"]') !== null ||
            document.querySelector('[class*="response"]') !== null
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

    // Get the response text
    const response = await view.webContents.executeJavaScript(`
      const messages = document.querySelectorAll('[class*="message-assistant"], [class*="response"]');
      const lastMessage = messages[messages.length - 1];
      return lastMessage ? lastMessage.textContent : '';
    `) as string;

    return response || 'No response received';
  }

  async logout(view: BrowserView): Promise<void> {
    await view.webContents.loadURL('https://www.doubao.com');
    await new Promise(resolve => setTimeout(resolve, 1000));
    await view.webContents.executeJavaScript(`
      const userMenu = document.querySelector('[data-user-menu]') ||
                       document.querySelector('[class*="user-menu"]');
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
