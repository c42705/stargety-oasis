import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { Message, Reaction, ChatRoom, MessageContent, MessageEnum } from '../types/chat';
import { chatApiService } from '../../services/api/ChatApiService';

// Define types
export interface ChatState {
  // Room management
  currentRoom: string | null;
  rooms: ChatRoom[];
  
  // Messages
  messages: Record<string, Message[]>; // roomId -> messages
  loading: Record<string, boolean>; // roomId -> loading state
  error: string | null;
  
  // Real-time state
  onlineUsers: string[];
  typingUsers: Record<string, string[]>; // roomId -> user IDs
  
  // UI state
  messageInput: string;
  selectedMessage: string | null;
  editingMessage: string | null;
  
  // Pagination
  hasMore: Record<string, boolean>; // roomId -> has more messages
  page: Record<string, number>; // roomId -> current page
  
  // Optimistic updates
  pendingMessages: Record<string, Message>; // tempId -> message
  pendingEdits: Record<string, { messageId: string; originalContent: string }>; // tempId -> edit data
  pendingDeletions: Record<string, Message>; // messageId -> original message
  pendingReactions: Record<string, { messageId: string; emoji: string; userId: string }>; // tempId -> reaction data
}

// Async thunks
export const chatThunks = {
  // Room operations
  fetchRooms: createAsyncThunk('chat/fetchRooms', async () => {
    const rooms = await chatApiService.getRooms();
    return rooms;
  }),
  
  joinRoom: createAsyncThunk('chat/joinRoom', async (roomId: string) => {
    // Room joining is handled via Socket.IO, this is for state management
    return { roomId };
  }),
  
  leaveRoom: createAsyncThunk('chat/leaveRoom', async (roomId: string) => {
    // Room leaving is handled via Socket.IO, this is for state management
    return { roomId };
  }),
  
  // Message operations
  loadMessages: createAsyncThunk('chat/loadMessages', async (params: { roomId: string; page?: number }) => {
    const { roomId, page = 1 } = params;
    const messages = await chatApiService.getMessages({ roomId, page });
    // Assume 50 messages per page, hasMore if we got 50
    const hasMore = messages.length === 50;
    return { roomId, messages, hasMore, page };
  }),
  
  sendMessage: createAsyncThunk('chat/sendMessage', async (message: { roomId: string; content: string; type?: MessageEnum; parentId?: string; threadId?: string }) => {
    const { roomId, content, type = MessageEnum.TEXT, parentId, threadId } = message;
    const newMessage = await chatApiService.sendMessage({ roomId, content, type, parentId, threadId });
    return newMessage;
  }),
  
  editMessage: createAsyncThunk('chat/editMessage', async (params: { messageId: string; content: string }) => {
    const { messageId, content } = params;
    const updatedMessage = await chatApiService.editMessage({ messageId, content });
    return updatedMessage;
  }),
  
  deleteMessage: createAsyncThunk('chat/deleteMessage', async (messageId: string) => {
    await chatApiService.deleteMessage(messageId);
    return { messageId };
  }),
  
  // Reactions
  addReaction: createAsyncThunk('chat/addReaction', async (params: { messageId: string; emoji: string }) => {
    const { messageId, emoji } = params;
    const updatedMessage = await chatApiService.addReaction({ messageId, emoji });
    return { messageId, emoji, message: updatedMessage };
  }),
  
  removeReaction: createAsyncThunk('chat/removeReaction', async (params: { messageId: string; emoji: string }) => {
    const { messageId, emoji } = params;
    await chatApiService.removeReaction({ messageId, emoji });
    return { messageId, emoji };
  }),
  
  // Files
  uploadFile: createAsyncThunk('chat/uploadFile', async (params: { file: File; roomId: string }) => {
    const { file, roomId } = params;
    const attachment = await chatApiService.uploadFile(file, roomId);
    return attachment;
  }),
  
  // Search
  searchMessages: createAsyncThunk('chat/searchMessages', async (params: { roomId: string; query: string }) => {
    const { roomId, query } = params;
    const messages = await chatApiService.searchMessages({ roomId, query });
    return { roomId, query, messages };
  }),
};

// Initial state
const initialState: ChatState = {
  currentRoom: null,
  rooms: [],
  messages: {},
  loading: {},
  error: null,
  onlineUsers: [],
  typingUsers: {},
  messageInput: '',
  selectedMessage: null,
  editingMessage: null,
  hasMore: {},
  page: {},
  pendingMessages: {},
  pendingEdits: {},
  pendingDeletions: {},
  pendingReactions: {},
};

