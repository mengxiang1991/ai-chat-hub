import React from 'react';
import './LoginModal.css';

interface LoginModalProps {
  platformName: string;
  platformIcon: string;
  onLoginComplete: () => void;
  onCancel: () => void;
}

const LoginModal: React.FC<LoginModalProps> = ({
  platformName,
  platformIcon,
  onLoginComplete,
  onCancel,
}) => {
  return (
    <div className="login-modal-overlay" onClick={onCancel}>
      <div className="login-modal" onClick={e => e.stopPropagation()}>
        <div className="login-modal-header">
          <span className="login-platform-icon">{platformIcon}</span>
          <h2>登录 {platformName}</h2>
        </div>
        <div className="login-modal-content">
          <p>请在打开的浏览器窗口中完成登录。</p>
          <p>登录成功后，点击下方按钮确认。</p>
        </div>
        <div className="login-modal-actions">
          <button className="cancel-button" onClick={onCancel}>
            取消
          </button>
          <button className="confirm-button" onClick={onLoginComplete}>
            登录完成
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;