/**
 * WorldChatIntegration Service
 * 
 * Integrates the chat system with the world module (Phaser.js).
 * Handles:
 * - Contextual chat based on world location/area
 * - Presence indicators showing which users are in which areas
 * - Area-to-chat mapping
 * - Cross-module communication between world and chat systems
 */

import { store } from '../../redux/store';
import { chatThunks } from '../../redux/slices/chatSlice';
import { chatSocketService } from '../socket/ChatSocketService';

// Types for world integration
export interface WorldArea {
  id: string;
  name: string;
  type: 'meeting' | 'lounge' | 'workspace' | 'portal';
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  chatRoomId?: string;
  jitsiRoomId?: string;
}

export interface PlayerPosition {
  userId: string;
  username: string;
  x: number;
  y: number;
  direction: string;
  currentArea?: string;
}

export interface WorldChatEvent {
  type: 'player-entered-area' | 'player-left-area' | 'player-moved';
  userId: string;
  username: string;
  areaId?: string;
  position?: { x: number; y: number };
  timestamp: Date;
}

class WorldChatIntegration {
  private static instance: WorldChatIntegration;
  private socketService: any; // ChatSocketService type
  private worldAreas: Map<string, WorldArea> = new Map();
  private playerPositions: Map<string, PlayerPosition> = new Map();
  private eventListeners: Map<string, Set<Function>> = new Map();
  private currentArea: string | null = null;
  private isInitialized = false;

  private constructor() {
    this.socketService = chatSocketService;
    this.setupSocketListeners();
  }

  public static getInstance(): WorldChatIntegration {
    if (!WorldChatIntegration.instance) {
      WorldChatIntegration.instance = new WorldChatIntegration();
    }
    return WorldChatIntegration.instance;
  }

  /**
   * Initialize the world-chat integration
   */
  public async initialize(areas: WorldArea[]): Promise<void> {
    if (this.isInitialized) {
      console.warn('[WorldChatIntegration] Already initialized');
      return;
    }

    console.log('[WorldChatIntegration] Initializing with', areas.length, 'areas');

    // Store world areas
    areas.forEach(area => {
      this.worldAreas.set(area.id, area);
      
      // Create chat room for each area if not exists
      if (area.chatRoomId) {
        this.ensureChatRoom(area);
      }
    });

    this.isInitialized = true;
    console.log('[WorldChatIntegration] Initialized successfully');
  }

  /**
   * Ensure a chat room exists for a world area
   */
  private async ensureChatRoom(area: WorldArea): Promise<void> {
    try {
      const state = store.getState();
      const existingRoom = state.chat.rooms.find(r => r.id === area.chatRoomId);

      if (!existingRoom) {
        console.log('[WorldChatIntegration] Chat room for area will be created on first join:', area.name);
        // Room will be created automatically when first user joins
      }
    } catch (error) {
      console.error('[WorldChatIntegration] Error ensuring chat room:', error);
    }
  }

  /**
   * Handle player position update from world module
   */
  public handlePlayerPositionUpdate(position: PlayerPosition): void {
    if (!this.isInitialized) {
      console.warn('[WorldChatIntegration] Not initialized');
      return;
    }

    const previousPosition = this.playerPositions.get(position.userId);
    this.playerPositions.set(position.userId, position);

    // Check if player entered or left an area
    const newArea = this.getAreaAtPosition(position.x, position.y);
    const previousArea = previousPosition 
      ? this.getAreaAtPosition(previousPosition.x, previousPosition.y)
      : null;

    if (newArea !== previousArea) {
      if (previousArea) {
        this.handlePlayerLeftArea(position.userId, position.username, previousArea);
      }
      if (newArea) {
        this.handlePlayerEnteredArea(position.userId, position.username, newArea);
      }
    }

    // Emit player moved event
    this.emitEvent('player-moved', {
      type: 'player-moved',
      userId: position.userId,
      username: position.username,
      position: { x: position.x, y: position.y },
      timestamp: new Date()
    });
  }

  /**
   * Handle player entering an area
   */
  private handlePlayerEnteredArea(userId: string, username: string, area: WorldArea): void {
    console.log('[WorldChatIntegration] Player entered area:', username, area.name);

    // Update player's current area
    const position = this.playerPositions.get(userId);
    if (position) {
      position.currentArea = area.id;
    }

    // Join area's chat room
    if (area.chatRoomId) {
      this.socketService.joinRoom(area.chatRoomId);
    }

    // Emit event
    this.emitEvent('player-entered-area', {
      type: 'player-entered-area',
      userId,
      username,
      areaId: area.id,
      timestamp: new Date()
    });

    // If this is the current user, update current area
    // Note: Auth state is managed separately, we'll use a callback approach
    this.currentArea = area.id;
  }

