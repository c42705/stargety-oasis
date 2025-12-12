/**
 * Map API Service
 * 
 * Provides API methods for map CRUD operations, replacing localStorage.
 * Matches the interface of MapDataService for easy migration.
 */

import { apiFetch, apiUpload, ApiResponse } from './apiClient';
// Import and re-export the canonical InteractiveArea type from MapDataContext
// This ensures type consistency across the codebase
import type {
  InteractiveArea,
  InteractiveAreaActionType,
  InteractiveAreaActionConfig,
  AlertActionConfig,
  UrlActionConfig,
  ModalActionConfig,
  JitsiActionConfig,
} from '../../shared/MapDataContext';

// Types matching server schema
export interface MapAsset {
  id: string;
  filename: string;
  originalName: string;
  path: string;
  url: string;
  size: number;
  mimeType: string;
  metadata?: Record<string, unknown>;
  uploadedAt: string;
}

export type {
  InteractiveArea,
  InteractiveAreaActionType,
  InteractiveAreaActionConfig,
  AlertActionConfig,
  UrlActionConfig,
  ModalActionConfig,
  JitsiActionConfig,
};

export interface ImpassableArea {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  points?: Array<{ x: number; y: number }>;
}

export interface MapData {
  id?: string;
  roomId: string;
  version: number;
  worldDimensions: { width: number; height: number };
  backgroundImage: string | null;
  backgroundImageDimensions?: { width: number; height: number };
  interactiveAreas: InteractiveArea[];
  impassableAreas: ImpassableArea[];
  assets?: MapAsset[];
  metadata?: {
    name?: string;
    description?: string;
    tags?: string[];
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface MapWithMeta extends MapData {
  assets: MapAsset[];
}

/**
 * Map API Service - handles all map-related API calls
 */
export const MapApiService = {
  /**
   * List all available maps
   */
  async listMaps(): Promise<ApiResponse<MapData[]>> {
    return apiFetch<MapData[]>('/api/maps');
  },

  /**
   * Load map data by room ID
   */
  async loadMap(roomId: string): Promise<ApiResponse<MapData>> {
    return apiFetch<MapData>(`/api/maps/${roomId}`);
  },

  /**
   * Load map with metadata and assets
   */
  async loadMapWithMeta(roomId: string): Promise<ApiResponse<MapWithMeta>> {
    return apiFetch<MapWithMeta>(`/api/maps/${roomId}?meta=true`);
  },

  /**
   * Create a new map
   */
  async createMap(roomId: string, data: Partial<MapData>): Promise<ApiResponse<MapData>> {
    return apiFetch<MapData>(`/api/maps/${roomId}`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Update existing map (auto-increments version)
   */
  async saveMap(roomId: string, data: Partial<MapData>): Promise<ApiResponse<MapData>> {
    return apiFetch<MapData>(`/api/maps/${roomId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete a map
   */
  async deleteMap(roomId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiFetch<{ deleted: boolean }>(`/api/maps/${roomId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get map assets
   */
  async getAssets(roomId: string): Promise<ApiResponse<MapAsset[]>> {
    return apiFetch<MapAsset[]>(`/api/maps/${roomId}/assets`);
  },

  /**
   * Upload a map asset (image, etc.)
   */
  async uploadAsset(
    roomId: string,
    file: File,
    metadata?: Record<string, string>
  ): Promise<ApiResponse<MapAsset>> {
    return apiUpload<MapAsset>(`/api/maps/${roomId}/assets`, file, metadata);
  },

  /**
   * Delete a map asset
   */
  async deleteAsset(roomId: string, assetId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiFetch<{ deleted: boolean }>(`/api/maps/${roomId}/assets/${assetId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Export map as JSON string (client-side utility)
   */
  exportMapData(data: MapData): string {
    return JSON.stringify(data, null, 2);
  },

  /**
   * Validate map data structure (client-side utility)
   */
  validateMapData(data: unknown): data is MapData {
    if (!data || typeof data !== 'object') return false;
    const map = data as MapData;
    return (
      typeof map.roomId === 'string' &&
      typeof map.version === 'number' &&
      typeof map.worldDimensions === 'object' &&
      Array.isArray(map.interactiveAreas) &&
      Array.isArray(map.impassableAreas)
    );
  },
};

// Default export for convenience
export default MapApiService;

