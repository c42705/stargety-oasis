// Redux-based useMapStore API
// Keeps import sites stable while internally using Redux (RTK)

import { useMapStoreCompat } from '../redux-compat/useMapStoreCompat';
import { useAppSelector } from '../redux/hooks';
import {
  selectMapData,
  selectIsLoading,
  selectError,
  selectIsDirty,
} from '../redux/selectors/mapSelectors';

export const useMapStore = useMapStoreCompat;

// Convenience hooks preserved
export const useMapData = () => useAppSelector(selectMapData);
export const useMapLoading = () => useAppSelector(selectIsLoading);
export const useMapError = () => useAppSelector(selectError);
export const useMapDirty = () => useAppSelector(selectIsDirty);

