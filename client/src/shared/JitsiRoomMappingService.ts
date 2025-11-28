/**
 * Jitsi Room Mapping Service
 *
 * Manages the mapping between interactive area IDs and Jitsi room names.
 * Provides a centralized service for converting map areas to video conference rooms.
 *
 * Storage: API-first with localStorage fallback
 *
 * @example
 * ```typescript
 * const service = jitsiRoomMappingService;
 * const roomName = service.getJitsiRoomForArea('meeting-room');
 * // Returns: 'stargety-meeting-room' or custom mapping
 * ```
 *
 * @version 2.0.0
 * @date 2025-11-28
 */

import { JitsiMappingApiService } from '../services/api/JitsiMappingApiService';
import { logger } from './logger';

export interface JitsiRoomMapping {
  areaId: string;
  jitsiRoomName: string;
  displayName?: string;
  isCustom?: boolean; // True if custom mapping, false if auto-generated
  createdAt: Date;
  updatedAt: Date;
}

const STORAGE_KEY = 'stargety_jitsi_room_mappings';
const DEFAULT_JITSI_SERVER = 'meet.stargety.com';

/**
 * Service for managing Jitsi room mappings
 */
class JitsiRoomMappingService {
  private mappings: Map<string, JitsiRoomMapping> = new Map();
  private jitsiServerUrl: string = DEFAULT_JITSI_SERVER;
  
  constructor() {
    this.loadMappings();
    // Also try to load from API asynchronously
    this.loadMappingsFromApiAsync();
  }

  /**
   * Load mappings from localStorage (sync)
   */
  private loadMappings(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);

        // Convert plain objects back to Map with Date objects
        Object.entries(parsed).forEach(([key, value]: [string, any]) => {
          this.mappings.set(key, {
            ...value,
            createdAt: new Date(value.createdAt),
            updatedAt: new Date(value.updatedAt)
          });
        });

