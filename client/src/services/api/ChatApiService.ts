// API Service for chat functionality
// Mobile-first design for integration with Jitsi video call side panel
import axios, { AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Import types from chat slice
import {
  Message,
  ChatRoom,
  User,
  Reaction,
  Attachment
} from '../../redux/slices/chatSlice';

// API base URL - will be configured based on environment
const API_BASE_URL = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_URL || 'http://localhost:3001';

// Backend message format
interface BackendMessage {
  id: string;
  content: { text: string; authorName?: string; mentions?: string[]; attachments?: Array<{ url: string; type: string; name: string }> };
  authorId: string | null;
  authorName: string;
  roomId: string;
  createdAt: string;
}

// Backend room format
interface BackendRoom {
  id: string;
  name: string;
  roomId: string;
  description: string | null;
  createdAt: string;
}

// Transform backend message to frontend Message format
function transformMessage(backendMsg: BackendMessage): Message {
  return {
    id: backendMsg.id,
    content: backendMsg.content.text,
    type: 'text',
    roomId: backendMsg.roomId,
    authorId: backendMsg.authorId || 'anonymous',
    author: {
      id: backendMsg.authorId || 'anonymous',
      displayName: backendMsg.authorName || backendMsg.content.authorName || 'Anonymous',
    },
    isEdited: false,
    reactions: [],
    attachments: (backendMsg.content.attachments || []).map((att, idx) => ({
      id: `${backendMsg.id}-att-${idx}`,
      filename: att.name,
      mimetype: att.type,
      size: 0,
      url: att.url,
      uploadedAt: new Date(backendMsg.createdAt),
    })),
    expiresAt: new Date(new Date(backendMsg.createdAt).getTime() + 8 * 60 * 60 * 1000),
    createdAt: new Date(backendMsg.createdAt),
  };
}

// Transform backend room to frontend ChatRoom format
function transformRoom(backendRoom: BackendRoom): ChatRoom {
  return {
    id: backendRoom.roomId,
    name: backendRoom.name,
    description: backendRoom.description || undefined,
    unreadCount: 0,
    lastActivity: new Date(backendRoom.createdAt),
  };
}

// API client instance
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Chat API Service class
class ChatApiService {
  // REST API methods

  /**
   * Get all available chat rooms
   */
  async getRooms(): Promise<ChatRoom[]> {
    try {
      const response = await api.get<{ success: boolean; data: BackendRoom[] }>('/chat/rooms');
      if (response.data.success && response.data.data) {
        return response.data.data.map(transformRoom);
      }
      return [];
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
      throw error;
    }
  }

  /**
   * Get messages for a specific room (paginated)
   */
  async getMessages(params: { roomId: string; page?: number; limit?: number }): Promise<{
    messages: Message[];
    hasMore: boolean;
    page: number;
  }> {
    try {
      const response = await api.get<{ success: boolean; data: { messages: BackendMessage[]; hasMore: boolean } }>(
        `/chat/${params.roomId}/messages`,
        { params: { limit: params.limit || 50 } }
      );
      if (response.data.success && response.data.data) {
        return {
          messages: response.data.data.messages.map(transformMessage),
          hasMore: response.data.data.hasMore,
          page: params.page || 1,
        };
      }
      return { messages: [], hasMore: false, page: params.page || 1 };
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }
  }

  /**
   * Send a new message to a room
   */
  async sendMessage(params: {
    roomId: string;
    content: string;
    authorName?: string;
    authorId?: string;
  }): Promise<Message> {
    try {
      const response = await api.post<{ success: boolean; data: BackendMessage }>(
        `/chat/${params.roomId}/messages`,
        { text: params.content, authorName: params.authorName || 'Anonymous', authorId: params.authorId }
      );
      if (response.data.success && response.data.data) {
        return transformMessage(response.data.data);
      }
      throw new Error('Failed to send message');
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }
  
  /**
   * Edit an existing message
   */
  async editMessage(params: { messageId: string; content: string }): Promise<Message> {
    try {
      const response = await api.put(`/chat/messages/${params.messageId}`, params);
      return response.data;
    } catch (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }
  
  /**
   * Delete a message
   */
  async deleteMessage(messageId: string): Promise<void> {
    try {
      await api.delete(`/chat/messages/${messageId}`);
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }
  
  /**
   * Add a reaction to a message
   */
  async addReaction(params: { messageId: string; emoji: string }): Promise<Reaction> {
    try {
      const response = await api.post(`/chat/messages/${params.messageId}/reactions`, params);
      return response.data;
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw error;
    }
  }
  
  /**
   * Remove a reaction from a message
   */
  async removeReaction(params: { messageId: string; emoji: string }): Promise<void> {
    try {
      await api.delete(`/chat/messages/${params.messageId}/reactions/${params.emoji}`);
    } catch (error) {
      console.error('Error removing reaction:', error);
      throw error;
    }
  }
  
  /**
   * Upload a file to a chat room
   */
  async uploadFile(file: File, roomId: string): Promise<Attachment> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post(`/chat/${roomId}/files`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  }
  
  /**
   * Search messages in a room
   */
  async searchMessages(params: { roomId: string; query: string; page?: number; limit?: number }): Promise<{
    messages: Message[];
    hasMore: boolean;
    page: number;
  }> {
    try {
      const response = await api.get(`/chat/${params.roomId}/search`, {
        params: {
          query: params.query,
          page: params.page || 1,
          limit: params.limit || 50,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error searching messages:', error);
      throw error;
    }
  }
  
  /**
   * Join a chat room
   */
  async joinRoom(roomId: string): Promise<void> {
    try {
      await api.post(`/chat/rooms/${roomId}/join`);
    } catch (error) {
      console.error('Error joining room:', error);
      throw error;
    }
  }
  
  /**
   * Leave a chat room
   */
  async leaveRoom(roomId: string): Promise<void> {
    try {
      await api.post(`/chat/rooms/${roomId}/leave`);
    } catch (error) {
      console.error('Error leaving room:', error);
      throw error;
    }
  }
  
  /**
   * Get online users in a room
   */
  async getOnlineUsers(roomId: string): Promise<User[]> {
    try {
      const response = await api.get(`/chat/${roomId}/users/online`);
      return response.data;
    } catch (error) {
      console.error('Error fetching online users:', error);
      throw error;
    }
  }
  
  /**
   * Get typing users in a room
   */
  async getTypingUsers(roomId: string): Promise<string[]> {
    try {
      const response = await api.get(`/chat/${roomId}/users/typing`);
      return response.data;
    } catch (error) {
      console.error('Error fetching typing users:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const chatApiService = new ChatApiService();

// Export for direct use if needed
export default ChatApiService;