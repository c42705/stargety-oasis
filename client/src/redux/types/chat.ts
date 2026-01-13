/**
 * Chat Type Definitions
 * Shared types for chat system across frontend
 */

export enum MessageEnum {
  TEXT = 'TEXT',
  FILE = 'FILE',
  REACTION = 'REACTION',
  THREAD = 'THREAD',
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
  emoji: string;
  userId: string;
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
  type: MessageEnum;
  roomId: string;
  authorId: string;
  parentId?: string;
  threadId?: string;
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
  roomId: string;
  name: string;
  description?: string;
  createdAt: Date;
  expiresAt: Date;
  _count?: {
    messages: number;
  };
  metadata?: Record<string, unknown>;
}

export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
}

export interface SendMessageParams {
  roomId: string;
  content: string;
  type?: MessageEnum;
  parentId?: string;
  threadId?: string;
}

export interface EditMessageParams {
  messageId: string;
  content: string;
}

export interface AddReactionParams {
  messageId: string;
  emoji: string;
}

export interface RemoveReactionParams {
  messageId: string;
  emoji: string;
}

export interface UploadFileParams {
  file: File;
  roomId: string;
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

export interface TypingIndicator {
  roomId: string;
  userId: string;
  isTyping: boolean;
}

export interface OnlineUser {
  userId: string;
  username: string;
  roomId: string;
  joinedAt: Date;
}
