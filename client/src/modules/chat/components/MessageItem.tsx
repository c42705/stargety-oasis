import React, { useState, useCallback } from 'react';
import { Button, Dropdown, Popconfirm, Avatar, Tooltip, Space, Input, Badge, Card, Typography } from 'antd';
import { MoreOutlined, EditOutlined, DeleteOutlined, MessageOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { Message as ModuleMessage } from '../../../types/chat';
import { Message as ReduxMessage } from '../../../redux/types/chat';
import { useAppDispatch } from '../../../redux/hooks';
import { chatThunks, updateMessage } from '../../../redux/slices/chatSlice';
import { chatSocketService } from '../../../services/socket/ChatSocketService';
import '../../../animations/chat-animations.css';

const { Text } = Typography;

// MessageItem accepts either module types or redux types for flexibility
type ChatMessage = ModuleMessage | ReduxMessage;

interface MessageItemProps {
  message: ChatMessage;
  isCurrentUser: boolean;
  onReply?: (messageId: string) => void;
  onEdit?: (messageId: string, content: string) => void;
  onDelete?: (messageId: string) => void;
}

// Common emoji reactions
const COMMON_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🎉', '🔥', '👎'];

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isCurrentUser,
  onReply,
  onEdit,
  onDelete
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const dispatch = useAppDispatch();
  
  // Get current user ID from sessionStorage (where AuthContext stores it)
  const getCurrentUserId = useCallback(() => {
    try {
      const savedAuth = sessionStorage.getItem('stargetyOasisAuth');
      if (savedAuth) {
        const authData = JSON.parse(savedAuth);
        return authData.id || 'anonymous';
      }
    } catch {
      // Ignore parse errors
    }
    return 'anonymous';
  }, []);

  // Initialize edit content when entering edit mode
  React.useEffect(() => {
    if (isEditing) {
      setEditContent(message.content.text || '');
    }
  }, [isEditing, message.content]);

  const handleEdit = useCallback(() => {
    if (isEditing && editContent.trim()) {
      dispatch(chatThunks.editMessage({ messageId: message.id, content: editContent.trim() }));
      setIsEditing(false);
      if (onEdit) onEdit(message.id, editContent.trim());
    } else {
      setIsEditing(true);
    }
  }, [isEditing, editContent, message, dispatch, onEdit]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditContent('');
  }, []);

  const handleDelete = useCallback(() => {
    setIsDeleting(true);
    dispatch(chatThunks.deleteMessage(message.id));
    if (onDelete) onDelete(message.id);
  }, [message, dispatch, onDelete]);

  const handleReaction = useCallback((emoji: string) => {
    const currentUserId = getCurrentUserId();
    const existingReaction = message.reactions?.find(r => r.emoji === emoji && r.userId === currentUserId);
    
    if (existingReaction) {
      // Remove reaction via Socket.IO
      // Note: Backend doesn't have a Socket.IO endpoint for removing reactions yet
      // For now, we'll just update the local state optimistically
      dispatch(updateMessage({
        roomId: message.roomId,
        messageId: message.id,
        updates: {
          reactions: message.reactions?.filter(r => !(r.emoji === emoji && r.userId === currentUserId)) || []
        }
      }));
    } else {
      // Add reaction via Socket.IO
      // Emit reaction event to backend
      // Note: Backend expects Socket.IO event, not REST API
      // We'll emit directly to the socket
      const socket = (chatSocketService as any).socket;
      if (socket && socket.connected) {
        socket.emit('add-reaction', {
          messageId: message.id,
          emoji,
          userId: currentUserId
        });
      }
      
      // Optimistically update local state
      dispatch(updateMessage({
        roomId: message.roomId,
        messageId: message.id,
        updates: {
          reactions: [
            ...(message.reactions || []),
            { emoji, userId: currentUserId, createdAt: new Date() }
          ]
        }
      }));
    }
  }, [message, dispatch, getCurrentUserId]);

  const formatTimestamp = (timestamp: Date) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const formatEditTimestamp = (timestamp?: Date) => {
    if (!timestamp) return '';
    return `edited ${formatTimestamp(timestamp)}`;
  };

  // Group reactions by emoji - use explicit typing for compatibility with both message types
  type ReactionItem = { emoji: string; userId: string; createdAt: Date };
  const reactions = message.reactions as ReactionItem[] | undefined;
  const groupedReactions = reactions?.reduce<Record<string, ReactionItem[]>>((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {}) || {};

  const currentUserId = getCurrentUserId();

  const authorDisplay: string = (message as any).authorName || (message.content as any)?.authorName || message.authorId || 'Unknown User';

  const reactionMenuItems = COMMON_EMOJIS.map(emoji => {
    const reactions = groupedReactions[emoji] || [];
    const hasReacted = reactions.some(r => r.userId === currentUserId);

    return {
      key: emoji,
      label: (
        <Space>
          <span>{emoji}</span>
          {reactions.length > 0 && <span>{reactions.length}</span>}
          {hasReacted && <CheckOutlined style={{ color: '#52c41a' }} />}
        </Space>
      ),
      onClick: () => handleReaction(emoji)
    };
  });

  const messageMenuItems = [
    ...(isCurrentUser ? [
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: 'Edit',
        onClick: () => setIsEditing(true)
      }
    ] : []),
    ...(isCurrentUser ? [
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: (
          <Popconfirm
            title="Delete this message?"
            description="This action cannot be undone."
            onConfirm={handleDelete}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            Delete
          </Popconfirm>
        ),
        disabled: isDeleting
      }
    ] : []),
    {
      key: 'reply',
      icon: <MessageOutlined />,
      label: 'Reply',
      onClick: () => onReply?.(message.id)
    },
    { type: 'divider' as const },
    {
      key: 'reactions',
      label: 'Add Reaction',
      icon: <span>😊</span>,
      children: reactionMenuItems
    }
  ];

  return (
    <Card
      className={`message-item ${isCurrentUser ? 'current-user' : ''}`}
      style={{
        marginBottom: 0,
        borderRadius: '6px',
      }}
      styles={{ body: { padding: '12px' } }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        {/* Message Header */}
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space size="small">
            <Avatar size="small">{authorDisplay.charAt(0).toUpperCase() || 'U'}</Avatar>
            <Text strong>{authorDisplay}</Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {formatTimestamp(message.createdAt)}
            </Text>
            {message.isEdited && message.editedAt && (
              <Text type="secondary" style={{ fontSize: '11px', fontStyle: 'italic' }}>
                {formatEditTimestamp(message.editedAt)}
              </Text>
            )}
          </Space>
          {isCurrentUser && (
            <Dropdown menu={{ items: messageMenuItems }} trigger={['click']} placement="topRight">
              <Button type="text" size="small" icon={<MoreOutlined />} />
            </Dropdown>
          )}
        </Space>

        {/* Message Content */}
        {isEditing ? (
          <Space.Compact style={{ width: '100%' }}>
            <Input.TextArea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleEdit();
                }
              }}
            />
          </Space.Compact>
        ) : (
          <Text>{message.content.text}</Text>
        )}

        {/* Edit Actions */}
        {isEditing && (
          <Space>
            <Button type="primary" size="small" onClick={handleEdit} icon={<CheckOutlined />}>
              Save
            </Button>
            <Button size="small" onClick={handleCancelEdit} icon={<CloseOutlined />}>
              Cancel
            </Button>
          </Space>
        )}

        {/* Reactions Display */}
        {!isEditing && Object.keys(groupedReactions).length > 0 && (
          <Space wrap size="small">
            {Object.entries(groupedReactions).map(([emoji, reactions]) => {
              const hasReacted = reactions.some(r => r.userId === currentUserId);
              return (
                <Tooltip key={emoji} title={`${reactions.length} reaction${reactions.length > 1 ? 's' : ''}`}>
                  <Badge count={reactions.length} size="small">
                    <Button
                      type={hasReacted ? 'primary' : 'default'}
                      size="small"
                      onClick={() => handleReaction(emoji)}
                    >
                      {emoji}
                    </Button>
                  </Badge>
                </Tooltip>
              );
            })}
          </Space>
        )}

        {/* Message Actions */}
        {!isEditing && (
          <Space size="small">
            <Dropdown menu={{ items: reactionMenuItems }} trigger={['click']} placement="topLeft">
              <Button type="text" size="small">
                😊
              </Button>
            </Dropdown>
            {onReply && (
              <Button
                type="text"
                size="small"
                icon={<MessageOutlined />}
                onClick={() => onReply(message.id)}
              >
                Reply
              </Button>
            )}
          </Space>
        )}
      </Space>
    </Card>
  );
};

export default MessageItem;
