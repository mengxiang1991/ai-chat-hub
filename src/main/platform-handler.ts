import { ipcMain } from 'electron';
import { registry } from '../platforms';
import { viewManager } from './view-manager';

export function setupPlatformHandlers() {
  // platform:ask - 向平台发送问题并获取回复
  ipcMain.handle('platform:ask', async (_event, platformId: string, question: string) => {
    const adapter = registry.get(platformId);
    if (!adapter) {
      throw new Error(`Platform ${platformId} not found`);
    }

    // Ensure view exists
    if (!viewManager.hasView(platformId)) {
      await viewManager.createView(platformId, adapter.url);
    }

    const view = viewManager.getView(platformId);
    if (!view) {
      throw new Error(`View ${platformId} not found`);
    }

    try {
      return await adapter.ask(view, question);
    } catch (error) {
      throw new Error(`Failed to ask ${platformId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // platform:login - 触发平台登录流程
  ipcMain.handle('platform:login', async (_event, platformId: string) => {
    console.log(`[Login] Starting login for ${platformId}`);
    const adapter = registry.get(platformId);
    if (!adapter) {
      console.error(`[Login] Platform ${platformId} not found in registry`);
      throw new Error(`Platform ${platformId} not found`);
    }
    console.log(`[Login] Got adapter for ${platformId}`);

    try {
      // Create view for the platform if it doesn't exist
      let view = viewManager.getView(platformId);
      if (!view) {
        console.log(`[Login] Creating new view for ${platformId}`);
        view = await viewManager.createView(platformId, adapter.loginUrl);
      } else {
        console.log(`[Login] Using existing view for ${platformId}`);
        await viewManager.loadURL(platformId, adapter.loginUrl);
      }

      console.log(`[Login] Calling adapter.login()...`);
      await adapter.login(view);
      console.log(`[Login] adapter.login() completed successfully`);

      // Save session state
      viewManager.saveSession(platformId);
      console.log(`[Login] Session saved`);
    } catch (error) {
      console.error(`[Login] Login failed:`, error);
      throw new Error(`Login failed for ${platformId}: ${error instanceof Error ? error.message : String(error)}`);
    }

    console.log(`[Login] Login complete for ${platformId}`);
    return true;
  });

  // platform:is-logged-in - 检查平台登录状态
  ipcMain.handle('platform:is-logged-in', async (_event, platformId: string) => {
    const adapter = registry.get(platformId);
    if (!adapter) {
      return false;
    }

    try {
      let view = viewManager.getView(platformId);
      if (!view) {
        // Create a temporary view to check login status
        view = await viewManager.createView(platformId, adapter.url);
      }
      return await adapter.isLoggedIn(view);
    } catch (error) {
      console.error(`isLoggedIn check failed for ${platformId}:`, error);
      return false;
    }
  });

  // platform:logout - 清除平台登录状态
  ipcMain.handle('platform:logout', async (_event, platformId: string) => {
    try {
      const adapter = registry.get(platformId);
      if (adapter) {
        const view = viewManager.getView(platformId);
        if (view) {
          await adapter.logout(view);
        }
      }
      viewManager.clearSession(platformId);
      await viewManager.closeView(platformId);
      return true;
    } catch (error) {
      console.error(`Logout failed for ${platformId}:`, error);
      throw new Error(`Logout failed for ${platformId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  });

  // platform:list - 获取所有平台列表
  ipcMain.handle('platform:list', async () => {
    return registry.list().map(p => ({
      id: p.id,
      name: p.name,
      icon: p.icon,
    }));
  });

  // platform:open - Open platform in BrowserView
  ipcMain.handle('platform:open', async (_event, platformId: string) => {
    const adapter = registry.get(platformId);
    if (!adapter) {
      throw new Error(`Platform ${platformId} not found`);
    }

    try {
      if (!viewManager.hasView(platformId)) {
        await viewManager.createView(platformId, adapter.url);
      } else {
        await viewManager.loadURL(platformId, adapter.url);
      }
      viewManager.setActiveView(platformId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // platform:close - Close platform BrowserView
  ipcMain.handle('platform:close', async (_event, platformId: string) => {
    try {
      await viewManager.closeView(platformId);
      return { success: true };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  });

  // addCustomPlatform - 添加自定义平台
  ipcMain.handle('addCustomPlatform', async (_event, config: { id: string; name: string; icon: string; url: string; loginUrl?: string }) => {
    if (registry.get(config.id)) {
      throw new Error(`Platform ${config.id} already exists`);
    }

    class CustomAdapter {
      readonly id: string = config.id;
      readonly name: string = config.name;
      readonly icon: string = config.icon;
      readonly url: string = config.url;
      readonly loginUrl: string = config.loginUrl || config.url;

      async isLoggedIn(view: any): Promise<boolean> {
        try {
          await view.webContents.loadURL(this.url);
          await new Promise(resolve => setTimeout(resolve, 2000));
          const hasInput = await view.webContents.executeJavaScript(`
            document.querySelector('textarea[placeholder*="输入"], textarea[placeholder*="搜索"], input[type="text"], [contenteditable="true"]') !== null
          `) as boolean;
          return hasInput;
        } catch {
          return false;
        }
      }

      async login(view: any): Promise<void> {
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
                document.querySelector('textarea[placeholder*="输入"], textarea[placeholder*="搜索"], input[type="text"], [contenteditable="true"]') !== null
              `) as boolean;
              if (hasInput) {
                cleanup();
                resolve();
              }
            } catch {
              // Ignore errors
            }
          }, 1000);
        }).finally(cleanup);
      }

      async ask(view: any, question: string): Promise<string> {
        await view.webContents.loadURL(this.url);
        await new Promise(resolve => setTimeout(resolve, 3000));

        let inputCheckInterval: NodeJS.Timeout | null = null;
        let inputTimeout: NodeJS.Timeout | null = null;
        const inputCleanup = () => {
          if (inputCheckInterval) clearInterval(inputCheckInterval);
          if (inputTimeout) clearTimeout(inputTimeout);
        };
        await new Promise<void>((resolve, reject) => {
          inputTimeout = setTimeout(() => reject(new Error('Input not found')), 15000);
          inputCheckInterval = setInterval(async () => {
            try {
              const hasInput = await view.webContents.executeJavaScript(`
                document.querySelector('textarea[placeholder*="输入"], textarea[placeholder*="搜索"], input[type="text"], [contenteditable="true"]') !== null
              `) as boolean;
              if (hasInput) {
                inputCleanup();
                resolve();
              }
            } catch {
              // Ignore errors
            }
          }, 500);
        }).finally(inputCleanup);

        await view.webContents.executeJavaScript(`
          const input = document.querySelector('textarea[placeholder*="输入"], textarea[placeholder*="搜索"], input[type="text"], [contenteditable="true"]');
          if (input) {
            input.value = ${JSON.stringify(question)};
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
        `);

        await view.webContents.executeJavaScript(`
          const input = document.querySelector('textarea[placeholder*="输入"], textarea[placeholder*="搜索"], input[type="text"], [contenteditable="true"]');
          if (input) {
            input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
          }
        `);

        let responseCheckInterval: NodeJS.Timeout | null = null;
        let responseTimeout: NodeJS.Timeout | null = null;
        const responseCleanup = () => {
          if (responseCheckInterval) clearInterval(responseCheckInterval);
          if (responseTimeout) clearTimeout(responseTimeout);
        };
        await new Promise<void>((resolve, reject) => {
          responseTimeout = setTimeout(() => reject(new Error('Response timeout')), 60000);
          responseCheckInterval = setInterval(async () => {
            try {
              const hasResponse = await view.webContents.executeJavaScript(`
                document.querySelector('[class*="message"], [class*="response"], [class*="answer"]') !== null
              `) as boolean;
              if (hasResponse) {
                responseCleanup();
                resolve();
              }
            } catch {
              // Ignore errors
            }
          }, 1000);
        }).finally(responseCleanup);

        const response = await view.webContents.executeJavaScript(`
          const messages = document.querySelectorAll('[class*="message-assistant"], [class*="response"], [class*="answer"]');
          const lastMessage = messages[messages.length - 1];
          return lastMessage ? lastMessage.textContent : '';
        `) as string;

        return response || 'No response received';
      }

      async logout(view: any): Promise<void> {
        await view.webContents.loadURL(this.url);
        await new Promise(resolve => setTimeout(resolve, 1000));
        await view.webContents.executeJavaScript(`
          const userMenu = document.querySelector('[data-user-menu], [class*="user-menu"], [class*="avatar"]');
          if (userMenu) userMenu.click();
        `);
        await new Promise(resolve => setTimeout(resolve, 500));
        await view.webContents.executeJavaScript(`
          const logoutBtn = Array.from(document.querySelectorAll('button, a'))
            .find(el => el.textContent.includes('退出') || el.textContent.includes('Logout'));
          if (logoutBtn) logoutBtn.click();
        `);
      }
    }

    registry.register(config.id, CustomAdapter as any);
    return true;
  });
}
