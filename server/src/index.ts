import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { ChatController } from './chat/chatController';
import { initChatDbController, ChatDbController } from './chat/chatDbController';
import { WorldController } from './world/worldController';
import { VideoCallController } from './video-call/videoCallController';
import { MapController } from './map/mapController';
import { characterController } from './character/characterController';
import { settingsController } from './settings/settingsController';
import { initializeDatabase, prisma } from './utils/prisma';
import { logger } from './utils/logger';
import {
  ensureUploadDirs,
  uploadMapAsset,
  uploadCharacterAsset,
  uploadGenericAsset,
  UPLOAD_BASE_DIR,
  getRelativePath,
  getFileUrl
} from './utils/uploadMiddleware';

// Load environment variables
dotenv.config();

// Ensure upload directories exist on startup
ensureUploadDirs();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving for uploads
app.use('/uploads', express.static(UPLOAD_BASE_DIR, {
  maxAge: '1d', // Cache for 1 day
  etag: true,
  setHeaders: (res, filePath) => {
    // Set proper content-type for images
    if (filePath.endsWith('.png')) res.setHeader('Content-Type', 'image/png');
    else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) res.setHeader('Content-Type', 'image/jpeg');
    else if (filePath.endsWith('.gif')) res.setHeader('Content-Type', 'image/gif');
    else if (filePath.endsWith('.webp')) res.setHeader('Content-Type', 'image/webp');
  }
}));

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Stargety Oasis Server is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.get('/api/chat/rooms/:roomId/messages', (req, res) => {
  const { roomId } = req.params;
  const limit = parseInt(req.query.limit as string) || 50;
  const messages = chatController.getRoomMessages(roomId, limit);
  res.json({ success: true, data: messages });
});

app.get('/api/chat/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = chatController.getRoomInfo(roomId);
  if (!room) {
    return res.status(404).json({ success: false, error: 'Room not found' });
  }
  res.json({ success: true, data: room });
});

app.get('/api/world/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const worldState = worldController.getWorldState(roomId);
  if (!worldState) {
    return res.status(404).json({ success: false, error: 'World room not found' });
  }
  res.json({ success: true, data: worldState });
});

app.get('/api/video/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = videoCallController.getVideoCallRoom(roomId);
  if (!room) {
    return res.status(404).json({ success: false, error: 'Video call room not found' });
  }
  res.json({ success: true, data: room });
});

app.get('/api/video/rooms', (req, res) => {
  const rooms = videoCallController.getAllVideoCallRooms();
  res.json({ success: true, data: rooms });
});

// Map API Routes
// List all maps
app.get('/api/maps', async (req, res) => {
  try {
    const maps = await mapController.listMaps();
    res.json({ success: true, data: maps });
  } catch (error) {
    logger.error('Error listing maps:', error);
    res.status(500).json({ success: false, error: 'Failed to list maps' });
  }
});

// Get map by roomId
app.get('/api/maps/:roomId', async (req, res) => {
  const { roomId } = req.params;
  const includeMeta = req.query.meta === 'true';
  try {
    if (includeMeta) {
      const map = await mapController.getMapWithMeta(roomId);
      if (!map) {
        return res.status(404).json({ success: false, error: 'Map not found' });
      }
      res.json({ success: true, data: map });
    } else {
      const mapData = await mapController.getMap(roomId);
      if (!mapData) {
        return res.status(404).json({ success: false, error: 'Map not found' });
      }
      res.json({ success: true, data: mapData });
    }
  } catch (error) {
    logger.error('Error fetching map:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch map' });
  }
});

// Create map
app.post('/api/maps/:roomId', async (req, res) => {
  const { roomId } = req.params;
  const mapData = req.body;
  try {
    const savedMap = await mapController.saveMap(roomId, mapData);
    if (!savedMap) {
      return res.status(500).json({ success: false, error: 'Failed to save map' });
    }
    res.json({ success: true, data: savedMap });
  } catch (error) {
    logger.error('Error saving map:', error);
    res.status(500).json({ success: false, error: 'Failed to save map' });
  }
});

