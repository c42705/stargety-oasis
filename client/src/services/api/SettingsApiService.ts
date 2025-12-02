/**
 * Settings API Service
 * 
 * Provides API methods for user settings persistence.
 * Handles theme preferences, Jitsi configuration, and editor preferences.
 */

import { apiFetch, ApiResponse } from './apiClient';

// User settings structure matching server schema
export interface UserSettings {
  userId: string;
  theme: 'light' | 'dark' | 'system';
  jitsiServerUrl?: string;
  editorPrefs?: EditorPreferences;
  notificationPrefs?: NotificationPreferences;
  createdAt?: string;
  updatedAt?: string;
}

export interface EditorPreferences {
  gridSize?: number;
  gridVisible?: boolean;
  snapToGrid?: boolean;
  showRulers?: boolean;
  zoomLevel?: number;
  panPosition?: { x: number; y: number };
  selectedTool?: string;
}

export interface NotificationPreferences {
  sound?: boolean;
  desktop?: boolean;
  chatMessages?: boolean;
  playerJoin?: boolean;
}

// Player position data (ephemeral)
export interface PlayerPosition {
  sessionId: string;
  x: number;
  y: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  roomId?: string;
  updatedAt?: string;
}

export interface PlayerInRoom {
  sessionId: string;
  x: number;
  y: number;
  direction: string;
  updatedAt: string;
}

/**
 * Settings API Service - handles user preferences and session data
 */
export const SettingsApiService = {
  /**
   * Get user settings (creates default if not exists)
   */
  async getSettings(userId: string): Promise<ApiResponse<UserSettings>> {
    return apiFetch<UserSettings>(`/api/settings/${userId}`);
  },

  /**
   * Update user settings (partial update)
   */
  async updateSettings(
    userId: string,
    settings: Partial<Omit<UserSettings, 'userId' | 'createdAt' | 'updatedAt'>>
  ): Promise<ApiResponse<UserSettings>> {
    return apiFetch<UserSettings>(`/api/settings/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  },

  /**
   * Get player position by session ID
   */
  async getPosition(sessionId: string): Promise<ApiResponse<PlayerPosition>> {
    return apiFetch<PlayerPosition>(`/api/position/${sessionId}`);
  },

  /**
   * Update player position
   */
  async updatePosition(
    sessionId: string,
    position: Omit<PlayerPosition, 'sessionId' | 'updatedAt'>
  ): Promise<ApiResponse<PlayerPosition>> {
    return apiFetch<PlayerPosition>(`/api/position/${sessionId}`, {
      method: 'PUT',
      body: JSON.stringify(position),
    });
  },

  /**
   * Delete player position (on disconnect)
   */
  async deletePosition(sessionId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiFetch<{ deleted: boolean }>(`/api/position/${sessionId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get all players in a room
   */
  async getPlayersInRoom(roomId: string): Promise<ApiResponse<PlayerInRoom[]>> {
    return apiFetch<PlayerInRoom[]>(`/api/rooms/${roomId}/players`);
  },

  /**
   * Get default settings (client-side utility)
   */
  getDefaultSettings(userId: string): UserSettings {
    return {
      userId,
      theme: 'dark',
      jitsiServerUrl: 'meet.jit.si',
      editorPrefs: {
        gridSize: 32,
        gridVisible: true,
        snapToGrid: true,
        showRulers: false,
        zoomLevel: 1,
      },
      notificationPrefs: {
        sound: true,
        desktop: false,
        chatMessages: true,
        playerJoin: true,
      },
    };
  },
};

// Default export for convenience
export default SettingsApiService;

