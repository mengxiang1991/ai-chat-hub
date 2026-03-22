import React from 'react';
import { Platform } from '../hooks/usePlatforms';
import './ChatView.css';

interface ChatViewProps {
  platform: Platform | null;
  isAllMode?: boolean;
  onOpenPlatform?: (platformId: string) => void;
}

const ChatView: React.FC<ChatViewProps> = ({
  platform,
  isAllMode = false,
  onOpenPlatform,
}) => {
  if (!platform && !isAllMode) {
    return (
      <div className="chat-view empty">
        <div className="empty-state">
          <p>选择一个平台开始对话</p>
          <p className="empty-hint">平台内容将直接显示在此区域</p>
        </div>
      </div>
    );
  }

  if (isAllMode) {
    return (
      <div className="chat-view all-mode">
        <div className="all-mode-header">
          <span className="all-mode-title">⚡ ALL in One</span>
          <p className="all-mode-hint">在各个平台的嵌入式浏览器中发送消息进行对比</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-view platform-mode">
      <div className="platform-mode-header">
        <span className="platform-icon">{platform?.icon}</span>
        <span className="platform-name">{platform?.name}</span>
      </div>
      <div className="platform-browser-container">
        <div className="browser-placeholder">
          <p>🔗 {platform?.name} 已在侧边栏打开</p>
          <p className="placeholder-hint">平台内容显示在应用窗口中</p>
        </div>
      </div>
    </div>
  );
};

export default ChatView;
