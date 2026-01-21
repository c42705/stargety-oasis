/**
 * MessageItem Component Tests
 * Tests for individual message display component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { BrowserRouter } from 'react-router-dom';
import MessageItem from '../components/MessageItem';
import { Message, MessageEnum } from '../../redux/types/chat';

// Mock Redux store
const mockStore = configureStore({
  reducer: {
    chat: (state = {}) => state,
  },
});

// Mock user context
const mockUser = {
  id: 'user-1',
  username: 'Test User',
  email: 'test@example.com',
};

jest.mock('../../shared/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

describe('MessageItem Component', () => {
  const mockMessage: Message = {
    id: 'msg-1',
    content: { text: 'Hello World' },
    type: MessageEnum.TEXT,
    roomId: 'room-1',
    authorId: 'user-1',
    isEdited: false,
    reactions: [],
    attachments: [],
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
    createdAt: new Date('2024-01-01T10:00:00Z'),
    updatedAt: new Date('2024-01-01T10:00:00Z'),
  };

  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();
  const mockOnReply = jest.fn();
  const mockOnAddReaction = jest.fn();
  const mockOnRemoveReaction = jest.fn();

  const renderMessageItem = (message: Message = mockMessage) => {
    return render(
      <Provider store={mockStore}>
        <BrowserRouter>
          <MessageItem
            message={message}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
            onReply={mockOnReply}
            onAddReaction={mockOnAddReaction}
            onRemoveReaction={mockOnRemoveReaction}
          />
        </BrowserRouter>
      </Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render message content', () => {
      renderMessageItem();
      expect(screen.getByText('Hello World')).toBeInTheDocument();
    });

    it('should render message author', () => {
      renderMessageItem();
      expect(screen.getByText('Test User')).toBeInTheDocument();
    });

    it('should render message timestamp', () => {
      renderMessageItem();
      expect(screen.getByText(/10:00/)).toBeInTheDocument();
    });

    it('should render edited indicator when message is edited', () => {
      const editedMessage: Message = {
        ...mockMessage,
        isEdited: true,
        editedAt: new Date('2024-01-01T11:00:00Z'),
      };
      renderMessageItem(editedMessage);
      expect(screen.getByText(/edited/)).toBeInTheDocument();
    });

    it('should render reactions', () => {
      const messageWithReactions: Message = {
        ...mockMessage,
        reactions: [
          { emoji: '👍', userId: 'user-2', createdAt: new Date() },
          { emoji: '👍', userId: 'user-3', createdAt: new Date() },
          { emoji: '❤️', userId: 'user-2', createdAt: new Date() },
        ],
      };
      renderMessageItem(messageWithReactions);
      expect(screen.getByText('👍')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('❤️')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('should render attachments', () => {
      const messageWithAttachment: Message = {
        ...mockMessage,
        attachments: [
          {
            id: 'att-1',
            filename: 'test.jpg',
            mimetype: 'image/jpeg',
            size: 1024,
            url: 'http://example.com/test.jpg',
            uploadedAt: new Date(),
          },
        ],
      };
      renderMessageItem(messageWithAttachment);
      expect(screen.getByText('test.jpg')).toBeInTheDocument();
    });

    it('should render thread reply indicator', () => {
      const messageWithThread: Message = {
        ...mockMessage,
        parentId: 'parent-msg-1',
        threadId: 'thread-1',
      };
      renderMessageItem(messageWithThread);
      expect(screen.getByText(/reply/)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should show edit button for own messages', () => {
      renderMessageItem();
      const editButton = screen.getByRole('button', { name: /edit/i });
      expect(editButton).toBeInTheDocument();
    });

    it('should not show edit button for other users messages', () => {
      const otherUserMessage: Message = {
        ...mockMessage,
        authorId: 'user-2',
      };
      renderMessageItem(otherUserMessage);
      expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    });

    it('should call onEdit when edit button is clicked', () => {
      renderMessageItem();
      const editButton = screen.getByRole('button', { name: /edit/i });
      fireEvent.click(editButton);
      expect(mockOnEdit).toHaveBeenCalledWith(mockMessage);
    });

    it('should call onDelete when delete button is clicked', async () => {
      renderMessageItem();
      const deleteButton = screen.getByRole('button', { name: /delete/i });
      fireEvent.click(deleteButton);
      
      // Confirm deletion
      const confirmButton = await screen.findByRole('button', { name: /confirm/i });
      fireEvent.click(confirmButton);
      
      expect(mockOnDelete).toHaveBeenCalledWith(mockMessage.id);
    });

    it('should call onReply when reply button is clicked', () => {
      renderMessageItem();
      const replyButton = screen.getByRole('button', { name: /reply/i });
      fireEvent.click(replyButton);
      expect(mockOnReply).toHaveBeenCalledWith(mockMessage);
    });

    it('should show reaction picker when reaction button is clicked', () => {
      renderMessageItem();
      const reactionButton = screen.getByRole('button', { name: /reaction/i });
      fireEvent.click(reactionButton);
      expect(screen.getByText('👍')).toBeInTheDocument();
      expect(screen.getByText('❤️')).toBeInTheDocument();
      expect(screen.getByText('😂')).toBeInTheDocument();
    });

    it('should call onAddReaction when emoji is selected', () => {
      renderMessageItem();
      const reactionButton = screen.getByRole('button', { name: /reaction/i });
      fireEvent.click(reactionButton);
      
      const thumbsUp = screen.getByText('👍');
      fireEvent.click(thumbsUp);
      
      expect(mockOnAddReaction).toHaveBeenCalledWith({
        messageId: mockMessage.id,
        emoji: '👍',
      });
    });

    it('should call onRemoveReaction when reaction is clicked again', () => {
      const messageWithReaction: Message = {
        ...mockMessage,
        reactions: [
          { emoji: '👍', userId: mockUser.id, createdAt: new Date() },
        ],
      };
      renderMessageItem(messageWithReaction);
      
      const thumbsUp = screen.getByText('👍');
      fireEvent.click(thumbsUp);
      
      expect(mockOnRemoveReaction).toHaveBeenCalledWith({
        messageId: mockMessage.id,
        emoji: '👍',
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      renderMessageItem();
      const messageContainer = screen.getByRole('article');
      expect(messageContainer).toHaveAttribute('aria-label', expect.stringContaining('message'));
    });

    it('should be keyboard navigable', () => {
      renderMessageItem();
      const editButton = screen.getByRole('button', { name: /edit/i });
      editButton.focus();
      expect(editButton).toHaveFocus();
    });

    it('should announce new messages to screen readers', () => {
      renderMessageItem();
      const messageContainer = screen.getByRole('article');
      expect(messageContainer).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message content', () => {
      const emptyMessage: Message = {
        ...mockMessage,
        content: {},
      };
      renderMessageItem(emptyMessage);
      expect(screen.queryByText('Hello World')).not.toBeInTheDocument();
    });

    it('should handle very long messages', () => {
      const longMessage: Message = {
        ...mockMessage,
        content: { text: 'A'.repeat(1000) },
      };
      renderMessageItem(longMessage);
      expect(screen.getByText(/A+/)).toBeInTheDocument();
    });

    it('should handle multiple attachments', () => {
      const messageWithMultipleAttachments: Message = {
        ...mockMessage,
        attachments: [
          {
            id: 'att-1',
            filename: 'test1.jpg',
            mimetype: 'image/jpeg',
            size: 1024,
            url: 'http://example.com/test1.jpg',
            uploadedAt: new Date(),
          },
          {
            id: 'att-2',
            filename: 'test2.jpg',
            mimetype: 'image/jpeg',
            size: 2048,
            url: 'http://example.com/test2.jpg',
            uploadedAt: new Date(),
          },
        ],
      };
      renderMessageItem(messageWithMultipleAttachments);
      expect(screen.getByText('test1.jpg')).toBeInTheDocument();
      expect(screen.getByText('test2.jpg')).toBeInTheDocument();
    });

    it('should handle many reactions', () => {
      const messageWithManyReactions: Message = {
        ...mockMessage,
        reactions: Array.from({ length: 10 }, (_, i) => ({
          emoji: '👍',
          userId: `user-${i}`,
          createdAt: new Date(),
        })),
      };
      renderMessageItem(messageWithManyReactions);
      expect(screen.getByText('10')).toBeInTheDocument();
    });
  });
});
