import { useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { loadMap } from '../redux/slices/mapSlice';
import { selectMapData, selectIsLoading } from '../redux/selectors/mapSelectors';

export const useMapInit = () => {
  const dispatch = useAppDispatch();
  const mapData = useAppSelector(selectMapData);
  const isLoading = useAppSelector(selectIsLoading);
  const hasTriedInit = useRef(false);

  useEffect(() => {
    if (!mapData && !isLoading && !hasTriedInit.current) {
      hasTriedInit.current = true;
      dispatch(loadMap());
    }
  }, [mapData, isLoading, dispatch]);

  return {
    isReady: !!mapData && !isLoading,
    isLoading,
    mapData,
  } as const;
};

