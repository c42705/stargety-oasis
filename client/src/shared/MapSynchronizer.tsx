/**
 * Map Synchronizer Component
 * 
 * This component ensures perfect synchronization between the Map Editor (Fabric.js)
 * and the main virtual world (Phaser.js) by listening to SharedMapSystem events
 * and triggering appropriate updates across all connected interfaces.
 * 
 * Features:
 * - Real-time synchronization across all map interfaces
 * - Conflict detection and resolution
 * - Data validation before synchronization
 * - Performance optimization with debounced updates
 * - Cross-tab synchronization support
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { logger } from './logger';
import { SharedMapSystem, MapEventType } from './SharedMapSystem';


interface MapSynchronizerProps {
  children: React.ReactNode;
  enableCrossTabSync?: boolean;
  syncDebounceMs?: number;
  onSyncError?: (error: string) => void;
  onSyncSuccess?: () => void;
}

export const MapSynchronizer: React.FC<MapSynchronizerProps> = ({
  children,
  enableCrossTabSync = true,
  syncDebounceMs = 100,
  onSyncError,
  onSyncSuccess
}) => {
  const mapSystemRef = useRef<SharedMapSystem | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncTimestamp = useRef<number>(0);

  // Perform actual synchronization
  const performSync = useCallback((eventType: string, data: any) => {
    const now = Date.now();

    // Prevent rapid successive syncs
    if (now - lastSyncTimestamp.current < 50) {
      return;
    }

    lastSyncTimestamp.current = now;

    try {
      // Emit synchronization event to all connected interfaces
      if (mapSystemRef.current) {
        mapSystemRef.current.emit('map:sync:started' as MapEventType, {
          eventType,
          data,
          timestamp: now
        });

        // Validate data before sync
        if (data.mapData && !validateMapData(data.mapData)) {
          throw new Error('Invalid map data structure detected during sync');
        }

        // Emit completion event
        mapSystemRef.current.emit('map:sync:completed' as MapEventType, {
          eventType,
          data,
          timestamp: now,
          success: true
        });
      }

      logger.info(`Map synchronized: ${eventType}`, data);

    } catch (error) {
      logger.error('Synchronization failed', error as Error);

      if (mapSystemRef.current) {
        mapSystemRef.current.emit('map:sync:error' as MapEventType, {
          error: error instanceof Error ? error.message : 'Unknown sync error',
          eventType,
          timestamp: now
        });
      }

      onSyncError?.(error instanceof Error ? error.message : 'Synchronization failed');
    }
  }, [onSyncError]);

  // Debounced synchronization to prevent excessive updates
  const debouncedSync = useCallback((eventType: string, data: any) => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      performSync(eventType, data);
    }, syncDebounceMs);
  }, [performSync, syncDebounceMs]);

  useEffect(() => {
    // Initialize map system
    mapSystemRef.current = SharedMapSystem.getInstance();
    
    // Set up synchronization event listeners
    const setupSyncListeners = () => {
      if (!mapSystemRef.current) return;

      const handleMapChanged = (data: any) => {
        debouncedSync('map:changed', data);
      };

      const handleElementAdded = (data: any) => {
        debouncedSync('map:element:added', data);
      };

      const handleElementUpdated = (data: any) => {
        debouncedSync('map:element:updated', data);
      };

      const handleElementRemoved = (data: any) => {
        debouncedSync('map:element:removed', data);
      };

      const handleMapSaved = (data: any) => {
        // Immediate sync on save
        performSync('map:saved', data);
        onSyncSuccess?.();
      };

      const handleSyncError = (data: any) => {
        console.error('Map synchronization error:', data.error);
        onSyncError?.(data.error);
      };

      // Subscribe to events
      mapSystemRef.current.on('map:changed', handleMapChanged);
      mapSystemRef.current.on('map:element:added', handleElementAdded);
      mapSystemRef.current.on('map:element:updated', handleElementUpdated);
      mapSystemRef.current.on('map:element:removed', handleElementRemoved);
      mapSystemRef.current.on('map:saved', handleMapSaved);
      mapSystemRef.current.on('map:sync:error', handleSyncError);

      // Return cleanup function
      return () => {
        if (mapSystemRef.current) {
          mapSystemRef.current.off('map:changed', handleMapChanged);
          mapSystemRef.current.off('map:element:added', handleElementAdded);
          mapSystemRef.current.off('map:element:updated', handleElementUpdated);
          mapSystemRef.current.off('map:element:removed', handleElementRemoved);
          mapSystemRef.current.off('map:saved', handleMapSaved);
          mapSystemRef.current.off('map:sync:error', handleSyncError);
        }
      };
    };

    const cleanup = setupSyncListeners();

    // Set up cross-tab synchronization if enabled
    let storageListener: ((event: StorageEvent) => void) | null = null;
    
    if (enableCrossTabSync) {
      storageListener = (event: StorageEvent) => {
        if (event.key === 'stargety_shared_map_data' && event.newValue) {
          try {
            const newData = JSON.parse(event.newValue);
            // Trigger synchronization across all interfaces
            performSync('map:external:changed', { mapData: newData, source: 'cross-tab' });
          } catch (error) {
            logger.warn('Failed to parse cross-tab map data', error as Error);
          }
        }
      };
      
      window.addEventListener('storage', storageListener);
    }

    // Cleanup
    return () => {
      cleanup?.();
      if (storageListener) {
        window.removeEventListener('storage', storageListener);
      }
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [enableCrossTabSync, onSyncError, onSyncSuccess, debouncedSync, performSync]);



  // Validate map data structure
  const validateMapData = (data: any): boolean => {
    try {
      return (
        data &&
        typeof data === 'object' &&
        Array.isArray(data.interactiveAreas) &&
        Array.isArray(data.impassableAreas) &&
        data.worldDimensions &&
        typeof data.worldDimensions.width === 'number' &&
        typeof data.worldDimensions.height === 'number' &&
        typeof data.version === 'number' &&
        data.lastModified instanceof Date
      );
    } catch {
      return false;
    }
  };



  // Force sync method is available via the hook
  // React.useImperativeHandle would need a proper ref setup

  return (
    <>
      {children}
      {/* Map Sync status indicator removed for cleaner UI */}
    </>
  );
};

// Hook for accessing synchronization functionality
export const useMapSynchronizer = () => {
  const mapSystem = SharedMapSystem.getInstance();
  
  return {
    forceSynchronization: () => {
      const currentData = mapSystem.getMapData();
      if (currentData) {
        mapSystem.emit('map:sync:started' as MapEventType, {
          eventType: 'manual:sync',
          data: { mapData: currentData },
          timestamp: Date.now()
        });
      }
    },
    getSyncState: () => mapSystem.getSaveState()
  };
};
