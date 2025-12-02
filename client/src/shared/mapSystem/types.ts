/**
 * Map System Type Definitions
 *
 * Centralized types for the SharedMapSystem and related services.
 * Used by MapPersistenceService, MapSocketService, MapHistoryManager, and SharedMapSystem.
 */

import { MapData } from '../MapDataContext';

// Extended map data structure for shared system
export interface SharedMapData extends MapData {
  version: number;
  lastModified: Date;
  createdBy: string;
  metadata: {
    name: string;
    description: string;
    tags: string[];
    isPublic: boolean;
  };
  layers: MapLayer[];
  resources: MapResource[];
}

export interface MapLayer {
  id: string;
  name: string;
  type: 'background' | 'interactive' | 'collision' | 'decoration' | 'overlay';
  visible: boolean;
  locked: boolean;
  opacity: number;
  zIndex: number;
  elements: MapElement[];
}

export interface MapElement {
  id: string;
  type: 'area' | 'collision' | 'decoration' | 'spawn' | 'trigger';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  properties: Record<string, unknown>;
  layerId: string;
}

// Renamed from MapAsset to MapResource to avoid confusion with Asset (placed images)
export interface MapResource {
  id: string;
  name: string;
  type: 'image' | 'sprite' | 'tileset' | 'audio';
  url: string;
  metadata: {
    width?: number;
    height?: number;
    frameCount?: number;
    duration?: number;
  };
}

// Event types for map system
export type MapEventType =
  | 'map:loaded'
  | 'map:saved'
  | 'map:saving'
  | 'map:save:error'
  | 'map:changed'
  | 'map:element:added'
  | 'map:element:updated'
  | 'map:element:removed'
  | 'map:layer:added'
  | 'map:layer:updated'
  | 'map:layer:removed'
  | 'map:sync:started'
  | 'map:sync:completed'
  | 'map:sync:error'
  | 'map:dimensionsChanged';

export interface MapEvent {
  type: MapEventType;
  data: unknown;
  timestamp: Date;
  source: 'world' | 'editor';
}

// Map change history for undo/redo functionality
export interface MapChange {
  id: string;
  type: 'add' | 'update' | 'remove';
  elementType: 'area' | 'collision' | 'layer' | 'asset' | 'worldDimensions';
  before: unknown;
  after: unknown;
  timestamp: Date;
  userId: string;
}

// Event callback function type
export type MapEventCallback = (data: unknown) => void;

