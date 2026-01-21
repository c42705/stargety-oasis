import React, { useRef, useEffect } from 'react';
import { Message } from '../../../redux/types/chat';
import MessageItem from './MessageItem';

interface VirtualizedMessageListProps {
  messages: Message[];
  currentUserId: string;
  onEditMessage: (messageId: string, content: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onReplyToMessage: (messageId: string) => void;
  height: number;
  width: number;
}

const VirtualizedMessageList: React.FC<VirtualizedMessageListProps> = ({
  messages,
  currentUserId,
  onEditMessage,
  onDeleteMessage,
  onReplyToMessage,
  height,
  width,
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const prevMessagesLength = useRef(messages.length);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > prevMessagesLength.current) {
      // New messages added, scroll to bottom
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    }
    prevMessagesLength.current = messages.length;
  }, [messages.length]);

  return (
    <div
      ref={listRef}
      style={{
        height,
        width,
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          isCurrentUser={message.authorId === currentUserId}
          onEdit={onEditMessage}
          onDelete={onDeleteMessage}
          onReply={onReplyToMessage}
        />
      ))}
    </div>
  );
};

export default VirtualizedMessageList;
