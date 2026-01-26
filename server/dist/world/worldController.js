"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorldController = void 0;
const logger_1 = require("../utils/logger");
const characterController_1 = require("../character/characterController");
// In-memory storage for world state
const worldRooms = new Map();
const players = new Map();
const roomPlayers = new Map();
// Socket-to-player mapping for proper disconnect handling
const socketPlayerMap = new Map();
class WorldController {
    constructor(io) {
        this.io = io;
    }
    // Handle player joining world
    async handlePlayerJoinedWorld(socket, data) {
        const { playerId, x, y, roomId, name, avatarData } = data;
        // Track socket-to-player mapping for disconnect handling
        socketPlayerMap.set(socket.id, playerId);
        logger_1.logger.info(`[WorldController] Socket ${socket.id} mapped to player ${playerId}`);
        // Create world room if it doesn't exist
        if (!worldRooms.has(roomId)) {
            worldRooms.set(roomId, {
                id: roomId,
                name: `World ${roomId}`,
                type: 'world',
                participants: [],
                createdAt: new Date(),
                isPrivate: false
            });
            roomPlayers.set(roomId, new Set());
        }
        // Determine avatar data: use provided or fall back to DB
        let finalAvatarData = avatarData;
        if (!finalAvatarData) {
            logger_1.logger.debug(`[WorldController] No avatarData provided by client for ${playerId}, attempting to load from DB`);
            const dbAvatarData = await characterController_1.characterController.getActiveCharacterAvatarSync(playerId);
            if (dbAvatarData) {
                finalAvatarData = dbAvatarData;
                logger_1.logger.debug(`[WorldController] Loaded avatarData from DB for ${playerId}`);
            }
            else {
                logger_1.logger.debug(`[WorldController] No avatarData in DB for ${playerId}, will render placeholder`);
            }
        }
        // Create or update player with avatar data
        // Use provided display name, or fall back to playerId
        const displayName = name || playerId;
        const player = {
            id: playerId,
            name: displayName,
            x: this.clampPosition(x, 'x'),
            y: this.clampPosition(y, 'y'),
            roomId,
            lastMoved: new Date(),
            avatarData: finalAvatarData
        };
        players.set(playerId, player);
        // Add player to room
        const room = worldRooms.get(roomId);
        if (!room.participants.includes(playerId)) {
            room.participants.push(playerId);
        }
        roomPlayers.get(roomId).add(playerId);
        // Join socket room
        socket.join(roomId);
        // Notify other players with avatar data
        socket.to(roomId).emit('player-joined', {
            playerId,
            x: player.x,
            y: player.y,
            name: player.name,
            avatarData: player.avatarData
        });
        // Send current players to new player (with their avatar data)
        const currentPlayers = Array.from(roomPlayers.get(roomId))
            .filter(id => id !== playerId)
            .map(id => players.get(id))
            .filter(p => p !== undefined);
        socket.emit('world-state', {
            players: currentPlayers,
            roomId
        });
        console.log(`Player ${playerId} joined world room: ${roomId} at (${x}, ${y})`);
    }
    // Handle player movement
    handlePlayerMoved(socket, data) {
        const { playerId, x, y, roomId } = data;
        const player = players.get(playerId);
        if (!player || player.roomId !== roomId) {
            socket.emit('error', { message: 'Player not found in room' });
            return;
        }
        // Validate and clamp position
        const newX = this.clampPosition(x, 'x');
        const newY = this.clampPosition(y, 'y');
        // Update player position
        player.x = newX;
        player.y = newY;
        player.lastMoved = new Date();
        // Broadcast movement to other players in the room
        socket.to(roomId).emit('player-moved', {
            playerId,
            x: newX,
            y: newY
        });
    }
    // Handle player disconnect - looks up playerId from socket mapping
    handleDisconnect(socket) {
        // Look up playerId from socket-to-player mapping
        const playerId = socketPlayerMap.get(socket.id);
        if (!playerId) {
            logger_1.logger.debug(`[WorldController] No player found for socket ${socket.id}`);
            return;
        }
        const player = players.get(playerId);
        if (player) {
            const { roomId } = player;
            // Remove player from room
            if (roomPlayers.has(roomId)) {
                roomPlayers.get(roomId).delete(playerId);
            }
            if (worldRooms.has(roomId)) {
                const room = worldRooms.get(roomId);
                room.participants = room.participants.filter(p => p !== playerId);
            }
            // Remove player
            players.delete(playerId);
            // Clean up socket-to-player mapping
            socketPlayerMap.delete(socket.id);
            // Notify other players
            socket.to(roomId).emit('player-left', { playerId });
            logger_1.logger.info(`[WorldController] Player ${playerId} left world room: ${roomId}`);
        }
    }
    // Clamp position to world boundaries
    clampPosition(value, axis) {
        const worldWidth = 800;
        const worldHeight = 600;
        const padding = 16;
        if (axis === 'x') {
            return Math.max(padding, Math.min(worldWidth - padding, value));
        }
        else {
            return Math.max(padding, Math.min(worldHeight - padding, value));
        }
    }
    // Get world state (API endpoint)
    getWorldState(roomId) {
        const room = worldRooms.get(roomId);
        if (!room)
            return null;
        const roomPlayerSet = roomPlayers.get(roomId) || new Set();
        const playersInRoom = Array.from(roomPlayerSet)
            .map(id => players.get(id))
            .filter(p => p !== undefined);
        return {
            room,
            players: playersInRoom,
            playerCount: playersInRoom.length
        };
    }
}
exports.WorldController = WorldController;
