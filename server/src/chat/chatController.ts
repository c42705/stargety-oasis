import { Socket, Server } from 'socket.io';
import { ChatMessage, Room, User } from '../types';

// In-memory storage (replace with database in production)
const messages: Map<string, ChatMessage[]> = new Map();
const rooms: Map<string, Room> = new Map();
const users: Map<string, User> = new Map();
const userRooms: Map<string, Set<string>> = new Map();

export class ChatController {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  // Handle user joining a room
  handleJoinRoom(socket: Socket, data: { roomId: string; user: string }) {
    const { roomId, user } = data;

    // Create room if it doesn't exist
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        id: roomId,
        name: roomId,
        type: 'chat',
        participants: [],
        createdAt: new Date(),
        isPrivate: false
      });
      messages.set(roomId, []);
    }

    // Add user to room
    const room = rooms.get(roomId)!;
    if (!room.participants.includes(user)) {
      room.participants.push(user);
    }

    // Track user rooms
    if (!userRooms.has(user)) {
      userRooms.set(user, new Set());
    }
    userRooms.get(user)!.add(roomId);

    // Join socket room
    socket.join(roomId);

    // Create or update user
    const userId = socket.id;
    users.set(userId, {
      id: userId,
      name: user,
      isOnline: true,
      lastSeen: new Date(),
      joinedAt: new Date()
    });

    // Notify others in the room
    socket.to(roomId).emit('user-joined', user);

    // Send room info to user
    socket.emit('room-joined', {
      roomId,
      participants: room.participants,
      messageHistory: messages.get(roomId)?.slice(-50) || []
    });

    // Send updated user list
    this.io.to(roomId).emit('users-list', room.participants);

    console.log(`${user} joined chat room: ${roomId}`);
  }

  // Handle sending messages
  handleSendMessage(socket: Socket, data: ChatMessage) {
    const { roomId, message, user } = data;

    if (!rooms.has(roomId)) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    // Create message object
    const chatMessage: ChatMessage = {
      id: Date.now().toString(),
      message: message.trim(),
      user,
      userId: socket.id,
      timestamp: new Date(),
      type: 'message',
      roomId,
    };

    // Store message
    if (!messages.has(roomId)) {
      messages.set(roomId, []);
    }

    const roomMessages = messages.get(roomId)!;
    roomMessages.push(chatMessage);

    // Keep only last 100 messages per room
    if (roomMessages.length > 100) {
      roomMessages.splice(0, roomMessages.length - 100);
    }

    // Broadcast message to room
    this.io.to(roomId).emit('chat-message', chatMessage);

    console.log(`Message sent to room ${roomId} by ${user}: ${message}`);
  }

  // Handle typing indicators
  handleTyping(socket: Socket, data: { user: string; isTyping: boolean; roomId: string }) {
    socket.to(data.roomId).emit('user-typing', data);
  }

  // Handle user disconnect
  handleDisconnect(socket: Socket) {
    const userId = socket.id;
    const user = users.get(userId);

    if (user) {
      // Mark user as offline
      user.isOnline = false;
      user.lastSeen = new Date();

      // Remove from all rooms
      const userRoomSet = userRooms.get(user.name);
      if (userRoomSet) {
        userRoomSet.forEach(roomId => {
          const room = rooms.get(roomId);
          if (room) {
            room.participants = room.participants.filter(p => p !== user.name);
            socket.to(roomId).emit('user-left', user.name);
            this.io.to(roomId).emit('users-list', room.participants);
          }
        });
        userRooms.delete(user.name);
      }

      console.log(`User disconnected: ${user.name} (${userId})`);
    }
  }

  // Get room messages (API endpoint)
  getRoomMessages(roomId: string, limit: number = 50) {
    const roomMessages = messages.get(roomId) || [];
    return roomMessages.slice(-limit);
  }

  // Get room info (API endpoint)
  getRoomInfo(roomId: string) {
    return rooms.get(roomId);
  }
}