// Update map
app.put('/api/maps/:roomId', async (req, res) => {
  const { roomId } = req.params;
  const mapData = req.body;
  try {
    const savedMap = await mapController.saveMap(roomId, mapData);
    if (!savedMap) {
      return res.status(500).json({ success: false, error: 'Failed to update map' });
    }
    res.json({ success: true, data: savedMap });
  } catch (error) {
    logger.error('Error updating map:', error);
    res.status(500).json({ success: false, error: 'Failed to update map' });
  }
});

// Delete map
app.delete('/api/maps/:roomId', async (req, res) => {
  const { roomId } = req.params;
  try {
    const deleted = await mapController.deleteMap(roomId);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Map not found' });
    }
    res.json({ success: true, message: `Map ${roomId} deleted` });
  } catch (error) {
    logger.error('Error deleting map:', error);
    res.status(500).json({ success: false, error: 'Failed to delete map' });
  }
});

// Get map assets
app.get('/api/maps/:roomId/assets', async (req, res) => {
  const { roomId } = req.params;
  try {
    const assets = await mapController.getMapAssets(roomId);
    res.json({ success: true, data: assets });
  } catch (error) {
    logger.error('Error fetching map assets:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch assets' });
  }
});

// Delete map asset
app.delete('/api/maps/:roomId/assets/:assetId', async (req, res) => {
  const { roomId, assetId } = req.params;
  try {
    const deleted = await mapController.deleteMapAsset(roomId, assetId);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Asset not found' });
    }
    res.json({ success: true, message: 'Asset deleted' });
  } catch (error) {
    logger.error('Error deleting asset:', error);
    res.status(500).json({ success: false, error: 'Failed to delete asset' });
  }
});

// ============================================================================
// CHARACTER API ROUTES
// ============================================================================

// List all character slots for a user
app.get('/api/characters/:userId/slots', async (req, res) => {
  const { userId } = req.params;
  try {
    const slots = await characterController.listCharacterSlots(userId);
    res.json({ success: true, data: slots });
  } catch (error) {
    logger.error('Error listing character slots:', error);
    res.status(500).json({ success: false, error: 'Failed to list character slots' });
  }
});

// Get a specific character slot
app.get('/api/characters/:userId/slots/:slotNumber', async (req, res) => {
  const { userId, slotNumber } = req.params;
  try {
    const slot = await characterController.getCharacterSlot(userId, parseInt(slotNumber, 10));
    if (!slot) {
      return res.status(404).json({ success: false, error: 'Character slot not found' });
    }
    res.json({ success: true, data: slot });
  } catch (error) {
    logger.error('Error getting character slot:', error);
    res.status(500).json({ success: false, error: 'Failed to get character slot' });
  }
});

// Save/update a character slot
app.put('/api/characters/:userId/slots/:slotNumber', async (req, res) => {
  const { userId, slotNumber } = req.params;
  const { name, spriteSheet, thumbnailPath, texturePath } = req.body;
  try {
    const slot = await characterController.saveCharacterSlot(
      userId,
      parseInt(slotNumber, 10),
      { name, spriteSheet, thumbnailPath, texturePath }
    );
    if (!slot) {
      return res.status(500).json({ success: false, error: 'Failed to save character slot' });
    }
    res.json({ success: true, data: slot });
  } catch (error) {
    logger.error('Error saving character slot:', error);
    res.status(500).json({ success: false, error: 'Failed to save character slot' });
  }
});

// Delete/clear a character slot
app.delete('/api/characters/:userId/slots/:slotNumber', async (req, res) => {
  const { userId, slotNumber } = req.params;
  try {
    const deleted = await characterController.deleteCharacterSlot(userId, parseInt(slotNumber, 10));
    if (!deleted) {
      return res.status(500).json({ success: false, error: 'Failed to delete character slot' });
    }
    res.json({ success: true, message: `Character slot ${slotNumber} cleared` });
  } catch (error) {
    logger.error('Error deleting character slot:', error);
    res.status(500).json({ success: false, error: 'Failed to delete character slot' });
  }
});

