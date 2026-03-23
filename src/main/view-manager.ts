import { BrowserView, session, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import store from './store';

const SESSION_DIR = path.join(process.cwd(), '.session-data');

export class ViewManager {
  private views: Map<string, BrowserView> = new Map();
  private mainWindow: BrowserWindow | null = null;
  private activeViewId: string | null = null;
  private visibleViews: Set<string> = new Set(); // Track which views are currently visible

  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  getMainWindow(): BrowserWindow | null {
    return this.mainWindow;
  }

  getView(platformId: string): BrowserView | null {
    return this.views.get(platformId) || null;
  }

  hasView(platformId: string): boolean {
    return this.views.has(platformId);
  }

  async createView(platformId: string, url: string): Promise<BrowserView> {
    if (this.views.has(platformId)) {
      const existingView = this.views.get(platformId)!;
      this.setActiveView(platformId);
      return existingView;
    }

    // Ensure session directory exists
    if (!fs.existsSync(SESSION_DIR)) {
      fs.mkdirSync(SESSION_DIR, { recursive: true });
    }

    // Create a persistent session for this platform
    const sessionPath = path.join(SESSION_DIR, platformId);
    const sess = session.fromPath(sessionPath, {
      cache: true,
    });

    const view = new BrowserView({
      webPreferences: {
        session: sess,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
      },
    });

    // Configure the view
    view.webContents.on('did-finish-load', () => {
      console.log(`[ViewManager] View ${platformId} finished loading`);
    });

    view.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
      console.error(`[ViewManager] View ${platformId} failed to load: ${errorDescription} (${errorCode})`);
    });

    view.webContents.on('console-message', (_event, level, message, line, sourceId) => {
      const levels = ['verbose', 'info', 'warning', 'error'];
      const levelStr = levels[level] || 'info';
      console.log(`[ViewManager][${platformId}][${levelStr}] ${message}`);
    });

    this.views.set(platformId, view);
    console.log(`[ViewManager] Created view for ${platformId}`);

    // Load the URL
    await view.webContents.loadURL(url);
    this.setActiveView(platformId);

    return view;
  }

  async loadURL(platformId: string, url: string): Promise<void> {
    const view = this.views.get(platformId);
    if (!view) {
      throw new Error(`View ${platformId} does not exist`);
    }
    await view.webContents.loadURL(url);
  }

  async executeJavaScript(platformId: string, script: string): Promise<unknown> {
    const view = this.views.get(platformId);
    if (!view) {
      throw new Error(`View ${platformId} does not exist`);
    }
    return view.webContents.executeJavaScript(script);
  }

  setActiveView(platformId: string | null): void {
    if (!this.mainWindow) return;

    // Remove all currently visible views
    for (const vid of this.visibleViews) {
      const view = this.views.get(vid);
      if (view) {
        this.mainWindow.removeBrowserView(view);
      }
    }
    this.visibleViews.clear();

    this.activeViewId = platformId;

    if (platformId && platformId !== 'all' && this.views.has(platformId)) {
      // Single platform mode
      const view = this.views.get(platformId)!;
      this.mainWindow.addBrowserView(view);
      this.visibleViews.add(platformId);
      this.resizeView(platformId);
    }
  }

  // Show all views simultaneously (for "all in one" mode)
  showAllViews(): void {
    const win = this.mainWindow;
    if (!win) return;

    // Remove all currently visible views first
    for (const vid of this.visibleViews) {
      const view = this.views.get(vid);
      if (view) {
        win.removeBrowserView(view);
      }
    }
    this.visibleViews.clear();

    // Add all views with split layout
    const viewIds = Array.from(this.views.keys());
    if (viewIds.length === 0) return;

    const [width, height] = win.getContentSize();
    const sidebarWidth = 240;
    const contentWidth = width - sidebarWidth;
    const viewWidth = Math.floor(contentWidth / viewIds.length);

    viewIds.forEach((vid, index) => {
      const view = this.views.get(vid)!;
      win.addBrowserView(view);
      this.visibleViews.add(vid);
      view.setBounds({
        x: sidebarWidth + index * viewWidth,
        y: 0,
        width: viewWidth,
        height: height,
      });
      view.setAutoResize({
        width: false,
        height: false,
      });
    });
  }

  // Hide all views (when switching away from "all in one" mode)
  hideAllViews(): void {
    const win = this.mainWindow;
    if (!win) return;

    for (const vid of this.visibleViews) {
      const view = this.views.get(vid);
      if (view) {
        win.removeBrowserView(view);
      }
    }
    this.visibleViews.clear();
  }

  resizeView(platformId: string): void {
    const view = this.views.get(platformId);
    const mainWindow = this.mainWindow;
    if (!view || !mainWindow) return;

    const [width, height] = mainWindow.getContentSize();
    const sidebarWidth = 240;

    view.setBounds({
      x: sidebarWidth,
      y: 0,
      width: width - sidebarWidth,
      height: height,
    });
    view.setAutoResize({
      width: true,
      height: true,
      horizontal: false,
      vertical: false,
    });
  }

  resizeAllViews(): void {
    for (const platformId of this.views.keys()) {
      this.resizeView(platformId);
    }
  }

  async closeView(platformId: string): Promise<void> {
    const view = this.views.get(platformId);
    if (view) {
      if (this.mainWindow) {
        this.mainWindow.removeBrowserView(view);
      }
      this.visibleViews.delete(platformId);
      await view.webContents.close();
      this.views.delete(platformId);
      console.log(`[ViewManager] Closed view for ${platformId}`);
    }
  }

  async closeAllViews(): Promise<void> {
    for (const platformId of this.views.keys()) {
      await this.closeView(platformId);
    }
    this.views.clear();
    this.activeViewId = null;
  }

  getActiveViewId(): string | null {
    return this.activeViewId;
  }

  getAllViewIds(): string[] {
    return Array.from(this.views.keys());
  }

  // Save session state for a platform
  saveSession(platformId: string): void {
    store.set(`platformSessions.${platformId}`, {
      sessionPath: path.join(SESSION_DIR, platformId),
    });
  }

  // Clear session state for a platform
  clearSession(platformId: string): void {
    const sessionPath = path.join(SESSION_DIR, platformId);
    if (fs.existsSync(sessionPath)) {
      fs.rmSync(sessionPath, { recursive: true, force: true });
    }
    store.set(`platformSessions.${platformId}`, {});
  }
}

export const viewManager = new ViewManager();
