import { Server, Socket } from 'socket.io';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import fs from 'fs';
import path from 'path';

// ============================================================================
// INTERFACES
// ============================================================================

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

export interface MapAssetData {
  id: string;
  mapId: string;
  name: string;
  filePath: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

export interface MapListItem {
  id: string;
  roomId: string;
  name: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// MAP CONTROLLER
// ============================================================================

export class MapController {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  // --------------------------------------------------------------------------
  // MAP CRUD OPERATIONS
  // --------------------------------------------------------------------------

  /**
   * List all maps (for admin/selection purposes)
   */
  async listMaps(): Promise<MapListItem[]> {
    try {
      const maps = await prisma.map.findMany({
        select: {
          id: true,
          roomId: true,
          name: true,
          version: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
      });
      return maps;
    } catch (error) {
      logger.error('Error listing maps:', error);
      return [];
    }
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
   * Get full map record including metadata
   */
  async getMapWithMeta(roomId: string) {
    try {
      const map = await prisma.map.findUnique({
        where: { roomId },
        include: { assets: true },
      });
      return map;
    } catch (error) {
      logger.error('Error getting map with meta:', error);
      return null;
    }
  }

  /**
   * Create or update map (upsert)
   */
  async saveMap(roomId: string, mapData: MapData): Promise<MapData | null> {
    try {
      // Update lastModified timestamp
      const updatedMapData = {
        ...mapData,
        lastModified: new Date().toISOString(),
      };

      const result = await prisma.map.upsert({
        where: { roomId },
        update: {
          name: mapData.metadata?.name || 'Untitled Map',
          data: updatedMapData as object,
          version: { increment: 1 },
        },
        create: {
          roomId,
          name: mapData.metadata?.name || 'Untitled Map',
          data: updatedMapData as object,
          version: 1,
        },
      });

      // Broadcast map update to all clients in the room
      this.io.to(`map:${roomId}`).emit('map:updated', {
        roomId,
        mapData: result.data,
        version: result.version,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Map saved for room ${roomId}, version ${result.version}`);
      return result.data as unknown as MapData;
    } catch (error) {
      logger.error('Error saving map:', error);
      return null;
    }
  }

  /**
   * Delete map and its assets
   */
  async deleteMap(roomId: string): Promise<boolean> {
    try {
      // First, get all assets to delete files
      const map = await prisma.map.findUnique({
        where: { roomId },
        include: { assets: true },
      });

      if (!map) {
        return false;
      }

      // Delete asset files from filesystem
      for (const asset of map.assets) {
        try {
          if (fs.existsSync(asset.filePath)) {
            fs.unlinkSync(asset.filePath);
            logger.debug(`Deleted asset file: ${asset.filePath}`);
          }
        } catch (fileError) {
          logger.warn(`Failed to delete asset file ${asset.filePath}:`, fileError);
        }
      }

      // Delete map (cascades to assets via Prisma relation)
      await prisma.map.delete({
        where: { roomId },
      });

      // Broadcast map deletion
      this.io.to(`map:${roomId}`).emit('map:deleted', {
        roomId,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Map deleted: ${roomId}`);
      return true;
    } catch (error) {
      logger.error('Error deleting map:', error);
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // MAP ASSETS CRUD OPERATIONS
  // --------------------------------------------------------------------------

  /**
   * Get all assets for a map
   */
  async getMapAssets(roomId: string): Promise<MapAssetData[]> {
    try {
      const map = await prisma.map.findUnique({
        where: { roomId },
      });

      if (!map) {
        return [];
      }

      const assets = await prisma.mapAsset.findMany({
        where: { mapId: map.id },
        orderBy: { createdAt: 'desc' },
      });

      return assets.map((asset) => {
        const meta = asset.metadata as Record<string, unknown> || {};
        return {
          id: asset.id,
          mapId: asset.mapId,
          name: asset.fileName,
          filePath: asset.filePath,
          fileUrl: `/uploads/${asset.filePath.split('/uploads/')[1] || asset.filePath}`,
          fileSize: asset.fileSize,
          mimeType: asset.mimeType,
          width: (meta.width as number) || undefined,
          height: (meta.height as number) || undefined,
          metadata: meta,
          createdAt: asset.createdAt,
        };
      });
    } catch (error) {
      logger.error('Error getting map assets:', error);
      return [];
    }
  }

  /**
   * Create a map asset record (after file upload)
   */
  async createMapAsset(
    roomId: string,
    assetData: {
      name: string;
      filePath: string;
      fileSize: number;
      mimeType: string;
      width?: number;
      height?: number;
      metadata?: Record<string, unknown>;
    }
  ): Promise<MapAssetData | null> {
    try {
      // Get or create map
      let map = await prisma.map.findUnique({ where: { roomId } });

      if (!map) {
        // Create a minimal map if it doesn't exist
        map = await prisma.map.create({
          data: {
            roomId,
            name: 'Untitled Map',
            data: {
              interactiveAreas: [],
              impassableAreas: [],
              worldDimensions: { width: 800, height: 600 },
              version: 1,
              lastModified: new Date().toISOString(),
              createdBy: 'system',
              metadata: { name: 'Untitled Map', description: '', tags: [], isPublic: false },
              layers: [],
              resources: [],
            },
            version: 1,
          },
        });
      }

      // Store width/height in metadata JSON
      const metadataWithDimensions = {
        ...(assetData.metadata || {}),
        width: assetData.width,
        height: assetData.height,
      };

      const asset = await prisma.mapAsset.create({
        data: {
          mapId: map.id,
          fileName: assetData.name,
          filePath: assetData.filePath,
          fileSize: assetData.fileSize,
          mimeType: assetData.mimeType,
          metadata: metadataWithDimensions,
        },
      });

      const meta = asset.metadata as Record<string, unknown> || {};
      const result: MapAssetData = {
        id: asset.id,
        mapId: asset.mapId,
        name: asset.fileName,
        filePath: asset.filePath,
        fileUrl: `/uploads/${asset.filePath.split('/uploads/')[1] || asset.filePath}`,
        fileSize: asset.fileSize,
        mimeType: asset.mimeType,
        width: (meta.width as number) || undefined,
        height: (meta.height as number) || undefined,
        metadata: meta,
        createdAt: asset.createdAt,
      };

      // Broadcast asset addition
      this.io.to(`map:${roomId}`).emit('map:asset:added', {
        roomId,
        asset: result,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Asset created for map ${roomId}: ${asset.fileName}`);
      return result;
    } catch (error) {
      logger.error('Error creating map asset:', error);
      return null;
    }
  }

  /**
   * Delete a map asset
   */
  async deleteMapAsset(roomId: string, assetId: string): Promise<boolean> {
    try {
      const asset = await prisma.mapAsset.findUnique({
        where: { id: assetId },
        include: { map: true },
      });

      if (!asset || asset.map.roomId !== roomId) {
        return false;
      }

      // Delete file from filesystem
      try {
        if (fs.existsSync(asset.filePath)) {
          fs.unlinkSync(asset.filePath);
          logger.debug(`Deleted asset file: ${asset.filePath}`);
        }
      } catch (fileError) {
        logger.warn(`Failed to delete asset file ${asset.filePath}:`, fileError);
      }

      // Delete from database
      await prisma.mapAsset.delete({
        where: { id: assetId },
      });

      // Broadcast asset removal
      this.io.to(`map:${roomId}`).emit('map:asset:removed', {
        roomId,
        assetId,
        timestamp: new Date().toISOString(),
      });

      logger.info(`Asset deleted from map ${roomId}: ${assetId}`);
      return true;
    } catch (error) {
      logger.error('Error deleting map asset:', error);
      return false;
    }
  }

  // --------------------------------------------------------------------------
  // SOCKET.IO HANDLERS
  // --------------------------------------------------------------------------

  /**
   * Handle socket join map room for real-time updates
   */
  handleJoinMapRoom(socket: Socket, roomId: string): void {
    socket.join(`map:${roomId}`);
    logger.debug(`Socket ${socket.id} joined map room ${roomId}`);

    // Notify others in the room
    socket.to(`map:${roomId}`).emit('map:user:joined', {
      socketId: socket.id,
      roomId,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Handle socket leave map room
   */
  handleLeaveMapRoom(socket: Socket, roomId: string): void {
    socket.leave(`map:${roomId}`);
    logger.debug(`Socket ${socket.id} left map room ${roomId}`);

    // Notify others in the room
    socket.to(`map:${roomId}`).emit('map:user:left', {
      socketId: socket.id,
      roomId,
      timestamp: new Date().toISOString(),
    });
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

  /**
   * Handle partial map update (e.g., single area change)
   */
  async handlePartialUpdate(
    socket: Socket,
    data: {
      roomId: string;
      changeType: 'area:add' | 'area:update' | 'area:remove' | 'collision:add' | 'collision:update' | 'collision:remove';
      payload: unknown;
    }
  ): Promise<void> {
    // Broadcast partial update to other clients (optimistic UI)
    socket.to(`map:${data.roomId}`).emit('map:partial:update', {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }
}

