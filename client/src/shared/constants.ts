// API Configuration
export const API_CONFIG = {
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  SOCKET_URL: process.env.REACT_APP_SOCKET_URL || 'http://localhost:3001',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
} as const;

// Jitsi Configuration
export const JITSI_CONFIG = {
  DOMAIN: process.env.REACT_APP_JITSI_DOMAIN || 'meet.jit.si',
  DEFAULT_ROOM_PREFIX: 'stargety-oasis-',
} as const;

// Chat Configuration
export const CHAT_CONFIG = {
  MAX_MESSAGE_LENGTH: 500,
  MAX_MESSAGES_HISTORY: 100,
  TYPING_TIMEOUT: 1000,
  RECONNECT_INTERVAL: 5000,
  EMOJI_LIST: ['😀', '😂', '😍', '🤔', '👍', '👎', '❤️', '🎉', '😢', '😮'], // Note: These are kept as emojis for chat functionality
} as const;

// Video Call Configuration
export const VIDEO_CONFIG = {
  MAX_PARTICIPANTS: 10,
  DEFAULT_AUDIO_MUTED: false,
  DEFAULT_VIDEO_MUTED: false,
  SCREEN_SHARE_ENABLED: true,
  RECORDING_ENABLED: false,
} as const;

// World Configuration
export const WORLD_CONFIG = {
  DEFAULT_WIDTH: 800,
  DEFAULT_HEIGHT: 600,
  PLAYER_SPEED: 200,
  PLAYER_SIZE: 32,
  MAX_PLAYERS: 20,
  SYNC_INTERVAL: 100,
  BOUNDS_PADDING: 16,
} as const;

// UI Configuration
export const UI_CONFIG = {
  SIDEBAR_WIDTH: 200,
  HEADER_HEIGHT: 60,
  MOBILE_BREAKPOINT: 768,
  ANIMATION_DURATION: 300,
  TOAST_DURATION: 5000,
} as const;

// Storage Keys
export const STORAGE_KEYS = {
  USER_PREFERENCES: 'stargety_user_preferences',
  AUTH_TOKEN: 'stargety_auth_token',
  LAST_ROOM: 'stargety_last_room',
  CHAT_HISTORY: 'stargety_chat_history',
  WORLD_POSITION: 'stargety_world_position',
} as const;

// Event Names
export const EVENTS = {
  // Chat events
  CHAT_MESSAGE: 'chat:message',
  CHAT_USER_JOINED: 'chat:userJoined',
  CHAT_USER_LEFT: 'chat:userLeft',
  CHAT_TYPING: 'chat:typing',

  // Video events
  VIDEO_ROOM_JOINED: 'video:roomJoined',
  VIDEO_ROOM_LEFT: 'video:roomLeft',
  VIDEO_PARTICIPANT_JOINED: 'video:participantJoined',
  VIDEO_PARTICIPANT_LEFT: 'video:participantLeft',

  // World events
  WORLD_PLAYER_MOVED: 'world:playerMoved',
  WORLD_PLAYER_JOINED: 'world:playerJoined',
  WORLD_PLAYER_LEFT: 'world:playerLeft',
  WORLD_OBJECT_INTERACTION: 'world:objectInteraction',

  // App events
  APP_MODULE_LOADED: 'app:moduleLoaded',
  APP_ERROR: 'app:error',
  APP_CONNECTION_CHANGED: 'app:connectionChanged',
} as const;

// Error Codes
export const ERROR_CODES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  AUTH_ERROR: 'AUTH_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  ROOM_FULL: 'ROOM_FULL',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INVALID_ROOM: 'INVALID_ROOM',
  CONNECTION_LOST: 'CONNECTION_LOST',
  MEDIA_ERROR: 'MEDIA_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

// Default Values
export const DEFAULTS = {
  USER_NAME: 'Anonymous',
  ROOM_NAME: 'General',
  AVATAR_COLOR: '#007bff',
  WORLD_SPAWN_X: 400,
  WORLD_SPAWN_Y: 300,
} as const;

// Validation Rules
export const VALIDATION = {
  MIN_USERNAME_LENGTH: 2,
  MAX_USERNAME_LENGTH: 20,
  MIN_PASSWORD_LENGTH: 6,
  MAX_PASSWORD_LENGTH: 50,
  MIN_ROOM_NAME_LENGTH: 1,
  MAX_ROOM_NAME_LENGTH: 30,
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  USERNAME_REGEX: /^[a-zA-Z0-9_-]+$/,
} as const;

// Module Names
export const MODULES = {
  CHAT: 'chat',
  VIDEO: 'video',
  WORLD: 'world',
} as const;

// Connection States
export const CONNECTION_STATES = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  ERROR: 'error',
} as const;

// User Roles
export const USER_ROLES = {
  ADMIN: 'admin',
  MODERATOR: 'moderator',
  USER: 'user',
  GUEST: 'guest',
} as const;
