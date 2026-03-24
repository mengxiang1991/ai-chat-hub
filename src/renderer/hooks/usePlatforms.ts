import { useState, useEffect, useCallback } from 'react';

declare global {
  interface Window {
    electronAPI: {
      platformAsk: (platformId: string, question: string) => Promise<string>;
      platformLogin: (platformId: string) => Promise<void>;
      platformIsLoggedIn: (platformId: string) => Promise<boolean>;
      platformLogout: (platformId: string) => Promise<void>;
      platformList: () => Promise<Array<{ id: string; name: string; icon: string }>>;
      platformOpen: (platformId: string) => Promise<{ success: boolean; error?: string }>;
      platformClose: (platformId: string) => Promise<{ success: boolean; error?: string }>;
      getStoreValue: (key: string) => Promise<unknown>;
      setStoreValue: (key: string, value: unknown) => Promise<void>;
      addCustomPlatform: (config: { id: string; name: string; icon: string; url: string; loginUrl?: string }) => Promise<void>;
      viewSetActive: (platformId: string | null) => Promise<{ success: boolean }>;
      viewGetActive: () => Promise<string | null>;
      viewHas: (platformId: string) => Promise<boolean>;
    };
  }
}

export interface Platform {
  id: string;
  name: string;
  icon: string;
  isLoggedIn: boolean;
  isLoading: boolean;
  isCustom?: boolean;
  url?: string;
  loginUrl?: string;
}

const DEFAULT_PLATFORMS = [
  { id: 'doubao', name: '豆包', icon: '🤖' },
  { id: 'deepseek', name: 'DeepSeek', icon: '🧠' },
  { id: 'yuanbao', name: '元宝', icon: '🌐' },
  { id: 'perplexity', name: 'Perplexity', icon: '🔍' },
];

export function usePlatforms() {
  const [platforms, setPlatforms] = useState<Platform[]>(DEFAULT_PLATFORMS.map(p => ({ ...p, isLoggedIn: false, isLoading: true })));
  const [selectedPlatform, setSelectedPlatform] = useState<string | 'all' | null>('doubao');

  // Load custom platforms from store
  useEffect(() => {
    const loadCustomPlatforms = async () => {
      if (!window.electronAPI) return;
      try {
        const customPlatforms = await window.electronAPI.getStoreValue('customPlatforms') as Platform[] | undefined;
        if (customPlatforms && customPlatforms.length > 0) {
          setPlatforms(prev => [
            ...DEFAULT_PLATFORMS.map(p => ({ ...p, isLoggedIn: false, isLoading: true })),
            ...customPlatforms.map(p => ({ ...p, isLoggedIn: false, isLoading: true, isCustom: true }))
          ]);
        }
      } catch (error) {
        console.error('Failed to load custom platforms:', error);
      }
    };
    loadCustomPlatforms();
  }, []);

  // Check login status on mount and periodically
  useEffect(() => {
    const checkLoginStatus = async () => {
      for (const platform of platforms) {
        try {
          const isLoggedIn = await window.electronAPI.platformIsLoggedIn(platform.id);
          setPlatforms(prev =>
            prev.map(p => p.id === platform.id ? { ...p, isLoggedIn, isLoading: false } : p)
          );
        } catch {
          setPlatforms(prev =>
            prev.map(p => p.id === platform.id ? { ...p, isLoading: false } : p)
          );
        }
      }
    };

    // Initial check
    const timer = setTimeout(checkLoginStatus, 1000);
    return () => clearTimeout(timer);
  }, []);

  const login = useCallback(async (platformId: string) => {
    console.log(`[usePlatforms] Starting login for ${platformId}`);
    setPlatforms(prev => prev.map(p => p.id === platformId ? { ...p, isLoading: true } : p));
    try {
      await window.electronAPI.platformLogin(platformId);
      console.log(`[usePlatforms] platformLogin succeeded`);
      setPlatforms(prev => prev.map(p => p.id === platformId ? { ...p, isLoggedIn: true, isLoading: false } : p));

      // Open the platform view after successful login
      await window.electronAPI.platformOpen(platformId);
    } catch (error) {
      console.error('[usePlatforms] Login failed:', error);
      setPlatforms(prev => prev.map(p => p.id === platformId ? { ...p, isLoading: false } : p));
    }
  }, []);

  const logout = useCallback(async (platformId: string) => {
    await window.electronAPI.platformLogout(platformId);
    await window.electronAPI.platformClose(platformId);
    setPlatforms(prev => prev.map(p => p.id === platformId ? { ...p, isLoggedIn: false } : p));
  }, []);

  const selectPlatform = useCallback(async (platformId: string | 'all') => {
    if (platformId === 'all') {
      setSelectedPlatform('all');
      await window.electronAPI.viewSetActive(null);
    } else {
      setSelectedPlatform(platformId);
      const hasView = await window.electronAPI.viewHas(platformId);
      if (hasView) {
        await window.electronAPI.viewSetActive(platformId);
      } else {
        // Open the platform view if not already open
        const platform = platforms.find(p => p.id === platformId);
        if (platform?.isLoggedIn) {
          await window.electronAPI.platformOpen(platformId);
        }
      }
    }
  }, [platforms]);

  const addPlatform = useCallback(async (config: { id: string; name: string; icon: string; url: string; loginUrl?: string }) => {
    const customPlatforms = await window.electronAPI.getStoreValue('customPlatforms') as Platform[] || [];
    const newPlatform = { ...config, isCustom: true };
    const updated = [...customPlatforms, newPlatform];
    await window.electronAPI.setStoreValue('customPlatforms', updated);

    setPlatforms(prev => [...prev, { ...newPlatform, isLoggedIn: false, isLoading: false }]);

    try {
      await window.electronAPI.addCustomPlatform(config);
    } catch (error) {
      console.error('Failed to register platform in main process:', error);
    }
  }, []);

  return { platforms, selectedPlatform, setSelectedPlatform: selectPlatform, login, logout, addPlatform };
}
