/**
 * Layer Order Hook
 * 
 * Manages the z-index stacking order of canvas objects to ensure proper layering:
 * Background → Grid → Interactive Elements → Collision Areas
 * 
 * Includes sophisticated background image detection with multiple fallback methods
 * to handle edge cases where the background image reference is lost.
 */

import { useCallback, MutableRefObject } from 'react';
import * as fabric from 'fabric';
import { logger } from '../../../shared/logger';

export interface UseLayerOrderOptions {
  /** Reference to Fabric.js canvas */
  canvasRef: MutableRefObject<fabric.Canvas | null>;
}

export interface UseLayerOrderResult {
  /** Update layer order to ensure proper stacking */
  updateLayerOrder: (skipBackgroundCheck?: boolean) => void;
}

/**
 * Hook for managing canvas layer order
 */
export function useLayerOrder(options: UseLayerOrderOptions): UseLayerOrderResult {
  const { canvasRef } = options;

  /**
   * Update layer order to ensure proper stacking: background → grid → interactive elements
   * 
   * @param skipBackgroundCheck - Skip background image detection (used when background was just added)
   */
  const updateLayerOrder = useCallback((skipBackgroundCheck = false) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Get all objects with multiple detection methods
    const allObjects = canvas.getObjects();

    // Enhanced object detection with detailed logging for background issues
    if (allObjects.length === 0 && !skipBackgroundCheck) {
      logger.warn('NO OBJECTS FOUND ON CANVAS - POSSIBLE INITIALIZATION ISSUE');
    }

    // Enhanced background image detection with multiple fallback methods
    let backgroundImages = allObjects.filter(obj =>
      (obj as any).isBackgroundImage ||
      (obj as any).backgroundImageId === 'map-background-image' ||
      (obj.type === 'image' && obj.left === 0 && obj.top === 0)
    );

    // Primary fallback: use stored reference
    if (backgroundImages.length === 0 && (canvas as any)._backgroundImageRef) {
      const bgRef = (canvas as any)._backgroundImageRef;

      // Check if reference exists in canvas objects
      const refInCanvas = allObjects.find(obj => obj === bgRef);
      if (refInCanvas) {
        (refInCanvas as any).isBackgroundImage = true;
        (refInCanvas as any).selectable = false;
        (refInCanvas as any).evented = false;
        (refInCanvas as any).backgroundImageId = 'map-background-image';
        backgroundImages.push(refInCanvas);
      } else if (!skipBackgroundCheck) {
        // Reference exists but not in canvas - re-add it
        canvas.add(bgRef);
        (bgRef as any).isBackgroundImage = true;
        (bgRef as any).selectable = false;
        (bgRef as any).evented = false;
        (bgRef as any).backgroundImageId = 'map-background-image';
        backgroundImages.push(bgRef);
        canvas.sendObjectToBack(bgRef);
      }
    }

    // Secondary fallback: look for image objects that could be background
    if (backgroundImages.length === 0 && !skipBackgroundCheck) {
      const possibleBg = allObjects.find(obj =>
        obj.type === 'image' &&
        (obj.left === 0 || Math.abs(obj.left || 0) < 10) &&
        (obj.top === 0 || Math.abs(obj.top || 0) < 10)
      );

      if (possibleBg) {
        // Removed: Non-critical found potential background image by position log.
        (possibleBg as any).isBackgroundImage = true;
        (possibleBg as any).selectable = false;
        (possibleBg as any).evented = false;
        (possibleBg as any).backgroundImageId = 'map-background-image';
        // Update the reference
        (canvas as any)._backgroundImageRef = possibleBg;
        backgroundImages.push(possibleBg);
      }
    }

    const gridObjects = allObjects.filter(obj =>
      (obj as any).isGridLine || (obj as any).isGridPattern
    );
    const interactiveElements = allObjects.filter(obj =>
      !((obj as any).isBackgroundImage) &&
      !((obj as any).isGridLine) &&
      !((obj as any).isGridPattern) &&
      (obj as any).backgroundImageId !== 'map-background-image'
    );

    // Only reorder if we have objects to reorder
    if (backgroundImages.length > 0 || gridObjects.length > 0 || interactiveElements.length > 0) {
      // Send background images to the very back
      backgroundImages.forEach(obj => canvas.sendObjectToBack(obj));

      // Bring grid objects above background but below interactive elements
      gridObjects.forEach(obj => canvas.bringObjectForward(obj));

      // Bring interactive elements to the front
      interactiveElements.forEach(obj => canvas.bringObjectToFront(obj));
    }

    // Removed: Non-critical layer order updated log.

    // Enhanced debugging for background image issues
    if (backgroundImages.length === 0 && (canvas as any)._backgroundImageRef) {
      logger.warn('BACKGROUND IMAGE REFERENCE EXISTS BUT NOT FOUND IN CANVAS', {
        hasReference: !!(canvas as any)._backgroundImageRef,
        totalObjects: allObjects.length,
        skipCheck: skipBackgroundCheck,
        objectTypes: allObjects.map(obj => ({
          type: obj.type,
          isBackground: (obj as any).isBackgroundImage,
          backgroundId: (obj as any).backgroundImageId,
          isGrid: (obj as any).isGridLine || (obj as any).isGridPattern,
          position: { left: obj.left, top: obj.top },
          size: { width: obj.width, height: obj.height }
        }))
      });
    } else if (backgroundImages.length > 0) {
      // Background image successfully maintained
    }
  }, [canvasRef]);

  return {
    updateLayerOrder
  };
}

