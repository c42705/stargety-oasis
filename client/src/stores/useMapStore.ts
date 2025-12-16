/**
 * Redux-based useMapStore API
 *
 * This is the primary public API for map data access.
 * All components should import useMapStore from this file.
 *
 * REFACTORED (2025-12-15): Now uses useMapStoreImpl directly.
 * SharedMapSystem has been eliminated - this is the only map data system.
 */
import { useMapStoreImpl } from '../redux-compat/useMapStoreCompat';
import { useAppSelector } from '../redux/hooks';
import {
  selectMapData,
  selectIsLoading,
  selectError,
  selectIsDirty,
} from '../redux/selectors/mapSelectors';

export const useMapStore = useMapStoreImpl;

// Convenience hooks preserved
export const useMapData = () => useAppSelector(selectMapData);
export const useMapLoading = () => useAppSelector(selectIsLoading);
export const useMapError = () => useAppSelector(selectError);
export const useMapDirty = () => useAppSelector(selectIsDirty);

