/**
 * Konva Map Editor POC - Pan Hook
 * Handles canvas panning with middle mouse button
 */

import { useCallback, useState } from 'react';
import { POCViewport } from '../types/konva.types';

interface UseKonvaPanProps {
  viewport: POCViewport;
  onViewportChange: (viewport: POCViewport) => void;
  enabled: boolean; // Only pan when pan tool is active or middle mouse button
}

export const useKonvaPan = ({ viewport, onViewportChange, enabled }: UseKonvaPanProps) => {
  const [isPanning, setIsPanning] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });

  const handleMouseDown = useCallback(
    (e: any) => {
      // Middle mouse button (button 1) or pan tool with left click
      const isMiddleButton = e.evt.button === 1;
      const isLeftClickWithPanTool = e.evt.button === 0 && enabled;

      if (isMiddleButton || isLeftClickWithPanTool) {
        setIsPanning(true);
        setLastPos({
          x: e.evt.clientX,
          y: e.evt.clientY,
        });
      }
    },
    [enabled]
  );

  const handleMouseMove = useCallback(
    (e: any) => {
      if (!isPanning) return;

      const dx = e.evt.clientX - lastPos.x;
      const dy = e.evt.clientY - lastPos.y;

      onViewportChange({
        ...viewport,
        pan: {
          x: viewport.pan.x + dx,
          y: viewport.pan.y + dy,
        },
      });

      setLastPos({
        x: e.evt.clientX,
        y: e.evt.clientY,
      });
    },
    [isPanning, lastPos, viewport, onViewportChange]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  return {
    isPanning,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
};

