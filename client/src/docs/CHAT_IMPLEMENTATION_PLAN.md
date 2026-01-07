# Stargety Oasis Chat Implementation Plan

## Executive Summary

This plan outlines the implementation of a sophisticated chat system for Stargety Oasis that connects the existing mock frontend components to the PostgreSQL-backed backend, and adds advanced chat features including message editing/deletion, file attachments, search functionality, message reactions, and threaded conversations.

## Current State Analysis

### ✅ Backend (Production-Ready)
- **PostgreSQL persistence** with Prisma ORM
- **Socket.IO real-time communication**
- **TTL-based message cleanup** (8-hour expiration)
- **REST API endpoints** for all operations
- **Room management** with automatic cleanup
- **Rich content support** (JSONB messages)

### ❌ Frontend (Mock/Simulation Only)
- **No Socket.IO client integration**
- **No Redux state management**
- **No API service layer**
- **Mock data only** (no persistence)
- **No real-time updates**

## Implementation Architecture

### 1. Frontend-Backend Integration Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND CHAT                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  ChatModule  │  │PersistentChat│  │  ChatHooks   │         │
│  │    (React)   │  │   Panel      │  │   (Redux)    │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                  │                 │
│         └─────────────────┼──────────────────┘                 │
│                           ▼                                      │
│                  ┌──────────────┐                              │
│                  │ Redux Store   │                              │
│                  │ (chatSlice)  │                              │
│                  └──────┬───────┘                              │
│                         │                                       │
│         ┌───────────────┴───────────────┐                       │
│         ▼                               ▼                       │
│  ┌──────────────┐              ┌──────────────┐                 │
│  │ChatApiService│              │SocketClient │                 │
│  │   (REST)     │              │   (WS)      │                 │
│  └──────────────┘              └──────────────┘                 │
└─────────────────────────────────────────────────────────────────┘
                         │ HTTP/WS
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND (Express)                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ChatDbController│ │  Socket.IO  │ │   FileUpload │         │
│  │  (PostgreSQL) │ │   Server    │ │   Handler    │         │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘         │
│         │                 │                                   │
│         └─────────────────┼───────────────────────────────────┘
│                           ▼                                   │
│                  ┌──────────────┐                              │
│                  │   PostgreSQL │                              │
│                  │  + Prisma    │                              │
│                  └──────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Database Schema Extensions

#### Enhanced Message Structure
```typescript
interface Message {
  id: string;
  content: MessageContent; // JSONB
  type: 'text' | 'file' | 'reaction' | 'thread';
  roomId: string;
  authorId: string;
  parentId?: string; // For threaded conversations
  threadId?: string; // Thread root ID
  isEdited: boolean;
  editedAt?: Date;
  reactions: Reaction[];
  attachments: Attachment[];
  expiresAt: Date;
  createdAt: Date;
}

interface MessageContent {
  text?: string;
  metadata?: {
    mentions?: string[];
    hashtags?: string[];
    replyTo?: string;
  };
}

interface Reaction {
  emoji: string;
  userId: string;
  createdAt: Date;
}

interface Attachment {
  id: string;
  filename: string;
  mimetype: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  uploadedAt: Date;
}
```

#### New Models
```prisma
model Message {
  id              String   @id @default(cuid())
  content         Json
  type            MessageEnum
  roomId          String
  room            ChatRoom @relation(fields: [roomId], references: [id], onDelete: Cascade)
  authorId        String
  author          User     @relation(fields: [authorId], references: [id])
  parentId        String?  @relation("MessageReplies", fields: [parentId], references: [id])
  parent          Message? @relation("MessageReplies", fields: [parentId], references: [id])
  threadId        String?
  thread          Message? @relation("MessageThread", fields: [threadId], references: [id])
  isEdited        Boolean  @default(false)
  editedAt        DateTime?
  reactions       Reaction[]
  attachments     Attachment[]
  expiresAt       DateTime
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Reaction {
  id        String   @id @default(cuid())
  emoji     String
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  messageId String
  message   Message  @relation(fields: [messageId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([emoji, userId, messageId])
}

model Attachment {
  id           String   @id @default(cuid())
  filename     String
  mimetype     String
  size         Int
  url          String
  thumbnailUrl String?
  messageId    String
  message      Message  @relation(fields: [messageId], references: [id], onDelete: Cascade)
  uploadedAt   DateTime @default(now())
}

enum MessageEnum {
  TEXT
  FILE
  REACTION
  THREAD
}
```

