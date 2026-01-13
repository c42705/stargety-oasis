/**
 * Chat Slice Tests
 * Tests for Redux chat state management
 */

import { configureStore } from '@reduxjs/toolkit';
import chatReducer, {
  ChatState,
  setCurrentRoom,
  addMessage,
  updateMessage,
  removeMessage,
  setTypingUsers,
  setOnlineUsers,
  clearMessages,
  chatThunks,
} from '../../redux/slices/chatSlice';
import { Message, MessageEnum } from '../../redux/types/chat';

describe('Chat Slice', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    store = configureStore({
      reducer: {
        chat: chatReducer,
      },
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const state = store.getState().chat as ChatState;
      expect(state.currentRoom).toBeNull();
      expect(state.rooms).toEqual([]);
      expect(state.messages).toEqual({});
      expect(state.loading).toEqual({});
      expect(state.error).toBeNull();
      expect(state.onlineUsers).toEqual([]);
      expect(state.typingUsers).toEqual({});
      expect(state.messageInput).toBe('');
      expect(state.selectedMessage).toBeNull();
      expect(state.editingMessage).toBeNull();
      expect(state.hasMore).toEqual({});
      expect(state.page).toEqual({});
    });
  });

  describe('setCurrentRoom', () => {
    it('should set current room', () => {
      store.dispatch(setCurrentRoom('room-1'));
      const state = store.getState().chat as ChatState;
      expect(state.currentRoom).toBe('room-1');
    });

    it('should clear current room when null', () => {
      store.dispatch(setCurrentRoom('room-1'));
      store.dispatch(setCurrentRoom(null));
      const state = store.getState().chat as ChatState;
      expect(state.currentRoom).toBeNull();
    });
  });

  describe('addMessage', () => {
    it('should add message to room', () => {
      const message: Message = {
        id: 'msg-1',
        content: { text: 'Hello' },
        type: MessageEnum.TEXT,
        roomId: 'room-1',
        authorId: 'user-1',
        isEdited: false,
        reactions: [],
        attachments: [],
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      store.dispatch(addMessage(message));
      const state = store.getState().chat as ChatState;
      expect(state.messages['room-1']).toHaveLength(1);
      expect(state.messages['room-1'][0]).toEqual(message);
    });

    it('should append message to existing messages', () => {
      const message1: Message = {
        id: 'msg-1',
        content: { text: 'Hello' },
        type: MessageEnum.TEXT,
        roomId: 'room-1',
        authorId: 'user-1',
        isEdited: false,
        reactions: [],
        attachments: [],
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const message2: Message = {
        id: 'msg-2',
        content: { text: 'World' },
        type: MessageEnum.TEXT,
        roomId: 'room-1',
        authorId: 'user-2',
        isEdited: false,
        reactions: [],
        attachments: [],
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      store.dispatch(addMessage(message1));
      store.dispatch(addMessage(message2));
      const state = store.getState().chat as ChatState;
      expect(state.messages['room-1']).toHaveLength(2);
      expect(state.messages['room-1'][0]).toEqual(message1);
      expect(state.messages['room-1'][1]).toEqual(message2);
    });
  });

  describe('updateMessage', () => {
    it('should update existing message', () => {
      const message: Message = {
        id: 'msg-1',
        content: { text: 'Hello' },
        type: MessageEnum.TEXT,
        roomId: 'room-1',
        authorId: 'user-1',
        isEdited: false,
        reactions: [],
        attachments: [],
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      store.dispatch(addMessage(message));

      const updatedMessage: Message = {
        ...message,
        content: { text: 'Hello World' },
        isEdited: true,
        editedAt: new Date(),
      };

      store.dispatch(updateMessage(updatedMessage));
      const state = store.getState().chat as ChatState;
      expect(state.messages['room-1'][0].content.text).toBe('Hello World');
      expect(state.messages['room-1'][0].isEdited).toBe(true);
    });

    it('should not update non-existent message', () => {
      const message: Message = {
        id: 'msg-1',
        content: { text: 'Hello' },
        type: MessageEnum.TEXT,
        roomId: 'room-1',
        authorId: 'user-1',
        isEdited: false,
        reactions: [],
        attachments: [],
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      store.dispatch(updateMessage(message));
      const state = store.getState().chat as ChatState;
      expect(state.messages['room-1']).toBeUndefined();
    });
  });

  describe('removeMessage', () => {
    it('should remove message from room', () => {
      const message: Message = {
        id: 'msg-1',
        content: { text: 'Hello' },
        type: MessageEnum.TEXT,
        roomId: 'room-1',
        authorId: 'user-1',
        isEdited: false,
        reactions: [],
        attachments: [],
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      store.dispatch(addMessage(message));
      store.dispatch(removeMessage({ roomId: 'room-1', messageId: 'msg-1' }));
      const state = store.getState().chat as ChatState;
      expect(state.messages['room-1']).toHaveLength(0);
    });

    it('should not remove non-existent message', () => {
      const message: Message = {
        id: 'msg-1',
        content: { text: 'Hello' },
        type: MessageEnum.TEXT,
        roomId: 'room-1',
        authorId: 'user-1',
        isEdited: false,
        reactions: [],
        attachments: [],
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      store.dispatch(addMessage(message));
      store.dispatch(removeMessage({ roomId: 'room-1', messageId: 'msg-2' }));
      const state = store.getState().chat as ChatState;
      expect(state.messages['room-1']).toHaveLength(1);
    });
  });

  describe('setTypingUsers', () => {
    it('should set typing users for room', () => {
      store.dispatch(setTypingUsers({ roomId: 'room-1', userIds: ['user-1', 'user-2'] }));
      const state = store.getState().chat as ChatState;
      expect(state.typingUsers['room-1']).toEqual(['user-1', 'user-2']);
    });

    it('should clear typing users when empty array', () => {
      store.dispatch(setTypingUsers({ roomId: 'room-1', userIds: ['user-1'] }));
      store.dispatch(setTypingUsers({ roomId: 'room-1', userIds: [] }));
      const state = store.getState().chat as ChatState;
      expect(state.typingUsers['room-1']).toEqual([]);
    });
  });

  describe('setOnlineUsers', () => {
    it('should set online users', () => {
      store.dispatch(setOnlineUsers(['user-1', 'user-2', 'user-3']));
      const state = store.getState().chat as ChatState;
      expect(state.onlineUsers).toEqual(['user-1', 'user-2', 'user-3']);
    });

    it('should clear online users when empty array', () => {
      store.dispatch(setOnlineUsers(['user-1']));
      store.dispatch(setOnlineUsers([]));
      const state = store.getState().chat as ChatState;
      expect(state.onlineUsers).toEqual([]);
    });
  });

  describe('clearMessages', () => {
    it('should clear messages for room', () => {
      const message: Message = {
        id: 'msg-1',
        content: { text: 'Hello' },
        type: MessageEnum.TEXT,
        roomId: 'room-1',
        authorId: 'user-1',
        isEdited: false,
        reactions: [],
        attachments: [],
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      store.dispatch(addMessage(message));
      store.dispatch(clearMessages('room-1'));
      const state = store.getState().chat as ChatState;
      expect(state.messages['room-1']).toBeUndefined();
    });
  });

  describe('Async Thunks', () => {
    describe('joinRoom', () => {
      it('should handle joinRoom pending', () => {
        const action = chatThunks.joinRoom.pending('requestId', 'room-1');
        const state = chatReducer(store.getState().chat as ChatState, action);
        expect(state.loading['room-1']).toBe(true);
      });

      it('should handle joinRoom fulfilled', () => {
        const action = chatThunks.joinRoom.fulfilled(
          { roomId: 'room-1', messages: [] },
          'requestId',
          'room-1'
        );
        const state = chatReducer(store.getState().chat as ChatState, action);
        expect(state.loading['room-1']).toBe(false);
        expect(state.currentRoom).toBe('room-1');
      });

      it('should handle joinRoom rejected', () => {
        const action = chatThunks.joinRoom.rejected(
          new Error('Failed to join'),
          'requestId',
          'room-1'
        );
        const state = chatReducer(store.getState().chat as ChatState, action);
        expect(state.loading['room-1']).toBe(false);
        expect(state.error).toBe('Failed to join');
      });
    });

    describe('loadMessages', () => {
      it('should handle loadMessages pending', () => {
        const action = chatThunks.loadMessages.pending('requestId', { roomId: 'room-1' });
        const state = chatReducer(store.getState().chat as ChatState, action);
        expect(state.loading['room-1']).toBe(true);
      });

      it('should handle loadMessages fulfilled', () => {
        const messages: Message[] = [
          {
            id: 'msg-1',
            content: { text: 'Hello' },
            type: MessageEnum.TEXT,
            roomId: 'room-1',
            authorId: 'user-1',
            isEdited: false,
            reactions: [],
            attachments: [],
            expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        const action = chatThunks.loadMessages.fulfilled(
          { roomId: 'room-1', messages, hasMore: false },
          'requestId',
          { roomId: 'room-1' }
        );
        const state = chatReducer(store.getState().chat as ChatState, action);
        expect(state.loading['room-1']).toBe(false);
        expect(state.messages['room-1']).toEqual(messages);
        expect(state.hasMore['room-1']).toBe(false);
      });
    });

    describe('sendMessage', () => {
      it('should handle sendMessage pending', () => {
        const action = chatThunks.sendMessage.pending('requestId', {
          roomId: 'room-1',
          content: 'Hello',
          type: MessageEnum.TEXT,
        });
        const state = chatReducer(store.getState().chat as ChatState, action);
        expect(state.loading['room-1']).toBe(true);
      });

      it('should handle sendMessage fulfilled', () => {
        const message: Message = {
          id: 'msg-1',
          content: { text: 'Hello' },
          type: MessageEnum.TEXT,
          roomId: 'room-1',
          authorId: 'user-1',
          isEdited: false,
          reactions: [],
          attachments: [],
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const action = chatThunks.sendMessage.fulfilled(message, 'requestId', {
          roomId: 'room-1',
          content: 'Hello',
          type: MessageEnum.TEXT,
        });
        const state = chatReducer(store.getState().chat as ChatState, action);
        expect(state.loading['room-1']).toBe(false);
        expect(state.messages['room-1']).toContainEqual(message);
      });
    });

    describe('editMessage', () => {
      it('should handle editMessage pending', () => {
        const action = chatThunks.editMessage.pending('requestId', {
          messageId: 'msg-1',
          content: 'Updated',
        });
        const state = chatReducer(store.getState().chat as ChatState, action);
        expect(state.loading['room-1']).toBe(true);
      });

      it('should handle editMessage fulfilled', () => {
        const message: Message = {
          id: 'msg-1',
          content: { text: 'Updated' },
          type: MessageEnum.TEXT,
          roomId: 'room-1',
          authorId: 'user-1',
          isEdited: true,
          editedAt: new Date(),
          reactions: [],
          attachments: [],
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const action = chatThunks.editMessage.fulfilled(message, 'requestId', {
          messageId: 'msg-1',
          content: 'Updated',
        });
        const state = chatReducer(store.getState().chat as ChatState, action);
        expect(state.loading['room-1']).toBe(false);
        expect(state.messages['room-1'][0].content.text).toBe('Updated');
        expect(state.messages['room-1'][0].isEdited).toBe(true);
      });
    });

    describe('deleteMessage', () => {
      it('should handle deleteMessage pending', () => {
        const action = chatThunks.deleteMessage.pending('requestId', 'msg-1');
        const state = chatReducer(store.getState().chat as ChatState, action);
        expect(state.loading['room-1']).toBe(true);
      });

      it('should handle deleteMessage fulfilled', () => {
        const action = chatThunks.deleteMessage.fulfilled(
          { roomId: 'room-1', messageId: 'msg-1' },
          'requestId',
          'msg-1'
        );
        const state = chatReducer(store.getState().chat as ChatState, action);
        expect(state.loading['room-1']).toBe(false);
        expect(state.messages['room-1']).not.toContainEqual(
          expect.objectContaining({ id: 'msg-1' })
        );
      });
    });

    describe('addReaction', () => {
      it('should handle addReaction pending', () => {
        const action = chatThunks.addReaction.pending('requestId', {
          messageId: 'msg-1',
          emoji: '👍',
        });
        const state = chatReducer(store.getState().chat as ChatState, action);
        expect(state.loading['room-1']).toBe(true);
      });

      it('should handle addReaction fulfilled', () => {
        const action = chatThunks.addReaction.fulfilled(
          { messageId: 'msg-1', emoji: '👍', userId: 'user-1' },
          'requestId',
          { messageId: 'msg-1', emoji: '👍' }
        );
        const state = chatReducer(store.getState().chat as ChatState, action);
        expect(state.loading['room-1']).toBe(false);
      });
    });

    describe('removeReaction', () => {
      it('should handle removeReaction pending', () => {
        const action = chatThunks.removeReaction.pending('requestId', {
          messageId: 'msg-1',
          emoji: '👍',
        });
        const state = chatReducer(store.getState().chat as ChatState, action);
        expect(state.loading['room-1']).toBe(true);
      });

      it('should handle removeReaction fulfilled', () => {
        const action = chatThunks.removeReaction.fulfilled(
          { messageId: 'msg-1', emoji: '👍', userId: 'user-1' },
          'requestId',
          { messageId: 'msg-1', emoji: '👍' }
        );
        const state = chatReducer(store.getState().chat as ChatState, action);
        expect(state.loading['room-1']).toBe(false);
      });
    });

    describe('uploadFile', () => {
      it('should handle uploadFile pending', () => {
        const action = chatThunks.uploadFile.pending('requestId', {
          file: new File([''], 'test.txt'),
          roomId: 'room-1',
        });
        const state = chatReducer(store.getState().chat as ChatState, action);
        expect(state.loading['room-1']).toBe(true);
      });

      it('should handle uploadFile fulfilled', () => {
        const attachment = {
          id: 'att-1',
          filename: 'test.txt',
          mimetype: 'text/plain',
          size: 0,
          url: 'http://example.com/test.txt',
          uploadedAt: new Date(),
        };

        const action = chatThunks.uploadFile.fulfilled(attachment, 'requestId', {
          file: new File([''], 'test.txt'),
          roomId: 'room-1',
        });
        const state = chatReducer(store.getState().chat as ChatState, action);
        expect(state.loading['room-1']).toBe(false);
      });
    });

    describe('searchMessages', () => {
      it('should handle searchMessages pending', () => {
        const action = chatThunks.searchMessages.pending('requestId', {
          roomId: 'room-1',
          query: 'test',
        });
        const state = chatReducer(store.getState().chat as ChatState, action);
        expect(state.loading['room-1']).toBe(true);
      });

      it('should handle searchMessages fulfilled', () => {
        const messages: Message[] = [
          {
            id: 'msg-1',
            content: { text: 'test message' },
            type: MessageEnum.TEXT,
            roomId: 'room-1',
            authorId: 'user-1',
            isEdited: false,
            reactions: [],
            attachments: [],
            expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ];

        const action = chatThunks.searchMessages.fulfilled(
          { roomId: 'room-1', messages },
          'requestId',
          { roomId: 'room-1', query: 'test' }
        );
        const state = chatReducer(store.getState().chat as ChatState, action);
        expect(state.loading['room-1']).toBe(false);
      });
    });
  });
});
