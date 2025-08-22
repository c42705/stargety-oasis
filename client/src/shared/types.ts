// Core application types
export interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen?: Date;
  joinedAt: Date;
}

export interface Room {
  id: string;
  name: string;
  type: 'chat' | 'video' | 'world';
  participants: string[];
  createdAt: Date;
  isPrivate: boolean;
  maxParticipants?: number;
}

// Chat module types
export interface ChatMessage {
  id: string;
  message: string;
  user: string;
  userId: string;
  timestamp: Date;
  type: 'message' | 'system' | 'emoji';
  roomId: string;
  edited?: boolean;
  editedAt?: Date;
}

export interface ChatRoom extends Room {
  type: 'chat';
  lastMessage?: ChatMessage;
  unreadCount: number;
}

// Video call types
export interface VideoCallParticipant {
  id: string;
  name: string;
  isAudioMuted: boolean;
  isVideoMuted: boolean;
  isScreenSharing: boolean;
  joinedAt: Date;
}

export interface VideoCallRoom {
  id: string;
  name: string;
  type: 'video';
  participants: string[];
  participantDetails: VideoCallParticipant[];
  createdAt: Date;
  isPrivate: boolean;
  maxParticipants?: number;
  isRecording: boolean;
  recordingStartedAt?: Date;
  jitsiRoomId: string;
}

// World module types
export interface WorldPlayer {
  id: string;
  name: string;
  x: number;
  y: number;
  avatar?: string;
  isMoving: boolean;
  direction?: 'up' | 'down' | 'left' | 'right';
  lastMoved: Date;
}

export interface WorldObject {
  id: string;
  type: 'tree' | 'building' | 'decoration' | 'interactive';
  x: number;
  y: number;
  width: number;
  height: number;
  isCollidable: boolean;
  sprite?: string;
}

export interface WorldRoom extends Room {
  type: 'world';
  width: number;
  height: number;
  players: WorldPlayer[];
  objects: WorldObject[];
  backgroundImage?: string;
}

// API response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

// Application state types
export interface AppState {
  user: User | null;
  currentRoom: Room | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

// Configuration types
export interface AppConfig {
  apiUrl: string;
  socketUrl: string;
  jitsiDomain: string;
  maxMessageLength: number;
  maxRoomParticipants: number;
  worldDimensions: { width: number; height: number };
  enableDebugMode: boolean;
}

// Utility types
export type ModuleType = 'chat' | 'video' | 'world';
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';
export type UserRole = 'admin' | 'moderator' | 'user' | 'guest';

// Event handler types
export type EventHandler<T = any> = (data: T) => void;
export type AsyncEventHandler<T = any> = (data: T) => Promise<void>;

// Error types
export interface AppError {
  code: string;
  message: string;
  details?: any;
  timestamp: Date;
  module?: ModuleType;
}