// Get active character for a user
app.get('/api/characters/:userId/active', async (req, res) => {
  const { userId } = req.params;
  try {
    const active = await characterController.getActiveCharacter(userId);
    res.json({ success: true, data: active });
  } catch (error) {
    logger.error('Error getting active character:', error);
    res.status(500).json({ success: false, error: 'Failed to get active character' });
  }
});

// Set active character for a user
app.put('/api/characters/:userId/active', async (req, res) => {
  const { userId } = req.params;
  const { slotNumber } = req.body;
  try {
    const active = await characterController.setActiveCharacter(userId, slotNumber);
    if (!active) {
      return res.status(400).json({ success: false, error: 'Invalid slot number (must be 1-5)' });
    }
    res.json({ success: true, data: active });
  } catch (error) {
    logger.error('Error setting active character:', error);
    res.status(500).json({ success: false, error: 'Failed to set active character' });
  }
});

// ============================================================================
// SETTINGS API ROUTES
// ============================================================================

// Get user settings
app.get('/api/settings/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const settings = await settingsController.getUserSettings(userId);
    res.json({ success: true, data: settings });
  } catch (error) {
    logger.error('Error getting user settings:', error);
    res.status(500).json({ success: false, error: 'Failed to get user settings' });
  }
});

// Update user settings
app.put('/api/settings/:userId', async (req, res) => {
  const { userId } = req.params;
  const { theme, jitsiServerUrl, editorPrefs } = req.body;
  try {
    const settings = await settingsController.updateUserSettings(userId, {
      theme,
      jitsiServerUrl,
      editorPrefs,
    });
    if (!settings) {
      return res.status(500).json({ success: false, error: 'Failed to update settings' });
    }
    res.json({ success: true, data: settings });
  } catch (error) {
    logger.error('Error updating user settings:', error);
    res.status(500).json({ success: false, error: 'Failed to update user settings' });
  }
});

// ============================================================================
// PLAYER POSITION API ROUTES
// ============================================================================

// Get player position
app.get('/api/position/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  try {
    const position = await settingsController.getPlayerPosition(sessionId);
    res.json({ success: true, data: position });
  } catch (error) {
    logger.error('Error getting player position:', error);
    res.status(500).json({ success: false, error: 'Failed to get player position' });
  }
});

// Update player position
app.put('/api/position/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  const { userId, roomId, x, y, direction } = req.body;
  try {
    const position = await settingsController.updatePlayerPosition(sessionId, {
      userId,
      roomId,
      x,
      y,
      direction,
    });
    if (!position) {
      return res.status(500).json({ success: false, error: 'Failed to update position' });
    }
    res.json({ success: true, data: position });
  } catch (error) {
    logger.error('Error updating player position:', error);
    res.status(500).json({ success: false, error: 'Failed to update player position' });
  }
});

// Delete player position (on disconnect)
app.delete('/api/position/:sessionId', async (req, res) => {
  const { sessionId } = req.params;
  try {
    await settingsController.deletePlayerPosition(sessionId);
    res.json({ success: true, message: 'Position deleted' });
  } catch (error) {
    logger.error('Error deleting player position:', error);
    res.status(500).json({ success: false, error: 'Failed to delete player position' });
  }
});

// Get all players in a room
app.get('/api/rooms/:roomId/players', async (req, res) => {
  const { roomId } = req.params;
  try {
    const players = await settingsController.getPlayersInRoom(roomId);
    res.json({ success: true, data: players });
  } catch (error) {
    logger.error('Error getting players in room:', error);
    res.status(500).json({ success: false, error: 'Failed to get players' });
  }
});

// ============================================================================
// CHAT API ROUTES
// ============================================================================

// Chat controller will be initialized after io is created
let chatDbController: ChatDbController;

// List all chat rooms
app.get('/api/chat/rooms', async (_req, res) => {
  try {
    if (!chatDbController) {
      return res.status(503).json({ success: false, error: 'Chat service not initialized' });
    }
    const rooms = await chatDbController.listRooms();
    res.json({ success: true, data: rooms });
  } catch (error) {
    logger.error('Error listing chat rooms:', error);
    res.status(500).json({ success: false, error: 'Failed to list chat rooms' });
  }
});

