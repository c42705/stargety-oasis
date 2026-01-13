/**
 * Map Editor Chat Integration Service
 *
 * Manages chat rooms for map areas, enabling collaborative editing
 * and area-specific chat contexts.
 */

import React from 'react';
import { io, Socket } from 'socket.io-client';
import { store } from '../../redux/store';
import { chatThunks } from '../../redux/slices/chatSlice';
import { MessageEnum } from '../../redux/types/chat';
import { InteractiveArea } from '../../shared/MapDataContext';

export interface MapAreaChatRoom {
  areaId: string;
  roomId: string;
  areaName: string;
  areaType: string;
  participants: string[];
  isActive: boolean;
}

export interface MapChatContext {
  mapId: string;
  currentArea: InteractiveArea | null;
  areaRooms: Map<string, MapAreaChatRoom>;
  activeRoomId: string | null;
}

class MapEditorChatIntegration {
  private socket: Socket | null = null;
  private currentContext: MapChatContext | null = null;
  private eventHandlers: Map<string, Function[]> = new Map();

  /**
   * Initialize the integration with a specific map
   */
  async initialize(mapId: string): Promise<void> {
    if (this.socket?.connected) {
      await this.disconnect();
    }

    this.currentContext = {
      mapId,
      currentArea: null,
      areaRooms: new Map(),
      activeRoomId: null,
    };

    // Connect to map-specific namespace
    this.socket = io(`${process.env.REACT_APP_WS_URL}/map-chat`, {
      auth: { mapId },
      transports: ['websocket', 'polling'],
    });

    this.setupEventHandlers();
    await this.loadAreaRooms();
  }

