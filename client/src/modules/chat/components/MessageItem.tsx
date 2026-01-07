import React, { useState, useCallback, useMemo } from 'react';
import {
  List,
  Avatar,
  Typography,
  Space,
  Button,
  Popover,
  Dropdown,
  message as antMessage,
  Tooltip,
  Card,
  Modal
} from 'antd';
import {
  UserOutlined,
  EditOutlined,
  DeleteOutlined,
  MessageOutlined,
  MoreOutlined,
  HeartOutlined,
  SmileOutlined,
  MehOutlined,
  EyeOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { Smile, Laugh, Heart, ThumbsUp, ThumbsDown, Angry, Meh } from 'lucide-react';
import { Message, User, Reaction } from '../../../types/chat';
import { MessageEditor } from './MessageEditor';
import { ReactionButton } from './ReactionButton';
import { ThreadView } from './ThreadView';

const { Text } = Typography;

interface MessageItemProps {
  message: Message;
  currentUser: User;
  onEditMessage: (messageId: string, content: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onAddReaction: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
  onReplyToMessage: (messageId: string, content: string) => void;
  isEditing?: boolean;
  onToggleEdit?: (messageId: string | null) => void;
  className?: string;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  currentUser,
  onEditMessage,
  onDeleteMessage,
  onAddReaction,
  onRemoveReaction,
  onReplyToMessage,
  isEditing = false,
  onToggleEdit,
  className = ''
}) => {
  const [isEditingLocal, setIsEditingLocal] = useState(isEditing);
  const [showThread, setShowThread] = useState(false);
  const [showReactions, setShowReactions] = useState(false);

  const isOwnMessage = message.authorId === currentUser.id;
  const hasReactions = message.reactions.length > 0;
  const hasAttachments = message.attachments.length > 0;
  const isEdited = message.isEdited && message.editedAt;

  // Common emoji reactions
  const commonEmojis = [
    { emoji: '❤️', icon: <Heart size={14} />, label: 'Heart' },
    { emoji: '👍', icon: <ThumbsUp size={14} />, label: 'Thumbs Up' },
    { emoji: '👎', icon: <ThumbsDown size={14} />, label: 'Thumbs Down' },
    { emoji: '😂', icon: <Laugh size={14} />, label: 'Laugh' },
    { emoji: '😡', icon: <Angry size={14} />, label: 'Angry' },
    { emoji: '😐', icon: <Meh size={14} />, label: 'Meh' }
  ];

  // Check if user has reacted to this message
  const userReaction = useMemo(() => {
    return message.reactions.find(reaction => reaction.userId === currentUser.id);
  }, [message.reactions, currentUser.id]);

  // Format timestamp
  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Format edited time
  const formatEditedTime = (date: Date) => {
    return `Edited at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Handle edit message
  const handleEdit = useCallback(() => {
    if (isOwnMessage) {
      setIsEditingLocal(true);
      onToggleEdit?.(message.id);
    }
  }, [isOwnMessage, message.id, onToggleEdit]);

  // Handle delete message
  const handleDelete = useCallback(() => {
    if (isOwnMessage) {
      Modal.confirm({
        title: 'Delete Message',
        content: 'Are you sure you want to delete this message?',
        onOk: () => {
          onDeleteMessage(message.id);
          antMessage.success('Message deleted');
        }
      });
    }
  }, [isOwnMessage, message.id, onDeleteMessage]);

  // Handle save edit
  const handleSaveEdit = useCallback((content: string) => {
    onEditMessage(message.id, content);
    setIsEditingLocal(false);
    onToggleEdit?.(null);
    antMessage.success('Message updated');
  }, [message.id, onEditMessage, onToggleEdit]);

  // Handle cancel edit
  const handleCancelEdit = useCallback(() => {
    setIsEditingLocal(false);
    onToggleEdit?.(null);
  }, [onToggleEdit]);

  // Handle reply
  const handleReply = useCallback(() => {
    // This would typically open a reply interface or focus the input
    onReplyToMessage(message.id, '');
  }, [message.id, onReplyToMessage]);

  // Handle reaction click
  const handleReactionClick = useCallback((emoji: string) => {
    if (userReaction?.emoji === emoji) {
      onRemoveReaction(message.id, emoji);
    } else {
      onAddReaction(message.id, emoji);
    }
  }, [userReaction, message.id, onAddReaction, onRemoveReaction]);

  // Message actions menu
  const messageActions = [
    {
      key: 'reply',
      icon: <MessageOutlined />,
      label: 'Reply',
      onClick: handleReply
    },
    ...(isOwnMessage ? [
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: 'Edit',
        onClick: handleEdit
      },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: 'Delete',
        onClick: handleDelete,
        danger: true
      }
    ] : [])
  ];

  // Render message content
  const renderMessageContent = () => {
    if (isEditingLocal) {
      return (
        <MessageEditor
          initialValue={message.content.text || ''}
          onSave={handleSaveEdit}
          onCancel={handleCancelEdit}
          placeholder="Edit your message..."
          multiline={true}
        />
      );
    }

    return (
      <div style={{ fontSize: '14px', lineHeight: '1.5', wordBreak: 'break-word' }}>
        {message.content.text}
        {hasAttachments && (
          <div style={{ marginTop: '8px' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {message.attachments.length} attachment{message.attachments.length > 1 ? 's' : ''}
            </Text>
          </div>
        )}
      </div>
    );
  };

  // Render reactions
  const renderReactions = () => {
    if (!hasReactions) return null;

    const reactionGroups = message.reactions.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = [];
      }
      acc[reaction.emoji].push(reaction);
      return acc;
    }, {} as Record<string, Reaction[]>);

    return (
      <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {Object.entries(reactionGroups).map(([emoji, reactions]) => (
          <ReactionButton
            key={emoji}
            emoji={emoji}
            count={reactions.length}
            isReacted={userReaction?.emoji === emoji}
            onClick={() => handleReactionClick(emoji)}
          />
        ))}
      </div>
    );
  };

  // Render message metadata
  const renderMessageMetadata = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
      <Text type="secondary" style={{ fontSize: '11px' }}>
        {formatTimestamp(message.createdAt)}
      </Text>
      {isEdited && (
        <Tooltip title={formatEditedTime(message.editedAt!)}>
          <ClockCircleOutlined style={{ fontSize: '11px', color: '#999' }} />
        </Tooltip>
      )}
      {message.type === 'file' && (
        <EyeOutlined style={{ fontSize: '11px', color: '#1890ff' }} />
      )}
    </div>
  );

  return (
    <div className={`message-item ${className}`} style={{ width: '100%' }}>
      <List.Item
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-border-light)',
          backgroundColor: 'transparent'
        }}
      >
        <div style={{ width: '100%', display: 'flex', gap: '12px' }}>
          {/* Avatar */}
          <div style={{ flexShrink: 0 }}>
            <Avatar
              size="small"
              src={message.author.avatar}
              icon={<UserOutlined />}
            >
              {message.author.username.charAt(0).toUpperCase()}
            </Avatar>
          </div>

          {/* Message Content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <Text
                strong
                style={{ 
                  fontSize: '13px',
                  color: 'var(--color-text-primary)'
                }}
              >
                {message.author.username}
              </Text>
              
              <Dropdown
                menu={{
                  items: messageActions.map(action => ({
                    key: action.key,
                    icon: action.icon,
                    label: action.label,
                    onClick: action.onClick,
                    danger: action.danger
                  }))
                }}
                trigger={['click']}
                placement="bottomRight"
              >
                <Button
                  type="text"
                  size="small"
                  icon={<MoreOutlined />}
                  style={{ 
                    color: 'var(--color-text-secondary)',
                    fontSize: '12px'
                  }}
                />
              </Dropdown>
            </div>

            {/* Message Text */}
            {renderMessageContent()}

            {/* Reactions */}
            {renderReactions()}

            {/* Metadata */}
            {renderMessageMetadata()}

            {/* Thread Button */}
            {message.threadId && (
              <Button
                type="text"
                size="small"
                icon={<MessageOutlined />}
                onClick={() => setShowThread(!showThread)}
                style={{
                  marginTop: '8px',
                  fontSize: '11px',
                  color: 'var(--color-text-secondary)'
                }}
              >
                View Thread ({message.reactions.length} replies)
              </Button>
            )}

            {/* Thread View */}
            {showThread && (
              <div style={{ marginTop: '12px', marginLeft: '24px' }}>
                <ThreadView
                  messageId={message.id}
                  messages={[]} // This would come from props in a real implementation
                  currentUser={currentUser}
                  onReply={onReplyToMessage}
                />
              </div>
            )}
          </div>
        </div>
      </List.Item>
    </div>
  );
};