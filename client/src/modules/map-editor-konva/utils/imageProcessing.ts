/**
 * Image Processing Utilities
 *
 * Utilities for processing, validating, and storing uploaded images for map assets.
 */

import { logger } from '../../../shared/logger';

// ============================================================================
// CONSTANTS
// ============================================================================

export const IMAGE_CONSTRAINTS = {
  MAX_WIDTH: 800,
  MAX_HEIGHT: 800,
  MAX_FILE_SIZE_MB: 2,
  MAX_FILE_SIZE_BYTES: 2 * 1024 * 1024,
  ALLOWED_TYPES: ['image/png', 'image/gif'],
  ALLOWED_EXTENSIONS: ['.png', '.gif'],
} as const;

// ============================================================================
// TYPES
// ============================================================================

export interface ProcessedImage {
  dataUrl: string;
  width: number;
  height: number;
  fileName: string;
  fileSize: number;
}

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  maintainAspectRatio?: boolean;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate image file type
 */
export function validateFileType(file: File): ImageValidationResult {
  if (!IMAGE_CONSTRAINTS.ALLOWED_TYPES.includes(file.type as 'image/png' | 'image/gif')) {
    return {
      valid: false,
      error: `Invalid file type. Only ${IMAGE_CONSTRAINTS.ALLOWED_EXTENSIONS.join(', ')} files are allowed.`,
    };
  }
  return { valid: true };
}

/**
 * Validate image file size
 */
export function validateFileSize(file: File): ImageValidationResult {
  if (file.size > IMAGE_CONSTRAINTS.MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds ${IMAGE_CONSTRAINTS.MAX_FILE_SIZE_MB}MB limit.`,
    };
  }
  return { valid: true };
}

/**
 * Validate image dimensions
 */
export function validateImageDimensions(
  width: number,
  height: number
): ImageValidationResult {
  if (width > IMAGE_CONSTRAINTS.MAX_WIDTH || height > IMAGE_CONSTRAINTS.MAX_HEIGHT) {
    return {
      valid: false,
      error: `Image dimensions exceed ${IMAGE_CONSTRAINTS.MAX_WIDTH}x${IMAGE_CONSTRAINTS.MAX_HEIGHT}px limit.`,
    };
  }
  return { valid: true };
}

/**
 * Validate image file completely
 */
export function validateImageFile(file: File): ImageValidationResult {
  const typeValidation = validateFileType(file);
  if (!typeValidation.valid) return typeValidation;

  const sizeValidation = validateFileSize(file);
  if (!sizeValidation.valid) return sizeValidation;

  return { valid: true };
}

// ============================================================================
// IMAGE LOADING
// ============================================================================

/**
 * Load image from file
 */
export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new window.Image();
      
      img.onload = () => {
        resolve(img);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = e.target?.result as string;
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Load image from data URL
 */
export function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    
    img.onload = () => {
      resolve(img);
    };
    
    img.onerror = () => {
      reject(new Error('Failed to load image from data URL'));
    };
    
    img.src = dataUrl;
  });
}

// ============================================================================
// IMAGE PROCESSING
// ============================================================================

/**
 * Resize image to fit within constraints while maintaining aspect ratio
 */
export function resizeImage(
  img: HTMLImageElement,
  options: ImageProcessingOptions = {}
): HTMLCanvasElement {
  const {
    maxWidth = IMAGE_CONSTRAINTS.MAX_WIDTH,
    maxHeight = IMAGE_CONSTRAINTS.MAX_HEIGHT,
    quality = 1,
    maintainAspectRatio = true,
  } = options;

  let targetWidth = img.width;
  let targetHeight = img.height;

  if (maintainAspectRatio) {
    // Calculate scale to fit within max dimensions
    const scale = Math.min(
      maxWidth / img.width,
      maxHeight / img.height,
      1 // Don't upscale
    );
    
    targetWidth = Math.floor(img.width * scale);
    targetHeight = Math.floor(img.height * scale);
  } else {
    targetWidth = Math.min(img.width, maxWidth);
    targetHeight = Math.min(img.height, maxHeight);
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  return canvas;
}

/**
 * Convert canvas to data URL
 */
export function canvasToDataUrl(
  canvas: HTMLCanvasElement,
  type: string = 'image/png',
  quality: number = 1
): string {
  return canvas.toDataURL(type, quality);
}

/**
 * Process uploaded image file
 */
export async function processImageFile(
  file: File,
  options: ImageProcessingOptions = {}
): Promise<ProcessedImage> {
  try {
    // Validate file
    const validation = validateImageFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Load image
    const img = await loadImageFromFile(file);

    // Validate dimensions
    const dimensionValidation = validateImageDimensions(img.width, img.height);
    
    let canvas: HTMLCanvasElement;
    
    if (!dimensionValidation.valid) {
      // Resize if dimensions exceed limits
      logger.info('IMAGE RESIZE NEEDED', { 
        original: { width: img.width, height: img.height },
        max: { width: IMAGE_CONSTRAINTS.MAX_WIDTH, height: IMAGE_CONSTRAINTS.MAX_HEIGHT }
      });
      canvas = resizeImage(img, options);
    } else {
      // Use original dimensions
      canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }
      ctx.drawImage(img, 0, 0);
    }

    // Convert to data URL
    const dataUrl = canvasToDataUrl(canvas, file.type, options.quality || 1);

    // Calculate final size
    const finalSize = Math.ceil((dataUrl.length * 3) / 4); // Approximate base64 size

    return {
      dataUrl,
      width: canvas.width,
      height: canvas.height,
      fileName: file.name,
      fileSize: finalSize,
    };
  } catch (error) {
    logger.error('IMAGE PROCESSING ERROR', error);
    throw error;
  }
}

// ============================================================================
// STORAGE
// ============================================================================

const STORAGE_KEY_PREFIX = 'map_asset_';

/**
 * Store image in localStorage
 * TODO: Migrate to database storage in the future
 */
export function storeImageInLocalStorage(
  assetId: string,
  imageData: string
): boolean {
  try {
    const key = `${STORAGE_KEY_PREFIX}${assetId}`;
    localStorage.setItem(key, imageData);
    logger.info('IMAGE STORED IN LOCALSTORAGE', { assetId, size: imageData.length });
    return true;
  } catch (error) {
    logger.error('LOCALSTORAGE QUOTA EXCEEDED', error);
    return false;
  }
}

/**
 * Retrieve image from localStorage
 */
export function retrieveImageFromLocalStorage(assetId: string): string | null {
  try {
    const key = `${STORAGE_KEY_PREFIX}${assetId}`;
    return localStorage.getItem(key);
  } catch (error) {
    logger.error('FAILED TO RETRIEVE IMAGE FROM LOCALSTORAGE', error);
    return null;
  }
}

/**
 * Remove image from localStorage
 */
export function removeImageFromLocalStorage(assetId: string): boolean {
  try {
    const key = `${STORAGE_KEY_PREFIX}${assetId}`;
    localStorage.removeItem(key);
    logger.info('IMAGE REMOVED FROM LOCALSTORAGE', { assetId });
    return true;
  } catch (error) {
    logger.error('FAILED TO REMOVE IMAGE FROM LOCALSTORAGE', error);
    return false;
  }
}

