import { Socket, Server } from 'socket.io';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';

// ============================================================================
// INTERFACES
// ============================================================================

export interface MessageContent {
  text: string;
  mentions?: string[];
  attachments?: Array<{ url: string; type: string; name: string }>;
}

export interface ChatMessageData {
  id: string;
  content: MessageContent;
  authorId: string | null;
  authorName: string;
  roomId: string;
  createdAt: Date;
}

export interface ChatRoomData {
  id: string;
  name: string;
  roomId: string;
  description: string | null;
  createdAt: Date;
}

// ============================================================================
// CHAT DATABASE CONTROLLER
// ============================================================================

export class ChatDbController {
  private io: Server;
  
  // In-memory tracking for active users (ephemeral state)
  private roomParticipants: Map<string, Set<string>> = new Map();
  private userSockets: Map<string, string> = new Map(); // socketId -> username

  constructor(io: Server) {
    this.io = io;
  }

  // --------------------------------------------------------------------------
  // ROOM MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Get or create a chat room
   */
  async getOrCreateRoom(roomId: string, name?: string): Promise<ChatRoomData | null> {
    try {
      let room = await prisma.chatRoom.findUnique({
        where: { roomId },
      });

      if (!room) {
        room = await prisma.chatRoom.create({
          data: {
            roomId,
            name: name ?? roomId,
            description: null,
            expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours from now
          },
        });
        logger.info(`Created chat room: ${roomId}`);
      }

      return {
        id: room.id,
        name: room.name,
        roomId: room.roomId,
        description: room.description,
        createdAt: room.createdAt,
      };
    } catch (error) {
      logger.error('Error getting/creating room:', error);
      return null;
    }
  }

  /**
   * List all chat rooms
   */
  async listRooms(): Promise<ChatRoomData[]> {
    try {
      const rooms = await prisma.chatRoom.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return rooms.map((r) => ({
        id: r.id,
        name: r.name,
        roomId: r.roomId,
        description: r.description,
        createdAt: r.createdAt,
      }));
    } catch (error) {
      logger.error('Error listing rooms:', error);
      return [];
    }
  }

  // --------------------------------------------------------------------------
  // MESSAGE PERSISTENCE
  // --------------------------------------------------------------------------

  /**
   * Get messages for a room with pagination
   */
  async getMessages(
    roomId: string,
    options: { limit?: number; before?: string; after?: string } = {}
  ): Promise<{ messages: ChatMessageData[]; hasMore: boolean }> {
    const { limit = 50, before, after } = options;

    try {
      // Ensure room exists
      const room = await prisma.chatRoom.findUnique({ where: { roomId } });
      if (!room) {
        return { messages: [], hasMore: false };
      }

      const whereClause: Record<string, unknown> = { roomId: room.id };

      // Cursor-based pagination
      if (before) {
        whereClause.createdAt = { lt: new Date(before) };
      } else if (after) {
        whereClause.createdAt = { gt: new Date(after) };
      }

      const messages = await prisma.message.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit + 1, // Fetch one extra to check if there's more
        include: { author: { select: { username: true } } },
      });

      const hasMore = messages.length > limit;
      const resultMessages = messages.slice(0, limit).reverse(); // Reverse to get chronological order

