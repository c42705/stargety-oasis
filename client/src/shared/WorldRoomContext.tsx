import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// Available world rooms
export const WORLD_ROOMS = [
  { id: 'Stargety-Oasis-1', label: 'Stargety Oasis 1' },
  { id: 'Stargety-Oasis-2', label: 'Stargety Oasis 2' },
  { id: 'Stargety-Oasis-3', label: 'Stargety Oasis 3' },
] as const;

export type WorldRoomId = typeof WORLD_ROOMS[number]['id'];

const DEFAULT_WORLD_ROOM: WorldRoomId = 'Stargety-Oasis-1';
const STORAGE_KEY = 'stargetyOasis_worldRoomId';

interface WorldRoomContextType {
  worldRoomId: WorldRoomId;
  setWorldRoomId: (roomId: WorldRoomId) => void;
  availableRooms: typeof WORLD_ROOMS;
}

const WorldRoomContext = createContext<WorldRoomContextType | undefined>(undefined);

export const useWorldRoom = (): WorldRoomContextType => {
  const context = useContext(WorldRoomContext);
  if (!context) {
    throw new Error('useWorldRoom must be used within a WorldRoomProvider');
  }
  return context;
};

interface WorldRoomProviderProps {
  children: React.ReactNode;
}

export const WorldRoomProvider: React.FC<WorldRoomProviderProps> = ({ children }) => {
  const [worldRoomId, setWorldRoomIdState] = useState<WorldRoomId>(() => {
    // Load from sessionStorage on mount
    const savedRoomId = sessionStorage.getItem(STORAGE_KEY);
    if (savedRoomId && WORLD_ROOMS.some(room => room.id === savedRoomId)) {
      return savedRoomId as WorldRoomId;
    }
    return DEFAULT_WORLD_ROOM;
  });

  // Persist to sessionStorage when changed
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, worldRoomId);
  }, [worldRoomId]);

  const setWorldRoomId = useCallback((roomId: WorldRoomId) => {
    if (WORLD_ROOMS.some(room => room.id === roomId)) {
      setWorldRoomIdState(roomId);
    }
  }, []);

  const contextValue: WorldRoomContextType = {
    worldRoomId,
    setWorldRoomId,
    availableRooms: WORLD_ROOMS,
  };

  return (
    <WorldRoomContext.Provider value={contextValue}>
      {children}
    </WorldRoomContext.Provider>
  );
};

// Utility function to get current world room ID (for use outside React)
export const getCurrentWorldRoomId = (): WorldRoomId => {
  const savedRoomId = sessionStorage.getItem(STORAGE_KEY);
  if (savedRoomId && WORLD_ROOMS.some(room => room.id === savedRoomId)) {
    return savedRoomId as WorldRoomId;
  }
  return DEFAULT_WORLD_ROOM;
};

