import React, { useState, useCallback, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import AllView from './components/AllView';
import Settings from './components/Settings';
import { usePlatforms, Platform } from './hooks/usePlatforms';
import { Message } from './hooks/useChat';

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

const App: React.FC = () => {
  const { platforms, selectedPlatform, setSelectedPlatform, login, logout, addPlatform } = usePlatforms();
  const [showSettings, setShowSettings] = useState(false);
  const [isAllMode, setIsAllMode] = useState(false);
  const [allMessages, setAllMessages] = useState<Record<string, Message[]>>({});
  const [isAllLoading, setIsAllLoading] = useState(false);

  const selectedPlatformObj = platforms.find(p => p.id === selectedPlatform) || null;

  const handleSelectPlatform = useCallback(async (id: string | 'all') => {
    if (id === 'all') {
      setIsAllMode(true);
      setSelectedPlatform(null);
    } else {
      setIsAllMode(false);
      setSelectedPlatform(id);

      // Open the platform view when selected
      try {
        const hasView = await window.electronAPI.viewHas(id);
        if (!hasView) {
          await window.electronAPI.platformOpen(id);
        } else {
          await window.electronAPI.viewSetActive(id);
        }
      } catch (error) {
        console.error('Failed to open platform view:', error);
      }
    }
  }, [setSelectedPlatform]);

  const handleSendMessage = useCallback(async (content: string) => {
    if (isAllMode) {
      setIsAllLoading(true);
      const loggedInPlatforms = platforms.filter(p => p.isLoggedIn);

      await Promise.all(
        loggedInPlatforms.map(async (platform) => {
          const userMsg: Message = {
            id: `user-${platform.id}-${Date.now()}`,
            role: 'user',
            content,
            platformId: platform.id,
            timestamp: Date.now(),
          };
          setAllMessages(prev => ({
            ...prev,
            [platform.id]: [...(prev[platform.id] || []), userMsg],
          }));

          try {
            const response = await window.electronAPI.platformAsk(platform.id, content);
            const assistantMsg: Message = {
              id: `assistant-${platform.id}-${Date.now()}`,
              role: 'assistant',
              content: response || 'No response',
              platformId: platform.id,
              timestamp: Date.now(),
            };
            setAllMessages(prev => ({
              ...prev,
              [platform.id]: [...(prev[platform.id] || []), assistantMsg],
            }));
          } catch (error) {
            const errorMsg: Message = {
              id: `error-${platform.id}-${Date.now()}`,
              role: 'assistant',
              content: `Error: ${error instanceof Error ? error.message : String(error)}`,
              platformId: platform.id,
              timestamp: Date.now(),
            };
            setAllMessages(prev => ({
              ...prev,
              [platform.id]: [...(prev[platform.id] || []), errorMsg],
            }));
          }
        })
      );
      setIsAllLoading(false);
    }
  }, [isAllMode, platforms]);

  // Open the first logged-in platform on mount
  useEffect(() => {
    const openInitialPlatform = async () => {
      const firstLoggedIn = platforms.find(p => p.isLoggedIn);
      if (firstLoggedIn && !isAllMode) {
        try {
          await window.electronAPI.platformOpen(firstLoggedIn.id);
          setSelectedPlatform(firstLoggedIn.id);
        } catch (error) {
          console.error('Failed to open initial platform:', error);
        }
      }
    };
    openInitialPlatform();
  }, []);

  return (
    <div className="app-layout">
      <Sidebar
        platforms={platforms}
        selectedPlatform={isAllMode ? 'all' : selectedPlatform}
        onSelectPlatform={handleSelectPlatform}
        onLogin={login}
        onLogout={logout}
        onOpenSettings={() => setShowSettings(true)}
      />
      {isAllMode ? (
        <AllView
          platforms={platforms}
          messagesByPlatform={allMessages}
          isLoading={isAllLoading}
          onSendAll={handleSendMessage}
        />
      ) : (
        <ChatView
          platform={selectedPlatformObj}
          isAllMode={isAllMode}
        />
      )}
      {showSettings && (
        <Settings
          platforms={platforms}
          onLogin={login}
          onLogout={logout}
          onClose={() => setShowSettings(false)}
          onAddPlatform={addPlatform}
        />
      )}
    </div>
  );
};

export default App;