      return {
        messages: resultMessages.map((m) => ({
          id: m.id,
          content: m.content as unknown as MessageContent,
          authorId: m.authorId,
          authorName: (m.content as unknown as MessageContent & { authorName?: string }).authorName
            ?? m.author?.username ?? 'Anonymous',
          roomId,
          createdAt: m.createdAt,
        })),
        hasMore,
      };
    } catch (error) {
      logger.error('Error getting messages:', error);
      return { messages: [], hasMore: false };
    }
  }

  /**
   * Create a new message (persists to DB)
   */
  async createMessage(
    roomId: string,
    data: { text: string; authorName: string; authorId?: string }
  ): Promise<ChatMessageData | null> {
    try {
      // Ensure room exists
      const room = await this.getOrCreateRoom(roomId);
      if (!room) return null;

      const dbRoom = await prisma.chatRoom.findUnique({ where: { roomId } });
      if (!dbRoom) return null;

      const content: MessageContent & { authorName: string } = {
        text: data.text,
        authorName: data.authorName,
      };

      const message = await prisma.message.create({
        data: {
          roomId: dbRoom.id,
          authorId: data.authorId ?? null,
          content: content as object,
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours TTL
        },
      });

      return {
        id: message.id,
        content: message.content as unknown as MessageContent,
        authorId: message.authorId,
        authorName: data.authorName,
        roomId,
        createdAt: message.createdAt,
      };
    } catch (error) {
      logger.error('Error creating message:', error);
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // SOCKET.IO EVENT HANDLERS
  // --------------------------------------------------------------------------

  /**
   * Handle user joining a room
   */
  async handleJoinRoom(socket: Socket, data: { roomId: string; user: string }) {
    const { roomId, user } = data;

    try {
      // Ensure room exists in DB
      await this.getOrCreateRoom(roomId);

      // Track user in room (ephemeral)
      if (!this.roomParticipants.has(roomId)) {
        this.roomParticipants.set(roomId, new Set());
      }
      this.roomParticipants.get(roomId)!.add(user);
      this.userSockets.set(socket.id, user);

      // Join socket room
      socket.join(roomId);

      // Get recent messages
      const { messages } = await this.getMessages(roomId, { limit: 50 });

      // Notify others
      socket.to(roomId).emit('user-joined', user);

      // Send room info to user
      socket.emit('room-joined', {
        roomId,
        participants: Array.from(this.roomParticipants.get(roomId) || []),
        messageHistory: messages,
      });

      // Send updated user list
      this.io.to(roomId).emit('users-list', Array.from(this.roomParticipants.get(roomId) || []));

      logger.debug(`${user} joined chat room: ${roomId}`);
    } catch (error) {
      logger.error('Error handling join room:', error);
      socket.emit('error', { message: 'Failed to join room' });
    }
  }

  /**
   * Handle sending messages (persists to DB + broadcasts)
   */
  async handleSendMessage(
    socket: Socket,
    data: { roomId: string; message: string; user: string; userId?: string }
  ) {
    const { roomId, message, user, userId } = data;

    try {
      // Persist to database
      const savedMessage = await this.createMessage(roomId, {
        text: message.trim(),
        authorName: user,
        authorId: userId,
      });

      if (!savedMessage) {
        socket.emit('error', { message: 'Failed to save message' });
        return;
      }

      // Broadcast to room (including sender)
      this.io.to(roomId).emit('chat-message', {
        id: savedMessage.id,
        message: savedMessage.content.text,
        user: savedMessage.authorName,
        userId: savedMessage.authorId,
        timestamp: savedMessage.createdAt,
        type: 'message',
        roomId,
      });

      logger.debug(`Message sent to room ${roomId} by ${user}`);
    } catch (error) {
      logger.error('Error handling send message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  /**
   * Handle typing indicators (ephemeral, no DB)
   */
  handleTyping(socket: Socket, data: { user: string; isTyping: boolean; roomId: string }) {
    socket.to(data.roomId).emit('user-typing', data);
  }

  /**
   * Handle user disconnect
   */
  handleDisconnect(socket: Socket) {
    const user = this.userSockets.get(socket.id);
    if (!user) return;

    // Remove from all rooms
    this.roomParticipants.forEach((participants, roomId) => {
      if (participants.has(user)) {
        participants.delete(user);
        socket.to(roomId).emit('user-left', user);
        this.io.to(roomId).emit('users-list', Array.from(participants));
      }
    });

    this.userSockets.delete(socket.id);
    logger.debug(`User disconnected from chat: ${user}`);
  }

  // --------------------------------------------------------------------------
  // TTL CLEANUP
  // --------------------------------------------------------------------------

  /**
   * Cleanup expired messages and rooms (called by scheduler)
   */
  async cleanupExpiredContent(): Promise<{ messages: number; rooms: number }> {
    try {
      const now = new Date();

      // Delete expired messages
      const messagesResult = await prisma.message.deleteMany({
        where: { expiresAt: { lt: now } },
      });

      // Delete expired rooms (only if empty)
      const roomsResult = await prisma.chatRoom.deleteMany({
        where: {
          expiresAt: { lt: now },
          messages: { none: {} },
        },
      });

      if (messagesResult.count > 0 || roomsResult.count > 0) {
        logger.info(
          `TTL cleanup: deleted ${messagesResult.count} messages, ${roomsResult.count} rooms`
        );
      }

      return { messages: messagesResult.count, rooms: roomsResult.count };
    } catch (error) {
      logger.error('Error during TTL cleanup:', error);
      return { messages: 0, rooms: 0 };
    }
  }
}

// Export singleton (will be initialized with io in index.ts)
export let chatDbController: ChatDbController;

export function initChatDbController(io: Server): ChatDbController {
  chatDbController = new ChatDbController(io);
  return chatDbController;
}

