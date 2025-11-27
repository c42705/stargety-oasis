import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import {
  selectMapData,
  selectIsLoading,
  selectError,
  selectLastSaved,
  selectIsDirty,
  selectAutoSaveEnabled,
  selectAutoSaveDelay,
} from '../redux/selectors/mapSelectors';
import {
  loadMap,
  saveMap,
  resetMap,
  importMap,
  restoreFromBackup,
  uploadBackgroundImage,
  clearError,
  markDirty,
  markClean,
  setAutoSaveEnabled,
  setAutoSaveDelay,
  setWorldDimensions,
  setBackgroundImage,
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
} from '../redux/slices/mapSlice';
import { MapDataService } from '../stores/MapDataService';

export const useMapStoreCompat = () => {
  const dispatch = useAppDispatch();

  const mapData = useAppSelector(selectMapData);
  const isLoading = useAppSelector(selectIsLoading);
  const error = useAppSelector(selectError);
  const lastSaved = useAppSelector(selectLastSaved);
  const isDirty = useAppSelector(selectIsDirty);
  const autoSaveEnabled = useAppSelector(selectAutoSaveEnabled);
  const autoSaveDelay = useAppSelector(selectAutoSaveDelay);

  const doExportMap = useCallback(() => {
    if (!mapData) throw new Error('No map data to export');
    return MapDataService.exportMapData(mapData);
  }, [mapData]);

  return {
    // State
    mapData,
    isLoading,
    error,
    lastSaved,
    isDirty,
    autoSaveEnabled,
    autoSaveDelay,

    // Ops
    loadMap: () => dispatch(loadMap()),
    saveMap: () => dispatch(saveMap()).unwrap(),
    resetMap: () => dispatch(resetMap()).unwrap(),
    importMap: (json: string) => dispatch(importMap(json)).unwrap(),
    exportMap: doExportMap,
    restoreFromBackup: () => dispatch(restoreFromBackup()).unwrap(),

    // Background & dimensions
    setWorldDimensions: (dims: { width: number; height: number }) => dispatch(setWorldDimensions(dims)),
    setBackgroundImage: (url: string, dimensions?: { width: number; height: number }) =>
      dispatch(setBackgroundImage({ url, dimensions })),
    uploadBackgroundImage: (file: File) => dispatch(uploadBackgroundImage(file)).unwrap(),

    // Areas
    addInteractiveArea: (area: any) => dispatch(addInteractiveArea(area)),
    updateInteractiveArea: (id: string, updates: any) => dispatch(updateInteractiveArea({ id, updates })),
    removeInteractiveArea: (id: string) => dispatch(removeInteractiveArea(id)),
    setInteractiveAreas: (areas: any[]) => dispatch(setInteractiveAreas(areas)),
    addCollisionArea: (area: any) => dispatch(addCollisionArea(area)),
    updateCollisionArea: (id: string, updates: any) => dispatch(updateCollisionArea({ id, updates })),
    removeCollisionArea: (id: string) => dispatch(removeCollisionArea(id)),
    setCollisionAreas: (areas: any[]) => dispatch(setCollisionAreas(areas)),

    // Assets
    addAsset: (asset: any) => dispatch(addAsset(asset)),
    updateAsset: (id: string, updates: any) => dispatch(updateAsset({ id, updates })),
    removeAsset: (id: string) => dispatch(removeAsset(id)),
    setAssets: (assets: any[]) => dispatch(setAssets(assets)),

    // Utility
    clearError: () => dispatch(clearError()),
    markDirty: () => dispatch(markDirty()),
    markClean: () => dispatch(markClean()),
    setAutoSaveEnabled: (enabled: boolean) => dispatch(setAutoSaveEnabled(enabled)),
    setAutoSaveDelay: (delay: number) => dispatch(setAutoSaveDelay(delay)),

    // Convenience
    getMapStatistics: () => (mapData ? MapDataService.getMapStatistics(mapData) : null),
  } as const;
};

