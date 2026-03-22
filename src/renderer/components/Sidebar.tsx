import React from 'react';
import { Platform } from '../hooks/usePlatforms';
import './Sidebar.css';

interface SidebarProps {
  platforms: Platform[];
  selectedPlatform: string | 'all' | null;
  onSelectPlatform: (id: string | 'all') => void;
  onLogin: (id: string) => void;
  onLogout: (id: string) => void;
  onOpenSettings: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  platforms,
  selectedPlatform,
  onSelectPlatform,
  onLogin,
  onLogout,
  onOpenSettings,
}) => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1 className="app-title">ChatHub</h1>
      </div>

      <div className="platform-list">
        {platforms.map(platform => (
          <div
            key={platform.id}
            className={`platform-item ${selectedPlatform === platform.id ? 'selected' : ''}`}
            onClick={() => onSelectPlatform(platform.id)}
          >
            <span className="platform-icon">{platform.icon}</span>
            <span className="platform-name">{platform.name}</span>
            <div className="platform-status">
              {platform.isLoading ? (
                <span className="status-loading">...</span>
              ) : platform.isLoggedIn ? (
                <span className="status-logged-in" onClick={(e) => { e.stopPropagation(); console.log(`[Sidebar] Logout clicked for ${platform.id}`); onLogout(platform.id); }}>●</span>
              ) : (
                <span className="status-logged-out" onClick={(e) => { e.stopPropagation(); console.log(`[Sidebar] Login clicked for ${platform.id}`); onLogin(platform.id); }}>○</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="sidebar-footer">
        <button
          className={`all-button ${selectedPlatform === 'all' ? 'selected' : ''}`}
          onClick={() => onSelectPlatform('all')}
        >
          ⚡ ALL in One
        </button>
        <button className="settings-button" onClick={onOpenSettings}>
          ⚙️ 设置
        </button>
      </div>
    </div>
  );
};

export default Sidebar;