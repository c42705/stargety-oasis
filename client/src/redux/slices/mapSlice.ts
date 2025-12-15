import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { MapDataService, ExtendedMapData } from '../../stores/MapDataService';
import { InteractiveArea, ImpassableArea, Asset } from '../../shared/MapDataContext';

export interface MapState {
  mapData: ExtendedMapData | null;
  isLoading: boolean;
  error: string | null;
  lastSaved: Date | null;
  isDirty: boolean;
  isInitializing: boolean;
  autoSaveEnabled: boolean;
  autoSaveDelay: number;
  uploadStatus: {
    status: 'idle' | 'pending' | 'in-progress' | 'completed' | 'failed';
    progress: number;
    fileName: string | null;
    error: string | null;
    dimensions: { width: number; height: number } | null;
  };
}

const initialState: MapState = {
  mapData: null,
  isLoading: false,
  error: null,
  lastSaved: null,
  isDirty: false,
  isInitializing: true,
  autoSaveEnabled: false,
  autoSaveDelay: 2000,
  uploadStatus: {
    status: 'idle',
    progress: 0,
    fileName: null,
    error: null,
    dimensions: null,
  },
};

export const loadMap = createAsyncThunk('map/load', async () => {
  // For map editor: allow localStorage fallback for offline editing support
  let data = await MapDataService.loadMapData(undefined, false);
  if (!data) {
    data = await MapDataService.createDefaultMap();
  }
  return data;
});

export const saveMap = createAsyncThunk('map/save', async (_, { getState }) => {
  const state = getState() as any;
  const mapData: ExtendedMapData | null = state.map?.mapData ?? null;
  if (!mapData) throw new Error('No map data to save');
  await MapDataService.saveMapData(mapData);
  return { when: new Date() };
});

export const resetMap = createAsyncThunk('map/reset', async () => {
  const data = await MapDataService.resetToDefault();
  return data;
});

export const importMap = createAsyncThunk('map/import', async (jsonData: string) => {
  const data = await MapDataService.importMapData(jsonData);
  return data;
});

export const restoreFromBackup = createAsyncThunk('map/restoreFromBackup', async () => {
  const data = await MapDataService.restoreFromBackup();
  if (!data) throw new Error('No backup data available');
  return data;
});

export const uploadBackgroundImage = createAsyncThunk(
  'map/uploadBackgroundImage',
  async (file: File) => {
    const { url, dimensions } = await MapDataService.handleBackgroundImageUpload(file);
    return { url, dimensions } as { url: string; dimensions: { width: number; height: number } };
  }
);

