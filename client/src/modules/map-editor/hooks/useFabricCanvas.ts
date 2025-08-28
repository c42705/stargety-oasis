import { useEffect, useRef } from 'react';
import * as fabric from 'fabric';
import { GridConfig } from '../types/editor.types';
import { InteractiveArea } from '../../../shared/MapDataContext';
import {
  initializeFabricCanvas,
  updateCanvasObjects,
  WorldDimensions
} from '../utils/canvasUtils';

interface UseFabricCanvasProps {
  worldDimensions: WorldDimensions;
  gridConfig: GridConfig;
  interactiveAreas: InteractiveArea[];
  impassableAreas: any[];
}

export const useFabricCanvas = ({
  worldDimensions,
  gridConfig,
  interactiveAreas,
  impassableAreas
}: UseFabricCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (canvasRef.current && !fabricCanvasRef.current) {
      const canvas = initializeFabricCanvas(canvasRef.current, worldDimensions);
      fabricCanvasRef.current = canvas;

      // Initialize canvas with current map data
      updateCanvasObjects(
        canvas,
        worldDimensions,
        gridConfig,
        interactiveAreas,
        impassableAreas
      );

      return () => {
        canvas.dispose();
        fabricCanvasRef.current = null;
      };
    }
  }, [worldDimensions]);

  // Update canvas when map data changes
  useEffect(() => {
    if (fabricCanvasRef.current) {
      updateCanvasObjects(
        fabricCanvasRef.current,
        worldDimensions,
        gridConfig,
        interactiveAreas,
        impassableAreas
      );
    }
  }, [worldDimensions, gridConfig, interactiveAreas, impassableAreas]);

  return {
    canvasRef,
    fabricCanvasRef
  };
};
