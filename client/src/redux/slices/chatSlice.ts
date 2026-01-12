// Redux slice for chat functionality
// Mobile-first design for integration with Jitsi video call side panel
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { chatApiService } from '../../services/api/ChatApiService';

// Type definitions for chat system
export interface User {
  id: string;
  displayName: string;
  username?: string;
  avatar?: string;
  isOnline?: boolean;
}

export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  unreadCount: number;
  lastMessage?: string;
  lastActivity?: Date;
  isPrivate?: boolean;
}

export interface Message {
  id: string;
  content: string;
  type: 'text' | 'file' | 'reaction' | 'thread';
  roomId: string;
  authorId: string;
  author: User;
  parentId?: string; // For threaded conversations
  threadId?: string; // Thread root ID
  isEdited: boolean;
  editedAt?: Date;
  reactions: Reaction[];
  attachments: Attachment[];
  expiresAt: Date;
  createdAt: Date;
}

export interface Reaction {
  id: string;
  emoji: string;
  userId: string;
  user: User;
  createdAt: Date;
}

export interface Attachment {
  id: string;
  filename: string;
  mimetype: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: Date;
}

// Chat state interface
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
}

// Initial state
const initialState: ChatState = {
  // Room management
  currentRoom: null,
  rooms: [],
  
  // Messages
  messages: {},
  loading: {},
  error: null,
  
  // Real-time state
  onlineUsers: [],
  typingUsers: {},
  
  // UI state
  messageInput: '',
  selectedMessage: null,
  editingMessage: null,
  
  // Pagination
  hasMore: {},
  page: {},
};

// Async thunks for chat operations
export const chatThunks = {
  // Room operations
  fetchRooms: createAsyncThunk('chat/fetchRooms', async () => {
    const rooms = await chatApiService.getRooms();
    return rooms;
  }),

  joinRoom: createAsyncThunk('chat/joinRoom', async (roomId: string) => {
    // Socket.IO handles the actual join - this just updates state
    return { roomId };
  }),

  leaveRoom: createAsyncThunk('chat/leaveRoom', async (roomId: string) => {
    // Socket.IO handles the actual leave - this just updates state
    return { roomId };
  }),

  // Message operations
  loadMessages: createAsyncThunk('chat/loadMessages', async (params: { roomId: string; page?: number; limit?: number }) => {
    const result = await chatApiService.getMessages(params);
    return {
      roomId: params.roomId,
      messages: result.messages,
      hasMore: result.hasMore,
      page: result.page
    };
  }),

  sendMessage: createAsyncThunk('chat/sendMessage', async (params: {
    roomId: string;
    content: string;
    authorName?: string;
    authorId?: string;
  }) => {
    const message = await chatApiService.sendMessage(params);
    return message;
  }),

  editMessage: createAsyncThunk('chat/editMessage', async (params: { messageId: string; content: string }) => {
    await chatApiService.editMessage(params);
    return params;
  }),

  deleteMessage: createAsyncThunk('chat/deleteMessage', async (messageId: string) => {
    await chatApiService.deleteMessage(messageId);
    return { messageId };
  }),

  // Reactions
  addReaction: createAsyncThunk('chat/addReaction', async (params: { messageId: string; emoji: string }) => {
    await chatApiService.addReaction(params);
    return params;
  }),

  removeReaction: createAsyncThunk('chat/removeReaction', async (params: { messageId: string; emoji: string }) => {
    await chatApiService.removeReaction(params);
    return params;
  }),

  // Files
  uploadFile: createAsyncThunk('chat/uploadFile', async (params: { file: File; roomId: string }) => {
    const attachment = await chatApiService.uploadFile(params.file, params.roomId);
    return attachment;
  }),

  // Search
  searchMessages: createAsyncThunk('chat/searchMessages', async (params: { roomId: string; query: string }) => {
    const result = await chatApiService.searchMessages(params);
    return result.messages;
  }),
};

