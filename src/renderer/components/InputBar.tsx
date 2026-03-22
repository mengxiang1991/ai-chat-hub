import React, { useState } from 'react';
import './InputBar.css';

interface InputBarProps {
  onSend: (content: string) => void;
  isLoading: boolean;
  showAllButton?: boolean;
  onAllClick?: () => void;
}

const InputBar: React.FC<InputBarProps> = ({ onSend, isLoading, showAllButton, onAllClick }) => {
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (input.trim() && !isLoading) {
      onSend(input.trim());
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="input-bar">
      <textarea
        className="input-field"
        placeholder="输入问题..."
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        disabled={isLoading}
      />
      <button
        className="send-button"
        onClick={handleSend}
        disabled={!input.trim() || isLoading}
      >
        发送
      </button>
      {showAllButton && (
        <button
          className="all-send-button"
          onClick={onAllClick}
          disabled={!input.trim() || isLoading}
        >
          ⚡ ALL
        </button>
      )}
    </div>
  );
};

export default InputBar;