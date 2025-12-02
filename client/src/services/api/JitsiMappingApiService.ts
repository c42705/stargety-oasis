/**
 * Jitsi Mapping API Service
 * 
 * Provides API methods for Jitsi room mapping management.
 * Maps interactive area IDs to Jitsi room names.
 */

import { apiFetch, ApiResponse } from './apiClient';
import { logger } from '../../shared/logger';

// Jitsi room mapping matching server schema
export interface JitsiRoomMapping {
  id?: string;
  areaId: string;
  jitsiRoomName: string;
  displayName?: string;
  isCustom?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Jitsi Mapping API Service - handles area-to-room mappings
 */
export const JitsiMappingApiService = {
  /**
   * Get all Jitsi room mappings
   */
  async getAllMappings(): Promise<ApiResponse<JitsiRoomMapping[]>> {
    return apiFetch<JitsiRoomMapping[]>('/api/jitsi-mappings');
  },

  /**
   * Get mapping for a specific area
   */
  async getMapping(areaId: string): Promise<ApiResponse<JitsiRoomMapping | null>> {
    return apiFetch<JitsiRoomMapping | null>(`/api/jitsi-mappings/${areaId}`);
  },

  /**
   * Create or update mapping for an area
   */
  async setMapping(
    areaId: string,
    data: { jitsiRoomName: string; displayName?: string; isCustom?: boolean }
  ): Promise<ApiResponse<JitsiRoomMapping>> {
    return apiFetch<JitsiRoomMapping>(`/api/jitsi-mappings/${areaId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  /**
   * Delete mapping for an area
   */
  async deleteMapping(areaId: string): Promise<ApiResponse<{ deleted: boolean }>> {
    return apiFetch<{ deleted: boolean }>(`/api/jitsi-mappings/${areaId}`, {
      method: 'DELETE',
    });
  },

  /**
   * Get Jitsi room name for an area
   * Returns custom mapping or generates default name
   */
  async getJitsiRoomForArea(areaId: string): Promise<string> {
    try {
      const result = await this.getMapping(areaId);
      if (result.success && result.data) {
        return result.data.jitsiRoomName;
      }
    } catch (error) {
      logger.warn(`Failed to get Jitsi mapping for ${areaId}, using default`);
    }
    // Fallback to generated name
    return this.generateDefaultRoomName(areaId);
  },

  /**
   * Generate default room name from area ID
   * Client-side utility matching server logic
   */
  generateDefaultRoomName(areaId: string): string {
    return `stargety-${areaId}`
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase();
  },

  /**
   * Validate room name for Jitsi
   * Client-side utility
   */
  isValidRoomName(name: string): boolean {
    // Jitsi room names should be alphanumeric with hyphens/underscores
    return /^[a-zA-Z0-9-_]+$/.test(name) && name.length >= 3 && name.length <= 100;
  },

  /**
   * Sanitize room name for Jitsi
   * Client-side utility
   */
  sanitizeRoomName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase()
      .slice(0, 100);
  },
};

// Default export for convenience
export default JitsiMappingApiService;

