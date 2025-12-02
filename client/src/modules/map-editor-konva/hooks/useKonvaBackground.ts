/**
 * Konva Map Editor - Background Hook
 * 
 * Handles background image loading, scaling, and positioning.
 * Uses layer caching for performance.
 */

import { useState, useEffect, useCallback } from 'react';
import type { UseKonvaBackgroundParams, UseKonvaBackgroundReturn } from '../types';

/**
 * Hook for managing background image
 * 
 * Handles image loading, error states, and provides image data for rendering.
 * Supports both data URLs and regular URLs.
 * 
 * @example
 * ```typescript
 * const { image, isLoading, error, reload } = useKonvaBackground({
 *   imageUrl: mapData?.backgroundImage,
 *   onLoad: (img) => console.log('Image loaded:', img.width, img.height),
 *   onError: (err) => console.error('Failed to load:', err),
 * });
 * 
 * // In render:
 * {image && <Image image={image} />}
 * ```
 */
export function useKonvaBackground(params: UseKonvaBackgroundParams): UseKonvaBackgroundReturn {
  const {
    imageUrl,
    onLoad,
    onError,
  } = params;

  // State
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ==========================================================================
  // IMAGE LOADING
  // ==========================================================================

  /**
   * Load image from URL
   */
  const loadImage = useCallback(
    (url: string) => {
      setIsLoading(true);
      setError(null);

      const img = new window.Image();

      // Handle cross-origin for non-data URLs
      const isDataUrl = url.startsWith('data:');
      if (!isDataUrl) {
        img.crossOrigin = 'anonymous';
      }

      img.onload = () => {
        setImage(img);
        setIsLoading(false);
        setError(null);
        onLoad?.(img);
      };

      img.onerror = (e) => {
        const errorMessage = 'Failed to load background image';
        setImage(null);
        setIsLoading(false);
        setError(errorMessage);
        onError?.(new Error(errorMessage));
      };

      img.src = url;
    },
    [onLoad, onError]
  );

  /**
   * Reload current image
   */
  const reload = useCallback(() => {
    if (imageUrl) {
      loadImage(imageUrl);
    }
  }, [imageUrl, loadImage]);

  /**
   * Clear current image
   */
  const clear = useCallback(() => {
    setImage(null);
    setError(null);
    setIsLoading(false);
  }, []);

  // ==========================================================================
  // EFFECTS
  // ==========================================================================

  /**
   * Load image when URL changes
   */
  useEffect(() => {
    if (imageUrl) {
      loadImage(imageUrl);
    } else {
      clear();
    }
  }, [imageUrl, loadImage, clear]);

  // ==========================================================================
  // IMAGE PROPERTIES
  // ==========================================================================

  /**
   * Get image dimensions
   */
  const dimensions = image
    ? { width: image.width, height: image.height }
    : null;

  /**
   * Get image aspect ratio
   */
  const aspectRatio = dimensions
    ? dimensions.width / dimensions.height
    : null;

  // ==========================================================================
  // RETURN
  // ==========================================================================

  return {
    // Image data
    image,
    dimensions,
    aspectRatio,

    // Loading state
    isLoading,
    error,

    // Actions
    reload,
    clear,
  };
}

