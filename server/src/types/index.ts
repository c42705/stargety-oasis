// Core types for the server
export interface User {
  id: string;
  name: string;
  email?: string;
  isOnline: boolean;
  lastSeen: Date;
  joinedAt: Date;
}

export interface Room {
  id: string;
  name: string;
  type: 'chat' | 'video' | 'world';
  participants: string[];
  createdAt: Date;
  isPrivate: boolean;
}

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

// Avatar data for multiplayer synchronization
export interface AvatarSyncData {
  spriteSheetImageData: string;  // Base64 of the composed sprite sheet
  frameWidth: number;
  frameHeight: number;
  characterName: string;
}

export interface WorldPlayer {
  id: string;
  name: string;
  x: number;
  y: number;
  roomId: string;
  lastMoved: Date;
  avatarData?: AvatarSyncData;  // Optional avatar data for V2 characters
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: Date;
}

// Socket event data types
export interface SocketEventData {
  'join-room': { roomId: string; user: string };
  'send-message': ChatMessage;
  'typing': { user: string; isTyping: boolean; roomId: string };
  'player-moved': { playerId: string; x: number; y: number; roomId: string };
  'player-joined-world': { playerId: string; x: number; y: number; roomId: string };
}