// Slice
const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // Room management
    setCurrentRoom(state, action: PayloadAction<string | null>) {
      state.currentRoom = action.payload;
    },
    
    addRoom(state, action: PayloadAction<ChatRoom>) {
      state.rooms.push(action.payload);
    },
    
    removeRoom(state, action: PayloadAction<string>) {
      state.rooms = state.rooms.filter(room => room.id !== action.payload);
    },
    
    setRooms(state, action: PayloadAction<ChatRoom[]>) {
      state.rooms = action.payload;
    },
    
    // Message management
    addMessage(state, action: PayloadAction<{ roomId: string; message: Message }>) {
      const { roomId, message } = action.payload;
      if (!state.messages[roomId]) {
        state.messages[roomId] = [];
      }
      state.messages[roomId].push(message);
    },
    
    updateMessage(state, action: PayloadAction<{ roomId: string; messageId: string; updates: Partial<Message> }>) {
      const { roomId, messageId, updates } = action.payload;
      if (!state.messages[roomId]) return;
      
      const messageIndex = state.messages[roomId].findIndex(m => m.id === messageId);
      if (messageIndex !== -1) {
        Object.assign(state.messages[roomId][messageIndex], updates);
      }
    },
    
    removeMessage(state, action: PayloadAction<{ roomId: string; messageId: string }>) {
      const { roomId, messageId } = action.payload;
      if (!state.messages[roomId]) return;
      state.messages[roomId] = state.messages[roomId].filter(m => m.id !== messageId);
    },
    
    setMessages(state, action: PayloadAction<{ roomId: string; messages: Message[] }>) {
      const { roomId, messages } = action.payload;
      state.messages[roomId] = messages;
    },
    
    // Loading states
    setLoading(state, action: PayloadAction<{ roomId: string; loading: boolean }>) {
      const { roomId, loading } = action.payload;
      state.loading[roomId] = loading;
    },
    
    // Error handling
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    
    clearError(state) {
      state.error = null;
    },
    
    // Real-time state
    setOnlineUsers(state, action: PayloadAction<string[]>) {
      state.onlineUsers = action.payload;
    },
    
    addOnlineUser(state, action: PayloadAction<string>) {
      if (!state.onlineUsers.includes(action.payload)) {
        state.onlineUsers.push(action.payload);
      }
    },
    
    removeOnlineUser(state, action: PayloadAction<string>) {
      state.onlineUsers = state.onlineUsers.filter(userId => userId !== action.payload);
    },
    
    setTypingUsers(state, action: PayloadAction<{ roomId: string; userIds: string[] }>) {
      const { roomId, userIds } = action.payload;
      state.typingUsers[roomId] = userIds;
    },
    
    addTypingUser(state, action: PayloadAction<{ roomId: string; userId: string }>) {
      const { roomId, userId } = action.payload;
      if (!state.typingUsers[roomId]) {
        state.typingUsers[roomId] = [];
      }
      if (!state.typingUsers[roomId].includes(userId)) {
        state.typingUsers[roomId].push(userId);
      }
    },
    
    removeTypingUser(state, action: PayloadAction<{ roomId: string; userId: string }>) {
      const { roomId, userId } = action.payload;
      if (!state.typingUsers[roomId]) return;
      state.typingUsers[roomId] = state.typingUsers[roomId].filter(id => id !== userId);
    },
    
    // UI state
    setMessageInput(state, action: PayloadAction<string>) {
      state.messageInput = action.payload;
    },
    
    setSelectedMessage(state, action: PayloadAction<string | null>) {
      state.selectedMessage = action.payload;
    },
    
    setEditingMessage(state, action: PayloadAction<string | null>) {
      state.editingMessage = action.payload;
    },
    
    clearMessageInput(state) {
      state.messageInput = '';
    },
    
    // Pagination
    setHasMore(state, action: PayloadAction<{ roomId: string; hasMore: boolean }>) {
      const { roomId, hasMore } = action.payload;
      state.hasMore[roomId] = hasMore;
    },
    
    setPage(state, action: PayloadAction<{ roomId: string; page: number }>) {
      const { roomId, page } = action.payload;
      state.page[roomId] = page;
    },
    
    incrementPage(state, action: PayloadAction<string>) {
      const roomId = action.payload;
      state.page[roomId] = (state.page[roomId] || 1) + 1;
    },
    
    // Reset state
    resetChatState(state) {
      Object.assign(state, initialState);
    },
  },
  extraReducers: (builder) => {
    builder
      // Room operations
      .addCase(chatThunks.fetchRooms.pending, (state) => {
        state.error = null;
      })
      .addCase(chatThunks.fetchRooms.fulfilled, (state, action) => {
        state.rooms = action.payload;
      })
      .addCase(chatThunks.fetchRooms.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to fetch rooms';
      })
      
      .addCase(chatThunks.joinRoom.pending, (state) => {
        state.error = null;
      })
      .addCase(chatThunks.joinRoom.fulfilled, (state, action) => {
        // Room joined successfully
      })
      .addCase(chatThunks.joinRoom.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to join room';
      })
      
      .addCase(chatThunks.leaveRoom.pending, (state) => {
        state.error = null;
      })
      .addCase(chatThunks.leaveRoom.fulfilled, (state, action) => {
        // Room left successfully
      })
      .addCase(chatThunks.leaveRoom.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to leave room';
      })
      
      // Message operations
      .addCase(chatThunks.loadMessages.pending, (state, action) => {
        const roomId = action.meta.arg.roomId;
        state.loading[roomId] = true;
        state.error = null;
      })
      .addCase(chatThunks.loadMessages.fulfilled, (state, action) => {
        const { roomId, messages, hasMore, page } = action.payload;
        state.loading[roomId] = false;
        if (messages.length > 0) {
          if (!state.messages[roomId]) {
            state.messages[roomId] = [];
          }
          // Append new messages (for infinite scroll)
          state.messages[roomId] = [...state.messages[roomId], ...messages];
        }
        state.hasMore[roomId] = hasMore;
        state.page[roomId] = page;
      })
      .addCase(chatThunks.loadMessages.rejected, (state, action) => {
        const roomId = action.meta.arg.roomId;
        state.loading[roomId] = false;
        state.error = action.error.message || 'Failed to load messages';
      })
      
      // Send Message with Optimistic Update
      .addCase(chatThunks.sendMessage.pending, (state, action) => {
        const { roomId, content, type, parentId, threadId } = action.meta.arg;
        const tempId = `temp-${Date.now()}`;
        
        // Create optimistic message
        const optimisticMessage: Message = {
          id: tempId,
          content: { text: content },
          type: type || MessageEnum.TEXT,
          roomId,
          authorId: 'current-user', // Will be replaced with actual user ID
          parentId,
          threadId,
          isEdited: false,
          reactions: [],
          attachments: [],
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        // Add to pending messages
        state.pendingMessages[tempId] = optimisticMessage;
        
        // Add to messages array immediately
        if (!state.messages[roomId]) {
          state.messages[roomId] = [];
        }
        state.messages[roomId].push(optimisticMessage);
        
        state.messageInput = '';
        state.editingMessage = null;
      })
      .addCase(chatThunks.sendMessage.fulfilled, (state, action) => {
        const message = action.payload;
        const { roomId, content, type, parentId, threadId } = action.meta.arg;
        
        // Find the tempId by matching all relevant fields
        const tempId = Object.keys(state.pendingMessages).find(id => {
          const pending = state.pendingMessages[id];
          return (
            pending.roomId === roomId &&
            pending.content.text === content &&
            pending.type === (type || MessageEnum.TEXT) &&
            pending.parentId === parentId &&
            pending.threadId === threadId
          );
        });
        
        if (tempId) {
          // Remove from pending
          delete state.pendingMessages[tempId];
          
          // Replace optimistic message with real message
          if (state.messages[message.roomId]) {
            const index = state.messages[message.roomId].findIndex(m => m.id === tempId);
            if (index !== -1) {
              state.messages[message.roomId][index] = message;
            }
          }
        } else {
          // No pending message, just add the new one
          if (!state.messages[message.roomId]) {
            state.messages[message.roomId] = [];
          }
          state.messages[message.roomId].push(message);
        }
      })
      .addCase(chatThunks.sendMessage.rejected, (state, action) => {
        const { roomId } = action.meta.arg;
        const tempId = Object.keys(state.pendingMessages).find(
          id => state.pendingMessages[id].roomId === roomId
        );
        
        if (tempId) {
          // Remove optimistic message
          delete state.pendingMessages[tempId];
          if (state.messages[roomId]) {
            state.messages[roomId] = state.messages[roomId].filter(m => m.id !== tempId);
          }
        }
        
        state.error = action.error.message || 'Failed to send message';
      })
      
      // Edit Message with Optimistic Update
      .addCase(chatThunks.editMessage.pending, (state, action) => {
        const { messageId, content } = action.meta.arg;
        const tempId = `edit-${Date.now()}`;
        
        // Find the message and store original content
        Object.keys(state.messages).forEach(roomId => {
          const messageIndex = state.messages[roomId].findIndex(m => m.id === messageId);
          if (messageIndex !== -1) {
            const originalMessage = { ...state.messages[roomId][messageIndex] };
            state.pendingEdits[tempId] = { messageId, originalContent: JSON.stringify(originalMessage.content) };
            
            // Optimistically update the message
            state.messages[roomId][messageIndex].content = { text: content };
            state.messages[roomId][messageIndex].isEdited = true;
            state.messages[roomId][messageIndex].editedAt = new Date();
          }
        });
      })
      .addCase(chatThunks.editMessage.fulfilled, (state, action) => {
        const updatedMessage = action.payload;
        const tempId = Object.keys(state.pendingEdits).find(
          id => state.pendingEdits[id].messageId === updatedMessage.id
        );
        
        if (tempId) {
          delete state.pendingEdits[tempId];
        }
        
        // Update with server response
        Object.keys(state.messages).forEach(roomId => {
          const messageIndex = state.messages[roomId].findIndex(m => m.id === updatedMessage.id);
          if (messageIndex !== -1) {
            state.messages[roomId][messageIndex] = updatedMessage;
          }
        });
        
        state.editingMessage = null;
      })
      .addCase(chatThunks.editMessage.rejected, (state, action) => {
        const { messageId } = action.meta.arg;
        const tempId = Object.keys(state.pendingEdits).find(
          id => state.pendingEdits[id].messageId === messageId
        );
        
        if (tempId) {
          // Revert to original content
          const { originalContent } = state.pendingEdits[tempId];
          Object.keys(state.messages).forEach(roomId => {
            const messageIndex = state.messages[roomId].findIndex(m => m.id === messageId);
            if (messageIndex !== -1) {
              state.messages[roomId][messageIndex].content = JSON.parse(originalContent);
              state.messages[roomId][messageIndex].isEdited = false;
              state.messages[roomId][messageIndex].editedAt = undefined;
            }
          });
          
          delete state.pendingEdits[tempId];
        }
        
        state.error = action.error.message || 'Failed to edit message';
      })
      
      // Delete Message with Optimistic Update
      .addCase(chatThunks.deleteMessage.pending, (state, action) => {
        const messageId = action.meta.arg;
        
        // Find and store the message before deletion
        Object.keys(state.messages).forEach(roomId => {
          const message = state.messages[roomId].find(m => m.id === messageId);
          if (message) {
            state.pendingDeletions[messageId] = { ...message };
          }
        });
        
        // Optimistically remove the message
        Object.keys(state.messages).forEach(roomId => {
          state.messages[roomId] = state.messages[roomId].filter(m => m.id !== messageId);
        });
      })
      .addCase(chatThunks.deleteMessage.fulfilled, (state, action) => {
        const messageId = action.payload.messageId;
        delete state.pendingDeletions[messageId];
      })
      .addCase(chatThunks.deleteMessage.rejected, (state, action) => {
        const messageId = action.meta.arg;
        
        // Restore the message
        if (state.pendingDeletions[messageId]) {
          const originalMessage = state.pendingDeletions[messageId];
          if (!state.messages[originalMessage.roomId]) {
            state.messages[originalMessage.roomId] = [];
          }
          state.messages[originalMessage.roomId].push(originalMessage);
          delete state.pendingDeletions[messageId];
        }
        
        state.error = action.error.message || 'Failed to delete message';
      })
      
      // Add Reaction with Optimistic Update
      .addCase(chatThunks.addReaction.pending, (state, action) => {
        const { messageId, emoji } = action.meta.arg;
        const tempId = `reaction-${Date.now()}`;
        
        state.pendingReactions[tempId] = { messageId, emoji, userId: 'current-user' };
        
        // Optimistically add reaction
        Object.keys(state.messages).forEach(roomId => {
          const message = state.messages[roomId].find(m => m.id === messageId);
          if (message) {
            if (!message.reactions) {
              message.reactions = [];
            }
            // Check if reaction already exists
            const existingIndex = message.reactions.findIndex(
              r => r.emoji === emoji && r.userId === 'current-user'
            );
            if (existingIndex === -1) {
              message.reactions.push({
                emoji,
                userId: 'current-user',
                createdAt: new Date(),
              });
            }
          }
        });
      })
      .addCase(chatThunks.addReaction.fulfilled, (state, action) => {
        const { message } = action.payload;
        const tempId = Object.keys(state.pendingReactions).find(
          id => state.pendingReactions[id].messageId === message.id
        );
        
        if (tempId) {
          delete state.pendingReactions[tempId];
        }
        
        // Update with server response
        Object.keys(state.messages).forEach(roomId => {
          const messageIndex = state.messages[roomId].findIndex(m => m.id === message.id);
          if (messageIndex !== -1) {
            state.messages[roomId][messageIndex] = message;
          }
        });
      })
      .addCase(chatThunks.addReaction.rejected, (state, action) => {
        const { messageId, emoji } = action.meta.arg;
        const tempId = Object.keys(state.pendingReactions).find(
          id => state.pendingReactions[id].messageId === messageId && state.pendingReactions[id].emoji === emoji
        );
        
        if (tempId) {
          // Remove optimistic reaction
          Object.keys(state.messages).forEach(roomId => {
            const message = state.messages[roomId].find(m => m.id === messageId);
            if (message && message.reactions) {
              message.reactions = message.reactions.filter(
                r => !(r.emoji === emoji && r.userId === 'current-user')
              );
            }
          });
          
          delete state.pendingReactions[tempId];
        }
        
        state.error = action.error.message || 'Failed to add reaction';
      })
      
      // Remove Reaction with Optimistic Update
      .addCase(chatThunks.removeReaction.pending, (state, action) => {
        const { messageId, emoji } = action.meta.arg;
        const tempId = `remove-reaction-${Date.now()}`;
        
        state.pendingReactions[tempId] = { messageId, emoji, userId: 'current-user' };
        
        // Optimistically remove reaction
        Object.keys(state.messages).forEach(roomId => {
          const message = state.messages[roomId].find(m => m.id === messageId);
          if (message && message.reactions) {
            message.reactions = message.reactions.filter(
              r => !(r.emoji === emoji && r.userId === 'current-user')
            );
          }
        });
      })
      .addCase(chatThunks.removeReaction.fulfilled, (state, action) => {
        const { messageId, emoji } = action.payload;
        const tempId = Object.keys(state.pendingReactions).find(
          id => state.pendingReactions[id].messageId === messageId && state.pendingReactions[id].emoji === emoji
        );
        
        if (tempId) {
          delete state.pendingReactions[tempId];
        }
      })
      .addCase(chatThunks.removeReaction.rejected, (state, action) => {
        const { messageId, emoji } = action.meta.arg;
        const tempId = Object.keys(state.pendingReactions).find(
          id => state.pendingReactions[id].messageId === messageId && state.pendingReactions[id].emoji === emoji
        );
        
        if (tempId) {
          // Restore reaction (this is tricky without the original data, so we'll just clear the pending state)
          delete state.pendingReactions[tempId];
        }
        
        state.error = action.error.message || 'Failed to remove reaction';
      })
      
      // File upload
      .addCase(chatThunks.uploadFile.pending, (state) => {
        state.error = null;
      })
      .addCase(chatThunks.uploadFile.fulfilled, (state, action) => {
        // File uploaded successfully, can be used in message
      })
      .addCase(chatThunks.uploadFile.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to upload file';
      })
      
      // Search
      .addCase(chatThunks.searchMessages.pending, (state) => {
        state.error = null;
      })
      .addCase(chatThunks.searchMessages.fulfilled, (state, action) => {
        // Search results handled by UI component
      })
      .addCase(chatThunks.searchMessages.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to search messages';
      });
  },
});

