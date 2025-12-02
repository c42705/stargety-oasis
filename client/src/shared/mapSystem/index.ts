/**
 * Map System Module
 *
 * Barrel exports for the map system services and types.
 * Provides clean imports for consumers.
 */

// Types
export * from './types';

// Services
export { MapPersistenceService } from './MapPersistenceService';
export type { SaveResult, LoadResult } from './MapPersistenceService';

export { MapSocketService } from './MapSocketService';
export type { MapSocketCallbacks, SocketEventHandler } from './MapSocketService';

export { MapHistoryManager } from './MapHistoryManager';

export { MapAreaService } from './MapAreaService';
export type { AreaOperationResult } from './MapAreaService';

export { MapDimensionService } from './MapDimensionService';
export type { DimensionUpdateResult } from './MapDimensionService';

export { MapEventEmitter } from './MapEventEmitter';
