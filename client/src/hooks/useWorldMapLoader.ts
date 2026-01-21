/**
 * useWorldMapLoader Hook
 * 
 * Loads map data for a specific world room with cache validation.
 * Handles room ID mapping from world room ID to database room ID.
 */

import { useEffect, useState, useCallback } from 'react';
import { MapDataService, ExtendedMapData } from '../stores/MapDataService';
import { WorldRoomId } from '../shared/WorldRoomContext';
import { logger } from '../shared/logger';

interface UseWorldMapLoaderOptions {
  worldRoomId: WorldRoomId;
  autoLoad?: boolean;
}

interface UseWorldMapLoaderResult {
  mapData: ExtendedMapData | null;
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * Hook to load world map data by world room ID
 * Automatically converts world room ID to database room ID
 * Handles cache validation and error handling
 */
export const useWorldMapLoader = ({
  worldRoomId,
  autoLoad = true,
}: UseWorldMapLoaderOptions): UseWorldMapLoaderResult => {
  const [mapData, setMapData] = useState<ExtendedMapData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMap = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      logger.info('Loading world map', { worldRoomId });

      const data = await MapDataService.loadMapDataByWorldRoom(worldRoomId, true);

      if (data) {
        setMapData(data);
        logger.info('World map loaded successfully', { worldRoomId });
      } else {
        // Fall back to default map if loading fails
        logger.warn('Failed to load world map, using default', { worldRoomId });
        const defaultMap = await MapDataService.createDefaultMap();
        setMapData(defaultMap);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error loading map';
      logger.error('Error loading world map', { worldRoomId, error: errorMessage });
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [worldRoomId]);

  // Auto-load map when worldRoomId changes
  useEffect(() => {
    if (autoLoad) {
      loadMap();
    }
  }, [worldRoomId, autoLoad, loadMap]);

  return {
    mapData,
    isLoading,
    error,
    reload: loadMap,
  };
};

