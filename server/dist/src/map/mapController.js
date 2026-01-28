"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MapController = void 0;
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
const fs_1 = __importDefault(require("fs"));
// ============================================================================
// MAP CONTROLLER
// ============================================================================
class MapController {
    constructor(io) {
        this.io = io;
    }
    // --------------------------------------------------------------------------
    // MAP CRUD OPERATIONS
    // --------------------------------------------------------------------------
    /**
     * List all maps (for admin/selection purposes)
     */
    async listMaps() {
        try {
            const maps = await prisma_1.prisma.map.findMany({
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
        }
        catch (error) {
            logger_1.logger.error('Error listing maps:', error);
            return [];
        }
    }
    /**
     * Get map by roomId
     */
    async getMap(roomId) {
        try {
            const map = await prisma_1.prisma.map.findUnique({
                where: { roomId },
            });
            if (!map) {
                return null;
            }
            return map.data;
        }
        catch (error) {
            logger_1.logger.error('Error getting map:', error);
            return null;
        }
    }
    /**
     * Get full map record including metadata
     */
    async getMapWithMeta(roomId) {
        try {
            const map = await prisma_1.prisma.map.findUnique({
                where: { roomId },
                include: { assets: true },
            });
            return map;
        }
        catch (error) {
            logger_1.logger.error('Error getting map with meta:', error);
            return null;
        }
    }
    /**
     * Get map sync metadata for cache validation
     * Returns: map data + cache metadata (version, cachedAt, lastModified)
     */
    async getMapSyncMetadata(roomId) {
        try {
            const map = await prisma_1.prisma.map.findUnique({
                where: { roomId },
            });
            if (!map) {
                return null;
            }
            return {
                success: true,
                data: map.data,
                metadata: {
                    version: map.version,
                    updatedAt: map.updatedAt,
                    cacheVersion: 1,
                },
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting map sync metadata:', error);
            return null;
        }
    }
    /**
     * Create or update map (upsert)
     */
    async saveMap(roomId, mapData) {
        try {
            // Update lastModified timestamp
            const updatedMapData = {
                ...mapData,
                lastModified: new Date().toISOString(),
            };
            const result = await prisma_1.prisma.map.upsert({
                where: { roomId },
                update: {
                    name: mapData.metadata?.name || 'Untitled Map',
                    data: updatedMapData,
                    version: { increment: 1 },
                },
                create: {
                    roomId,
                    name: mapData.metadata?.name || 'Untitled Map',
                    data: updatedMapData,
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
            logger_1.logger.info(`Map saved for room ${roomId}, version ${result.version}`);
            return result.data;
        }
        catch (error) {
            logger_1.logger.error('Error saving map:', error);
            return null;
        }
    }
    /**
     * Delete map and its assets
     */
    async deleteMap(roomId) {
        try {
            // First, get all assets to delete files
            const map = await prisma_1.prisma.map.findUnique({
                where: { roomId },
                include: { assets: true },
            });
            if (!map) {
                return false;
            }
            // Delete asset files from filesystem
            for (const asset of map.assets) {
                try {
                    if (fs_1.default.existsSync(asset.filePath)) {
                        fs_1.default.unlinkSync(asset.filePath);
                        logger_1.logger.debug(`Deleted asset file: ${asset.filePath}`);
                    }
                }
                catch (fileError) {
                    logger_1.logger.warn(`Failed to delete asset file ${asset.filePath}:`, fileError);
                }
            }
            // Delete map (cascades to assets via Prisma relation)
            await prisma_1.prisma.map.delete({
                where: { roomId },
            });
            // Broadcast map deletion
            this.io.to(`map:${roomId}`).emit('map:deleted', {
                roomId,
                timestamp: new Date().toISOString(),
            });
            logger_1.logger.info(`Map deleted: ${roomId}`);
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error deleting map:', error);
            return false;
        }
    }
    // --------------------------------------------------------------------------
    // MAP ASSETS CRUD OPERATIONS
    // --------------------------------------------------------------------------
    /**
     * Get all assets for a map
     */
    async getMapAssets(roomId) {
        try {
            const map = await prisma_1.prisma.map.findUnique({
                where: { roomId },
            });
            if (!map) {
                return [];
            }
            const assets = await prisma_1.prisma.mapAsset.findMany({
                where: { mapId: map.id },
                orderBy: { createdAt: 'desc' },
            });
            return assets.map((asset) => {
                const meta = asset.metadata || {};
                return {
                    id: asset.id,
                    mapId: asset.mapId,
                    name: asset.fileName,
                    filePath: asset.filePath,
                    fileUrl: `/uploads/${asset.filePath.split('/uploads/')[1] || asset.filePath}`,
                    fileSize: asset.fileSize,
                    mimeType: asset.mimeType,
                    width: meta.width || undefined,
                    height: meta.height || undefined,
                    metadata: meta,
                    createdAt: asset.createdAt,
                };
            });
        }
        catch (error) {
            logger_1.logger.error('Error getting map assets:', error);
            return [];
        }
    }
    /**
     * Get complete map package: map data + all avatars + map assets
     * Used for initial load to cache everything needed for gameplay
     */
    async getMapPackage(roomId) {
        try {
            const map = await prisma_1.prisma.map.findUnique({
                where: { roomId },
                include: { assets: true },
            });
            if (!map) {
                return null;
            }
            // Get all available characters (avatars) for rendering other players
            const allCharacters = await prisma_1.prisma.character.findMany({
                where: { isEmpty: false },
                select: {
                    id: true,
                    userId: true,
                    name: true,
                    spriteSheet: true,
                    thumbnailPath: true,
                    texturePath: true,
                },
            });
            // Transform assets to include URLs
            const assets = map.assets.map((asset) => {
                const meta = asset.metadata || {};
                return {
                    id: asset.id,
                    mapId: asset.mapId,
                    name: asset.fileName,
                    filePath: asset.filePath,
                    fileUrl: `/uploads/${asset.filePath.split('/uploads/')[1] || asset.filePath}`,
                    fileSize: asset.fileSize,
                    mimeType: asset.mimeType,
                    width: meta.width || undefined,
                    height: meta.height || undefined,
                    metadata: meta,
                    createdAt: asset.createdAt,
                };
            });
            // Calculate total package size
            const totalSize = assets.reduce((sum, asset) => sum + asset.fileSize, 0);
            return {
                success: true,
                data: {
                    map: map.data,
                    avatars: allCharacters,
                    assets: assets,
                    metadata: {
                        version: map.version,
                        updatedAt: map.updatedAt,
                        cacheVersion: 1,
                        totalPackageSize: totalSize,
                    },
                },
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting map package:', error);
            return null;
        }
    }
    /**
     * Create a map asset record (after file upload)
     */
    async createMapAsset(roomId, assetData) {
        try {
            // Get or create map
            let map = await prisma_1.prisma.map.findUnique({ where: { roomId } });
            if (!map) {
                // Create a minimal map if it doesn't exist
                map = await prisma_1.prisma.map.create({
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
            const asset = await prisma_1.prisma.mapAsset.create({
                data: {
                    mapId: map.id,
                    fileName: assetData.name,
                    filePath: assetData.filePath,
                    fileSize: assetData.fileSize,
                    mimeType: assetData.mimeType,
                    metadata: metadataWithDimensions,
                },
            });
            const meta = asset.metadata || {};
            const result = {
                id: asset.id,
                mapId: asset.mapId,
                name: asset.fileName,
                filePath: asset.filePath,
                fileUrl: `/uploads/${asset.filePath.split('/uploads/')[1] || asset.filePath}`,
                fileSize: asset.fileSize,
                mimeType: asset.mimeType,
                width: meta.width || undefined,
                height: meta.height || undefined,
                metadata: meta,
                createdAt: asset.createdAt,
            };
            // Broadcast asset addition
            this.io.to(`map:${roomId}`).emit('map:asset:added', {
                roomId,
                asset: result,
                timestamp: new Date().toISOString(),
            });
            logger_1.logger.info(`Asset created for map ${roomId}: ${asset.fileName}`);
            return result;
        }
        catch (error) {
            logger_1.logger.error('Error creating map asset:', error);
            return null;
        }
    }
    /**
     * Delete a map asset
     */
    async deleteMapAsset(roomId, assetId) {
        try {
            const asset = await prisma_1.prisma.mapAsset.findUnique({
                where: { id: assetId },
                include: { map: true },
            });
            if (!asset || asset.map.roomId !== roomId) {
                return false;
            }
            // Delete file from filesystem
            try {
                if (fs_1.default.existsSync(asset.filePath)) {
                    fs_1.default.unlinkSync(asset.filePath);
                    logger_1.logger.debug(`Deleted asset file: ${asset.filePath}`);
                }
            }
            catch (fileError) {
                logger_1.logger.warn(`Failed to delete asset file ${asset.filePath}:`, fileError);
            }
            // Delete from database
            await prisma_1.prisma.mapAsset.delete({
                where: { id: assetId },
            });
            // Broadcast asset removal
            this.io.to(`map:${roomId}`).emit('map:asset:removed', {
                roomId,
                assetId,
                timestamp: new Date().toISOString(),
            });
            logger_1.logger.info(`Asset deleted from map ${roomId}: ${assetId}`);
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error deleting map asset:', error);
            return false;
        }
    }
    // --------------------------------------------------------------------------
    // SOCKET.IO HANDLERS
    // --------------------------------------------------------------------------
    /**
     * Handle socket join map room for real-time updates
     */
    handleJoinMapRoom(socket, roomId) {
        socket.join(`map:${roomId}`);
        logger_1.logger.debug(`Socket ${socket.id} joined map room ${roomId}`);
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
    handleLeaveMapRoom(socket, roomId) {
        socket.leave(`map:${roomId}`);
        logger_1.logger.debug(`Socket ${socket.id} left map room ${roomId}`);
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
    async handleMapUpdate(socket, data) {
        const savedMap = await this.saveMap(data.roomId, data.mapData);
        if (!savedMap) {
            socket.emit('map:error', { error: 'Failed to save map' });
        }
    }
    /**
     * Handle partial map update (e.g., single area change)
     */
    async handlePartialUpdate(socket, data) {
        // Broadcast partial update to other clients (optimistic UI)
        socket.to(`map:${data.roomId}`).emit('map:partial:update', {
            ...data,
            timestamp: new Date().toISOString(),
        });
    }
}
exports.MapController = MapController;
