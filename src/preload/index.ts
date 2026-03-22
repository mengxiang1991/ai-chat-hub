import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Platform operations (main process handlers)
  platformAsk: (platformId: string, question: string) => ipcRenderer.invoke('platform:ask', platformId, question),
  platformLogin: (platformId: string) => ipcRenderer.invoke('platform:login', platformId),
  platformIsLoggedIn: (platformId: string) => ipcRenderer.invoke('platform:is-logged-in', platformId),
  platformLogout: (platformId: string) => ipcRenderer.invoke('platform:logout', platformId),
  platformList: () => ipcRenderer.invoke('platform:list'),
  platformOpen: (platformId: string) => ipcRenderer.invoke('platform:open', platformId),
  platformClose: (platformId: string) => ipcRenderer.invoke('platform:close', platformId),
  addCustomPlatform: (config: { id: string; name: string; icon: string; url: string; loginUrl?: string }) =>
    ipcRenderer.invoke('addCustomPlatform', config),

  // View operations
  viewCreate: (platformId: string, url: string) => ipcRenderer.invoke('view:create', platformId, url),
  viewLoadURL: (platformId: string, url: string) => ipcRenderer.invoke('view:load-url', platformId, url),
  viewExecuteJS: (platformId: string, script: string) => ipcRenderer.invoke('view:execute-js', platformId, script),
  viewSetActive: (platformId: string | null) => ipcRenderer.invoke('view:set-active', platformId),
  viewClose: (platformId: string) => ipcRenderer.invoke('view:close', platformId),
  viewGetActive: () => ipcRenderer.invoke('view:get-active'),
  viewHas: (platformId: string) => ipcRenderer.invoke('view:has', platformId),
  viewResize: (platformId: string) => ipcRenderer.invoke('view:resize', platformId),

  // Store
  getStoreValue: (key: string) => ipcRenderer.invoke('store:get', key),
  setStoreValue: (key: string, value: unknown) => ipcRenderer.invoke('store:set', key, value),
});
