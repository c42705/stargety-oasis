/**
 * Map Socket Service
 *
 * Manages Socket.IO connection for real-time map synchronization.
 * Handles room management and broadcasts map updates to other clients.
 */

import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '../constants';
import { logger } from '../logger';
import { SharedMapData, MapEventType } from './types';

export type SocketEventHandler = (data: unknown) => void;

export interface MapSocketCallbacks {
  onMapUpdated?: (data: { roomId: string; mapData: SharedMapData }) => void;
  onAssetAdded?: (data: { roomId: string; asset: unknown }) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

/**
 * MapSocketService - Handles real-time map synchronization via Socket.IO
 */
export class MapSocketService {
  private socket: Socket | null = null;
  private currentRoomId: string = 'default';
  private callbacks: MapSocketCallbacks = {};

  constructor() {
    this.initializeConnection();
  }

  /**
   * Initialize Socket.IO connection
   */
  private initializeConnection(): void {
    try {
      this.socket = io(API_CONFIG.SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.setupEventListeners();
      logger.info('[MapSocketService] Socket connection initialized');
    } catch (error) {
      logger.error('[MapSocketService] Failed to initialize socket connection', error);
    }
  }

  /**
   * Setup socket event listeners
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      logger.info('[MapSocketService] Connected to server');
      this.socket?.emit('map:join', { roomId: this.currentRoomId });
      this.callbacks.onConnect?.();
    });

    this.socket.on('disconnect', () => {
      logger.warn('[MapSocketService] Disconnected from server');
      this.callbacks.onDisconnect?.();
    });

    this.socket.on('map:updated', (data: { roomId: string; mapData: SharedMapData }) => {
      if (data.roomId === this.currentRoomId && data.mapData) {
        logger.info('[MapSocketService] Received map update', { roomId: data.roomId });
        this.callbacks.onMapUpdated?.(data);
      }
    });

    this.socket.on('map:asset:added', (data: { roomId: string; asset: unknown }) => {
      if (data.roomId === this.currentRoomId) {
        logger.info('[MapSocketService] Received asset added');
        this.callbacks.onAssetAdded?.(data);
      }
    });
  }

  /**
   * Set event callbacks
   */
  setCallbacks(callbacks: MapSocketCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Set the current room ID and join the room
   */
  setRoomId(roomId: string): void {
    if (this.currentRoomId !== roomId) {
      this.socket?.emit('map:leave', { roomId: this.currentRoomId });
      this.currentRoomId = roomId;
      this.socket?.emit('map:join', { roomId });
      logger.info('[MapSocketService] Switched to room', { roomId });
    }
  }

  /**
   * Get current room ID
   */
  getRoomId(): string {
    return this.currentRoomId;
  }

  /**
   * Emit map update to other clients
   */
  emitMapUpdate(mapData: SharedMapData): void {
    this.socket?.emit('map:update', { roomId: this.currentRoomId, mapData });
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Disconnect socket
   */
  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}

