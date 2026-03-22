import React, { useState } from 'react';
import { Platform } from '../hooks/usePlatforms';
import './Settings.css';

interface SettingsProps {
  platforms: Platform[];
  onLogin: (id: string) => void;
  onLogout: (id: string) => void;
  onClose: () => void;
  onAddPlatform: (config: { id: string; name: string; icon: string; url: string; loginUrl?: string }) => void;
}

interface AddPlatformForm {
  id: string;
  name: string;
  icon: string;
  url: string;
  loginUrl: string;
}

const Settings: React.FC<SettingsProps> = ({ platforms, onLogin, onLogout, onClose, onAddPlatform }) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [newPlatform, setNewPlatform] = useState<AddPlatformForm>({ id: '', name: '', icon: '🤖', url: '', loginUrl: '' });
  const [error, setError] = useState('');

  const handleAddPlatform = () => {
    if (!newPlatform.id.trim()) {
      setError('平台ID不能为空');
      return;
    }
    if (!newPlatform.name.trim()) {
      setError('平台名称不能为空');
      return;
    }
    if (!newPlatform.url.trim()) {
      setError('平台URL不能为空');
      return;
    }
    if (platforms.some(p => p.id === newPlatform.id)) {
      setError('平台ID已存在');
      return;
    }

    onAddPlatform({
      id: newPlatform.id.toLowerCase().replace(/\s+/g, '-'),
      name: newPlatform.name.trim(),
      icon: newPlatform.icon || '🤖',
      url: newPlatform.url.trim(),
      loginUrl: newPlatform.loginUrl.trim() || newPlatform.url.trim(),
    });
    setNewPlatform({ id: '', name: '', icon: '🤖', url: '', loginUrl: '' });
    setShowAddForm(false);
    setError('');
  };

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h2>设置</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="settings-content">
          <div className="settings-section-header">
            <h3>平台管理</h3>
            <button className="add-platform-btn" onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? '取消' : '+ 添加平台'}
            </button>
          </div>

          {showAddForm && (
            <div className="add-platform-form">
              <div className="form-row">
                <label>平台ID (英文):</label>
                <input
                  type="text"
                  placeholder="e.g. kimi"
                  value={newPlatform.id}
                  onChange={e => setNewPlatform({ ...newPlatform, id: e.target.value })}
                />
              </div>
              <div className="form-row">
                <label>平台名称:</label>
                <input
                  type="text"
                  placeholder="e.g. Kimi"
                  value={newPlatform.name}
                  onChange={e => setNewPlatform({ ...newPlatform, name: e.target.value })}
                />
              </div>
              <div className="form-row">
                <label>图标 (emoji):</label>
                <input
                  type="text"
                  placeholder="🤖"
                  value={newPlatform.icon}
                  onChange={e => setNewPlatform({ ...newPlatform, icon: e.target.value })}
                  maxLength={2}
                />
              </div>
              <div className="form-row">
                <label>平台URL:</label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={newPlatform.url}
                  onChange={e => setNewPlatform({ ...newPlatform, url: e.target.value })}
                />
              </div>
              <div className="form-row">
                <label>登录URL (可选):</label>
                <input
                  type="text"
                  placeholder="默认使用平台URL"
                  value={newPlatform.loginUrl}
                  onChange={e => setNewPlatform({ ...newPlatform, loginUrl: e.target.value })}
                />
              </div>
              {error && <div className="form-error">{error}</div>}
              <button className="confirm-add-btn" onClick={handleAddPlatform}>
                确认添加
              </button>
            </div>
          )}

          <div className="platform-settings-list">
            {platforms.map(platform => (
              <div key={platform.id} className="platform-setting-item">
                <div className="platform-info">
                  <span className="platform-icon">{platform.icon}</span>
                  <span className="platform-name">{platform.name}</span>
                </div>
                <div className="platform-actions">
                  {platform.isLoggedIn ? (
                    <>
                      <span className="status-badge logged-in">已登录</span>
                      <button
                        className="action-button logout"
                        onClick={() => onLogout(platform.id)}
                      >
                        退出
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="status-badge logged-out">未登录</span>
                      <button
                        className="action-button login"
                        onClick={() => onLogin(platform.id)}
                      >
                        登录
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="settings-section">
            <h3>关于</h3>
            <p className="about-text">
              ChatHub v1.0.0<br />
              AI 平台聚合对比工具<br />
              基于 Electron BrowserView 构建<br />
              支持同时使用多个 AI 平台
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