  /**
   * Handle player leaving an area
   */
  private handlePlayerLeftArea(userId: string, username: string, area: WorldArea): void {
    console.log('[WorldChatIntegration] Player left area:', username, area.name);

    // Update player's current area
    const position = this.playerPositions.get(userId);
    if (position) {
      position.currentArea = undefined;
    }

    // Leave area's chat room
    if (area.chatRoomId) {
      this.socketService.leaveRoom(area.chatRoomId);
    }

    // Emit event
    this.emitEvent('player-left-area', {
      type: 'player-left-area',
      userId,
      username,
      areaId: area.id,
      timestamp: new Date()
    });

    // If this is the current user, clear current area
    this.currentArea = null;
  }

  /**
   * Get area at a specific position
   */
  private getAreaAtPosition(x: number, y: number): WorldArea | null {
    for (const area of this.worldAreas.values()) {
      const { bounds } = area;
      if (x >= bounds.x && x <= bounds.x + bounds.width &&
          y >= bounds.y && y <= bounds.y + bounds.height) {
        return area;
      }
    }
    return null;
  }

  /**
   * Get all players in a specific area
   */
  public getPlayersInArea(areaId: string): PlayerPosition[] {
    const players: PlayerPosition[] = [];
    const positions = Array.from(this.playerPositions.values());
    for (const position of positions) {
      if (position.currentArea === areaId) {
        players.push(position);
      }
    }
    return players;
  }

  /**
   * Get chat room ID for an area
   */
  public getChatRoomId(areaId: string): string | null {
    const area = this.worldAreas.get(areaId);
    return area?.chatRoomId || null;
  }

  /**
   * Get area info for a chat room
   */
  public getAreaForChatRoom(chatRoomId: string): WorldArea | null {
    const areas = Array.from(this.worldAreas.values());
    for (const area of areas) {
      if (area.chatRoomId === chatRoomId) {
        return area;
      }
    }
    return null;
  }

  /**
   * Get current area for the current user
   */
  public getCurrentArea(): WorldArea | null {
    if (!this.currentArea) {
      return null;
    }
    return this.worldAreas.get(this.currentArea) || null;
  }

  /**
   * Get all world areas
   */
  public getWorldAreas(): WorldArea[] {
    return Array.from(this.worldAreas.values());
  }


  /**
   * Get all player positions
   */
  public getAllPlayerPositions(): PlayerPosition[] {
    return Array.from(this.playerPositions.values());
  }

  /**
   * Send chat notification for world event
   */
  public sendWorldNotification(areaId: string, message: string): void {
    const area = this.worldAreas.get(areaId);
    if (!area || !area.chatRoomId) {
      return;
    }

    this.socketService.sendMessage(area.chatRoomId, message, 'TEXT');
  }

  /**
   * Switch chat context based on world location
   */
  public switchChatContext(areaId: string): void {
    const area = this.worldAreas.get(areaId);
    if (!area || !area.chatRoomId) {
      console.warn('[WorldChatIntegration] Invalid area or no chat room:', areaId);
      return;
    }

    console.log('[WorldChatIntegration] Switching chat context to:', area.name);
    // Join the room - this will set it as current
    this.socketService.joinRoom(area.chatRoomId);
  }

  /**
   * Setup socket listeners for world events
   */
  private setupSocketListeners(): void {
    // Listen for player position updates from other users
    this.socketService.on('world:player-moved', (data: PlayerPosition) => {
      this.handlePlayerPositionUpdate(data);
    });

    // Listen for area events
    this.socketService.on('world:player-entered-area', (data: { userId: string; username: string; areaId: string }) => {
      const area = this.worldAreas.get(data.areaId);
      if (area) {
        this.handlePlayerEnteredArea(data.userId, data.username, area);
      }
    });

    this.socketService.on('world:player-left-area', (data: { userId: string; username: string; areaId: string }) => {
      const area = this.worldAreas.get(data.areaId);
      if (area) {
        this.handlePlayerLeftArea(data.userId, data.username, area);
      }
    });
  }

  /**
   * Register event listener
   */
  public on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(callback);
  }

  /**
   * Unregister event listener
   */
  public off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: string, data: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('[WorldChatIntegration] Error in event listener:', error);
        }
      });
    }
  }

  /**
   * Cleanup and reset
   */
  public cleanup(): void {
    console.log('[WorldChatIntegration] Cleaning up');
    
    // Leave current area's chat room
    if (this.currentArea) {
      const area = this.worldAreas.get(this.currentArea);
      if (area?.chatRoomId) {
        this.socketService.leaveRoom(area.chatRoomId);
      }
    }

    // Clear data
    this.worldAreas.clear();
    this.playerPositions.clear();
    this.eventListeners.clear();
    this.currentArea = null;
    this.isInitialized = false;
  }

  /**
   * Check if initialized
   */
  public isReady(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const worldChatIntegration = WorldChatIntegration.getInstance();
export default WorldChatIntegration;
