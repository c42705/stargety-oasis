import { io, Socket } from 'socket.io-client';
import { API_CONFIG } from '../shared/constants';
import { logger } from '../shared/logger';

// Avatar data structure for synchronization between players
export interface AvatarSyncData {
  spriteSheetImageData: string;  // Base64 of the composed sprite sheet
  frameWidth: number;
  frameHeight: number;
  characterName: string;
}

// Player data received from server
export interface RemotePlayerData {
  playerId: string;
  x: number;
  y: number;
  name: string;
  avatarData?: AvatarSyncData;
}

// Server WorldPlayer format (from world-state event)
export interface ServerWorldPlayer {
  id: string;
  name: string;
  x: number;
  y: number;
  roomId: string;
  avatarData?: AvatarSyncData;
}

// Event callbacks
export interface WorldSocketCallbacks {
  onPlayerJoined: (player: RemotePlayerData) => void;
  onPlayerMoved: (data: { playerId: string; x: number; y: number }) => void;
  onPlayerLeft: (data: { playerId: string }) => void;
  onWorldState: (data: { players: ServerWorldPlayer[]; roomId: string }) => void;
  onError?: (error: { message: string }) => void;
}

/**
 * WorldSocketService - Singleton for managing world multiplayer Socket.IO connection
 *
 * Responsibilities:
 * - Connect to server for world synchronization
 * - Emit player position updates
 * - Listen for other players' events
 * - Handle reconnection gracefully
 */
export class WorldSocketService {
  private static instance: WorldSocketService;
  private socket: Socket | null = null;
  private callbacks: WorldSocketCallbacks | null = null;
  private currentPlayerId: string = '';
  private currentPlayerName: string = '';
  private currentRoomId: string = '';
  private isConnected: boolean = false;
  private hasJoinedRoom: boolean = false; // Prevent duplicate join events
  private lastEmittedPosition: { x: number; y: number } = { x: 0, y: 0 };
  private moveThrottleMs: number = 50; // Max 20 updates/second
  private lastMoveTime: number = 0;
  private connectionResolvers: Array<() => void> = [];

  private constructor() {
    // Private constructor for singleton
  }

  public static getInstance(): WorldSocketService {
    if (!WorldSocketService.instance) {
      WorldSocketService.instance = new WorldSocketService();
    }
    return WorldSocketService.instance;
  }

  /**
   * Initialize socket connection with callbacks
   */
  public initialize(callbacks: WorldSocketCallbacks): void {
    this.callbacks = callbacks;

    if (this.socket) {
      logger.info('[WorldSocket] Already initialized, reusing connection');
      return;
    }

    this.socket = io(API_CONFIG.SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.setupEventListeners();
    logger.info('[WorldSocket] Initialized socket connection');
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      this.isConnected = true;
      logger.info('[WorldSocket] Connected to server');

      // Resolve any pending connection promises
      this.connectionResolvers.forEach(resolve => resolve());
      this.connectionResolvers = [];

      // Re-join room if we were in one (reconnection case)
      if (this.currentPlayerId && this.currentRoomId) {
        this.joinWorld(
          this.currentPlayerId,
          this.currentRoomId,
          this.lastEmittedPosition.x,
          this.lastEmittedPosition.y,
          this.currentPlayerName
        );
      }
    });

    this.socket.on('disconnect', () => {
      this.isConnected = false;
      this.hasJoinedRoom = false; // Reset so we can rejoin on reconnect
      logger.warn('[WorldSocket] Disconnected from server');
    });

    // Listen for other players joining
    this.socket.on('player-joined', (data: RemotePlayerData) => {
      logger.info('[WorldSocket] Player joined:', data.playerId);
      this.callbacks?.onPlayerJoined(data);
    });

    // Listen for player movement
    this.socket.on('player-moved', (data: { playerId: string; x: number; y: number }) => {
      this.callbacks?.onPlayerMoved(data);
    });

    // Listen for players leaving
    this.socket.on('player-left', (data: { playerId: string }) => {
      logger.info('[WorldSocket] Player left:', data.playerId);
      this.callbacks?.onPlayerLeft(data);
    });

    // Receive world state (existing players when joining)
    this.socket.on('world-state', (data: { players: ServerWorldPlayer[]; roomId: string }) => {
      logger.info(`[WorldSocket] Received world state: ${data.players.length} players`);
      this.callbacks?.onWorldState(data);
    });

    // Error handling
    this.socket.on('error', (error: { message: string }) => {
      logger.error('[WorldSocket] Error:', error);
      this.callbacks?.onError?.(error);
    });
  }

  /**
   * Wait for socket connection (with timeout)
   */
  public waitForConnection(timeoutMs: number = 5000): Promise<boolean> {
    return new Promise((resolve) => {
      if (this.isConnected) {
        resolve(true);
        return;
      }

      const timeout = setTimeout(() => {
        // Remove resolver from array
        this.connectionResolvers = this.connectionResolvers.filter(r => r !== resolver);
        logger.warn('[WorldSocket] Connection timeout');
        resolve(false);
      }, timeoutMs);

      const resolver = () => {
        clearTimeout(timeout);
        resolve(true);
      };

      this.connectionResolvers.push(resolver);
    });
  }

  /**
   * Join a world room
   */
  public joinWorld(
    playerId: string,
    roomId: string,
    x: number,
    y: number,
    name?: string,
    avatarData?: AvatarSyncData
  ): void {
    if (!this.socket || !this.isConnected) {
      logger.warn('[WorldSocket] Cannot join world - not connected');
      return;
    }

    // Prevent duplicate join if already in the same room with the same player
    if (this.hasJoinedRoom &&
        this.currentPlayerId === playerId &&
        this.currentRoomId === roomId) {
      logger.info('[WorldSocket] Already joined this room, skipping duplicate join');
      return;
    }

    this.currentPlayerId = playerId;
    this.currentPlayerName = name || playerId;
    this.currentRoomId = roomId;
    this.lastEmittedPosition = { x, y };
    this.hasJoinedRoom = true;

    this.socket.emit('player-joined-world', {
      playerId,
      name: this.currentPlayerName,
      x,
      y,
      roomId,
      avatarData,
    });

    logger.info(`[WorldSocket] Joined world room: ${roomId} as ${this.currentPlayerName} at (${x}, ${y})`);
  }

  /**
   * Emit player movement (throttled)
   */
  public emitMove(x: number, y: number): void {
    if (!this.socket || !this.isConnected || !this.currentPlayerId) return;

    const now = Date.now();
    if (now - this.lastMoveTime < this.moveThrottleMs) return;

    // Only emit if position actually changed
    if (x === this.lastEmittedPosition.x && y === this.lastEmittedPosition.y) return;

    this.lastMoveTime = now;
    this.lastEmittedPosition = { x, y };

    this.socket.emit('player-moved', {
      playerId: this.currentPlayerId,
      x,
      y,
      roomId: this.currentRoomId,
    });
  }

  /**
   * Leave current world room
   */
  public leaveWorld(): void {
    this.currentPlayerId = '';
    this.currentRoomId = '';
    logger.info('[WorldSocket] Left world room');
  }

  /**
   * Disconnect socket entirely
   */
  public disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      logger.info('[WorldSocket] Disconnected and cleaned up');
    }
  }

  /**
   * Check if connected
   */
  public getIsConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Get current room ID
   */
  public getCurrentRoomId(): string {
    return this.currentRoomId;
  }
}