### 3. Redux State Management Design

#### Chat Slice Structure
```typescript
// client/src/redux/slices/chatSlice.ts
interface ChatState {
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

// Async thunks
export const chatThunks = {
  // Room operations
  joinRoom: createAsyncThunk('chat/joinRoom', async (roomId: string) => { ... }),
  leaveRoom: createAsyncThunk('chat/leaveRoom', async (roomId: string) => { ... }),
  
  // Message operations
  loadMessages: createAsyncThunk('chat/loadMessages', async (params: { roomId: string; page?: number }) => { ... }),
  sendMessage: createAsyncThunk('chat/sendMessage', async (message: SendMessageParams) => { ... }),
  editMessage: createAsyncThunk('chat/editMessage', async (params: { messageId: string; content: string }) => { ... }),
  deleteMessage: createAsyncThunk('chat/deleteMessage', async (messageId: string) => { ... }),
  
  // Reactions
  addReaction: createAsyncThunk('chat/addReaction', async (params: { messageId: string; emoji: string }) => { ... }),
  removeReaction: createAsyncThunk('chat/removeReaction', async (params: { messageId: string; emoji: string }) => { ... }),
  
  // Files
  uploadFile: createAsyncThunk('chat/uploadFile', async (file: File) => { ... }),
  
  // Search
  searchMessages: createAsyncThunk('chat/searchMessages', async (params: { roomId: string; query: string }) => { ... }),
};
```

### 4. API Service Layer

```typescript
// client/src/services/api/ChatApiService.ts
class ChatApiService {
  // REST API methods
  async getRooms(): Promise<ChatRoom[]> {
    return api.get('/api/chat/rooms');
  }
  
  async getMessages(params: { roomId: string; page?: number }): Promise<Message[]> {
    return api.get(`/api/chat/${params.roomId}/messages`, { params });
  }
  
  async sendMessage(params: { roomId: string; content: string; type?: MessageEnum }): Promise<Message> {
    return api.post(`/api/chat/${params.roomId}/messages`, params);
  }
  
  async editMessage(params: { messageId: string; content: string }): Promise<Message> {
    return api.put(`/api/chat/messages/${params.messageId}`, params);
  }
  
  async deleteMessage(messageId: string): Promise<void> {
    return api.delete(`/api/chat/messages/${messageId}`);
  }
  
  async uploadFile(file: File, roomId: string): Promise<Attachment> {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/api/chat/${roomId}/files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  }
  
  async searchMessages(params: { roomId: string; query: string }): Promise<Message[]> {
    return api.get(`/api/chat/${params.roomId}/search`, { params });
  }
}
```

### 5. Socket.IO Client Integration

