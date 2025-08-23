import React, { createContext, useContext, useState, ReactNode } from 'react';

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
  icon: string;
}

export interface ImpassableArea {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  name?: string;
}

export interface MapData {
  interactiveAreas: InteractiveArea[];
  impassableAreas: ImpassableArea[];
  worldDimensions: {
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
      description: 'Join the weekly team sync',
      icon: '🏢'
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
      description: 'Watch presentations and demos',
      icon: '📊'
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
      description: 'Casual conversations',
      icon: '☕'
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
      description: 'Fun and games',
      icon: '🎮'
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
  }
};

export const MapDataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mapData, setMapData] = useState<MapData>(defaultMapData);

  const updateInteractiveAreas = (areas: InteractiveArea[]) => {
    setMapData(prev => ({ ...prev, interactiveAreas: areas }));
  };

  const updateImpassableAreas = (areas: ImpassableArea[]) => {
    setMapData(prev => ({ ...prev, impassableAreas: areas }));
  };

  const addInteractiveArea = (area: InteractiveArea) => {
    setMapData(prev => ({
      ...prev,
      interactiveAreas: [...prev.interactiveAreas, area]
    }));
  };

  const removeInteractiveArea = (id: string) => {
    setMapData(prev => ({
      ...prev,
      interactiveAreas: prev.interactiveAreas.filter(area => area.id !== id)
    }));
  };

  const addImpassableArea = (area: ImpassableArea) => {
    setMapData(prev => ({
      ...prev,
      impassableAreas: [...prev.impassableAreas, area]
    }));
  };

  const removeImpassableArea = (id: string) => {
    setMapData(prev => ({
      ...prev,
      impassableAreas: prev.impassableAreas.filter(area => area.id !== id)
    }));
  };

  const updateInteractiveArea = (id: string, updates: Partial<InteractiveArea>) => {
    setMapData(prev => ({
      ...prev,
      interactiveAreas: prev.interactiveAreas.map(area =>
        area.id === id ? { ...area, ...updates } : area
      )
    }));
  };

  const updateImpassableArea = (id: string, updates: Partial<ImpassableArea>) => {
    setMapData(prev => ({
      ...prev,
      impassableAreas: prev.impassableAreas.map(area =>
        area.id === id ? { ...area, ...updates } : area
      )
    }));
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
