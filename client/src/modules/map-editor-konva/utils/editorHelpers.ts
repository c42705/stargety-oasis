/**
 * Editor Helper Functions
 * 
 * Utility functions for the map editor including:
 * - Asset placement
 * - Grid config conversion
 * - Tool conversion
 */

import { logger } from '../../../shared/logger';
import type { Shape, Viewport, GridConfig as KonvaGridConfig } from '../types';
import type { GridConfig as FabricGridConfig } from '../types/editor.types';
import { createImageShape } from './shapeFactories';
import { screenToWorld } from './coordinateTransform';

interface PlaceAssetParams {
  fileData: string;
  fileName: string;
  width: number;
  height: number;
  viewport: Viewport;
  viewportWidth: number;
  viewportHeight: number;
  onShapeCreated: (shape: Shape) => void;
  onSelectShape: (shapeId: string) => void;
  onZoomToShape: (shape: Shape) => void;
  onMarkDirty: () => void;
}

/**
 * Handle asset placement from AssetsTab
 */
export const placeAsset = ({
  fileData,
  fileName,
  width,
  height,
  viewport,
  viewportWidth,
  viewportHeight,
  onShapeCreated,
  onSelectShape,
  onZoomToShape,
  onMarkDirty,
}: PlaceAssetParams): void => {
  logger.info('PLACE ASSET CALLED', {
    fileName,
    dimensions: { width, height },
    viewport: {
      pan: viewport.pan,
      zoom: viewport.zoom,
      viewportSize: { width: viewportWidth, height: viewportHeight }
    }
  });

  // Calculate center of viewport in screen coordinates
  const screenCenter = {
    x: viewportWidth / 2,
    y: viewportHeight / 2
  };

  // Convert screen coordinates to world coordinates
  const worldCenter = screenToWorld(screenCenter.x, screenCenter.y, viewport);

  // Create image shape at viewport center
  const imageShape = createImageShape({
    x: worldCenter.x - width / 2,
    y: worldCenter.y - height / 2,
    width,
    height,
    imageData: fileData,
    fileName,
  });

  // Add shape to map
  onShapeCreated(imageShape);

  // Select the new shape
  onSelectShape(imageShape.id);

  // Zoom to the placed asset
  onZoomToShape(imageShape);

  // Mark as dirty
  onMarkDirty();

  logger.info('ASSET PLACED ON MAP', {
    id: imageShape.id,
    fileName,
    position: { x: imageShape.geometry.x, y: imageShape.geometry.y },
    dimensions: { width, height }
  });
};

/**
 * Convert Fabric.js GridConfig to Konva GridConfig
 */
export const convertFabricToKonvaGridConfig = (
  fabricConfig: Partial<FabricGridConfig>,
  currentKonvaConfig: KonvaGridConfig
): KonvaGridConfig => {
  return {
    visible: fabricConfig.visible ?? currentKonvaConfig.visible,
    spacing: fabricConfig.spacing ?? currentKonvaConfig.spacing,
    pattern: currentKonvaConfig.pattern, // Keep current pattern
    color: currentKonvaConfig.color,
    opacity: fabricConfig.opacity ?? currentKonvaConfig.opacity,
  };
};

