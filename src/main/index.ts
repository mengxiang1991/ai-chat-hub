import { app, BrowserWindow, ipcMain, BrowserView } from 'electron';
import path from 'path';
import store from './store';
import { setupPlatformHandlers } from './platform-handler';
import { viewManager } from './view-manager';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Set up ViewManager with the main window
  viewManager.setMainWindow(mainWindow);

  const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../renderer/index.html'));
  }

  // Handle window resize to resize BrowserViews
  mainWindow.on('resize', () => {
    if (mainWindow) {
      viewManager.resizeAllViews();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  console.log('[Main] Window created');
}

app.whenReady().then(() => {
  setupPlatformHandlers(); // Register IPC handlers first
  createWindow();          // Then create window

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  viewManager.closeAllViews();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers for store
ipcMain.handle('store:get', async (_event, key: string) => {
  return store.get(key);
});

ipcMain.handle('store:set', async (_event, key: string, value: unknown) => {
  store.set(key, value);
});

// ViewManager IPC handlers
ipcMain.handle('view:create', async (_event, platformId: string, url: string) => {
  try {
    const view = await viewManager.createView(platformId, url);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('view:load-url', async (_event, platformId: string, url: string) => {
  try {
    await viewManager.loadURL(platformId, url);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('view:execute-js', async (_event, platformId: string, script: string) => {
  try {
    const result = await viewManager.executeJavaScript(platformId, script);
    return { success: true, result };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('view:set-active', async (_event, platformId: string | null) => {
  viewManager.setActiveView(platformId);
  return { success: true };
});

ipcMain.handle('view:close', async (_event, platformId: string) => {
  try {
    await viewManager.closeView(platformId);
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
});

ipcMain.handle('view:get-active', async () => {
  return viewManager.getActiveViewId();
});

ipcMain.handle('view:has', async (_event, platformId: string) => {
  return viewManager.hasView(platformId);
});

ipcMain.handle('view:resize', async (_event, platformId: string) => {
  viewManager.resizeView(platformId);
  return { success: true };
});

ipcMain.handle('view:show-all', async () => {
  viewManager.showAllViews();
  return { success: true };
});

ipcMain.handle('view:hide-all', async () => {
  viewManager.hideAllViews();
  return { success: true };
});
