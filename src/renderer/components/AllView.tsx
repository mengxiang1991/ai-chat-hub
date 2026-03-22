import React from 'react';
import { Platform } from '../hooks/usePlatforms';
import { Message } from '../hooks/useChat';
import InputBar from './InputBar';
import './AllView.css';

interface AllViewProps {
  platforms: Platform[];
  messagesByPlatform: Record<string, Message[]>;
  isLoading: boolean;
  onSendAll: (content: string) => void;
}

const AllView: React.FC<AllViewProps> = ({
  platforms,
  messagesByPlatform,
  isLoading,
  onSendAll,
}) => {
  const loggedInPlatforms = platforms.filter(p => p.isLoggedIn);

  return (
    <div className="all-view">
      <div className="all-header">
        <span className="all-title">⚡ ALL in One</span>
        <span className="all-subtitle">
          已登录: {loggedInPlatforms.length} 个平台
        </span>
      </div>

      <div className="all-columns">
        {loggedInPlatforms.length === 0 ? (
          <div className="all-empty">
            <p>没有已登录的平台</p>
            <p>请先登录至少一个平台</p>
          </div>
        ) : (
          loggedInPlatforms.map(platform => (
            <div key={platform.id} className="all-column">
              <div className="column-header">
                <span className="column-icon">{platform.icon}</span>
                <span className="column-name">{platform.name}</span>
              </div>
              <div className="column-messages">
                {(!messagesByPlatform[platform.id] || messagesByPlatform[platform.id].length === 0) && (
                  <div className="column-empty">等待回复...</div>
                )}
                {messagesByPlatform[platform.id]?.map(msg => (
                  <div key={msg.id} className={`message message-${msg.role}`}>
                    <div className="message-content">{msg.content}</div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <InputBar onSend={onSendAll} isLoading={isLoading} showAllButton={false} />
    </div>
  );
};

export default AllView;