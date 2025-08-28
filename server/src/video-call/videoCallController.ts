import { Socket, Server } from 'socket.io';
import { Room } from '../types';

interface VideoCallParticipant {
  id: string;
  name: string;
  socketId: string;
  joinedAt: Date;
}

interface VideoCallRoom extends Room {
  type: 'video';
  participantDetails: VideoCallParticipant[];
  jitsiRoomId: string;
}

// In-memory storage for video call state
const videoRooms: Map<string, VideoCallRoom> = new Map();
const participantSockets: Map<string, string> = new Map();

export class VideoCallController {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  // Handle participant joining video call
  handleJoinVideoCall(socket: Socket, data: { roomId: string; participantName: string }) {
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

    const room = videoRooms.get(roomId)!;

    // Create participant
    const participant: VideoCallParticipant = {
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
  handleLeaveVideoCall(socket: Socket, data: { roomId: string }) {
    const { roomId } = data;
    this.removeParticipantFromRoom(socket, roomId);
  }

  // Handle participant disconnect
  handleDisconnect(socket: Socket) {
    const roomId = participantSockets.get(socket.id);
    if (roomId) {
      this.removeParticipantFromRoom(socket, roomId);
    }
  }

  // Remove participant from room
  private removeParticipantFromRoom(socket: Socket, roomId: string) {
    const room = videoRooms.get(roomId);
    if (!room) return;

    const participantIndex = room.participantDetails.findIndex(p => p.socketId === socket.id);
    if (participantIndex === -1) return;

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
  getVideoCallRoom(roomId: string) {
    const room = videoRooms.get(roomId);
    if (!room) return null;

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
