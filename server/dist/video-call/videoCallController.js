"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoCallController = void 0;
// In-memory storage for video call state
const videoRooms = new Map();
const participantSockets = new Map();
class VideoCallController {
    constructor(io) {
        this.io = io;
    }
    // Handle participant joining video call
    handleJoinVideoCall(socket, data) {
        const { roomId, participantName } = data;
        // Create video room if it doesn't exist
        if (!videoRooms.has(roomId)) {
            videoRooms.set(roomId, {
                id: roomId,
                name: `Video Call - ${roomId}`,
                type: 'video',
                participants: [],
                participantDetails: [],
                createdAt: new Date(),
                isPrivate: false,
                jitsiRoomId: `stargety-oasis-${roomId}-${Date.now()}`
            });
        }
        const room = videoRooms.get(roomId);
        // Create participant
        const participant = {
            id: socket.id,
            name: participantName,
            socketId: socket.id,
            joinedAt: new Date()
        };
        // Add participant to room
        room.participants.push(participant.id);
        room.participantDetails.push(participant);
        participantSockets.set(socket.id, roomId);
        // Join socket room
        socket.join(roomId);
        // Notify other participants
        socket.to(roomId).emit('participant-joined', {
            participant: {
                id: participant.id,
                name: participant.name,
                joinedAt: participant.joinedAt
            },
            roomId
        });
        // Send room info to new participant
        socket.emit('video-call-joined', {
            roomId,
            jitsiRoomId: room.jitsiRoomId,
            participants: room.participantDetails.map(p => ({
                id: p.id,
                name: p.name,
                joinedAt: p.joinedAt
            }))
        });
        console.log(`${participantName} joined video call: ${roomId}`);
    }
    // Handle participant leaving video call
    handleLeaveVideoCall(socket, data) {
        const { roomId } = data;
        this.removeParticipantFromRoom(socket, roomId);
    }
    // Handle participant disconnect
    handleDisconnect(socket) {
        const roomId = participantSockets.get(socket.id);
        if (roomId) {
            this.removeParticipantFromRoom(socket, roomId);
        }
    }
    // Remove participant from room
    removeParticipantFromRoom(socket, roomId) {
        const room = videoRooms.get(roomId);
        if (!room)
            return;
        const participantIndex = room.participantDetails.findIndex(p => p.socketId === socket.id);
        if (participantIndex === -1)
            return;
        const participant = room.participantDetails[participantIndex];
        room.participants = room.participants.filter(id => id !== participant.id);
        room.participantDetails.splice(participantIndex, 1);
        participantSockets.delete(socket.id);
        // Leave socket room
        socket.leave(roomId);
        // Notify other participants
        socket.to(roomId).emit('participant-left', {
            participantId: participant.id,
            participantName: participant.name,
            roomId
        });
        // Clean up empty rooms
        if (room.participantDetails.length === 0) {
            videoRooms.delete(roomId);
            console.log(`Video call room ${roomId} cleaned up (empty)`);
        }
        console.log(`${participant.name} left video call: ${roomId}`);
    }
    // Get video call room info (API endpoint)
    getVideoCallRoom(roomId) {
        const room = videoRooms.get(roomId);
        if (!room)
            return null;
        return {
            ...room,
            participantCount: room.participantDetails.length
        };
    }
    // Get all active video calls (API endpoint)
    getAllVideoCallRooms() {
        return Array.from(videoRooms.values()).map(room => ({
            id: room.id,
            name: room.name,
            participantCount: room.participantDetails.length,
            createdAt: room.createdAt,
            jitsiRoomId: room.jitsiRoomId
        }));
    }
}
exports.VideoCallController = VideoCallController;