        logger.info('JITSI MAPPINGS LOADED FROM LOCALSTORAGE', { count: this.mappings.size });
      }
    } catch (error) {
      logger.error('FAILED TO LOAD JITSI MAPPINGS FROM LOCALSTORAGE', { error });
    }
  }

  /**
   * Load mappings from API (async, updates local cache)
   */
  private async loadMappingsFromApiAsync(): Promise<void> {
    try {
      const result = await JitsiMappingApiService.getAllMappings();
      if (result.success && result.data) {
        // Update local cache with API data
        result.data.forEach((mapping) => {
          this.mappings.set(mapping.areaId, {
            areaId: mapping.areaId,
            jitsiRoomName: mapping.jitsiRoomName,
            displayName: mapping.displayName,
            isCustom: mapping.isCustom,
            createdAt: new Date(mapping.createdAt || Date.now()),
            updatedAt: new Date(mapping.updatedAt || Date.now()),
          });
        });
        // Sync to localStorage
        this.saveMappingsToLocalStorage();
        logger.info('JITSI MAPPINGS SYNCED FROM API', { count: result.data.length });
      }
    } catch (error) {
      logger.warn('FAILED TO LOAD JITSI MAPPINGS FROM API', { error });
    }
  }

  /**
   * Save mappings to localStorage (sync backup)
   */
  private saveMappingsToLocalStorage(): void {
    try {
      const obj = Object.fromEntries(this.mappings);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch (error) {
      logger.error('FAILED TO SAVE JITSI MAPPINGS TO LOCALSTORAGE', { error });
    }
  }

  /**
   * Save mapping to API (async, fire and forget)
   */
  private async saveMappingToApiAsync(mapping: JitsiRoomMapping): Promise<void> {
    try {
      await JitsiMappingApiService.setMapping(mapping.areaId, {
        jitsiRoomName: mapping.jitsiRoomName,
        displayName: mapping.displayName,
        isCustom: mapping.isCustom,
      });
      logger.info('JITSI MAPPING SAVED TO API', { areaId: mapping.areaId });
    } catch (error) {
      logger.warn('FAILED TO SAVE JITSI MAPPING TO API', { areaId: mapping.areaId, error });
    }
  }

  /**
   * Delete mapping from API (async, fire and forget)
   */
  private async deleteMappingFromApiAsync(areaId: string): Promise<void> {
    try {
      await JitsiMappingApiService.deleteMapping(areaId);
      logger.info('JITSI MAPPING DELETED FROM API', { areaId });
    } catch (error) {
      logger.warn('FAILED TO DELETE JITSI MAPPING FROM API', { areaId, error });
    }
  }
  
  /**
   * Get Jitsi room name for an area
   * If no mapping exists, generates a default room name from area ID
   * 
   * @param areaId - The interactive area ID
   * @returns Sanitized Jitsi room name
   */
  getJitsiRoomForArea(areaId: string): string {
    const mapping = this.mappings.get(areaId);
    if (mapping) {
      return mapping.jitsiRoomName;
    }
    
    // Generate default room name: sanitize area ID for Jitsi
    // Prefix with 'stargety-' to namespace our rooms
    return this.sanitizeRoomName(`stargety-${areaId}`);
  }
  
  /**
   * Set custom Jitsi room name for an area (syncs to API + localStorage)
   *
   * @param areaId - The interactive area ID
   * @param jitsiRoomName - Custom Jitsi room name
   * @param displayName - Optional human-readable display name
   */
  setJitsiRoomForArea(areaId: string, jitsiRoomName: string, displayName?: string): void {
    const existingMapping = this.mappings.get(areaId);

    const mapping: JitsiRoomMapping = {
      areaId,
      jitsiRoomName: this.sanitizeRoomName(jitsiRoomName),
      displayName,
      isCustom: true, // Mark as custom mapping
      createdAt: existingMapping?.createdAt || new Date(),
      updatedAt: new Date()
    };

    this.mappings.set(areaId, mapping);
    this.saveMappingsToLocalStorage();
    // Sync to API (fire and forget)
    this.saveMappingToApiAsync(mapping);

    logger.info('JITSI ROOM MAPPING SET', { areaId, jitsiRoomName: mapping.jitsiRoomName });
  }

  /**
   * Remove mapping for an area (syncs to API + localStorage)
   * After removal, the area will use the default generated room name
   *
   * @param areaId - The interactive area ID
   */
  removeMappingForArea(areaId: string): void {
    const existed = this.mappings.delete(areaId);
    if (existed) {
      this.saveMappingsToLocalStorage();
      // Sync delete to API (fire and forget)
      this.deleteMappingFromApiAsync(areaId);
      logger.info('JITSI ROOM MAPPING REMOVED', { areaId });
    }
  }
  
  /**
   * Get mapping for a specific area
   * 
   * @param areaId - The interactive area ID
   * @returns The mapping or undefined if not found
   */
  getMappingForArea(areaId: string): JitsiRoomMapping | undefined {
    return this.mappings.get(areaId);
  }
  
  /**
   * Get all mappings
   * 
   * @returns Array of all room mappings
   */
  getAllMappings(): JitsiRoomMapping[] {
    return Array.from(this.mappings.values());
  }
  
  /**
   * Check if a mapping exists for an area
   * 
   * @param areaId - The interactive area ID
   * @returns True if custom mapping exists
   */
  hasMappingForArea(areaId: string): boolean {
    return this.mappings.has(areaId);
  }
  
  /**
   * Sanitize room name for Jitsi
   * Jitsi room names should be alphanumeric with hyphens and underscores
   * 
   * @param name - Raw room name
   * @returns Sanitized room name
   */
  private sanitizeRoomName(name: string): string {
    return name
      .replace(/[^a-zA-Z0-9-_]/g, '-')  // Replace invalid chars with hyphen
      .replace(/-+/g, '-')               // Collapse multiple hyphens
      .replace(/^-|-$/g, '')             // Remove leading/trailing hyphens
      .toLowerCase();
  }
  
  /**
   * Get Jitsi server URL
   * 
   * @returns The configured Jitsi server URL
   */
  getJitsiServerUrl(): string {
    return this.jitsiServerUrl;
  }
  
  /**
   * Set Jitsi server URL
   *
   * @param url - The Jitsi server URL (e.g., 'meet.stargety.com')
   */
  setJitsiServerUrl(url: string): void {
    this.jitsiServerUrl = url;
    logger.info('JITSI SERVER URL SET', { url });
  }

  /**
   * Clear all mappings (syncs to API + localStorage)
   * Useful for testing or reset functionality
   */
  clearAllMappings(): void {
    // Delete each mapping from API
    const areaIds = Array.from(this.mappings.keys());
    areaIds.forEach(areaId => {
      this.deleteMappingFromApiAsync(areaId);
    });

    this.mappings.clear();
    this.saveMappingsToLocalStorage();
    logger.info('CLEARED ALL JITSI ROOM MAPPINGS');
  }

  /**
   * Import mappings from JSON (syncs to API + localStorage)
   * Useful for bulk import or migration
   *
   * @param mappingsJson - JSON string or object containing mappings
   * @returns true if import successful, false otherwise
   */
  importMappings(mappingsJson: string | Record<string, any>): boolean {
    try {
      const data = typeof mappingsJson === 'string' ? JSON.parse(mappingsJson) : mappingsJson;

      Object.entries(data).forEach(([key, value]: [string, any]) => {
        const mapping: JitsiRoomMapping = {
          ...value,
          createdAt: new Date(value.createdAt),
          updatedAt: new Date(value.updatedAt)
        };
        this.mappings.set(key, mapping);
        // Sync each to API
        this.saveMappingToApiAsync(mapping);
      });

      this.saveMappingsToLocalStorage();
      logger.info('JITSI MAPPINGS IMPORTED', { count: Object.keys(data).length });
      return true;
    } catch (error) {
      logger.error('FAILED TO IMPORT JITSI ROOM MAPPINGS', { error });
      return false;
    }
  }
  
  /**
   * Export mappings to JSON
   * Useful for backup or migration
   * 
   * @returns JSON string of all mappings
   */
  exportMappings(): string {
    const obj = Object.fromEntries(this.mappings);
    return JSON.stringify(obj, null, 2);
  }
}

// Singleton instance
export const jitsiRoomMappingService = new JitsiRoomMappingService();

// Export for testing
export { JitsiRoomMappingService };