```typescript
// client/src/services/socket/ChatSocketService.ts
class ChatSocketService {
  private socket: Socket;
  private eventHandlers: Map<string, Function> = new Map();
  
  constructor() {
    this.socket = io(`${process.env.REACT_APP_WS_URL}/chat`, {
      auth: { token: getAuthToken() }
    });
    
    this.setupEventHandlers();
  }
  
  private setupEventHandlers() {
    // Message events
    this.socket.on('message:new', this.handleNewMessage.bind(this));
    this.socket.on('message:edited', this.handleMessageEdited.bind(this));
    this.socket.on('message:deleted', this.handleMessageDeleted.bind(this));
    
    // Reaction events
    this.socket.on('reaction:added', this.handleReactionAdded.bind(this));
    this.socket.on('reaction:removed', this.handleReactionRemoved.bind(this));
    
    // Room events
    this.socket.on('room:joined', this.handleRoomJoined.bind(this));
    this.socket.on('room:left', this.handleRoomLeft.bind(this));
    this.socket.on('user:joined', this.handleUserJoined.bind(this));
    this.socket.on('user:left', this.handleUserLeft.bind(this));
    
    // Typing events
    this.socket.on('typing:start', this.handleTypingStart.bind(this));
    this.socket.on('typing:stop', this.handleTypingStop.bind(this));
  }
  
  // Public methods
  joinRoom(roomId: string) {
    this.socket.emit('room:join', { roomId });
  }
  
  leaveRoom(roomId: string) {
    this.socket.emit('room:leave', { roomId });
  }
  
  sendMessage(roomId: string, content: string, type: MessageEnum = 'TEXT') {
    this.socket.emit('message:send', { roomId, content, type });
  }
  
  sendTyping(roomId: string, isTyping: boolean) {
    this.socket.emit('typing', { roomId, isTyping });
  }
  
  // Event handlers
  private handleNewMessage(message: Message) {
    dispatch(chatThunks.receiveMessage(message));
  }
  
  private handleReactionAdded(data: { messageId: string; emoji: string; userId: string }) {
    dispatch(chatThunks.addReaction.fulfilled(data));
  }
  
  // ... other handlers
}
```

## Feature Specifications

### 1. Core Messaging Features

#### ✅ Basic Messaging (Phase 1)
- **Send/Receive Messages**: Real-time text messaging
- **Room Management**: Join/leave chat rooms
- **User Presence**: See who's online in each room
- **Message History**: Load historical messages with pagination
- **Typing Indicators**: Show when users are typing

#### ✅ Message Management (Phase 2)
- **Message Editing**: Edit messages with edit timestamp
- **Message Deletion**: Delete messages (soft delete with tombstone)
- **Message Reactions**: Add/remove emoji reactions
- **Message Status**: Delivered/read indicators

#### ✅ Advanced Features (Phase 3)
- **Threaded Conversations**: Reply to specific messages
- **File Attachments**: Upload and share files
- **Message Search**: Search message content
- **Message Export**: Export chat history

### 2. File Attachments

#### Supported File Types
- **Images**: JPG, PNG, GIF, WebP (with thumbnails)
- **Documents**: PDF, DOC, DOCX, TXT
- **Media**: MP4, MP3, WAV
- **Other**: ZIP, RAR (with size limits)

#### File Upload Flow
```typescript
1. User selects file
2. Client validates file type/size
3. Show upload progress
4. Upload to server via multipart/form-data
5. Server stores file and returns attachment metadata
6. Client adds attachment to message
7. Send message with attachment reference
```

### 3. Message Reactions

#### Reaction System
- **Emoji Support**: Standard emoji reactions
- **Multiple Reactions**: Users can add multiple different emojis
- **Reaction Count**: Display number of users per reaction
- **Own Reactions**: Highlight user's own reactions
- **Reaction Removal**: Remove own reactions

#### Database Design
```prisma
model Reaction {
  id        String   @id @default(cuid())
  emoji     String
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  messageId String
  message   Message  @relation(fields: [messageId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@unique([emoji, userId, messageId]) // Prevent duplicate reactions
}
```

### 4. Threaded Conversations

#### Thread Structure
- **Root Message**: Original message that starts a thread
- **Replies**: Messages that reply to the root or other replies
- **Thread View**: Show threaded messages in nested format
- **Thread Navigation**: Collapse/expand threads

#### Implementation
```typescript
interface Message {
  id: string;
  content: MessageContent;
  roomId: string;
  authorId: string;
  parentId?: string; // Direct reply parent
  threadId?: string; // Thread root ID
  isThread: boolean; // Is this a thread root
  replyCount: number;
  lastReplyAt?: Date;
}
```

