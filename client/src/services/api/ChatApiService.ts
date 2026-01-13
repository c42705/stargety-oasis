import { Message, Reaction, ChatRoom, Attachment, MessageEnum } from '../../redux/types/chat';
import { apiFetch, apiUpload } from './apiClient';

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

export interface LoadMessagesParams {
  roomId: string;
  page?: number;
  limit?: number;
}

class ChatApiService {
  // Room operations
  async getRooms(): Promise<ChatRoom[]> {
    const response = await apiFetch<ChatRoom[]>('/api/chat/rooms');
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch rooms');
    }
    return response.data;
  }

  async getRoom(roomId: string): Promise<ChatRoom> {
    const response = await apiFetch<ChatRoom>(`/api/chat/rooms/${roomId}`);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch room');
    }
    return response.data;
  }

  async createRoom(roomData: Partial<ChatRoom>): Promise<ChatRoom> {
    const response = await apiFetch<ChatRoom>('/api/chat/rooms', {
      method: 'POST',
      body: JSON.stringify(roomData),
    });
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to create room');
    }
    return response.data;
  }

  async updateRoom(roomId: string, roomData: Partial<ChatRoom>): Promise<ChatRoom> {
    const response = await apiFetch<ChatRoom>(`/api/chat/rooms/${roomId}`, {
      method: 'PUT',
      body: JSON.stringify(roomData),
    });
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to update room');
    }
    return response.data;
  }

  async deleteRoom(roomId: string): Promise<void> {
    const response = await apiFetch<void>(`/api/chat/rooms/${roomId}`, {
      method: 'DELETE',
    });
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete room');
    }
  }

  // Message operations
  async getMessages(params: LoadMessagesParams): Promise<Message[]> {
    const { roomId, page = 1, limit = 50 } = params;
    const queryParams = new URLSearchParams({ page: page.toString(), limit: limit.toString() });
    const response = await apiFetch<Message[]>(`/api/chat/${roomId}/messages?${queryParams}`);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch messages');
    }
    return response.data;
  }

  async sendMessage(params: SendMessageParams): Promise<Message> {
    const { roomId, content, type = MessageEnum.TEXT, parentId, threadId } = params;
    const response = await apiFetch<Message>(`/api/chat/${roomId}/messages`, {
      method: 'POST',
      body: JSON.stringify({
        content,
        type,
        parentId,
        threadId,
      }),
    });
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to send message');
    }
    return response.data;
  }

  async editMessage(params: EditMessageParams): Promise<Message> {
    const { messageId, content } = params;
    const response = await apiFetch<Message>(`/api/chat/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to edit message');
    }
    return response.data;
  }

  async deleteMessage(messageId: string): Promise<void> {
    const response = await apiFetch<void>(`/api/chat/messages/${messageId}`, {
      method: 'DELETE',
    });
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete message');
    }
  }

  async getMessage(messageId: string): Promise<Message> {
    const response = await apiFetch<Message>(`/api/chat/messages/${messageId}`);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch message');
    }
    return response.data;
  }

  // Reactions
  async addReaction(params: ReactionParams): Promise<Message> {
    const { messageId, emoji } = params;
    const response = await apiFetch<Message>(`/api/chat/messages/${messageId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji }),
    });
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to add reaction');
    }
    return response.data;
  }

  async removeReaction(params: ReactionParams): Promise<void> {
    const { messageId, emoji } = params;
    const response = await apiFetch<void>(`/api/chat/messages/${messageId}/reactions/${emoji}`, {
      method: 'DELETE',
    });
    if (!response.success) {
      throw new Error(response.error || 'Failed to remove reaction');
    }
  }

  // File attachments
  async uploadFile(file: File, roomId: string): Promise<Attachment> {
    const response = await apiUpload<Attachment>(`/api/chat/${roomId}/files`, file);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to upload file');
    }
    return response.data;
  }

  async getAttachment(attachmentId: string): Promise<Attachment> {
    const response = await apiFetch<Attachment>(`/api/chat/attachments/${attachmentId}`);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch attachment');
    }
    return response.data;
  }

  async deleteAttachment(attachmentId: string): Promise<void> {
    const response = await apiFetch<void>(`/api/chat/attachments/${attachmentId}`, {
      method: 'DELETE',
    });
    if (!response.success) {
      throw new Error(response.error || 'Failed to delete attachment');
    }
  }

  // Search functionality
  async searchMessages(params: SearchMessagesParams): Promise<Message[]> {
    const { 
      roomId, 
      query, 
      userId, 
      startDate, 
      endDate, 
      fileType, 
      page = 1, 
      limit = 50 
    } = params;
    
    const searchParams: Record<string, string> = { 
      query, 
      page: page.toString(), 
      limit: limit.toString() 
    };
    
    if (userId) searchParams.userId = userId;
    if (startDate) searchParams.startDate = startDate.toISOString();
    if (endDate) searchParams.endDate = endDate.toISOString();
    if (fileType) searchParams.fileType = fileType;

    const queryParams = new URLSearchParams(searchParams);
    const response = await apiFetch<Message[]>(`/api/chat/${roomId}/search?${queryParams}`);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to search messages');
    }
    return response.data;
  }

  // Typing indicators
  async sendTypingIndicator(roomId: string, isTyping: boolean): Promise<void> {
    const response = await apiFetch<void>(`/api/chat/${roomId}/typing`, {
      method: 'POST',
      body: JSON.stringify({ isTyping }),
    });
    if (!response.success) {
      throw new Error(response.error || 'Failed to send typing indicator');
    }
  }

  // Message history/export
  async exportMessages(roomId: string, format: 'json' | 'txt' = 'json'): Promise<Blob> {
    const url = `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/chat/${roomId}/export?format=${format}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to export messages: ${response.status}`);
    }
    return response.blob();
  }

  // Message statistics
  async getMessageStats(roomId: string): Promise<{
    totalMessages: number;
    totalUsers: number;
    messagesByDay: Record<string, number>;
    topUsers: Array<{ userId: string; messageCount: number }>;
  }> {
    const response = await apiFetch<{
      totalMessages: number;
      totalUsers: number;
      messagesByDay: Record<string, number>;
      topUsers: Array<{ userId: string; messageCount: number }>;
    }>(`/api/chat/${roomId}/stats`);
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch message stats');
    }
    return response.data;
  }

  // Real-time connection status
  async getConnectionStatus(): Promise<{
    connected: boolean;
    lastPing: Date | null;
    reconnectAttempts: number;
  }> {
    const response = await apiFetch<{
      connected: boolean;
      lastPing: Date | null;
      reconnectAttempts: number;
    }>('/api/chat/status');
    if (!response.success || !response.data) {
      throw new Error(response.error || 'Failed to fetch connection status');
    }
    return response.data;
  }
}

// Export singleton instance
export const chatApiService = new ChatApiService();

// Export class for testing or custom instances
export { ChatApiService };