  /**
   * Load all chat rooms for map areas
   */
  private async loadAreaRooms(): Promise<void> {
    if (!this.currentContext) return;

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/maps/${this.currentContext.mapId}/chat-rooms`
      );
      const rooms: MapAreaChatRoom[] = await response.json();

      rooms.forEach(room => {
        this.currentContext!.areaRooms.set(room.areaId, room);
      });
    } catch (error) {
      console.error('Failed to load area chat rooms:', error);
    }
  }

  /**
   * Set up Socket.IO event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Room events
    this.socket.on('room:created', this.handleRoomCreated.bind(this));
    this.socket.on('room:updated', this.handleRoomUpdated.bind(this));
    this.socket.on('room:deleted', this.handleRoomDeleted.bind(this));

    // Participant events
    this.socket.on('participant:joined', this.handleParticipantJoined.bind(this));
    this.socket.on('participant:left', this.handleParticipantLeft.bind(this));

    // Map change events
    this.socket.on('map:area:created', this.handleAreaCreated.bind(this));
    this.socket.on('map:area:updated', this.handleAreaUpdated.bind(this));
    this.socket.on('map:area:deleted', this.handleAreaDeleted.bind(this));

    // Connection events
    this.socket.on('connect', () => {
      console.log('Map chat integration connected');
      this.emit('connected');
    });

    this.socket.on('disconnect', () => {
      console.log('Map chat integration disconnected');
      this.emit('disconnected');
    });
  }

  /**
   * Create or get a chat room for a map area
   */
  async createAreaChatRoom(area: InteractiveArea): Promise<MapAreaChatRoom> {
    if (!this.currentContext) {
      throw new Error('Map chat integration not initialized');
    }

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/maps/${this.currentContext.mapId}/chat-rooms`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            areaId: area.id,
            areaName: area.name || `Area ${area.id}`,
            areaType: area.actionType || 'default',
          }),
        }
      );

      const room: MapAreaChatRoom = await response.json();
      this.currentContext.areaRooms.set(area.id, room);
      
      this.emit('room:created', room);
      return room;
    } catch (error) {
      console.error('Failed to create area chat room:', error);
      throw error;
    }
  }

  /**
   * Join a chat room for a specific area
   */
  async joinAreaChat(areaId: string): Promise<void> {
    if (!this.currentContext || !this.socket) {
      throw new Error('Map chat integration not initialized');
    }

    const room = this.currentContext.areaRooms.get(areaId);
    if (!room) {
      throw new Error(`No chat room found for area ${areaId}`);
    }

    // Leave current room if any
    if (this.currentContext.activeRoomId) {
      await this.leaveAreaChat();
    }

    // Join the new room
    this.socket.emit('room:join', { roomId: room.roomId });
    this.currentContext.activeRoomId = room.roomId;
    this.currentContext.currentArea = this.getAreaById(areaId);

    // Update Redux store
    store.dispatch(chatThunks.joinRoom(room.roomId));

    this.emit('room:joined', room);
  }

  /**
   * Leave the current area chat room
   */
  async leaveAreaChat(): Promise<void> {
    if (!this.currentContext || !this.socket || !this.currentContext.activeRoomId) {
      return;
    }

    const roomId = this.currentContext.activeRoomId;
    this.socket.emit('room:leave', { roomId });

    // Update Redux store
    store.dispatch(chatThunks.leaveRoom(roomId));

    this.currentContext.activeRoomId = null;
    this.currentContext.currentArea = null;

    this.emit('room:left', roomId);
  }

  /**
   * Send a message in the current area chat
   */
  async sendAreaMessage(content: string): Promise<void> {
    if (!this.currentContext?.activeRoomId) {
      throw new Error('No active area chat room');
    }

    store.dispatch(
      chatThunks.sendMessage({
        roomId: this.currentContext.activeRoomId,
        content,
        type: MessageEnum.TEXT,
      })
    );
  }

  /**
   * Get all area chat rooms
   */
  getAreaRooms(): MapAreaChatRoom[] {
    if (!this.currentContext) return [];
    return Array.from(this.currentContext.areaRooms.values());
  }

  /**
   * Get a specific area chat room
   */
  getAreaRoom(areaId: string): MapAreaChatRoom | undefined {
    return this.currentContext?.areaRooms.get(areaId);
  }

  /**
   * Get the current active room
   */
  getActiveRoom(): MapAreaChatRoom | null {
    if (!this.currentContext?.activeRoomId) return null;
    
    for (const room of this.currentContext.areaRooms.values()) {
      if (room.roomId === this.currentContext.activeRoomId) {
        return room;
      }
    }
    return null;
  }

  /**
   * Get area by ID from map data
   */
  private getAreaById(_areaId: string): InteractiveArea | null {
    // This would need to access the current map data
    // For now, return null - this should be implemented based on how map data is accessed
    return null;
  }

  /**
   * Sync area changes with chat rooms
   */
  async syncAreaChange(area: InteractiveArea, action: 'created' | 'updated' | 'deleted'): Promise<void> {
    switch (action) {
      case 'created':
        await this.handleAreaCreated(area);
        break;
      case 'updated':
        await this.handleAreaUpdated(area);
        break;
      case 'deleted':
        await this.handleAreaDeleted(area.id);
        break;
    }
  }

  /**
   * Handle area creation
   */
  private async handleAreaCreated(area: InteractiveArea): Promise<void> {
    // Auto-create chat room for new area
    await this.createAreaChatRoom(area);
  }

  /**
   * Handle area update
   */
  private async handleAreaUpdated(area: InteractiveArea): Promise<void> {
    const room = this.currentContext?.areaRooms.get(area.id);
    if (room) {
      // Update room metadata
      try {
        await fetch(
          `${process.env.REACT_APP_API_URL}/api/chat/rooms/${room.roomId}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: area.name || `Area ${area.id}`,
            }),
          }
        );
      } catch (error) {
        console.error('Failed to update area chat room:', error);
      }
    }
  }

  /**
   * Handle area deletion
   */
  private async handleAreaDeleted(areaId: string): Promise<void> {
    const room = this.currentContext?.areaRooms.get(areaId);
    if (room) {
      // Leave room if active
      if (this.currentContext?.activeRoomId === room.roomId) {
        await this.leaveAreaChat();
      }

      // Delete room
      try {
        await fetch(
          `${process.env.REACT_APP_API_URL}/api/chat/rooms/${room.roomId}`,
          { method: 'DELETE' }
        );
      } catch (error) {
        console.error('Failed to delete area chat room:', error);
      }

      this.currentContext?.areaRooms.delete(areaId);
      this.emit('room:deleted', room);
    }
  }

  /**
   * Event handlers
   */
  private handleRoomCreated(room: MapAreaChatRoom): void {
    if (this.currentContext) {
      this.currentContext.areaRooms.set(room.areaId, room);
    }
    this.emit('room:created', room);
  }

  private handleRoomUpdated(room: MapAreaChatRoom): void {
    if (this.currentContext) {
      this.currentContext.areaRooms.set(room.areaId, room);
    }
    this.emit('room:updated', room);
  }

  private handleRoomDeleted(room: MapAreaChatRoom): void {
    if (this.currentContext) {
      this.currentContext.areaRooms.delete(room.areaId);
    }
    this.emit('room:deleted', room);
  }

  private handleParticipantJoined(data: { roomId: string; userId: string }): void {
    const room = Array.from(this.currentContext?.areaRooms.values() || []).find(
      r => r.roomId === data.roomId
    );
    if (room) {
      room.participants.push(data.userId);
      this.emit('participant:joined', { room, userId: data.userId });
    }
  }

  private handleParticipantLeft(data: { roomId: string; userId: string }): void {
    const room = Array.from(this.currentContext?.areaRooms.values() || []).find(
      r => r.roomId === data.roomId
    );
    if (room) {
      room.participants = room.participants.filter(id => id !== data.userId);
      this.emit('participant:left', { room, userId: data.userId });
    }
  }

  /**
   * Event emitter for custom events
   */
  on(event: string, handler: Function): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(handler);
  }

  off(event: string, handler: Function): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.forEach(handler => handler(data));
    }
  }

  /**
   * Disconnect from the map chat integration
   */
  async disconnect(): Promise<void> {
    if (this.currentContext?.activeRoomId) {
      await this.leaveAreaChat();
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.currentContext = null;
    this.eventHandlers.clear();
  }

  /**
   * Get current context
   */
  getContext(): MapChatContext | null {
    return this.currentContext;
  }
}

// Export singleton instance
export const mapEditorChatIntegration = new MapEditorChatIntegration();

// Export React hook for easy integration
export function useMapEditorChat() {
  const [context, setContext] = React.useState<MapChatContext | null>(null);
  const [isConnected, setIsConnected] = React.useState(false);

  React.useEffect(() => {
    const handleConnected = () => setIsConnected(true);
    const handleDisconnected = () => setIsConnected(false);

    mapEditorChatIntegration.on('connected', handleConnected);
    mapEditorChatIntegration.on('disconnected', handleDisconnected);

    return () => {
      mapEditorChatIntegration.off('connected', handleConnected);
      mapEditorChatIntegration.off('disconnected', handleDisconnected);
    };
  }, []);

  const initialize = React.useCallback(async (mapId: string) => {
    await mapEditorChatIntegration.initialize(mapId);
    setContext(mapEditorChatIntegration.getContext());
  }, []);

  const disconnect = React.useCallback(async () => {
    await mapEditorChatIntegration.disconnect();
    setContext(null);
    setIsConnected(false);
  }, []);

  return {
    context,
    isConnected,
    initialize,
    disconnect,
    joinAreaChat: mapEditorChatIntegration.joinAreaChat.bind(mapEditorChatIntegration),
    leaveAreaChat: mapEditorChatIntegration.leaveAreaChat.bind(mapEditorChatIntegration),
    sendAreaMessage: mapEditorChatIntegration.sendAreaMessage.bind(mapEditorChatIntegration),
    getAreaRooms: mapEditorChatIntegration.getAreaRooms.bind(mapEditorChatIntegration),
    getActiveRoom: mapEditorChatIntegration.getActiveRoom.bind(mapEditorChatIntegration),
    syncAreaChange: mapEditorChatIntegration.syncAreaChange.bind(mapEditorChatIntegration),
    on: mapEditorChatIntegration.on.bind(mapEditorChatIntegration),
    off: mapEditorChatIntegration.off.bind(mapEditorChatIntegration),
  };
}