### 5. Search Functionality

#### Search Features
- **Full-text Search**: Search message content
- **User Search**: Search messages by specific users
- **Date Range**: Filter messages by date range
- **File Search**: Search for specific file types
- **Search Results**: Highlight search terms in results

#### Search API
```typescript
// GET /api/chat/:roomId/search
{
  query: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  fileType?: string;
  page?: number;
  limit?: number;
}
```

## Implementation Phases

### ### Phase 0: UX and Validation (COMPLETED and APPROVED)
**Priority: CRITICAL**
1. **Define Core Requirements**   
   - Create UI components
   - Establish mock data models if needed by ui
   - Build only the UI entirely, as if you are implementing all phases, but with mock data and any basic data functionality, no real data
   - you will not need to connect to backend at all at this phase, focus only in ui
   - Create UI components based on Antd minimize CSS or custom divs with style.
   

### Phase 1: Foundation (Week 1-2)
**Priority: CRITICAL**

#### Frontend Integration
1. **Redux Chat Slice**
   - Create `chatSlice.ts` with basic state structure
   - Implement async thunks for room and message operations
   - Add typed hooks for chat state management

2. **API Service Layer**
   - Create `ChatApiService.ts` with REST API methods
   - Implement error handling and loading states
   - Add request/response interceptors

3. **Socket.IO Client**
   - Create `ChatSocketService.ts` for WebSocket connection
   - Implement event handlers for real-time updates
   - Add authentication and reconnection logic

4. **Component Updates**
   - Update `ChatModule.tsx` to use real backend data
   - Update `PersistentChatPanel.tsx` with Redux integration
   - Replace mock data with actual API calls

#### Backend Enhancements
1. **Legacy Code Cleanup**
   - Remove in-memory `chatController.ts`
   - Clean up duplicate event handlers in `server/src/index.ts`
   - Standardize on `chatDbController.ts`

2. **API Endpoint Updates**
   - Update existing endpoints for new message structure
   - Add authentication middleware
   - Implement proper error handling

### Phase 2: Core Features (Week 3-4)
**Priority: HIGH**

#### Message Management
1. **Message Editing**
   - Add edit endpoint: `PUT /api/chat/messages/:id`
   - Implement edit detection in UI
   - Show edit timestamps

2. **Message Deletion**
   - Add delete endpoint: `DELETE /api/chat/messages/:id`
   - Implement soft delete with tombstone
   - Add undo functionality

3. **Message Reactions**
   - Add reaction endpoints
   - Implement reaction UI components
   - Add reaction count display

#### Enhanced UI
1. **Message Components**
   - Create `MessageItem.tsx` with all features
   - Add message editing interface
   - Implement reaction buttons

2. **Room Management**
   - Create `RoomList.tsx` component
   - Add room creation interface
   - Implement room switching

### Phase 3: Advanced Features (Week 5-6)
**Priority: MEDIUM**

#### File Attachments
1. **File Upload System**
   - Add file upload endpoints
   - Implement file validation
   - Create file storage system

2. **Attachment UI**
   - Create `AttachmentPreview.tsx` component
   - Add file upload progress
   - Implement image thumbnails

#### Threaded Conversations
1. **Thread System**
   - Add thread endpoints
   - Implement thread data structure
   - Create thread UI components

2. **Thread Navigation**
   - Add thread collapse/expand
   - Implement thread reply interface
   - Create thread view components

#### Search Functionality
1. **Search Implementation**
   - Add search endpoints
   - Implement full-text search
   - Create search interface

2. **Search Results**
   - Create `SearchResults.tsx` component
   - Add search result highlighting
   - Implement search filters

### Phase 4: Integration & Polish (Week 7-8)
**Priority: LOW**

