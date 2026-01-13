import React, { useState } from 'react';
import { Button, Dropdown, Menu, Badge, Tooltip, Space } from 'antd';
import { SmileOutlined } from '@ant-design/icons';
import { Reaction } from '../../../redux/types/chat';

interface ReactionButtonProps {
  reactions: Reaction[];
  onAddReaction: (emoji: string) => void;
  onRemoveReaction: (emoji: string) => void;
  currentUserId?: string;
}

// Common emoji reactions
const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👎', '👏', '🙌'];

export const ReactionButton: React.FC<ReactionButtonProps> = ({
  reactions,
  onAddReaction,
  onRemoveReaction,
  currentUserId = 'current-user'
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, Reaction[]>);

  const handleEmojiClick = (emoji: string) => {
    const existingReaction = groupedReactions[emoji]?.find(r => r.userId === currentUserId);
    
    if (existingReaction) {
      onRemoveReaction(emoji);
    } else {
      onAddReaction(emoji);
    }
    setIsOpen(false);
  };

  const reactionMenu = (
    <Menu>
      {COMMON_EMOJIS.map(emoji => {
        const emojiReactions = groupedReactions[emoji] || [];
        const hasReacted = emojiReactions.some(r => r.userId === currentUserId);
        
        return (
          <Menu.Item 
            key={emoji} 
            onClick={() => handleEmojiClick(emoji)}
          >
            <span style={{ fontSize: '18px', marginRight: 8 }}>{emoji}</span>
            <span>{emojiReactions.length > 0 && `(${emojiReactions.length})`}</span>
            {hasReacted && <span style={{ marginLeft: 8, color: '#52c41a' }}>✓</span>}
          </Menu.Item>
        );
      })}
    </Menu>
  );

  // If there are reactions, show them as badges
  if (Object.keys(groupedReactions).length > 0) {
    return (
      <div className="reaction-button-group">
        <Space size={4} wrap>
          {Object.entries(groupedReactions).map(([emoji, emojiReactions]) => {
            const hasReacted = emojiReactions.some(r => r.userId === currentUserId);
            return (
              <Tooltip key={emoji} title={`${emojiReactions.length} reaction${emojiReactions.length > 1 ? 's' : ''}`}>
                <Badge count={emojiReactions.length} size="small" offset={[0, 0]}>
                  <Button
                    type={hasReacted ? 'primary' : 'default'}
                    size="small"
                    onClick={() => handleEmojiClick(emoji)}
                    style={{ fontSize: '16px', padding: '2px 8px', height: 'auto' }}
                  >
                    {emoji}
                  </Button>
                </Badge>
              </Tooltip>
            );
          })}
          <Dropdown 
            overlay={reactionMenu} 
            trigger={['click']} 
            visible={isOpen}
            onVisibleChange={setIsOpen}
          >
            <Button 
              type="text" 
              size="small" 
              icon={<SmileOutlined />}
              style={{ fontSize: '16px' }}
            />
          </Dropdown>
        </Space>
      </div>
    );
  }

  // No reactions yet, show just the emoji picker
  return (
    <Dropdown 
      overlay={reactionMenu} 
      trigger={['click']} 
      visible={isOpen}
      onVisibleChange={setIsOpen}
    >
      <Button 
        type="text" 
        size="small" 
        icon={<SmileOutlined />}
        style={{ fontSize: '16px' }}
      >
        React
      </Button>
    </Dropdown>
  );
};

export default ReactionButton;
