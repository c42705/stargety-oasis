"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatDbController = exports.ChatDbController = void 0;
exports.initChatDbController = initChatDbController;
const prisma_1 = require("../utils/prisma");
const logger_1 = require("../utils/logger");
// ============================================================================
// CHAT DATABASE CONTROLLER
// ============================================================================
class ChatDbController {
    constructor(io) {
        // In-memory tracking for active users (ephemeral state)
        this.roomParticipants = new Map();
        this.userSockets = new Map(); // socketId -> username
        this.io = io;
    }
    // --------------------------------------------------------------------------
    // ROOM MANAGEMENT
    // --------------------------------------------------------------------------
    /**
     * Get or create a chat room
     */
    async getOrCreateRoom(roomId, name) {
        try {
            let room = await prisma_1.prisma.chatRoom.findUnique({
                where: { roomId },
            });
            if (!room) {
                room = await prisma_1.prisma.chatRoom.create({
                    data: {
                        roomId,
                        name: name ?? roomId,
                        description: null,
                        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours from now
                    },
                });
                logger_1.logger.info(`Created chat room: ${roomId}`);
            }
            return {
                id: room.id,
                name: room.name,
                roomId: room.roomId,
                description: room.description,
                createdAt: room.createdAt,
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting/creating room:', error);
            return null;
        }
    }
    /**
     * List all chat rooms
     */
    async listRooms() {
        try {
            const rooms = await prisma_1.prisma.chatRoom.findMany({
                orderBy: { createdAt: 'desc' },
            });
            return rooms.map((r) => ({
                id: r.id,
                name: r.name,
                roomId: r.roomId,
                description: r.description,
                createdAt: r.createdAt,
            }));
        }
        catch (error) {
            logger_1.logger.error('Error listing rooms:', error);
            return [];
        }
    }
    // --------------------------------------------------------------------------
    // MESSAGE PERSISTENCE
    // --------------------------------------------------------------------------
    /**
     * Get messages for a room with pagination
     */
    async getMessages(roomId, options = {}) {
        const { limit = 50, before, after } = options;
        try {
            // Ensure room exists
            const room = await prisma_1.prisma.chatRoom.findUnique({ where: { roomId } });
            if (!room) {
                return { messages: [], hasMore: false };
            }
            const whereClause = { roomId: room.id };
            // Cursor-based pagination
            if (before) {
                whereClause.createdAt = { lt: new Date(before) };
            }
            else if (after) {
                whereClause.createdAt = { gt: new Date(after) };
            }
            const messages = await prisma_1.prisma.message.findMany({
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
                    content: m.content,
                    authorId: m.authorId,
                    authorName: m.content.authorName
                        ?? m.author?.username ?? 'Anonymous',
                    roomId,
                    createdAt: m.createdAt,
                })),
                hasMore,
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting messages:', error);
            return { messages: [], hasMore: false };
        }
    }
    /**
     * Get a single message by ID
     */
    async getMessage(messageId) {
        try {
            const message = await prisma_1.prisma.message.findUnique({
                where: { id: messageId },
                include: { room: true },
            });
            if (!message)
                return null;
            const content = message.content;
            return {
                id: message.id,
                content,
                authorId: message.authorId,
                authorName: content.authorName || 'Unknown',
                roomId: message.room.roomId,
                createdAt: message.createdAt,
            };
        }
        catch (error) {
            logger_1.logger.error('Error getting message:', error);
            return null;
        }
    }
    /**
     * Create a new message (persists to DB)
     */
    async createMessage(roomId, data) {
        try {
            // Ensure room exists
            const room = await this.getOrCreateRoom(roomId);
            if (!room)
                return null;
            const dbRoom = await prisma_1.prisma.chatRoom.findUnique({ where: { roomId } });
            if (!dbRoom)
                return null;
            // Validate authorId exists in database before using it
            // If not found, set to null (authorName is stored in content anyway)
            let validAuthorId = null;
            if (data.authorId) {
                const user = await prisma_1.prisma.user.findUnique({ where: { id: data.authorId } });
                if (user) {
                    validAuthorId = user.id;
                }
            }
            const content = {
                text: data.text,
                authorName: data.authorName,
            };
            const message = await prisma_1.prisma.message.create({
                data: {
                    roomId: dbRoom.id,
                    authorId: validAuthorId,
                    content: content,
                    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours TTL
                },
            });
            return {
                id: message.id,
                content: message.content,
                authorId: message.authorId,
                authorName: data.authorName,
                roomId,
                createdAt: message.createdAt,
            };
        }
        catch (error) {
            logger_1.logger.error('Error creating message:', error);
            return null;
        }
    }
    // --------------------------------------------------------------------------
    // SOCKET.IO EVENT HANDLERS
    // --------------------------------------------------------------------------
    /**
     * Handle user joining a room
     */
    async handleJoinRoom(socket, data) {
        const { roomId, user } = data;
        try {
            // Ensure room exists in DB
            await this.getOrCreateRoom(roomId);
            // Track user in room (ephemeral)
            if (!this.roomParticipants.has(roomId)) {
                this.roomParticipants.set(roomId, new Set());
            }
            this.roomParticipants.get(roomId).add(user);
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
            logger_1.logger.debug(`${user} joined chat room: ${roomId}`);
        }
        catch (error) {
            logger_1.logger.error('Error handling join room:', error);
            socket.emit('error', { message: 'Failed to join room' });
        }
    }
    /**
     * Handle sending messages (persists to DB + broadcasts)
     */
    async handleSendMessage(socket, data) {
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
            const broadcastData = {
                id: savedMessage.id,
                message: savedMessage.content.text,
                user: savedMessage.authorName,
                userId: savedMessage.authorId,
                timestamp: savedMessage.createdAt,
                type: 'message',
                roomId,
            };
            logger_1.logger.info(`📡 Broadcasting message to room "${roomId}":`, {
                messageId: savedMessage.id,
                user: savedMessage.authorName,
                text: savedMessage.content.text
            });
            this.io.to(roomId).emit('chat-message', broadcastData);
            logger_1.logger.debug(`Message sent to room ${roomId} by ${user}`);
        }
        catch (error) {
            logger_1.logger.error('Error handling send message:', error);
            socket.emit('error', { message: 'Failed to send message' });
        }
    }
    /**
     * Handle typing indicators (ephemeral, no DB)
     */
    handleTyping(socket, data) {
        socket.to(data.roomId).emit('user-typing', data);
    }
    // --------------------------------------------------------------------------
    // MESSAGE EDITING & DELETION
    // --------------------------------------------------------------------------
    /**
     * Edit an existing message
     */
    async editMessage(messageId, newContent) {
        try {
            const message = await prisma_1.prisma.message.findUnique({
                where: { id: messageId },
                include: { room: true },
            });
            if (!message) {
                logger_1.logger.error(`Message not found: ${messageId}`);
                return null;
            }
            // Update content and mark as edited
            const updatedMessage = await prisma_1.prisma.message.update({
                where: { id: messageId },
                data: {
                    content: {
                        ...message.content,
                        text: newContent,
                    },
                    isEdited: true,
                    editedAt: new Date(),
                },
            });
            // Broadcast edit event to room
            this.io.to(message.room.roomId).emit('message:edited', {
                messageId: updatedMessage.id,
                content: newContent,
                editedAt: updatedMessage.editedAt,
            });
            return {
                id: updatedMessage.id,
                content: updatedMessage.content,
                authorId: updatedMessage.authorId,
                authorName: updatedMessage.content.authorName ?? 'Anonymous',
                roomId: message.room.roomId,
                createdAt: updatedMessage.createdAt,
            };
        }
        catch (error) {
            logger_1.logger.error('Error editing message:', error);
            return null;
        }
    }
    /**
     * Delete a message (soft delete with tombstone)
     */
    async deleteMessage(messageId) {
        try {
            const message = await prisma_1.prisma.message.findUnique({
                where: { id: messageId },
                include: { room: true },
            });
            if (!message) {
                logger_1.logger.error(`Message not found: ${messageId}`);
                return false;
            }
            // Soft delete: replace content with tombstone
            await prisma_1.prisma.message.update({
                where: { id: messageId },
                data: {
                    content: {
                        text: '[Message deleted]',
                        isDeleted: true,
                    },
                },
            });
            // Broadcast delete event to room
            this.io.to(message.room.roomId).emit('message:deleted', {
                messageId,
            });
            logger_1.logger.debug(`Message deleted: ${messageId}`);
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error deleting message:', error);
            return false;
        }
    }
    // --------------------------------------------------------------------------
    // REACTIONS
    // --------------------------------------------------------------------------
    /**
     * Add a reaction to a message
     */
    async addReaction(messageId, emoji, userId) {
        try {
            const message = await prisma_1.prisma.message.findUnique({
                where: { id: messageId },
                include: { room: true },
            });
            if (!message) {
                logger_1.logger.error(`Message not found: ${messageId}`);
                return false;
            }
            // Check if reaction already exists
            const existingReaction = await prisma_1.prisma.reaction.findUnique({
                where: {
                    emoji_userId_messageId: {
                        emoji,
                        userId,
                        messageId,
                    },
                },
            });
            if (existingReaction) {
                // Reaction already exists, do nothing
                return false;
            }
            // Create new reaction
            await prisma_1.prisma.reaction.create({
                data: {
                    emoji,
                    userId,
                    messageId,
                },
            });
            // Broadcast reaction added event
            this.io.to(message.room.roomId).emit('reaction:added', {
                messageId,
                emoji,
                userId,
            });
            logger_1.logger.debug(`Reaction added: ${emoji} to message ${messageId} by user ${userId}`);
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error adding reaction:', error);
            return false;
        }
    }
    /**
     * Remove a reaction from a message
     */
    async removeReaction(messageId, emoji, userId) {
        try {
            const message = await prisma_1.prisma.message.findUnique({
                where: { id: messageId },
                include: { room: true },
            });
            if (!message) {
                logger_1.logger.error(`Message not found: ${messageId}`);
                return false;
            }
            // Delete reaction
            await prisma_1.prisma.reaction.deleteMany({
                where: {
                    emoji,
                    userId,
                    messageId,
                },
            });
            // Broadcast reaction removed event
            this.io.to(message.room.roomId).emit('reaction:removed', {
                messageId,
                emoji,
                userId,
            });
            logger_1.logger.debug(`Reaction removed: ${emoji} from message ${messageId} by user ${userId}`);
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error removing reaction:', error);
            return false;
        }
    }
    // --------------------------------------------------------------------------
    // SEARCH FUNCTIONALITY
    // --------------------------------------------------------------------------
    /**
     * Search messages in a room
     */
    async searchMessages(roomId, query, options = {}) {
        const { limit = 50, userId, startDate, endDate } = options;
        try {
            // Get room
            const room = await prisma_1.prisma.chatRoom.findUnique({ where: { roomId } });
            if (!room) {
                return [];
            }
            // Build where clause
            const whereClause = {
                roomId: room.id,
            };
            // Text search (case-insensitive)
            if (query) {
                whereClause.content = {
                    path: ['text'],
                    string_contains: query,
                };
            }
            // User filter
            if (userId) {
                whereClause.authorId = userId;
            }
            // Date range filter
            if (startDate || endDate) {
                whereClause.createdAt = {};
                if (startDate) {
                    whereClause.createdAt.gte = startDate;
                }
                if (endDate) {
                    whereClause.createdAt.lte = endDate;
                }
            }
            const messages = await prisma_1.prisma.message.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                take: limit,
                include: { author: { select: { username: true } } },
            });
            return messages.map((m) => ({
                id: m.id,
                content: m.content,
                authorId: m.authorId,
                authorName: m.content.authorName
                    ?? m.author?.username ?? 'Anonymous',
                roomId,
                createdAt: m.createdAt,
            }));
        }
        catch (error) {
            logger_1.logger.error('Error searching messages:', error);
            return [];
        }
    }
    // --------------------------------------------------------------------------
    // FILE ATTACHMENTS
    // --------------------------------------------------------------------------
    /**
     * Add file attachment to a message
     */
    async addAttachment(messageId, attachment) {
        try {
            await prisma_1.prisma.attachment.create({
                data: {
                    ...attachment,
                    messageId,
                },
            });
            logger_1.logger.debug(`Attachment added to message ${messageId}: ${attachment.filename}`);
            return true;
        }
        catch (error) {
            logger_1.logger.error('Error adding attachment:', error);
            return false;
        }
    }
    /**
     * Handle user disconnect
     */
    handleDisconnect(socket) {
        const user = this.userSockets.get(socket.id);
        if (!user)
            return;
        // Remove from all rooms
        this.roomParticipants.forEach((participants, roomId) => {
            if (participants.has(user)) {
                participants.delete(user);
                socket.to(roomId).emit('user-left', user);
                this.io.to(roomId).emit('users-list', Array.from(participants));
            }
        });
        this.userSockets.delete(socket.id);
        logger_1.logger.debug(`User disconnected from chat: ${user}`);
    }
    // --------------------------------------------------------------------------
    // TTL CLEANUP
    // --------------------------------------------------------------------------
    /**
     * Cleanup expired messages and rooms (called by scheduler)
     */
    async cleanupExpiredContent() {
        try {
            const now = new Date();
            // Delete expired messages
            const messagesResult = await prisma_1.prisma.message.deleteMany({
                where: { expiresAt: { lt: now } },
            });
            // Delete expired rooms (only if empty)
            const roomsResult = await prisma_1.prisma.chatRoom.deleteMany({
                where: {
                    expiresAt: { lt: now },
                    messages: { none: {} },
                },
            });
            if (messagesResult.count > 0 || roomsResult.count > 0) {
                logger_1.logger.info(`TTL cleanup: deleted ${messagesResult.count} messages, ${roomsResult.count} rooms`);
            }
            return { messages: messagesResult.count, rooms: roomsResult.count };
        }
        catch (error) {
            logger_1.logger.error('Error during TTL cleanup:', error);
            return { messages: 0, rooms: 0 };
        }
    }
}
exports.ChatDbController = ChatDbController;
function initChatDbController(io) {
    exports.chatDbController = new ChatDbController(io);
    return exports.chatDbController;
}
