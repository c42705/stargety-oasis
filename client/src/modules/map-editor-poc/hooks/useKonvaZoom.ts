/**
 * Konva Map Editor POC - Zoom Hook
 * Handles zoom in/out functionality
 */

import { useCallback } from 'react';
import { POC_ZOOM } from '../constants/konvaConstants';
import { POCViewport } from '../types/konva.types';

interface UseKonvaZoomProps {
  viewport: POCViewport;
  onViewportChange: (viewport: POCViewport) => void;
}

export const useKonvaZoom = ({ viewport, onViewportChange }: UseKonvaZoomProps) => {
  const zoomIn = useCallback(() => {
    const newZoom = Math.min(viewport.zoom + POC_ZOOM.STEP, POC_ZOOM.MAX);
    onViewportChange({ ...viewport, zoom: newZoom });
  }, [viewport, onViewportChange]);

  const zoomOut = useCallback(() => {
    const newZoom = Math.max(viewport.zoom - POC_ZOOM.STEP, POC_ZOOM.MIN);
    onViewportChange({ ...viewport, zoom: newZoom });
  }, [viewport, onViewportChange]);

  const handleWheel = useCallback(
    (e: any) => {
      e.evt.preventDefault();
      
      const delta = -e.evt.deltaY * POC_ZOOM.WHEEL_SENSITIVITY;
      const newZoom = Math.max(
        POC_ZOOM.MIN,
        Math.min(POC_ZOOM.MAX, viewport.zoom + delta)
      );

      onViewportChange({ ...viewport, zoom: newZoom });
    },
    [viewport, onViewportChange]
  );

  return {
    zoomIn,
    zoomOut,
    handleWheel,
  };
};

