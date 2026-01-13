// Socket.IO client service for real-time chat functionality
// Mobile-first design for integration with Jitsi video call side panel
import { io, Socket } from 'socket.io-client';
import { store } from '../../redux/store';
import {
  setError,
  addMessage,
  addOnlineUser,
  setMessages,
  removeOnlineUser,
  addTypingUser,
  removeTypingUser
} from '../../redux/slices/chatSlice';
import { Message } from '../../redux/types/chat';

// Event handler type for Socket.IO
type SocketEventHandler = (...args: unknown[]) => void;

// Socket.IO client service class
class ChatSocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // 1 second initial delay

  // Event handlers mapping
  private eventHandlers: Map<string, SocketEventHandler> = new Map();

  constructor() {
    this.initializeSocket();
  }

  /**
   * Initialize Socket.IO connection
   * Note: Auth is optional - the socket will connect without auth for now
   * In future, integrate with proper JWT-based authentication
   */
  private initializeSocket() {
    // Try to get user from sessionStorage (where AuthContext stores it)
    let userId: string | null = null;
    let username: string | null = null;

    try {
      const savedAuth = sessionStorage.getItem('stargetyOasisAuth');
      if (savedAuth) {
        const authData = JSON.parse(savedAuth);
        userId = authData.id;
        username = authData.username;
      }
    } catch {
      // Ignore parse errors
    }

    try {
      // Connect to the main socket namespace (not /chat - backend uses main namespace)
      this.socket = io(process.env.REACT_APP_WS_URL || 'http://localhost:3001', {
        auth: {
          userId: userId || 'anonymous',
          username: username || 'Anonymous',
        },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        reconnection: true,
        reconnectionAttempts: this.maxReconnectAttempts,
        reconnectionDelay: this.reconnectDelay,
        reconnectionDelayMax: 5000,
      });

      this.setupEventHandlers();
      this.setupReconnectionHandlers();

    } catch (error) {
      console.error('Error initializing Socket.IO connection:', error);
    }
  }
  
  /**
   * Setup Socket.IO event handlers
   * Event names match backend chatDbController.ts
   */
  private setupEventHandlers() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', this.handleConnect.bind(this));
    this.socket.on('disconnect', this.handleDisconnect.bind(this));
    this.socket.on('connect_error', this.handleConnectError.bind(this));

    // Message events (backend uses 'chat-message')
    this.socket.on('chat-message', this.handleNewMessage.bind(this));

    // Room events (backend uses 'room-joined', 'user-joined', 'user-left', 'users-list')
    this.socket.on('room-joined', this.handleRoomJoined.bind(this));
    this.socket.on('user-joined', this.handleUserJoined.bind(this));
    this.socket.on('user-left', this.handleUserLeft.bind(this));
    this.socket.on('users-list', this.handleUsersList.bind(this));

    // Typing events (backend uses 'user-typing')
    this.socket.on('user-typing', this.handleTyping.bind(this));

    // Error events
    this.socket.on('error', this.handleError.bind(this));
  }
  
  /**
   * Setup reconnection handlers
   */
  private setupReconnectionHandlers() {
    if (!this.socket) return;
    
    this.socket.on('reconnect_attempt', (attempt) => {
      console.log(`Reconnection attempt ${attempt}`);
      this.reconnectAttempts = attempt;
    });
    
    this.socket.on('reconnect', () => {
      console.log('Reconnected to server');
      this.reconnectAttempts = 0;
      // Rejoin current room if any
      const currentRoom = store.getState().chat.currentRoom;
      if (currentRoom) {
        this.joinRoom(currentRoom);
      }
    });
    
    this.socket.on('reconnect_failed', () => {
      console.error('Reconnection failed');
      this.reconnectAttempts = 0;
    });
  }
  
  /**
   * Handle connection established
   */
  private handleConnect() {
    console.log('Connected to chat server');
    const currentRoom = store.getState().chat.currentRoom;
    if (currentRoom) {
      this.joinRoom(currentRoom);
    }
  }
  
  /**
   * Handle connection lost
   */
  private handleDisconnect(reason: string) {
    console.log('Disconnected from chat server:', reason);
    // Update UI to show disconnected state
    store.dispatch(setError('Connection lost'));
  }
  
  /**
   * Handle connection error
   */
  private handleConnectError(error: Error) {
    console.error('Connection error:', error);
    store.dispatch(setError('Connection failed'));
  }
  
  /**
   * Handle new message received from backend 'chat-message' event
   * Backend format: { id, message, user, userId, timestamp, type, roomId }
   */
  private handleNewMessage(data: {
    id: string;
    message: string;
    user: string;
    userId?: string;
    timestamp: string;
    type: string;
    roomId: string
  }) {
    console.log('New message received:', data);
    // Transform backend format to frontend Message format
    const message: Message = {
      id: data.id,
      content: { text: data.message },
      type: 'TEXT' as any,
      roomId: data.roomId,
      authorId: data.userId || 'anonymous',
      isEdited: false,
      reactions: [],
      attachments: [],
      expiresAt: new Date(new Date(data.timestamp).getTime() + 8 * 60 * 60 * 1000),
      createdAt: new Date(data.timestamp),
      updatedAt: new Date(data.timestamp),
    };
    store.dispatch(addMessage({ roomId: data.roomId, message }));
  }

  /**
   * Handle room joined event from backend 'room-joined'
   * Backend format: { roomId, participants, messageHistory }
   */
  private handleRoomJoined(data: {
    roomId: string;
    participants: string[];
    messageHistory: Array<{
      id: string;
      content: { text: string; authorName?: string };
      authorId: string | null;
      authorName: string;
      roomId: string;
      createdAt: string;
    }>;
  }) {
    console.log('Room joined:', data);
    // Set online users from participants
    data.participants.forEach(user => {
      store.dispatch(addOnlineUser(user));
    });
    // Transform and set message history
    const messages: Message[] = data.messageHistory.map(msg => ({
      id: msg.id,
      content: msg.content,
      type: 'TEXT' as any,
      roomId: data.roomId,
      authorId: msg.authorId || 'anonymous',
      isEdited: false,
      reactions: [],
      attachments: [],
      expiresAt: new Date(new Date(msg.createdAt).getTime() + 8 * 60 * 60 * 1000),
      createdAt: new Date(msg.createdAt),
      updatedAt: new Date(msg.createdAt),
    }));
    store.dispatch(setMessages({ roomId: data.roomId, messages }));
  }

  /**
   * Handle user joined event from backend 'user-joined'
   */
  private handleUserJoined(user: string) {
    console.log('User joined chat:', user);
    store.dispatch(addOnlineUser(user));
  }

  /**
   * Handle user left event from backend 'user-left'
   */
  private handleUserLeft(user: string) {
    console.log('User left chat:', user);
    store.dispatch(removeOnlineUser(user));
  }

  /**
   * Handle users list update from backend 'users-list'
   */
  private handleUsersList(users: string[]) {
    console.log('Users list updated:', users);
    // Clear and reset online users
    const currentState = store.getState();
    currentState.chat.onlineUsers.forEach(userId => {
      store.dispatch(removeOnlineUser(userId));
    });
    users.forEach(user => {
      store.dispatch(addOnlineUser(user));
    });
  }

  /**
   * Handle typing event from backend 'user-typing'
   * Backend format: { user, isTyping, roomId }
   */
  private handleTyping(data: { user: string; isTyping: boolean; roomId: string }) {
    console.log('Typing event:', data);
    const { roomId, user, isTyping } = data;
    if (isTyping) {
      store.dispatch(addTypingUser({ roomId, userId: user }));
    } else {
      store.dispatch(removeTypingUser({ roomId, userId: user }));
    }
  }
  
  /**
   * Handle socket error
   */
  private handleError(error: Error) {
    console.error('Socket error:', error);
    store.dispatch(setError(error.message));
  }
  
  // Public methods

  /**
   * Join a chat room
   * Backend expects: { roomId, user }
   */
  joinRoom(roomId: string, user?: string) {
    if (this.socket && this.socket.connected) {
      const userName = user || localStorage.getItem('username') || 'Anonymous';
      this.socket.emit('join-room', { roomId, user: userName });
    }
  }

  /**
   * Leave a chat room
   */
  leaveRoom(roomId: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('leave-room', { roomId });
    }
  }

  /**
   * Send a message
   * Backend expects: { roomId, message, user, userId? }
   */
  sendMessage(roomId: string, content: string, user?: string, userId?: string) {
    if (this.socket && this.socket.connected) {
      const userName = user || localStorage.getItem('username') || 'Anonymous';
      const userIdValue = userId || localStorage.getItem('userId');
      this.socket.emit('send-message', {
        roomId,
        message: content,
        user: userName,
        userId: userIdValue
      });
    }
  }

  /**
   * Send typing indicator
   * Backend expects: { user, isTyping, roomId }
   */
  sendTypingIndicator(roomId: string, isTyping: boolean, user?: string) {
    if (this.socket && this.socket.connected) {
      const userName = user || localStorage.getItem('username') || 'Anonymous';
      this.socket.emit('typing', { user: userName, isTyping, roomId });
    }
  }

  /**
   * Check if socket is connected
   */
  isConnected(): boolean {
    return this.socket?.connected || false;
  }
  
  /**
   * Disconnect socket
   */
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
  
  /**
   * Reconnect socket
   */
  reconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.initializeSocket();
    }
  }
  
  /**
   * Add custom event handler
   */
  on(event: string, handler: SocketEventHandler) {
    if (this.socket) {
      this.socket.on(event, handler);
      this.eventHandlers.set(event, handler);
    }
  }

  /**
   * Remove custom event handler
   */
  off(event: string) {
    if (this.socket) {
      const handler = this.eventHandlers.get(event);
      if (handler) {
        this.socket.off(event, handler);
        this.eventHandlers.delete(event);
      }
    }
  }
}

// Export singleton instance
export const chatSocketService = new ChatSocketService();

// Export for direct use if needed
export default ChatSocketService;