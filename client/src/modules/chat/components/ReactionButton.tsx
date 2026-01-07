import React, { useState } from 'react';
import { Button, Tooltip } from 'antd';
import { HeartFilled, SmileFilled } from '@ant-design/icons';

interface ReactionButtonProps {
  emoji: string;
  count: number;
  isReacted: boolean;
  onClick: () => void;
  size?: 'small' | 'middle' | 'large';
  showCount?: boolean;
  className?: string;
}

export const ReactionButton: React.FC<ReactionButtonProps> = ({
  emoji,
  count,
  isReacted,
  onClick,
  size = 'small',
  showCount = true,
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Get emoji label for tooltip
  const getEmojiLabel = (emoji: string): string => {
    const emojiLabels: Record<string, string> = {
      '❤️': 'Heart',
      '👍': 'Thumbs Up',
      '👎': 'Thumbs Down',
      '😂': 'Laugh',
      '😡': 'Angry',
      '😐': 'Meh',
      '😊': 'Smile',
      '🎉': 'Party',
      '🔥': 'Fire',
      '💯': 'Hundred'
    };
    return emojiLabels[emoji] || emoji;
  };

  // Get button size styles
  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          fontSize: '12px',
          padding: '2px 6px',
          minHeight: '20px',
          minWidth: 'auto'
        };
      case 'large':
        return {
          fontSize: '16px',
          padding: '4px 8px',
          minHeight: '28px',
          minWidth: 'auto'
        };
      default: // middle
        return {
          fontSize: '14px',
          padding: '3px 8px',
          minHeight: '24px',
          minWidth: 'auto'
        };
    }
  };

  // Get button color based on reaction state
  const getButtonColor = () => {
    if (isReacted) {
      return '#ff4d4f'; // Red for reacted
    }
    if (isHovered) {
      return '#1890ff'; // Blue on hover
    }
    return 'var(--color-text-secondary)'; // Default gray
  };

  const sizeStyles = getSizeStyles();
  const emojiLabel = getEmojiLabel(emoji);

  return (
    <Tooltip title={`${emojiLabel} (${count})`} placement="top">
      <Button
        type="text"
        size={size}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          ...sizeStyles,
          color: getButtonColor(),
          backgroundColor: isReacted ? 'rgba(255, 77, 79, 0.1)' : 
                           isHovered ? 'rgba(24, 144, 255, 0.1)' : 'transparent',
          border: isReacted ? `1px solid #ff4d4f` : 
                   isHovered ? `1px solid #1890ff` : 'none',
          borderRadius: '12px',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: sizeStyles.fontSize,
          fontWeight: isReacted ? '600' : '400'
        }}
        className={`reaction-button ${className}`}
      >
        <span style={{ fontSize: sizeStyles.fontSize }}>{emoji}</span>
        {showCount && count > 0 && (
          <span 
            style={{ 
              fontSize: Math.max(10, parseInt(sizeStyles.fontSize as string) - 2) + 'px',
              color: getButtonColor(),
              fontWeight: '500'
            }}
          >
            {count}
          </span>
        )}
      </Button>
    </Tooltip>
  );
};