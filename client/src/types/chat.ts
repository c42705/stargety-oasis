export interface User {
  id: string;
  username: string;
  displayName?: string;
  avatar?: string;
  online?: boolean;
  lastSeen?: Date;
}

export interface MessageContent {
  text?: string;
  metadata?: {
    mentions?: string[];
    hashtags?: string[];
    replyTo?: string;
  };
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

export interface Message {
  id: string;
  content: MessageContent;
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
  updatedAt: Date;
}

export interface ChatRoom {
  id: string;
  name: string;
  description?: string;
  unreadCount: number;
  lastMessage?: string;
  lastActivity?: Date;
  isPrivate?: boolean;
  memberCount?: number;
  tags?: string[];
  createdBy?: string;
  members?: User[];
  createdAt?: Date;
  updatedAt?: Date;
}

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

export interface SendMessageParams {
  roomId: string;
  content: string;
  type?: 'text' | 'file' | 'reaction' | 'thread';
  parentId?: string;
  threadId?: string;
  attachments?: Attachment[];
}

export interface EditMessageParams {
  messageId: string;
  content: string;
}

export interface ReactionParams {
  messageId: string;
  emoji: string;
}

export interface SearchMessagesParams {
  roomId: string;
  query: string;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  fileType?: string;
  page?: number;
  limit?: number;
}