// Get messages for a room (with pagination)
app.get('/api/chat/:roomId/messages', async (req, res) => {
  const { roomId } = req.params;
  const { limit, before, after } = req.query;

  try {
    if (!chatDbController) {
      return res.status(503).json({ success: false, error: 'Chat service not initialized' });
    }
    const result = await chatDbController.getMessages(roomId, {
      limit: limit ? parseInt(limit as string, 10) : 50,
      before: before as string | undefined,
      after: after as string | undefined,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error getting chat messages:', error);
    res.status(500).json({ success: false, error: 'Failed to get messages' });
  }
});

// Post a new message (REST alternative to Socket.IO)
app.post('/api/chat/:roomId/messages', async (req, res) => {
  const { roomId } = req.params;
  const { text, authorName, authorId } = req.body;

  try {
    if (!chatDbController) {
      return res.status(503).json({ success: false, error: 'Chat service not initialized' });
    }
    if (!text || !authorName) {
      return res.status(400).json({ success: false, error: 'text and authorName are required' });
    }
    const message = await chatDbController.createMessage(roomId, {
      text,
      authorName,
      authorId,
    });
    if (!message) {
      return res.status(500).json({ success: false, error: 'Failed to create message' });
    }
    res.json({ success: true, data: message });
  } catch (error) {
    logger.error('Error creating chat message:', error);
    res.status(500).json({ success: false, error: 'Failed to create message' });
  }
});

// Manually trigger TTL cleanup (for testing/admin)
app.post('/api/chat/cleanup', async (_req, res) => {
  try {
    if (!chatDbController) {
      return res.status(503).json({ success: false, error: 'Chat service not initialized' });
    }
    const result = await chatDbController.cleanupExpiredContent();
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error during chat cleanup:', error);
    res.status(500).json({ success: false, error: 'Failed to cleanup' });
  }
});

// ============================================================================
// FILE UPLOAD ENDPOINTS
// ============================================================================

// Generic file upload
app.post('/api/uploads', uploadGenericAsset.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }
  const relativePath = getRelativePath(req.file.path);
  res.json({
    success: true,
    data: {
      id: req.file.filename.split('.')[0],
      filename: req.file.filename,
      originalname: req.file.originalname,
      path: relativePath,
      url: getFileUrl(relativePath),
      size: req.file.size,
      mimetype: req.file.mimetype,
    }
  });
});

// Map asset upload - saves to filesystem AND database
app.post('/api/maps/:roomId/assets', uploadMapAsset.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  const { roomId } = req.params;
  const { width, height } = req.body; // Optional dimensions from client

  try {
    // Create database record for the asset
    const asset = await mapController.createMapAsset(roomId, {
      name: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      width: width ? parseInt(width, 10) : undefined,
      height: height ? parseInt(height, 10) : undefined,
      metadata: {
        originalFilename: req.file.originalname,
        uploadedAt: new Date().toISOString(),
      },
    });

    if (!asset) {
      return res.status(500).json({ success: false, error: 'Failed to save asset to database' });
    }

    res.json({ success: true, data: asset });
  } catch (error) {
    logger.error('Error uploading map asset:', error);
    res.status(500).json({ success: false, error: 'Failed to upload asset' });
  }
});

// Character asset upload (thumbnail, texture) with optional slot update
app.post('/api/characters/:userId/upload', uploadCharacterAsset.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }

  const { userId } = req.params;
  const { slotNumber, type } = req.body; // type: 'thumbnail' | 'texture'
  const relativePath = getRelativePath(req.file.path);
  const fileUrl = getFileUrl(relativePath);

  try {
    // If slot number provided, update the character record
    if (slotNumber && type) {
      const slot = parseInt(slotNumber, 10);
      if (type === 'thumbnail') {
        await characterController.updateCharacterFiles(userId, slot, { thumbnailPath: req.file.path });
      } else if (type === 'texture') {
        await characterController.updateCharacterFiles(userId, slot, { texturePath: req.file.path });
      }
    }

    res.json({
      success: true,
      data: {
        id: req.file.filename.split('.')[0],
        userId,
        filename: req.file.filename,
        originalname: req.file.originalname,
        path: relativePath,
        url: fileUrl,
        size: req.file.size,
        mimetype: req.file.mimetype,
      }
    });
  } catch (error) {
    logger.error('Error uploading character asset:', error);
    res.status(500).json({ success: false, error: 'Failed to upload character asset' });
  }
});