// Create the slice
const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    // Room actions
    setCurrentRoom: (state, action: PayloadAction<string>) => {
      state.currentRoom = action.payload;
    },
    
    addRoom: (state, action: PayloadAction<ChatRoom>) => {
      state.rooms.push(action.payload);
    },
    
    removeRoom: (state, action: PayloadAction<string>) => {
      state.rooms = state.rooms.filter(room => room.id !== action.payload);
    },
    
    updateRoom: (state, action: PayloadAction<ChatRoom>) => {
      const index = state.rooms.findIndex(room => room.id === action.payload.id);
      if (index !== -1) {
        state.rooms[index] = action.payload;
      }
    },
    
    // Message actions
    addMessage: (state, action: PayloadAction<Message>) => {
      const roomId = action.payload.roomId;
      if (!state.messages[roomId]) {
        state.messages[roomId] = [];
      }
      // Prevent duplicate messages by checking if ID already exists
      const existingIndex = state.messages[roomId].findIndex(msg => msg.id === action.payload.id);
      if (existingIndex === -1) {
        state.messages[roomId].push(action.payload);
      }
    },
    
    updateMessage: (state, action: PayloadAction<Message>) => {
      const roomId = action.payload.roomId;
      if (state.messages[roomId]) {
        const index = state.messages[roomId].findIndex(msg => msg.id === action.payload.id);
        if (index !== -1) {
          state.messages[roomId][index] = action.payload;
        }
      }
    },
    
    removeMessage: (state, action: PayloadAction<string>) => {
      // Remove message from all rooms
      Object.keys(state.messages).forEach(roomId => {
        state.messages[roomId] = state.messages[roomId].filter(msg => msg.id !== action.payload);
      });
    },
    
    setMessages: (state, action: PayloadAction<{ roomId: string; messages: Message[] }>) => {
      state.messages[action.payload.roomId] = action.payload.messages;
    },
    
    // Real-time actions
    addUserOnline: (state, action: PayloadAction<string>) => {
      if (!state.onlineUsers.includes(action.payload)) {
        state.onlineUsers.push(action.payload);
      }
    },
    
    removeUserOnline: (state, action: PayloadAction<string>) => {
      state.onlineUsers = state.onlineUsers.filter(userId => userId !== action.payload);
    },
    
    addTypingUser: (state, action: PayloadAction<{ roomId: string; userId: string }>) => {
      const { roomId, userId } = action.payload;
      if (!state.typingUsers[roomId]) {
        state.typingUsers[roomId] = [];
      }
      if (!state.typingUsers[roomId].includes(userId)) {
        state.typingUsers[roomId].push(userId);
      }
    },
    
    removeTypingUser: (state, action: PayloadAction<{ roomId: string; userId: string }>) => {
      const { roomId, userId } = action.payload;
      if (state.typingUsers[roomId]) {
        state.typingUsers[roomId] = state.typingUsers[roomId].filter(id => id !== userId);
      }
    },
    
    clearTypingUsers: (state, action: PayloadAction<string>) => {
      state.typingUsers[action.payload] = [];
    },
    
    // UI actions
    setMessageInput: (state, action: PayloadAction<string>) => {
      state.messageInput = action.payload;
    },
    
    setSelectedMessage: (state, action: PayloadAction<string | null>) => {
      state.selectedMessage = action.payload;
    },
    
    setEditingMessage: (state, action: PayloadAction<string | null>) => {
      state.editingMessage = action.payload;
    },
    
    // Loading and error actions
    setLoading: (state, action: PayloadAction<{ roomId: string; loading: boolean }>) => {
      state.loading[action.payload.roomId] = action.payload.loading;
    },
    
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    
    // Pagination actions
    setHasMore: (state, action: PayloadAction<{ roomId: string; hasMore: boolean }>) => {
      state.hasMore[action.payload.roomId] = action.payload.hasMore;
    },
    
    setPage: (state, action: PayloadAction<{ roomId: string; page: number }>) => {
      state.page[action.payload.roomId] = action.payload.page;
    },
    
    // Reset actions
    resetChatState: (state) => {
      Object.assign(state, initialState);
    },
  },
  
  extraReducers: (builder) => {
    // Room operations
    builder
      .addCase(chatThunks.fetchRooms.fulfilled, (state, action) => {
        state.rooms = action.payload;
      })
      .addCase(chatThunks.joinRoom.fulfilled, (state, action) => {
        state.currentRoom = action.payload.roomId;
      })
      .addCase(chatThunks.leaveRoom.fulfilled, (state, action) => {
        if (state.currentRoom === action.payload.roomId) {
          state.currentRoom = null;
        }
      });

    // Message operations
    builder
      .addCase(chatThunks.loadMessages.fulfilled, (state, action) => {
        const { roomId, messages, hasMore, page } = action.payload;
        if (page === 1) {
          state.messages[roomId] = messages;
        } else {
          // Prepend older messages for pagination
          state.messages[roomId] = [...messages, ...(state.messages[roomId] || [])];
        }
        state.hasMore[roomId] = hasMore;
        state.page[roomId] = page;
      })
      .addCase(chatThunks.sendMessage.fulfilled, (state, action) => {
        const message = action.payload;
        if (!state.messages[message.roomId]) {
          state.messages[message.roomId] = [];
        }
        state.messages[message.roomId].push(message);
        state.messageInput = '';
      })
      .addCase(chatThunks.editMessage.fulfilled, (state, action) => {
        const { messageId, content } = action.payload;
        // Find and update the message in all rooms
        Object.keys(state.messages).forEach(roomId => {
          const messageIndex = state.messages[roomId].findIndex(msg => msg.id === messageId);
          if (messageIndex !== -1) {
            state.messages[roomId][messageIndex].content = content;
            state.messages[roomId][messageIndex].isEdited = true;
            state.messages[roomId][messageIndex].editedAt = new Date();
          }
        });
        state.editingMessage = null;
      })
      .addCase(chatThunks.deleteMessage.fulfilled, (state, action) => {
        const messageId = action.payload.messageId;
        // Remove message from all rooms
        Object.keys(state.messages).forEach(roomId => {
          state.messages[roomId] = state.messages[roomId].filter(msg => msg.id !== messageId);
        });
      });
    
    // Loading states
    builder
      .addMatcher(
        (action): action is { type: string; meta: { arg: { roomId?: string } | string } } =>
          action.type.startsWith('chat/') && action.type.endsWith('/pending'),
        (state, action) => {
          const arg = action.meta.arg;
          const roomId = typeof arg === 'object' && arg?.roomId ? arg.roomId :
                         typeof arg === 'string' ? arg : null;
          if (roomId) {
            state.loading[roomId] = true;
          }
        }
      )
      .addMatcher(
        (action): action is { type: string; meta: { arg: { roomId?: string } | string } } =>
          action.type.startsWith('chat/') && (action.type.endsWith('/fulfilled') || action.type.endsWith('/rejected')),
        (state, action) => {
          const arg = action.meta.arg;
          const roomId = typeof arg === 'object' && arg?.roomId ? arg.roomId :
                         typeof arg === 'string' ? arg : null;
          if (roomId) {
            state.loading[roomId] = false;
          }
        }
      );

    // Error handling
    builder
      .addMatcher(
        (action): action is { type: string; error: { message?: string } } =>
          action.type.endsWith('/rejected'),
        (state, action) => {
          state.error = action.error?.message || 'An error occurred';
        }
      );
  },
});

// Export actions
export const chatActions = chatSlice.actions;

// Export reducer
export default chatSlice.reducer;

// Export selectors
export const selectCurrentRoom = (state: { chat: ChatState }) => state.chat.currentRoom;
export const selectRooms = (state: { chat: ChatState }) => state.chat.rooms;
export const selectMessages = (state: { chat: ChatState }) => state.chat.messages;
export const selectMessagesByRoom = (roomId: string) => (state: { chat: ChatState }) => state.chat.messages[roomId] || [];
export const selectOnlineUsers = (state: { chat: ChatState }) => state.chat.onlineUsers;
export const selectTypingUsers = (roomId: string) => (state: { chat: ChatState }) => state.chat.typingUsers[roomId] || [];
export const selectMessageInput = (state: { chat: ChatState }) => state.chat.messageInput;
export const selectEditingMessage = (state: { chat: ChatState }) => state.chat.editingMessage;
export const selectHasMore = (roomId: string) => (state: { chat: ChatState }) => state.chat.hasMore[roomId] || false;
export const selectPage = (roomId: string) => (state: { chat: ChatState }) => state.chat.page[roomId] || 1;