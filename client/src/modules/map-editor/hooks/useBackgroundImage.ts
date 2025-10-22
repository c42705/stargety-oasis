/**
 * Background Image Hook
 * 
 * Manages loading and updating the background image on the canvas. Handles image
 * loading, dimension detection, layer ordering, and event listeners for map changes.
 */

import { useCallback, useEffect, useMemo, MutableRefObject, Dispatch, SetStateAction } from 'react';
import * as fabric from 'fabric';
import { logger } from '../../../shared/logger';
import { SharedMapSystem } from '../../../shared/SharedMapSystem';
import { MapData } from '../../../shared/MapDataContext';

export interface UseBackgroundImageOptions {
  /** Reference to Fabric.js canvas */
  canvasRef: MutableRefObject<fabric.Canvas | null>;
  /** Map data from SharedMap */
  mapData: MapData | null;
  /** Whether canvas is initialized */
  isInitialized: boolean;
  /** Callback to update layer order */
  updateLayerOrder: (skipBackgroundCheck?: boolean) => void;
  /** State setter for background ready flag */
  setIsBackgroundReady: Dispatch<SetStateAction<boolean>>;
}

export interface UseBackgroundImageResult {
  /** Background image URL (memoized) */
  backgroundImageUrl: string | undefined;
  /** Update background image on canvas */
  updateBackgroundImage: () => void;
}

/**
 * Hook for managing background image loading and updates
 */
