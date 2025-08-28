import { useState, useCallback } from 'react';
import { InteractiveArea } from '../../../shared/MapDataContext';

export const useDrawingMode = () => {
  const [drawingMode, setDrawingMode] = useState(false);
  const [pendingAreaData, setPendingAreaData] = useState<Partial<InteractiveArea> | null>(null);

  const startDrawingMode = useCallback((areaData: Partial<InteractiveArea>) => {
    setPendingAreaData(areaData);
    setDrawingMode(true);
  }, []);

  const exitDrawingMode = useCallback(() => {
    setDrawingMode(false);
    setPendingAreaData(null);
  }, []);

  const cancelDrawingMode = useCallback(() => {
    setDrawingMode(false);
    setPendingAreaData(null);
  }, []);

  return {
    drawingMode,
    setDrawingMode,
    pendingAreaData,
    setPendingAreaData,
    startDrawingMode,
    exitDrawingMode,
    cancelDrawingMode
  };
};
