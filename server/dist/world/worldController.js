"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorldController = void 0;
// In-memory storage for world state
const worldRooms = new Map();
const players = new Map();
const roomPlayers = new Map();
class WorldController {
    constructor(io) {
        this.io = io;
    }
    // Handle player joining world
    handlePlayerJoinedWorld(socket, data) {
        const { playerId, x, y, roomId } = data;
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
        // Create or update player
        const player = {
            id: playerId,
            name: playerId,
            x: this.clampPosition(x, 'x'),
            y: this.clampPosition(y, 'y'),
            roomId,
            lastMoved: new Date()
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
        // Notify other players
        socket.to(roomId).emit('player-joined', {
            playerId,
            x: player.x,
            y: player.y,
            name: player.name
        });
        // Send current players to new player
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
    // Handle player disconnect
    handleDisconnect(socket, playerId) {
        if (!playerId)
            return;
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
            // Notify other players
            socket.to(roomId).emit('player-left', { playerId });
            console.log(`Player ${playerId} left world room: ${roomId}`);
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
