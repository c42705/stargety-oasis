"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const chatController_1 = require("./chat/chatController");
const worldController_1 = require("./world/worldController");
const videoCallController_1 = require("./video-call/videoCallController");
const ringCentralController_1 = require("./ringcentral/ringCentralController");
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = (0, http_1.createServer)(app);
const io = new socket_io_1.Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true
    }
});
const PORT = process.env.PORT || 3001;
// Middleware
app.use((0, cors_1.default)({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Error handling middleware
app.use((err, req, res, next) => {
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
    const limit = parseInt(req.query.limit) || 50;
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
app.get('/api/ringcentral/calls/:callId', (req, res) => {
    const { callId } = req.params;
    const call = ringCentralController.getActiveCall(callId);
    if (!call) {
        return res.status(404).json({ success: false, error: 'Call not found' });
    }
    res.json({ success: true, data: call });
});
app.get('/api/ringcentral/calls', (req, res) => {
    const calls = ringCentralController.getAllActiveCalls();
    res.json({ success: true, data: calls });
});
// Initialize controllers
const chatController = new chatController_1.ChatController(io);
const worldController = new worldController_1.WorldController(io);
const videoCallController = new videoCallController_1.VideoCallController(io);
const ringCentralController = new ringCentralController_1.RingCentralController(io);
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
    // RingCentral events
    socket.on('ringcentral-call-started', (data) => ringCentralController.handleCallStarted(socket, data));
    socket.on('ringcentral-participant-joined', (data) => ringCentralController.handleParticipantJoined(socket, data));
    socket.on('ringcentral-participant-left', (data) => ringCentralController.handleParticipantLeft(socket, data));
    socket.on('ringcentral-call-ended', (data) => ringCentralController.handleCallEnded(socket, data));
    // Handle disconnection
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        chatController.handleDisconnect(socket);
        worldController.handleDisconnect(socket);
        videoCallController.handleDisconnect(socket);
        ringCentralController.handleDisconnect(socket);
    });
});
// Start server
server.listen(PORT, () => {
    console.log(`🚀 Stargety Oasis Server running on port ${PORT}`);
    console.log(`📡 Socket.IO server ready for connections`);
    console.log(`🌐 CORS enabled for: ${process.env.CLIENT_URL || "http://localhost:3000"}`);
});
exports.default = app;
