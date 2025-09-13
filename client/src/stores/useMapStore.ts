/**
 * Zustand Map Store - Centralized state management for the hybrid architecture
 * 
 * This store replaces the SharedMapSystem with a cleaner, more predictable
 * state management solution using Zustand. It provides a single source of truth
 * for all map data and eliminates the race conditions and multiple initialization
 * issues of the previous system.
 * 
 * Key Features:
 * - Single store instance (no singleton complexity)
 * - Immutable state updates with Immer
 * - Clear action separation
 * - Async operation handling
 * - Error state management
 * - Save-based synchronization
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { MapDataService, ExtendedMapData } from './MapDataService';
import { InteractiveArea, ImpassableArea } from '../shared/MapDataContext';

interface MapStore {
  // State
  mapData: ExtendedMapData | null;
  isLoading: boolean;
  error: string | null;
  lastSaved: Date | null;
  isDirty: boolean;
  isInitializing: boolean; // Has unsaved changes

  // Auto-save configuration
  autoSaveEnabled: boolean;
  autoSaveDelay: number;

  // Actions - Map Operations
  loadMap: () => Promise<void>;
  saveMap: () => Promise<void>;
  resetMap: () => Promise<void>;
  importMap: (jsonData: string) => Promise<void>;
  exportMap: () => string;

  // Actions - Interactive Areas
  addInteractiveArea: (area: InteractiveArea) => void;
  updateInteractiveArea: (id: string, updates: Partial<InteractiveArea>) => void;
  removeInteractiveArea: (id: string) => void;
  setInteractiveAreas: (areas: InteractiveArea[]) => void;

  // Actions - Collision Areas
  addCollisionArea: (area: ImpassableArea) => void;
  updateCollisionArea: (id: string, updates: Partial<ImpassableArea>) => void;
  removeCollisionArea: (id: string) => void;
  setCollisionAreas: (areas: ImpassableArea[]) => void;

  // Actions - Background & Dimensions
  setBackgroundImage: (url: string, dimensions?: { width: number; height: number }) => void;
  uploadBackgroundImage: (file: File) => Promise<void>;
  setWorldDimensions: (dimensions: { width: number; height: number }) => void;

  // Actions - Backup & Recovery
  restoreFromBackup: () => Promise<void>;

  // Actions - Utility
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  markDirty: () => void;
  markClean: () => void;

  // Actions - Auto-save
  setAutoSaveEnabled: (enabled: boolean) => void;
  setAutoSaveDelay: (delay: number) => void;

  // Getters
  getMapStatistics: () => any;
}

export const useMapStore = create<MapStore>()(
  immer((set, get) => ({
    // Initial State
    mapData: null,
    isLoading: false,
    error: null,
    lastSaved: null,
    isDirty: false,
    isInitializing: true, // Flag to prevent auto-save during initialization

    // Auto-save configuration - DISABLED by default
    autoSaveEnabled: false,
    autoSaveDelay: 2000, // 2 seconds

    // Map Operations
    loadMap: async () => {
      try {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        console.log('📂 LOADING MAP DATA FROM STORE');

        let mapData = await MapDataService.loadMapData();
        
        if (!mapData) {
          console.log('🆕 NO MAP DATA FOUND, CREATING DEFAULT');
          mapData = await MapDataService.createDefaultMap();
        }

        set((state) => {
          state.mapData = mapData;
          state.lastSaved = mapData?.lastModified || new Date();
          state.isDirty = false;
          state.isLoading = false;
          state.isInitializing = false; // Mark initialization as complete
        });

        console.log('✅ MAP DATA LOADED SUCCESSFULLY');

      } catch (error) {
        console.error('❌ FAILED TO LOAD MAP:', error);
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to load map';
          state.isLoading = false;
        });
      }
    },

    saveMap: async () => {
      const { mapData } = get();
      if (!mapData) {
        throw new Error('No map data to save');
      }

      try {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        console.log('💾 SAVING MAP DATA FROM STORE');

        await MapDataService.saveMapData(mapData);

        set((state) => {
          state.lastSaved = new Date();
          state.isDirty = false;
          state.isLoading = false;
        });

        console.log('✅ MAP DATA SAVED SUCCESSFULLY');

      } catch (error) {
        console.error('❌ FAILED TO SAVE MAP:', error);
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to save map';
          state.isLoading = false;
        });
        throw error;
      }
    },

    resetMap: async () => {
      try {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        console.log('🔄 RESETTING MAP TO DEFAULT');

        const defaultMap = await MapDataService.resetToDefault();

        set((state) => {
          state.mapData = defaultMap;
          state.lastSaved = defaultMap.lastModified;
          state.isDirty = false;
          state.isLoading = false;
        });

        console.log('✅ MAP RESET SUCCESSFULLY');

      } catch (error) {
        console.error('❌ FAILED TO RESET MAP:', error);
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to reset map';
          state.isLoading = false;
        });
        throw error;
      }
    },

    importMap: async (jsonData: string) => {
      try {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        const importedMap = await MapDataService.importMapData(jsonData);

        set((state) => {
          state.mapData = importedMap;
          state.lastSaved = importedMap.lastModified;
          state.isDirty = false;
          state.isLoading = false;
        });

      } catch (error) {
        console.error('❌ FAILED TO IMPORT MAP:', error);
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to import map';
          state.isLoading = false;
        });
        throw error;
      }
    },

    exportMap: () => {
      const { mapData } = get();
      if (!mapData) {
        throw new Error('No map data to export');
      }
      return MapDataService.exportMapData(mapData);
    },

    // Interactive Areas
    addInteractiveArea: (area: InteractiveArea) => {
      set((state) => {
        if (state.mapData) {
          state.mapData.interactiveAreas.push(area);
          state.isDirty = true;
        }
      });
    },

    updateInteractiveArea: (id: string, updates: Partial<InteractiveArea>) => {
      set((state) => {
        if (state.mapData) {
          const index = state.mapData.interactiveAreas.findIndex(area => area.id === id);
          if (index !== -1) {
            Object.assign(state.mapData.interactiveAreas[index], updates);
            state.isDirty = true;
          }
        }
      });
    },

    removeInteractiveArea: (id: string) => {
      set((state) => {
        if (state.mapData) {
          state.mapData.interactiveAreas = state.mapData.interactiveAreas.filter(area => area.id !== id);
          state.isDirty = true;
        }
      });
    },

    setInteractiveAreas: (areas: InteractiveArea[]) => {
      set((state) => {
        if (state.mapData) {
          state.mapData.interactiveAreas = areas;
          state.isDirty = true;
        }
      });
    },

    // Collision Areas
    addCollisionArea: (area: ImpassableArea) => {
      set((state) => {
        if (state.mapData) {
          state.mapData.impassableAreas.push(area);
          state.isDirty = true;
        }
      });
    },

    updateCollisionArea: (id: string, updates: Partial<ImpassableArea>) => {
      set((state) => {
        if (state.mapData) {
          const index = state.mapData.impassableAreas.findIndex(area => area.id === id);
          if (index !== -1) {
            Object.assign(state.mapData.impassableAreas[index], updates);
            state.isDirty = true;
          }
        }
      });
    },

    removeCollisionArea: (id: string) => {
      set((state) => {
        if (state.mapData) {
          state.mapData.impassableAreas = state.mapData.impassableAreas.filter(area => area.id !== id);
          state.isDirty = true;
        }
      });
    },

    setCollisionAreas: (areas: ImpassableArea[]) => {
      set((state) => {
        if (state.mapData) {
          state.mapData.impassableAreas = areas;
          state.isDirty = true;
        }
      });
    },

    // Background & Dimensions
    setBackgroundImage: (url: string, dimensions?: { width: number; height: number }) => {
      set((state) => {
        if (state.mapData) {
          state.mapData.backgroundImage = url;
          if (dimensions) {
            state.mapData.backgroundImageDimensions = dimensions;
          }
          state.isDirty = true;
        }
      });
    },

    uploadBackgroundImage: async (file: File) => {
      try {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        console.log('📤 UPLOADING BACKGROUND IMAGE:', file.name);

        const { url, dimensions } = await MapDataService.handleBackgroundImageUpload(file);

        set((state) => {
          if (state.mapData) {
            state.mapData.backgroundImage = url;
            state.mapData.backgroundImageDimensions = dimensions;
            state.mapData.worldDimensions = dimensions; // Update world dimensions to match image
            state.isDirty = true;
          }
          state.isLoading = false;
        });

        console.log('✅ BACKGROUND IMAGE UPLOADED SUCCESSFULLY');

      } catch (error) {
        console.error('❌ FAILED TO UPLOAD BACKGROUND IMAGE:', error);
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to upload background image';
          state.isLoading = false;
        });
        throw error;
      }
    },

    setWorldDimensions: (dimensions: { width: number; height: number }) => {
      set((state) => {
        if (state.mapData) {
          state.mapData.worldDimensions = dimensions;
          state.isDirty = true;
        }
      });
    },

    // Backup & Recovery
    restoreFromBackup: async () => {
      try {
        set((state) => {
          state.isLoading = true;
          state.error = null;
        });

        console.log('🔄 RESTORING FROM BACKUP');

        const backupData = await MapDataService.restoreFromBackup();

        if (!backupData) {
          throw new Error('No backup data available');
        }

        set((state) => {
          state.mapData = backupData;
          state.lastSaved = backupData.lastModified;
          state.isDirty = false;
          state.isLoading = false;
        });

        console.log('✅ RESTORED FROM BACKUP SUCCESSFULLY');

      } catch (error) {
        console.error('❌ FAILED TO RESTORE FROM BACKUP:', error);
        set((state) => {
          state.error = error instanceof Error ? error.message : 'Failed to restore from backup';
          state.isLoading = false;
        });
        throw error;
      }
    },

    // Utility Actions
    setLoading: (loading: boolean) => {
      set((state) => {
        state.isLoading = loading;
      });
    },

    setError: (error: string | null) => {
      set((state) => {
        state.error = error;
      });
    },

    clearError: () => {
      set((state) => {
        state.error = null;
      });
    },

    markDirty: () => {
      const { isInitializing } = get();
      // Don't mark as dirty during initialization to prevent auto-save
      if (isInitializing) {
        console.log('🚫 Skipping markDirty during initialization');
        return;
      }
      set((state) => {
        state.isDirty = true;
      });
    },

    markClean: () => {
      set((state) => {
        state.isDirty = false;
      });
    },

    // Auto-save actions
    setAutoSaveEnabled: (enabled: boolean) => {
      set((state) => {
        state.autoSaveEnabled = enabled;
      });
    },

    setAutoSaveDelay: (delay: number) => {
      set((state) => {
        state.autoSaveDelay = delay;
      });
    },

    // Getters
    getMapStatistics: () => {
      const { mapData } = get();
      if (!mapData) return null;
      return MapDataService.getMapStatistics(mapData);
    }
  }))
);

// Convenience hooks for specific data
export const useMapData = () => useMapStore((state) => state.mapData);
export const useInteractiveAreas = () => useMapStore((state) => state.mapData?.interactiveAreas || []);
export const useCollisionAreas = () => useMapStore((state) => state.mapData?.impassableAreas || []);
export const useMapLoading = () => useMapStore((state) => state.isLoading);
export const useMapError = () => useMapStore((state) => state.error);
export const useMapDirty = () => useMapStore((state) => state.isDirty);
