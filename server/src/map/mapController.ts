import { Server, Socket } from 'socket.io';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

export interface MapData {
  interactiveAreas: unknown[];
  impassableAreas: unknown[];
  worldDimensions: { width: number; height: number };
  backgroundImage?: string;
  backgroundImageDimensions?: { width: number; height: number };
  version: number;
  lastModified: string;
  createdBy: string;
  metadata: {
    name: string;
    description: string;
    tags: string[];
    isPublic: boolean;
  };
  layers: unknown[];
  resources: unknown[];
  assets?: unknown[];
}

export class MapController {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  /**
   * Get map by roomId
   */
  async getMap(roomId: string): Promise<MapData | null> {
    try {
      const map = await prisma.map.findUnique({
        where: { roomId },
      });

      if (!map) {
        return null;
      }

      return map.data as unknown as MapData;
    } catch (error) {
      logger.error('Error getting map:', error);
      return null;
    }
  }

  /**
   * Create or update map
   */
  async saveMap(roomId: string, mapData: MapData): Promise<MapData | null> {
    try {
      const result = await prisma.map.upsert({
        where: { roomId },
        update: {
          name: mapData.metadata?.name || 'Untitled Map',
          data: mapData as object,
          version: mapData.version,
        },
        create: {
          roomId,
          name: mapData.metadata?.name || 'Untitled Map',
          data: mapData as object,
          version: mapData.version || 1,
        },
      });

      // Broadcast map update to all clients in the room
      this.io.to(`map:${roomId}`).emit('map:updated', {
        roomId,
        mapData: result.data,
        version: result.version,
      });

      logger.info(`Map saved for room ${roomId}, version ${result.version}`);
      return result.data as unknown as MapData;
    } catch (error) {
      logger.error('Error saving map:', error);
      return null;
    }
  }

  /**
   * Handle socket join map room for real-time updates
   */
  handleJoinMapRoom(socket: Socket, roomId: string): void {
    socket.join(`map:${roomId}`);
    logger.debug(`Socket ${socket.id} joined map room ${roomId}`);
  }

  /**
   * Handle socket leave map room
   */
  handleLeaveMapRoom(socket: Socket, roomId: string): void {
    socket.leave(`map:${roomId}`);
    logger.debug(`Socket ${socket.id} left map room ${roomId}`);
  }

  /**
   * Handle map update from socket
   */
  async handleMapUpdate(socket: Socket, data: { roomId: string; mapData: MapData }): Promise<void> {
    const savedMap = await this.saveMap(data.roomId, data.mapData);
    if (!savedMap) {
      socket.emit('map:error', { error: 'Failed to save map' });
    }
  }
}

