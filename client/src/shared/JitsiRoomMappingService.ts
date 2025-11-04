/**
 * Jitsi Room Mapping Service
 * 
 * Manages the mapping between interactive area IDs and Jitsi room names.
 * Provides a centralized service for converting map areas to video conference rooms.
 * 
 * Storage: localStorage (TODO: Migrate to database when backend is ready)
 * 
 * @example
 * ```typescript
 * const service = jitsiRoomMappingService;
 * const roomName = service.getJitsiRoomForArea('meeting-room');
 * // Returns: 'stargety-meeting-room' or custom mapping
 * ```
 */

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
  }
  
  /**
   * Load mappings from localStorage
   * TODO: Replace with API call when backend is ready
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
        
        console.log(`✅ Loaded ${this.mappings.size} Jitsi room mappings from localStorage`);
      }
    } catch (error) {
      console.error('❌ Failed to load Jitsi room mappings:', error);
    }
  }
  
  /**
   * Save mappings to localStorage
   * TODO: Replace with API call when backend is ready
   */
  private saveMappings(): void {
    try {
      const obj = Object.fromEntries(this.mappings);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
      console.log(`✅ Saved ${this.mappings.size} Jitsi room mappings to localStorage`);
    } catch (error) {
      console.error('❌ Failed to save Jitsi room mappings:', error);
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
   * Set custom Jitsi room name for an area
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
    this.saveMappings();

    console.log(`✅ Set Jitsi room mapping: ${areaId} → ${mapping.jitsiRoomName}`);
  }
  
  /**
   * Remove mapping for an area
   * After removal, the area will use the default generated room name
   * 
   * @param areaId - The interactive area ID
   */
  removeMappingForArea(areaId: string): void {
    const existed = this.mappings.delete(areaId);
    if (existed) {
      this.saveMappings();
      console.log(`✅ Removed Jitsi room mapping for area: ${areaId}`);
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
    // TODO: Persist to localStorage or settings when settings integration is added
    console.log(`✅ Set Jitsi server URL: ${url}`);
  }
  
  /**
   * Clear all mappings
   * Useful for testing or reset functionality
   */
  clearAllMappings(): void {
    this.mappings.clear();
    this.saveMappings();
    console.log('✅ Cleared all Jitsi room mappings');
  }
  
  /**
   * Import mappings from JSON
   * Useful for bulk import or migration
   *
   * @param mappingsJson - JSON string or object containing mappings
   * @returns true if import successful, false otherwise
   */
  importMappings(mappingsJson: string | Record<string, any>): boolean {
    try {
      const data = typeof mappingsJson === 'string' ? JSON.parse(mappingsJson) : mappingsJson;

      Object.entries(data).forEach(([key, value]: [string, any]) => {
        this.mappings.set(key, {
          ...value,
          createdAt: new Date(value.createdAt),
          updatedAt: new Date(value.updatedAt)
        });
      });

      this.saveMappings();
      console.log(`✅ Imported ${Object.keys(data).length} Jitsi room mappings`);
      return true;
    } catch (error) {
      console.error('❌ Failed to import Jitsi room mappings:', error);
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

