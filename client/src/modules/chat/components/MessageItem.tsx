import React, { useState, useCallback } from 'react';
import { Button, Dropdown, Menu, Popconfirm, Avatar, Tooltip, Space, Input, Badge } from 'antd';
import { MoreOutlined, EditOutlined, DeleteOutlined, MessageOutlined, CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { Message as ModuleMessage } from '../../../types/chat';
import { Message as ReduxMessage } from '../../../redux/types/chat';
import { useAppDispatch } from '../../../redux/hooks';
import { chatThunks, updateMessage } from '../../../redux/slices/chatSlice';
import { chatSocketService } from '../../../services/socket/ChatSocketService';
import '../../../animations/chat-animations.css';

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

  const reactionMenu = (
    <Menu>
      {COMMON_EMOJIS.map(emoji => {
        const reactions = groupedReactions[emoji] || [];
        const hasReacted = reactions.some(r => r.userId === currentUserId);
        
        return (
          <Menu.Item 
            key={emoji} 
            onClick={() => handleReaction(emoji)}
          >
            <Space>
              <span>{emoji}</span>
              <span>{reactions.length > 0 && reactions.length}</span>
              {hasReacted && <CheckOutlined style={{ color: '#52c41a' }} />}
            </Space>
          </Menu.Item>
        );
      })}
    </Menu>
  );

  const messageMenu = (
    <Menu>
      {isCurrentUser && (
        <Menu.Item 
          key="edit" 
          icon={<EditOutlined />}
          onClick={() => setIsEditing(true)}
        >
          Edit
        </Menu.Item>
      )}
      {isCurrentUser && (
        <Menu.Item 
          key="delete" 
          icon={<DeleteOutlined />}
          disabled={isDeleting}
        >
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
        </Menu.Item>
      )}
      <Menu.Item 
        key="reply" 
        icon={<MessageOutlined />}
        onClick={() => onReply?.(message.id)}
      >
        Reply
      </Menu.Item>
      <Menu.Divider />
      <Menu.SubMenu key="reactions" title="Add Reaction" icon={<span>😊</span>}>
        {COMMON_EMOJIS.map(emoji => (
          <Menu.Item key={emoji} onClick={() => handleReaction(emoji)}>
            {emoji}
          </Menu.Item>
        ))}
      </Menu.SubMenu>
    </Menu>
  );

  return (
    <div className={`message-item ${isCurrentUser ? 'current-user' : ''}`}>
      <div className="message-avatar">
        <Avatar size="small">{authorDisplay.charAt(0).toUpperCase() || 'U'}</Avatar>
      </div>
      
      <div className="message-content">
        <div className="message-header">
          <span className="message-author">{authorDisplay}</span>
          <span className="message-timestamp">{formatTimestamp(message.createdAt)}</span>
          {message.isEdited && message.editedAt && (
            <span className="message-edited">
              {formatEditTimestamp(message.editedAt)}
            </span>
          )}
        </div>
        
        {isEditing ? (
          <div className="message-edit">
            <Input.TextArea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="message-edit-input"
              rows={3}
              autoFocus
              onPressEnter={(e) => {
                if (!e.shiftKey) {
                  e.preventDefault();
                  handleEdit();
                }
              }}
            />
            <Space style={{ marginTop: 8 }}>
              <Button type="primary" onClick={handleEdit} icon={<CheckOutlined />}>
                Save
              </Button>
              <Button onClick={handleCancelEdit} icon={<CloseOutlined />}>
                Cancel
              </Button>
            </Space>
          </div>
        ) : (
          <div className="message-text">
            {message.content.text}
            
            {/* Reactions display */}
            {Object.keys(groupedReactions).length > 0 && (
              <div className="message-reactions">
                <Space size={4} wrap>
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
              </div>
            )}
          </div>
        )}
        
        <div className="message-actions">
          <Dropdown overlay={reactionMenu} trigger={['click']} placement="topLeft">
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
          {isCurrentUser && (
            <Dropdown overlay={messageMenu} trigger={['click']} placement="topRight">
              <Button type="text" size="small" icon={<MoreOutlined />} />
            </Dropdown>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageItem;
