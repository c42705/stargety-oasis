/**
 * MapChatIntegration Service
 * 
 * Integrates the Map Editor with the Chat system by:
 * 1. Mapping interactive areas to chat rooms
 * 2. Creating area-specific chat contexts
 * 3. Managing chat room lifecycle based on map areas
 */

import { InteractiveArea, InteractiveAreaActionType, sanitizeJitsiRoomName } from '../../shared/MapDataContext';
import { ChatApiService } from '../api/ChatApiService';
import { ChatRoom } from '../../redux/types/chat';

/**
 * Configuration for map-chat integration
 */
export interface MapChatConfig {
  /** Whether to auto-create chat rooms for interactive areas */
  autoCreateRooms: boolean;
  /** Which action types should have chat rooms */
  chatEnabledActionTypes: InteractiveAreaActionType[];
  /** Prefix for area-based chat room names */
  roomNamePrefix: string;
}

/**
 * Default configuration for map-chat integration
 */
const DEFAULT_CONFIG: MapChatConfig = {
  autoCreateRooms: true,
  chatEnabledActionTypes: ['jitsi', 'modal', 'alert', 'none'],
  roomNamePrefix: 'area-'
};

/**
 * MapChatIntegration Service
 * 
 * Manages the relationship between map interactive areas and chat rooms
 */
export class MapChatIntegration {
  private config: MapChatConfig;
  private chatApiService: ChatApiService;
  private areaRoomMap: Map<string, string>; // areaId -> roomId
  private roomAreaMap: Map<string, string>; // roomId -> areaId

  constructor(config: Partial<MapChatConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.chatApiService = new ChatApiService();
    this.areaRoomMap = new Map();
    this.roomAreaMap = new Map();
  }

  /**
   * Generate a chat room name for an interactive area
   */
  private generateRoomName(area: InteractiveArea): string {
    return `${this.config.roomNamePrefix}${sanitizeJitsiRoomName(area.name)}`;
  }

  /**
   * Check if an area should have a chat room
   */
  private shouldHaveChatRoom(area: InteractiveArea): boolean {
    return this.config.chatEnabledActionTypes.includes(area.actionType);
  }

  /**
   * Create a chat room for an interactive area
   */
  async createRoomForArea(area: InteractiveArea): Promise<ChatRoom | null> {
    if (!this.shouldHaveChatRoom(area)) {
      console.log(`Area ${area.name} (${area.actionType}) does not need a chat room`);
      return null;
    }

    // Check if room already exists
    const existingRoomId = this.areaRoomMap.get(area.id);
    if (existingRoomId) {
      console.log(`Chat room already exists for area ${area.name}`);
      return this.chatApiService.getRoom(existingRoomId);
    }

    try {
      const roomName = this.generateRoomName(area);
      const room = await this.chatApiService.createRoom({
        name: roomName,
        description: `Chat for ${area.name} area`,
        metadata: {
          areaId: area.id,
          areaName: area.name,
          actionType: area.actionType,
          isAreaRoom: true
        }
      });

      // Store mappings
      this.areaRoomMap.set(area.id, room.id);
      this.roomAreaMap.set(room.id, area.id);

      console.log(`Created chat room ${room.id} for area ${area.name}`);
      return room;
    } catch (error) {
      console.error(`Failed to create chat room for area ${area.name}:`, error);
      return null;
    }
  }

  /**
   * Create chat rooms for multiple interactive areas
   */
  async createRoomsForAreas(areas: InteractiveArea[]): Promise<Map<string, ChatRoom>> {
    const results = new Map<string, ChatRoom>();

    // Process areas in parallel
    const promises = areas
      .filter(area => this.shouldHaveChatRoom(area))
      .map(async (area) => {
        const room = await this.createRoomForArea(area);
        if (room) {
          results.set(area.id, room);
        }
      });

    await Promise.all(promises);
    return results;
  }

  /**
   * Get the chat room ID for an interactive area
   */
  getRoomIdForArea(areaId: string): string | undefined {
    return this.areaRoomMap.get(areaId);
  }

  /**
   * Get the area ID for a chat room
   */
  getAreaIdForRoom(roomId: string): string | undefined {
    return this.roomAreaMap.get(roomId);
  }

  /**
   * Check if a room is an area-based chat room
   */
  isAreaRoom(roomId: string): boolean {
    return this.roomAreaMap.has(roomId);
  }