const mapSlice = createSlice({
  name: 'map',
  initialState,
  reducers: {
    clearError(state) { state.error = null; },
    markDirty(state) {
      if (state.isInitializing) return; // preserve init behavior
      state.isDirty = true;
    },
    markClean(state) { state.isDirty = false; },
    setAutoSaveEnabled(state, action: PayloadAction<boolean>) { state.autoSaveEnabled = action.payload; },
    setAutoSaveDelay(state, action: PayloadAction<number>) { state.autoSaveDelay = action.payload; },

    // Upload status management
    setUploadStatus(state, action: PayloadAction<MapState['uploadStatus']>) {
      state.uploadStatus = action.payload;
    },
    resetUploadStatus(state) {
      state.uploadStatus = {
        status: 'idle',
        progress: 0,
        fileName: null,
        error: null,
        dimensions: null,
      };
    },

    setWorldDimensions(state, action: PayloadAction<{ width: number; height: number }>) {
      if (state.mapData) {
        state.mapData.worldDimensions = action.payload;
        state.isDirty = true;
      }
    },
    setBackgroundImage(
      state,
      action: PayloadAction<{ url: string; dimensions?: { width: number; height: number } }>
    ) {
      if (state.mapData) {
        state.mapData.backgroundImage = action.payload.url;
        if (action.payload.dimensions) {
          state.mapData.backgroundImageDimensions = action.payload.dimensions;
        }
        state.isDirty = true;
      }
    },

    addInteractiveArea(state, action: PayloadAction<InteractiveArea>) {
      if (state.mapData) {
        state.mapData.interactiveAreas.push(action.payload);
        state.isDirty = true;
      }
    },
    updateInteractiveArea(state, action: PayloadAction<{ id: string; updates: Partial<InteractiveArea> }>) {
      if (!state.mapData) return;
      const idx = state.mapData.interactiveAreas.findIndex(a => a.id === action.payload.id);
      if (idx !== -1) {
        Object.assign(state.mapData.interactiveAreas[idx], action.payload.updates);
        state.isDirty = true;
      }
    },
    removeInteractiveArea(state, action: PayloadAction<string>) {
      if (!state.mapData) return;
      state.mapData.interactiveAreas = state.mapData.interactiveAreas.filter(a => a.id !== action.payload);
      state.isDirty = true;
    },
    setInteractiveAreas(state, action: PayloadAction<InteractiveArea[]>) {
      if (!state.mapData) return;
      state.mapData.interactiveAreas = action.payload;
      state.isDirty = true;
    },

    addCollisionArea(state, action: PayloadAction<ImpassableArea>) {
      if (state.mapData) {
        state.mapData.impassableAreas.push(action.payload);
        state.isDirty = true;
      }
    },
    updateCollisionArea(state, action: PayloadAction<{ id: string; updates: Partial<ImpassableArea> }>) {
      if (!state.mapData) return;
      const idx = state.mapData.impassableAreas.findIndex(a => a.id === action.payload.id);
      if (idx !== -1) {
        Object.assign(state.mapData.impassableAreas[idx], action.payload.updates);
        state.isDirty = true;
      }
    },
    removeCollisionArea(state, action: PayloadAction<string>) {
      if (!state.mapData) return;
      state.mapData.impassableAreas = state.mapData.impassableAreas.filter(a => a.id !== action.payload);
      state.isDirty = true;
    },
    setCollisionAreas(state, action: PayloadAction<ImpassableArea[]>) {
      if (!state.mapData) return;
      state.mapData.impassableAreas = action.payload;
      state.isDirty = true;
    },

    // Asset management actions
    addAsset(state, action: PayloadAction<Asset>) {
      if (state.mapData) {
        if (!state.mapData.assets) {
          state.mapData.assets = [];
        }
        state.mapData.assets.push(action.payload);
        state.isDirty = true;
      }
    },
    updateAsset(state, action: PayloadAction<{ id: string; updates: Partial<Asset> }>) {
      if (!state.mapData || !state.mapData.assets) return;
      const idx = state.mapData.assets.findIndex(a => a.id === action.payload.id);
      if (idx !== -1) {
        Object.assign(state.mapData.assets[idx], action.payload.updates);
        state.isDirty = true;
      }
    },
    removeAsset(state, action: PayloadAction<string>) {
      if (!state.mapData || !state.mapData.assets) return;
      state.mapData.assets = state.mapData.assets.filter(a => a.id !== action.payload);
      state.isDirty = true;
    },
    setAssets(state, action: PayloadAction<Asset[]>) {
      if (!state.mapData) return;
      state.mapData.assets = action.payload;
      state.isDirty = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadMap.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadMap.fulfilled, (state, action) => {
        state.mapData = action.payload;
        state.lastSaved = action.payload?.lastModified ?? new Date();
        state.isDirty = false;
        state.isLoading = false;
        state.isInitializing = false;
      })
      .addCase(loadMap.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to load map';
      })

      .addCase(saveMap.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(saveMap.fulfilled, (state, action) => {
        state.lastSaved = action.payload.when;
        state.isDirty = false;
        state.isLoading = false;
      })
      .addCase(saveMap.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to save map';
      })

      .addCase(resetMap.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(resetMap.fulfilled, (state, action) => {
        state.mapData = action.payload;
        state.lastSaved = action.payload.lastModified;
        state.isDirty = false;
        state.isLoading = false;
      })
      .addCase(resetMap.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to reset map';
      })

      .addCase(importMap.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(importMap.fulfilled, (state, action) => {
        state.mapData = action.payload;
        state.lastSaved = action.payload.lastModified;
        state.isDirty = false;
        state.isLoading = false;
      })
      .addCase(importMap.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to import map';
      })

      .addCase(restoreFromBackup.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(restoreFromBackup.fulfilled, (state, action) => {
        state.mapData = action.payload;
        state.lastSaved = action.payload.lastModified;
        state.isDirty = false;
        state.isLoading = false;
      })
      .addCase(restoreFromBackup.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to restore from backup';
      })

      .addCase(uploadBackgroundImage.pending, (state, action) => {
        state.isLoading = true;
        state.error = null;
        state.uploadStatus = {
          status: 'in-progress',
          progress: 10,
          fileName: action.meta.arg?.name || 'Unknown file',
          error: null,
          dimensions: null,
        };
      })
      .addCase(uploadBackgroundImage.fulfilled, (state, action) => {
        if (state.mapData) {
          state.mapData.backgroundImage = action.payload.url;
          state.mapData.backgroundImageDimensions = action.payload.dimensions;
          state.mapData.worldDimensions = action.payload.dimensions;
          state.isDirty = true;
        }
        state.isLoading = false;
        state.uploadStatus = {
          status: 'completed',
          progress: 100,
          fileName: state.uploadStatus.fileName,
          error: null,
          dimensions: action.payload.dimensions,
        };
      })
      .addCase(uploadBackgroundImage.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to upload background image';
      });
  },
});

export const {
  clearError,
  markDirty,
  markClean,
  setAutoSaveEnabled,
  setAutoSaveDelay,
  setWorldDimensions,
  setBackgroundImage,
  setUploadStatus,
  resetUploadStatus,
  addInteractiveArea,
  updateInteractiveArea,
  removeInteractiveArea,
  setInteractiveAreas,
  addCollisionArea,
  updateCollisionArea,
  removeCollisionArea,
  setCollisionAreas,
  addAsset,
  updateAsset,
  removeAsset,
  setAssets,
} = mapSlice.actions;

export default mapSlice.reducer;

