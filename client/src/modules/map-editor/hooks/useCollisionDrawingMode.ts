import { useState, useCallback } from 'react';
import { ImpassableArea } from '../../../shared/MapDataContext';

export const useCollisionDrawingMode = () => {
  const [collisionDrawingMode, setCollisionDrawingMode] = useState(false);
  const [pendingCollisionAreaData, setPendingCollisionAreaData] = useState<Partial<ImpassableArea> | null>(null);

  const startCollisionDrawingMode = useCallback((areaData: Partial<ImpassableArea>) => {
    setPendingCollisionAreaData(areaData);
    setCollisionDrawingMode(true);
  }, []);

  const exitCollisionDrawingMode = useCallback(() => {
    setCollisionDrawingMode(false);
    setPendingCollisionAreaData(null);
  }, []);

  const cancelCollisionDrawingMode = useCallback(() => {
    setCollisionDrawingMode(false);
    setPendingCollisionAreaData(null);
  }, []);

  return {
    collisionDrawingMode,
    setCollisionDrawingMode,
    pendingCollisionAreaData,
    setPendingCollisionAreaData,
    startCollisionDrawingMode,
    exitCollisionDrawingMode,
    cancelCollisionDrawingMode
  };
};
