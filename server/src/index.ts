import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import { ChatController } from './chat/chatController';
import { WorldController } from './world/worldController';
import { VideoCallController } from './video-call/videoCallController';
import { MapController } from './map/mapController';
import { initializeDatabase, prisma } from './utils/prisma';
import { logger } from './utils/logger';

// Load environment variables
dotenv.config();

// Configure multer for file uploads
const upload = multer({
  dest: '/tmp/uploads',
  limits: { fileSize: 40 * 1024 * 1024 }, // 40MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
    }
  },
});

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
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
app.get('/api/maps/:roomId', async (req, res) => {
  const { roomId } = req.params;
  try {
    const mapData = await mapController.getMap(roomId);
    if (!mapData) {
      return res.status(404).json({ success: false, error: 'Map not found' });
    }
    res.json({ success: true, data: mapData });
  } catch (error) {
    logger.error('Error fetching map:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch map' });
  }
});

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

// File upload endpoint
app.post('/api/uploads', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded' });
  }
  res.json({
    success: true,
    data: {
      filename: req.file.filename,
      originalname: req.file.originalname,
      path: req.file.path,
      size: req.file.size,
      mimetype: req.file.mimetype,
    }
  });
});

// Initialize controllers
const chatController = new ChatController(io);
const worldController = new WorldController(io);
const videoCallController = new VideoCallController(io);
const mapController = new MapController(io);

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);

  // Chat events
  socket.on('join-room', (data) => chatController.handleJoinRoom(socket, data));
  socket.on('send-message', (data) => chatController.handleSendMessage(socket, data));
  socket.on('typing', (data) => chatController.handleTyping(socket, data));

  // World events
  socket.on('player-joined-world', (data) => worldController.handlePlayerJoinedWorld(socket, data));
  socket.on('player-moved', (data) => worldController.handlePlayerMoved(socket, data));

  // Video call events
  socket.on('join-video-call', (data) => videoCallController.handleJoinVideoCall(socket, data));
  socket.on('leave-video-call', (data) => videoCallController.handleLeaveVideoCall(socket, data));

  // Map events
  socket.on('join-map', (roomId: string) => mapController.handleJoinMapRoom(socket, roomId));
  socket.on('leave-map', (roomId: string) => mapController.handleLeaveMapRoom(socket, roomId));
  socket.on('map:update', (data) => mapController.handleMapUpdate(socket, data));

  // Handle disconnection
  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);
    chatController.handleDisconnect(socket);
    worldController.handleDisconnect(socket);
    videoCallController.handleDisconnect(socket);
  });
});

// Start server with database initialization
async function startServer() {
  try {
    // Initialize database connection (optional - graceful fallback if DB not available)
    const dbConnected = await initializeDatabase();
    if (!dbConnected) {
      logger.warn('⚠️ Database not available - running in localStorage fallback mode');
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