export function useBackgroundImage(options: UseBackgroundImageOptions): UseBackgroundImageResult {
  const {
    canvasRef,
    mapData,
    isInitialized,
    updateLayerOrder,
    setIsBackgroundReady
  } = options;

  // Handle background image changes - use a stable reference to prevent constant re-renders
  const backgroundImageUrl = useMemo(() => {
    const bgImage = mapData?.backgroundImage;
    // Removed: Non-critical background image URL debug log.
    return bgImage;
  }, [mapData]);

  /**
   * Update background image with cover mode scaling (same as game world)
   */
  const updateBackgroundImage = useCallback(() => {
    // Removed: Non-critical update background image debug log.

    const canvas = canvasRef.current;
    if (!canvas || !mapData) {
      logger.warn('BACKGROUND: Cannot update background - missing canvas or map data', {
        hasCanvas: !!canvas,
        hasMapData: !!mapData
      });
      return;
    }

    // Removed: Non-critical starting background update process debug log.

    // Background info panel status is managed by parent component

    // Remove existing background image
    const existingBackground = canvas.getObjects().find(obj =>
      (obj as any).isBackgroundImage === true || (obj as any).backgroundImageId === 'map-background-image'
    );
    if (existingBackground) {
      // Removed: Non-critical removing existing background image log.
      canvas.remove(existingBackground);
      // Clear the reference since we're replacing it
      (canvas as any)._backgroundImageRef = null;
    } else {
      // Removed: Non-critical no existing background image log.
    }

    // Add new background image if available
    if (backgroundImageUrl) {
      // Removed: Non-critical starting Fabric.js image loading log.

      // Determine if we need crossOrigin based on URL type
      const isDataUrl = backgroundImageUrl.startsWith('data:');
      const fabricOptions = isDataUrl ? {} : { crossOrigin: 'anonymous' as any };

      // Removed: Non-critical Fabric.js loading configuration log.

      fabric.Image.fromURL(backgroundImageUrl, fabricOptions).then((img: fabric.Image) => {
        // Removed: Non-critical Fabric.js image loading completed log.

        if (!canvas || !img) {
          console.error('❌ BACKGROUND: Failed to create fabric image from background', {
            timestamp: new Date().toISOString(),
            hasCanvas: !!canvas,
            hasImage: !!img,
            backgroundImageUrl: backgroundImageUrl.substring(0, 50) + '...'
          });
          return;
        }

        // Removed: Non-critical background image dimensions log.

        // For the Map Editor, we want to show the image at its actual size
        // without scaling, so users can see the full detail
        // The canvas should match the image dimensions
        img.set({
          left: 0,
          top: 0,
          scaleX: 1,
          scaleY: 1,
          selectable: false,
          evented: false,
          excludeFromExport: false,
          originX: 'left',
          originY: 'top'
        });

        // Mark as background image for identification - SET IMMEDIATELY
        (img as any).isBackgroundImage = true;
        (img as any).selectable = false;
        (img as any).evented = false;
        (img as any).excludeFromExport = false;
        (img as any).backgroundImageId = 'map-background-image';
        (img as any).mapElementType = 'background';

        // Store background image reference BEFORE adding to canvas
        (canvas as any)._backgroundImageRef = img;

        // Add event listener to maintain properties if they get lost
        img.on('added', () => {
          (img as any).isBackgroundImage = true;
          (img as any).backgroundImageId = 'map-background-image';
          (img as any).mapElementType = 'background';

          // Lock background image by default to prevent accidental modification
          (img as any).locked = true;
          img.selectable = false;
          img.evented = false;
          img.hoverCursor = 'default';
          img.moveCursor = 'default';
        });

        // Removed: Non-critical background image configured log.

        // Add to canvas and send to back (behind grid and other elements)
        canvas.add(img);
        canvas.sendObjectToBack(img);

        // Removed: Non-critical background image added log.

        // Removed: Non-critical background verification log.

        // Immediate render to ensure visibility
        canvas.renderAll();

        // Force layer order update after a brief delay to ensure background is maintained
        setTimeout(() => {
          const bgImg = canvas.getObjects().find(obj => (obj as any).isBackgroundImage);
          if (bgImg) {
            canvas.sendObjectToBack(bgImg);
            canvas.renderAll();
            // Removed: Non-critical background image layer order enforced log.

            // Removed: Non-critical final background state log.

            // Mark background as ready and trigger coordinated layer order update
            setTimeout(() => {
              // Background image fully integrated - marking ready
              setIsBackgroundReady(true);
              updateLayerOrder(true); // Skip background check since we just added it
              // Background info panel success handled by parent
            }, 50);
          } else {
            console.warn('⚠️ BACKGROUND IMAGE NOT FOUND DURING LAYER ORDER ENFORCEMENT');
          }
        }, 100);

      }).catch((error: any) => {
        logger.error('Failed to load background image', {
          error: error.message || error,
          errorType: error.constructor?.name,
          backgroundImageUrl: backgroundImageUrl ? backgroundImageUrl.substring(0, 100) + '...' : 'none',
          backgroundImageLength: backgroundImageUrl?.length || 0,
          isDataUrl: backgroundImageUrl?.startsWith('data:') || false,
          fabricOptions,
          canvasSize: { width: canvas.width, height: canvas.height }
        });
        // Background info panel error handled by parent
      });
    } else {
      // Removed: Non-critical no background image log.
      // Mark background as ready even when no image (transparent background)
      setIsBackgroundReady(true);
    }
  }, [backgroundImageUrl, mapData, canvasRef, updateLayerOrder, setIsBackgroundReady]);

  // Priority background loading - triggers immediately when canvas is ready
  useEffect(() => {
    // Removed: Non-critical priority background loading effect log.

    if (canvasRef.current && isInitialized && backgroundImageUrl !== undefined) {
      // Removed: Non-critical priority background loading initiated log.
      updateBackgroundImage();
    } else {
      // Removed: Non-critical priority background loading skipped log.
    }
  }, [isInitialized, backgroundImageUrl, updateBackgroundImage, canvasRef]);

  // Listen for SharedMapSystem events to handle background image updates
  useEffect(() => {
    const handleMapChanged = (event: any) => {
      // Removed: Non-critical shared map changed event log.

      // Force background image update when map data changes
      if (canvasRef.current && isInitialized && event.mapData?.backgroundImage) {
        // Removed: Non-critical triggering background update from map change log.
        setTimeout(() => {
          updateBackgroundImage();
        }, 100); // Small delay to ensure state is updated
      }
    };

    const handleDimensionsChanged = () => {
      // Removed: Non-critical dimensions changed event log.

      // Canvas dimensions will be updated via props from MapEditorModule
      // No need to manually resize here as it's handled by the width/height props
    };

    // Get the SharedMapSystem instance directly
    const mapSystem = SharedMapSystem.getInstance();

    // Set up event listeners
    mapSystem.on('map:changed', handleMapChanged);
    mapSystem.on('map:dimensionsChanged', handleDimensionsChanged);

    // Cleanup
    return () => {
      mapSystem.off('map:changed', handleMapChanged);
      mapSystem.off('map:dimensionsChanged', handleDimensionsChanged);
    };
  }, [isInitialized, updateBackgroundImage, canvasRef]);

  return {
    backgroundImageUrl,
    updateBackgroundImage
  };
}

