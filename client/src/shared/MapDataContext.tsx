import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
// import { useSharedMap } from './useSharedMap';
import { useSharedMapCompat as useSharedMap } from '../stores/useSharedMapCompat';

// Shared interfaces for map data
export interface InteractiveArea {
  id: string;
  name: string;
  type: 'meeting-room' | 'presentation-hall' | 'coffee-corner' | 'game-zone' | 'custom';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  description: string;
}

export interface ImpassableArea {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  name?: string;

  // Extended properties for polygon support
  type?: 'rectangle' | 'impassable-polygon';
  points?: { x: number; y: number }[];
  color?: string;
}

export interface MapData {
  interactiveAreas: InteractiveArea[];
  impassableAreas: ImpassableArea[];
  worldDimensions: {
    width: number;
    height: number;
  };
  backgroundImage?: string;
  backgroundImageDimensions?: {
    width: number;
    height: number;
  };
}

interface MapDataContextType {
  mapData: MapData;
  updateInteractiveAreas: (areas: InteractiveArea[]) => void;
  updateImpassableAreas: (areas: ImpassableArea[]) => void;
  addInteractiveArea: (area: InteractiveArea) => void;
  removeInteractiveArea: (id: string) => void;
  addImpassableArea: (area: ImpassableArea) => void;
  removeImpassableArea: (id: string) => void;
  updateInteractiveArea: (id: string, updates: Partial<InteractiveArea>) => void;
  updateImpassableArea: (id: string, updates: Partial<ImpassableArea>) => void;
}

const MapDataContext = createContext<MapDataContextType | undefined>(undefined);

// Default map data
const defaultMapData: MapData = {
  interactiveAreas: [
    {
      id: 'meeting-room',
      name: 'Meeting Room',
      type: 'meeting-room',
      x: 150,
      y: 150,
      width: 120,
      height: 80,
      color: '#4A90E2',
      description: 'Join the weekly team sync'
    },
    {
      id: 'presentation-hall',
      name: 'Presentation Hall',
      type: 'presentation-hall',
      x: 300,
      y: 150,
      width: 140,
      height: 100,
      color: '#9B59B6',
      description: 'Watch presentations and demos'
    },
    {
      id: 'coffee-corner',
      name: 'Coffee Corner',
      type: 'coffee-corner',
      x: 150,
      y: 350,
      width: 100,
      height: 80,
      color: '#D2691E',
      description: 'Casual conversations'
    },
    {
      id: 'game-zone',
      name: 'Game Zone',
      type: 'game-zone',
      x: 300,
      y: 350,
      width: 120,
      height: 90,
      color: '#E74C3C',
      description: 'Fun and games'
    }
  ],
  impassableAreas: [
    {
      id: 'wall-1',
      x: 200,
      y: 100,
      width: 80,
      height: 20,
      name: 'Wall Section'
    },
    {
      id: 'barrier-1',
      x: 400,
      y: 200,
      width: 60,
      height: 60,
      name: 'Barrier'
    }
  ],
  worldDimensions: {
    width: 800,
    height: 600
  },
  backgroundImage: undefined,
  backgroundImageDimensions: undefined
};

export const MapDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Use the shared map system instead of local state
  // Auto-save is now controlled by the Zustand store configuration
  const sharedMap = useSharedMap({ source: 'editor' });
  const [mapData, setMapData] = useState<MapData>(defaultMapData);

  // Sync with shared map system
  useEffect(() => {
    if (sharedMap.mapData) {
      setMapData({
        interactiveAreas: sharedMap.interactiveAreas,
        impassableAreas: sharedMap.collisionAreas,
        worldDimensions: sharedMap.mapData.worldDimensions
      });
    }
  }, [sharedMap.mapData, sharedMap.interactiveAreas, sharedMap.collisionAreas]);

  // Wrapper functions that use the shared map system
  const updateInteractiveAreas = async (areas: InteractiveArea[]) => {
    // For bulk updates, we'll need to handle this differently
    // For now, update local state and TODO: implement bulk update in shared system
    setMapData(prev => ({ ...prev, interactiveAreas: areas }));
  };

  const updateImpassableAreas = async (areas: ImpassableArea[]) => {
    // For bulk updates, we'll need to handle this differently
    // For now, update local state and TODO: implement bulk update in shared system
    setMapData(prev => ({ ...prev, impassableAreas: areas }));
  };

  const addInteractiveArea = async (area: InteractiveArea) => {
    try {
      await sharedMap.addInteractiveArea(area);
    } catch (error) {
      console.error('Failed to add interactive area:', error);
      // Fallback to local state update
      setMapData(prev => ({
        ...prev,
        interactiveAreas: [...prev.interactiveAreas, area]
      }));
    }
  };

  const removeInteractiveArea = async (id: string) => {
    try {
      await sharedMap.removeInteractiveArea(id);
    } catch (error) {
      console.error('Failed to remove interactive area:', error);
      // Fallback to local state update
      setMapData(prev => ({
        ...prev,
        interactiveAreas: prev.interactiveAreas.filter(area => area.id !== id)
      }));
    }
  };

  const addImpassableArea = async (area: ImpassableArea) => {
    try {
      await sharedMap.addCollisionArea(area);
    } catch (error) {
      console.error('Failed to add collision area:', error);
      // Fallback to local state update
      setMapData(prev => ({
        ...prev,
        impassableAreas: [...prev.impassableAreas, area]
      }));
    }
  };

  const removeImpassableArea = async (id: string) => {
    try {
      await sharedMap.removeCollisionArea(id);
    } catch (error) {
      console.error('Failed to remove collision area:', error);
      // Fallback to local state update
      setMapData(prev => ({
        ...prev,
        impassableAreas: prev.impassableAreas.filter(area => area.id !== id)
      }));
    }
  };

  const updateInteractiveArea = async (id: string, updates: Partial<InteractiveArea>) => {
    try {
      await sharedMap.updateInteractiveArea(id, updates);
    } catch (error) {
      console.error('Failed to update interactive area:', error);
      // Fallback to local state update
      setMapData(prev => ({
        ...prev,
        interactiveAreas: prev.interactiveAreas.map(area =>
          area.id === id ? { ...area, ...updates } : area
        )
      }));
    }
  };

  const updateImpassableArea = async (id: string, updates: Partial<ImpassableArea>) => {
    try {
      await sharedMap.updateCollisionArea(id, updates);
    } catch (error) {
      console.error('Failed to update collision area:', error);
      // Fallback to local state update
      setMapData(prev => ({
        ...prev,
        impassableAreas: prev.impassableAreas.map(area =>
          area.id === id ? { ...area, ...updates } : area
        )
      }));
    }
  };

  const value: MapDataContextType = {
    mapData,
    updateInteractiveAreas,
    updateImpassableAreas,
    addInteractiveArea,
    removeInteractiveArea,
    addImpassableArea,
    removeImpassableArea,
    updateInteractiveArea,
    updateImpassableArea
  };

  return (
    <MapDataContext.Provider value={value}>
      {children}
    </MapDataContext.Provider>
  );
};

export const useMapData = (): MapDataContextType => {
  const context = useContext(MapDataContext);
  if (context === undefined) {
    throw new Error('useMapData must be used within a MapDataProvider');
  }
  return context;
};
