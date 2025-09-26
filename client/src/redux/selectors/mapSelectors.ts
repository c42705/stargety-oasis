import { RootState } from '../store';

export const selectMapState = (s: RootState) => s.map;
export const selectMapData = (s: RootState) => s.map.mapData;
export const selectIsLoading = (s: RootState) => s.map.isLoading;
export const selectError = (s: RootState) => s.map.error;
export const selectLastSaved = (s: RootState) => s.map.lastSaved;
export const selectIsDirty = (s: RootState) => s.map.isDirty;
export const selectIsInitializing = (s: RootState) => s.map.isInitializing;
export const selectAutoSaveEnabled = (s: RootState) => s.map.autoSaveEnabled;
export const selectAutoSaveDelay = (s: RootState) => s.map.autoSaveDelay;