#### System Integration
1. **Jitsi Integration**
   - Map chat rooms to Jitsi video rooms
   - Auto-join video calls when entering chat rooms
   - Sync chat presence with video call status

2. **World Module Integration**
   - Show chat presence in world module
   - Add chat notifications for world events
   - Implement world-to-chat context switching

3. **Map Editor Integration**
   - Add chat rooms for map areas
   - Implement area-specific chat contexts
   - Create chat room mapping from map areas

#### Performance & Polish
1. **Performance Optimizations**
   - Implement message virtualization
   - Add optimistic updates
   - Optimize database queries

2. **UI/UX Improvements**
   - Add animations and transitions
   - Implement dark mode support
   - Add accessibility features

3. **Testing & Quality**
   - Add comprehensive test coverage
   - Implement end-to-end tests
   - Add performance monitoring

## File Structure

### Frontend Files
```
client/src/
├── redux/
│   ├── slices/
│   │   └── chatSlice.ts              # Chat Redux slice
│   └── hooks.ts                      # Typed hooks (update)
├── services/
│   ├── api/
│   │   └── ChatApiService.ts         # REST API client
│   └── socket/
│       └── ChatSocketService.ts      # WebSocket client
├── modules/chat/
│   ├── ChatModule.tsx                 # Updated with real backend
│   ├── hooks/
│   │   ├── useChatMessages.ts        # Message management hooks
│   │   ├── useChatRoom.ts            # Room management hooks
│   │   ├── useChatSocket.ts         # Socket event hooks
│   │   └── useChatTyping.ts          # Typing indicator hooks
│   └── components/
│       ├── MessageItem.tsx           # Individual message component
│       ├── MessageEditor.tsx         # Message editing interface
│       ├── ReactionButton.tsx       # Reaction component
│       ├── ThreadView.tsx            # Thread conversation view
│       ├── FileUpload.tsx            # File upload component
│       └── SearchBox.tsx             # Search interface
├── components/
│   ├── PersistentChatPanel.tsx       # Updated with Redux integration
│   └── ChatRoomList.tsx              # Room list component
└── types/
    └── chat.ts                       # Chat type definitions
```

### Backend Files
```
server/src/
├── chat/
│   ├── chatDbController.ts          # Enhanced with new features
│   ├── messageValidation.ts          # Message validation middleware
│   ├── fileUpload.ts                 # File upload handling
│   └── search.ts                    # Search functionality
├── prisma/
│   └── schema.prisma                 # Updated with new models
├── utils/
│   └── fileStorage.ts               # File storage utilities
└── index.ts                         # Updated Socket.IO events
```

## API Endpoints

### REST API Endpoints

#### Room Management
```typescript
GET    /api/chat/rooms                    # List all rooms
POST   /api/chat/rooms                    # Create new room
GET    /api/chat/rooms/:id                # Get room details
PUT    /api/chat/rooms/:id                # Update room
DELETE /api/chat/rooms/:id                # Delete room
```

#### Message Management
```typescript
GET    /api/chat/:roomId/messages         # Get messages (paginated)
POST   /api/chat/:roomId/messages         # Send message
PUT    /api/chat/messages/:id             # Edit message
DELETE /api/chat/messages/:id             # Delete message
POST   /api/chat/:roomId/messages/search # Search messages
```

#### Reactions
```typescript
POST   /api/chat/messages/:id/reactions    # Add reaction
DELETE /api/chat/messages/:id/reactions/:emoji # Remove reaction
```

#### File Management
```typescript
POST   /api/chat/:roomId/files            # Upload file
GET    /api/chat/files/:id               # Get file
DELETE /api/chat/files/:id               # Delete file
```

### Socket.IO Events

#### Client → Server
```typescript
room:join              { roomId: string }
room:leave             { roomId: string }
message:send           { roomId: string, content: string, type: MessageEnum }
message:edit           { messageId: string, content: string }
message:delete         { messageId: string }
reaction:add           { messageId: string, emoji: string }
reaction:remove        { messageId: string, emoji: string }
typing                 { roomId: string, isTyping: boolean }
```

