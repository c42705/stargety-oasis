import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { ChatController } from './chat/chatController';
import { WorldController } from './world/worldController';
import { VideoCallController } from './video-call/videoCallController';


// Load environment variables
dotenv.config();

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





// Initialize controllers
const chatController = new ChatController(io);
const worldController = new WorldController(io);
const videoCallController = new VideoCallController(io);


// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

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

  

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    chatController.handleDisconnect(socket);
    worldController.handleDisconnect(socket);
    videoCallController.handleDisconnect(socket);
    
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Stargety Oasis Server running on port ${PORT}`);
  console.log(`📡 Socket.IO server ready for connections`);
  console.log(`🌐 CORS enabled for: ${process.env.CLIENT_URL || "http://localhost:3000"}`);
});

export default app;
