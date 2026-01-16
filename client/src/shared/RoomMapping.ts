/**
 * Room Mapping Configuration
 * 
 * Maps world room IDs (UI) to database room IDs (backend).
 * This allows the frontend to use user-friendly names while the backend
 * uses consistent database identifiers.
 */

import { WorldRoomId } from './WorldRoomContext';

/**
 * Database room ID type - consistent naming convention
 * Format: room_{number} (e.g., room_001, room_002, room_003)
 */
export type DatabaseRoomId = 'room_001' | 'room_002' | 'room_003';

/**
 * Room mapping configuration
 * Maps world room IDs to database room IDs
 */
export const ROOM_MAPPING: Record<WorldRoomId, DatabaseRoomId> = {
  'Stargety-Oasis-1': 'room_001',
  'Stargety-Oasis-2': 'room_002',
  'Stargety-Oasis-3': 'room_003',
} as const;

/**
 * Reverse mapping for database room ID to world room ID
 */
export const REVERSE_ROOM_MAPPING: Record<DatabaseRoomId, WorldRoomId> = {
  'room_001': 'Stargety-Oasis-1',
  'room_002': 'Stargety-Oasis-2',
  'room_003': 'Stargety-Oasis-3',
} as const;

/**
 * Get database room ID from world room ID
 * @param worldRoomId - The world room ID (e.g., 'Stargety-Oasis-1')
 * @returns The database room ID (e.g., 'room_001')
 */
export function getDatabaseRoomId(worldRoomId: WorldRoomId): DatabaseRoomId {
  const dbRoomId = ROOM_MAPPING[worldRoomId];
  if (!dbRoomId) {
    throw new Error(`Unknown world room ID: ${worldRoomId}`);
  }
  return dbRoomId;
}

/**
 * Get world room ID from database room ID
 * @param databaseRoomId - The database room ID (e.g., 'room_001')
 * @returns The world room ID (e.g., 'Stargety-Oasis-1')
 */
export function getWorldRoomId(databaseRoomId: DatabaseRoomId): WorldRoomId {
  const worldRoomId = REVERSE_ROOM_MAPPING[databaseRoomId];
  if (!worldRoomId) {
    throw new Error(`Unknown database room ID: ${databaseRoomId}`);
  }
  return worldRoomId;
}

/**
 * Validate if a string is a valid database room ID
 */
export function isValidDatabaseRoomId(roomId: string): roomId is DatabaseRoomId {
  return roomId === 'room_001' || roomId === 'room_002' || roomId === 'room_003';
}

/**
 * Get all available database room IDs
 */
export function getAllDatabaseRoomIds(): DatabaseRoomId[] {
  return ['room_001', 'room_002', 'room_003'];
}

/**
 * Room metadata - additional information about each room
 */
export interface RoomMetadata {
  databaseId: DatabaseRoomId;
  worldId: WorldRoomId;
  displayName: string;
  description: string;
  capacity: number;
  features: string[];
}

/**
 * Room metadata configuration
 */
export const ROOM_METADATA: Record<DatabaseRoomId, RoomMetadata> = {
  'room_001': {
    databaseId: 'room_001',
    worldId: 'Stargety-Oasis-1',
    displayName: 'Stargety Oasis 1',
    description: 'Main gathering space with meeting rooms and lounges',
    capacity: 100,
    features: ['meetings', 'lounges', 'coffee-corner', 'game-zone'],
  },
  'room_002': {
    databaseId: 'room_002',
    worldId: 'Stargety-Oasis-2',
    displayName: 'Stargety Oasis 2',
    description: 'Secondary world space for collaborative work',
    capacity: 100,
    features: ['meetings', 'workspaces', 'lounges'],
  },
  'room_003': {
    databaseId: 'room_003',
    worldId: 'Stargety-Oasis-3',
    displayName: 'Stargety Oasis 3',
    description: 'Tertiary world space for events and gatherings',
    capacity: 100,
    features: ['meetings', 'event-space', 'lounges'],
  },
};

/**
 * Get room metadata by database room ID
 */
export function getRoomMetadata(databaseRoomId: DatabaseRoomId): RoomMetadata {
  const metadata = ROOM_METADATA[databaseRoomId];
  if (!metadata) {
    throw new Error(`No metadata found for room: ${databaseRoomId}`);
  }
  return metadata;
}