#### Server → Client
```typescript
room:joined            { roomId: string, user: User }
room:left             { roomId: string, userId: string }
message:new           { message: Message }
message:edited        { messageId: string, content: string }
message:deleted       { messageId: string }
reaction:added        { messageId: string, emoji: string, userId: string }
reaction:removed     { messageId: string, emoji: string, userId: string }
user:joined           { roomId: string, user: User }
user:left             { roomId: string, userId: string }
typing:start          { roomId: string, userId: string }
typing:stop           { roomId: string, userId: string }
```

## Integration Points

### 1. Jitsi Integration
- **Room Mapping**: Chat rooms map to Jitsi meeting rooms
- **Auto-Join**: When user joins a chat room, auto-join corresponding Jitsi room
- **Presence Sync**: Chat presence synced with video call status
- **Unified Interface**: Combined chat and video call interface

### 2. World Module Integration
- **Contextual Chat**: Chat rooms based on world location/area
- **Presence Indicators**: Show which users are in which areas
- **Area-to-Chat Mapping**: Interactive map areas map to chat rooms
- **Cross-Module Communication**: Events between world and chat systems

### 3. Map Editor Integration
- **Area-Specific Chat**: Each interactive area has its own chat room
- **Design-Time Chat**: Chat for map design collaboration
- **Real-Time Updates**: Map changes reflected in chat context
- **Collaborative Editing**: Multiple users can edit maps with chat coordination

## Success Metrics

### Technical Metrics
- **Response Time**: < 200ms for API calls
- **WebSocket Latency**: < 100ms for real-time events
- **Database Performance**: < 50ms for query operations
- **File Upload**: < 5s for files < 10MB
- **Search Response**: < 1s for full-text search

### User Experience Metrics
- **Message Delivery**: > 99.9% real-time delivery rate
- **Typing Indicators**: < 500ms typing detection
- **File Upload Success**: > 95% success rate
- **Search Accuracy**: > 90% relevant results
- **System Uptime**: > 99.5% availability

### Usage Metrics
- **Daily Active Users**: Track chat engagement
- **Messages Per Day**: Monitor system load
- **File Upload Volume**: Track storage usage
- **Search Queries**: Monitor search usage patterns
- **Thread Usage**: Track threaded conversation adoption

## Risk Assessment

### Technical Risks
1. **WebSocket Connection Issues**
   - **Mitigation**: Implement reconnection logic and offline support
   - **Fallback**: REST API polling for critical operations

2. **Database Performance**
   - **Mitigation**: Proper indexing and query optimization
   - **Monitoring**: Add performance monitoring and alerts

3. **File Storage Scalability**
   - **Mitigation**: Implement file size limits and cleanup policies
   - **Future**: Consider cloud storage for production

### User Experience Risks
1. **Complex UI**
   - **Mitigation**: Progressive disclosure and intuitive design
   - **Testing**: User testing with target audience

2. **Learning Curve**
   - **Mitigation**: Onboarding tutorials and tooltips
   - **Documentation**: Comprehensive user guides

### Security Risks
1. **Message Content**
   - **Mitigation**: Content moderation and profanity filtering
   - **Privacy**: End-to-end encryption consideration

2. **File Upload Security**
   - **Mitigation**: File type validation and virus scanning
   - **Access**: Proper file access controls

## Conclusion

This implementation plan provides a comprehensive approach to transforming the Stargety Oasis chat system from a mock implementation to a full-featured, production-ready chat platform. The phased approach ensures that core functionality is delivered first, followed by advanced features, with proper integration with other system components.

The plan balances technical requirements with user experience considerations, ensuring that the final product is both powerful and intuitive. By following this plan, the Stargety Oasis team will deliver a sophisticated chat system that enhances the overall virtual collaboration experience.