  /**
   * Delete a chat room for an interactive area
   */
  async deleteRoomForArea(areaId: string): Promise<boolean> {
    const roomId = this.areaRoomMap.get(areaId);
    if (!roomId) {
      console.log(`No chat room found for area ${areaId}`);
      return false;
    }

    try {
      await this.chatApiService.deleteRoom(roomId);
      
      // Remove mappings
      this.areaRoomMap.delete(areaId);
      this.roomAreaMap.delete(roomId);

      console.log(`Deleted chat room ${roomId} for area ${areaId}`);
      return true;
    } catch (error) {
      console.error(`Failed to delete chat room for area ${areaId}:`, error);
      return false;
    }
  }

  /**
   * Update chat room when area is modified
   */
  async updateRoomForArea(area: InteractiveArea): Promise<ChatRoom | null> {
    const roomId = this.areaRoomMap.get(area.id);
    
    if (!roomId) {
      // Room doesn't exist, create it
      return this.createRoomForArea(area);
    }

    try {
      const roomName = this.generateRoomName(area);
      const updatedRoom = await this.chatApiService.updateRoom(roomId, {
        name: roomName,
        description: `Chat for ${area.name} area`,
        metadata: {
          areaId: area.id,
          areaName: area.name,
          actionType: area.actionType,
          isAreaRoom: true
        }
      });

      console.log(`Updated chat room ${roomId} for area ${area.name}`);
      return updatedRoom;
    } catch (error) {
      console.error(`Failed to update chat room for area ${area.name}:`, error);
      return null;
    }
  }

  /**
   * Get all area-based chat rooms
   */
  async getAreaRooms(): Promise<ChatRoom[]> {
    try {
      const allRooms = await this.chatApiService.getRooms();
      return allRooms.filter(room => 
        room.metadata?.isAreaRoom === true
      );
    } catch (error) {
      console.error('Failed to get area rooms:', error);
      return [];
    }
  }

  /**
   * Sync chat rooms with current map areas
   * Creates rooms for new areas, updates existing, removes deleted
   */
  async syncRooms(areas: InteractiveArea[]): Promise<{
    created: number;
    updated: number;
    deleted: number;
  }> {
    const currentAreaIds = new Set(areas.map(a => a.id));
    const existingAreaIds = new Set(this.areaRoomMap.keys());

    let created = 0;
    let updated = 0;
    let deleted = 0;

    // Create rooms for new areas
    for (const area of areas) {
      if (!existingAreaIds.has(area.id) && this.shouldHaveChatRoom(area)) {
        const room = await this.createRoomForArea(area);
        if (room) created++;
      } else if (existingAreaIds.has(area.id)) {
        // Update existing rooms
        await this.updateRoomForArea(area);
        updated++;
      }
    }

    // Delete rooms for removed areas
    for (const areaId of existingAreaIds) {
      if (!currentAreaIds.has(areaId)) {
        const success = await this.deleteRoomForArea(areaId);
        if (success) deleted++;
      }
    }

    console.log(`Sync complete: ${created} created, ${updated} updated, ${deleted} deleted`);
    return { created, updated, deleted };
  }

  /**
   * Clear all mappings (useful for testing or reset)
   */
  clearMappings(): void {
    this.areaRoomMap.clear();
    this.roomAreaMap.clear();
  }

  /**
   * Get current mapping statistics
   */
  getStats(): {
    totalAreas: number;
    totalRooms: number;
    mappings: Array<{ areaId: string; roomId: string }>;
  } {
    const mappings: Array<{ areaId: string; roomId: string }> = [];
    this.areaRoomMap.forEach((roomId, areaId) => {
      mappings.push({ areaId, roomId });
    });

    return {
      totalAreas: this.areaRoomMap.size,
      totalRooms: this.roomAreaMap.size,
      mappings
    };
  }
}

// Singleton instance
let mapChatIntegrationInstance: MapChatIntegration | null = null;

/**
 * Get the singleton MapChatIntegration instance
 */
export function getMapChatIntegration(config?: Partial<MapChatConfig>): MapChatIntegration {
  if (!mapChatIntegrationInstance) {
    mapChatIntegrationInstance = new MapChatIntegration(config);
  }
  return mapChatIntegrationInstance;
}

/**
 * Reset the singleton instance (useful for testing)
 */
export function resetMapChatIntegration(): void {
  mapChatIntegrationInstance = null;
}