// Export actions
export const {
  setCurrentRoom,
  addRoom,
  removeRoom,
  setRooms,
  addMessage,
  updateMessage,
  removeMessage,
  setMessages,
  setLoading,
  setError,
  clearError,
  setOnlineUsers,
  addOnlineUser,
  removeOnlineUser,
  setTypingUsers,
  addTypingUser,
  removeTypingUser,
  setMessageInput,
  setSelectedMessage,
  setEditingMessage,
  clearMessageInput,
  setHasMore,
  setPage,
  incrementPage,
  resetChatState,
} = chatSlice.actions;

// Selectors
export const selectCurrentRoom = (state: { chat: ChatState }) => state.chat.currentRoom;
export const selectRooms = (state: { chat: ChatState }) => state.chat.rooms;
export const selectMessagesByRoom = (roomId: string) => (state: { chat: ChatState }) =>
  state.chat.messages[roomId] || [];
export const selectTypingUsers = (roomId: string) => (state: { chat: ChatState }) =>
  state.chat.typingUsers[roomId] || [];
export const selectOnlineUsers = (state: { chat: ChatState }) => state.chat.onlineUsers;
export const selectError = (state: { chat: ChatState }) => state.chat.error;
export const selectIsLoading = (roomId: string) => (state: { chat: ChatState }) =>
  state.chat.loading[roomId] || false;
export const selectHasMore = (roomId: string) => (state: { chat: ChatState }) =>
  state.chat.hasMore[roomId] || false;

// Export reducer
export default chatSlice.reducer;