// Initialize controllers
const chatController = new ChatController(io);
chatDbController = initChatDbController(io); // DB-backed chat controller
const worldController = new WorldController(io);
const videoCallController = new VideoCallController(io);
const mapController = new MapController(io);

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);

  // Chat events (legacy in-memory controller)
  socket.on('join-room', (data) => chatController.handleJoinRoom(socket, data));
  socket.on('send-message', (data) => chatController.handleSendMessage(socket, data));
  socket.on('typing', (data) => chatController.handleTyping(socket, data));

  // Chat events (DB-backed controller) - use 'chat:' prefix for new events
  socket.on('chat:join', (data) => chatDbController.handleJoinRoom(socket, data));
  socket.on('chat:message', (data) => chatDbController.handleSendMessage(socket, data));
  socket.on('chat:typing', (data) => chatDbController.handleTyping(socket, data));

  // World events
  socket.on('player-joined-world', (data) => worldController.handlePlayerJoinedWorld(socket, data).catch((error) => logger.error('Error in player-joined-world handler:', error)));
  socket.on('player-moved', (data) => worldController.handlePlayerMoved(socket, data));

  // Video call events
  socket.on('join-video-call', (data) => videoCallController.handleJoinVideoCall(socket, data));
  socket.on('leave-video-call', (data) => videoCallController.handleLeaveVideoCall(socket, data));

  // Map events
  socket.on('join-map', (roomId: string) => mapController.handleJoinMapRoom(socket, roomId));
  socket.on('leave-map', (roomId: string) => mapController.handleLeaveMapRoom(socket, roomId));
  socket.on('map:update', (data) => mapController.handleMapUpdate(socket, data));
  socket.on('map:partial:update', (data) => mapController.handlePartialUpdate(socket, data));

  // Handle disconnection
  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);
    chatController.handleDisconnect(socket);
    chatDbController.handleDisconnect(socket);
    worldController.handleDisconnect(socket);
    videoCallController.handleDisconnect(socket);
  });
});

// TTL Cleanup Scheduler - runs every hour
let cleanupInterval: NodeJS.Timeout | null = null;

function startCleanupScheduler() {
  // Run cleanup every hour
  cleanupInterval = setInterval(async () => {
    try {
      // Cleanup chat messages/rooms
      await chatDbController.cleanupExpiredContent();
      // Cleanup stale player positions
      await settingsController.cleanupStalePositions();
    } catch (error) {
      logger.error('Error during scheduled cleanup:', error);
    }
  }, 60 * 60 * 1000); // 1 hour

  logger.info('📅 TTL cleanup scheduler started (runs every hour)');
}

// Start server with database initialization
async function startServer() {
  try {
    // Initialize database connection (optional - graceful fallback if DB not available)
    const dbConnected = await initializeDatabase();
    if (!dbConnected) {
      logger.warn('⚠️ Database not available - running in localStorage fallback mode');
    }

    // Start TTL cleanup scheduler
    if (dbConnected) {
      startCleanupScheduler();
    }

    server.listen(PORT, () => {
      logger.info(`🚀 Stargety Oasis Server running on port ${PORT}`);
      logger.info(`📡 Socket.IO server ready for connections`);
      logger.info(`🌐 CORS enabled for: ${process.env.CLIENT_URL || "http://localhost:3000"}`);
      logger.info(`💾 Database: ${dbConnected ? 'Connected' : 'Not connected (localStorage mode)'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();

export default app;
