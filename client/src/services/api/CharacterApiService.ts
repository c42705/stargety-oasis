/**
 * Character API Service
 * 
 * Provides API methods for character slot management and avatar persistence.
 * Supports 5 character slots per user with active character tracking.
 */

import { apiFetch, apiUpload, ApiResponse } from './apiClient';

// Character slot data matching server schema
export interface CharacterSlot {
  slotNumber: number;
  name: string | null;
  isEmpty: boolean;
  thumbnailUrl?: string;
  textureUrl?: string;
  spriteSheet?: SpriteSheetConfig;
  lastModified?: string;
}

export interface SpriteSheetConfig {
  layers: SpriteLayer[];
  animations?: AnimationConfig;
  frameWidth?: number;
  frameHeight?: number;
}

export interface SpriteLayer {
  id: string;
  src: string;
  zIndex?: number;
  visible?: boolean;
  opacity?: number;
}

export interface AnimationConfig {
  idle?: AnimationDef;
  walk?: AnimationDef;
  [key: string]: AnimationDef | undefined;
}

export interface AnimationDef {
  frames: number[];
  frameRate?: number;
  repeat?: number;
}

export interface CharacterData {
  id?: string;
  slotNumber: number;
  name: string;
  spriteSheet: SpriteSheetConfig;
  thumbnailPath?: string;
  texturePath?: string;
}

export interface ActiveCharacterResponse {
  activeSlot: number;
  character: CharacterSlot | null;
}

export interface UploadedFile {
  id: string;
  userId: string;
  filename: string;
  originalname: string;
  path: string;
  url: string;
  size: number;
  mimetype: string;
}

/**
 * Character API Service - handles all character/avatar-related API calls
 */
export const CharacterApiService = {
  /**
   * Get all character slots for a user (always returns 5 slots)
   */
  async getSlots(userId: string): Promise<ApiResponse<CharacterSlot[]>> {
    return apiFetch<CharacterSlot[]>(`/api/characters/${userId}/slots`);
  },

  /**
   * Get a specific character slot
   */
  async getSlot(userId: string, slotNumber: number): Promise<ApiResponse<CharacterSlot>> {
    return apiFetch<CharacterSlot>(`/api/characters/${userId}/slots/${slotNumber}`);
  },

  /**
   * Save character to a slot
   */
  async saveSlot(
    userId: string,
    slotNumber: number,
    data: { name: string; spriteSheet: SpriteSheetConfig }
  ): Promise<ApiResponse<CharacterData>> {
    return apiFetch<CharacterData>(`/api/characters/${userId}/slots/${slotNumber}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Clear/delete a character slot
   */
  async clearSlot(userId: string, slotNumber: number): Promise<ApiResponse<{ cleared: boolean }>> {
    return apiFetch<{ cleared: boolean }>(`/api/characters/${userId}/slots/${slotNumber}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get active character slot
   */
  async getActiveCharacter(userId: string): Promise<ApiResponse<ActiveCharacterResponse>> {
    return apiFetch<ActiveCharacterResponse>(`/api/characters/${userId}/active`);
  },

  /**
   * Set active character slot
   */
  async setActiveCharacter(
    userId: string,
    slotNumber: number
  ): Promise<ApiResponse<ActiveCharacterResponse>> {
    return apiFetch<ActiveCharacterResponse>(`/api/characters/${userId}/active`, {
      method: 'PUT',
      body: JSON.stringify({ slotNumber }),
    });
  },

  /**
   * Upload character asset (thumbnail or texture)
   */
  async uploadAsset(
    userId: string,
    file: File,
    options?: { slotNumber?: number; type?: 'thumbnail' | 'texture' }
  ): Promise<ApiResponse<UploadedFile>> {
    const additionalData: Record<string, string> = {};
    if (options?.slotNumber !== undefined) {
      additionalData.slotNumber = String(options.slotNumber);
    }
    if (options?.type) {
      additionalData.type = options.type;
    }
    return apiUpload<UploadedFile>(`/api/characters/${userId}/upload`, file, additionalData);
  },

  /**
   * Validate sprite sheet configuration (client-side utility)
   */
  validateSpriteSheet(config: unknown): config is SpriteSheetConfig {
    if (!config || typeof config !== 'object') return false;
    const sheet = config as SpriteSheetConfig;
    return Array.isArray(sheet.layers) && sheet.layers.every(
      (layer) => typeof layer.id === 'string' && typeof layer.src === 'string'
    );
  },
};

// Default export for convenience
export default CharacterApiService;

