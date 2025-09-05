/**
 * Sprite Sheet Processing Utilities
 * Core utilities for loading, parsing, and manipulating sprite sheet images using HTML5 Canvas API
 */

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ProcessingResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface SpriteSheetMetadata {
  originalDimensions: ImageDimensions;
  fileSize: number;
  format: string;
  hasTransparency: boolean;
  colorDepth: number;
}

/**
 * Core sprite sheet processing utilities
 */
export class SpriteSheetProcessor {
  private static readonly MAX_CANVAS_SIZE = 4096;
  private static readonly SUPPORTED_FORMATS = ['image/png', 'image/gif', 'image/webp'];

  /**
   * Load and validate an image file
   */
  static async loadImage(source: File | string): Promise<ProcessingResult<HTMLImageElement>> {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      return new Promise((resolve) => {
        img.onload = () => {
          // Validate image dimensions
          if (img.width > this.MAX_CANVAS_SIZE || img.height > this.MAX_CANVAS_SIZE) {
            resolve({
              success: false,
              error: `Image too large: ${img.width}x${img.height}. Maximum size: ${this.MAX_CANVAS_SIZE}x${this.MAX_CANVAS_SIZE}`
            });
            return;
          }

          if (img.width < 32 || img.height < 32) {
            resolve({
              success: false,
              error: `Image too small: ${img.width}x${img.height}. Minimum size: 32x32`
            });
            return;
          }

          resolve({ success: true, data: img });
        };

        img.onerror = () => {
          resolve({
            success: false,
            error: 'Failed to load image. Please check the file format and try again.'
          });
        };

        if (source instanceof File) {
          // Validate file type
          if (!this.SUPPORTED_FORMATS.includes(source.type)) {
            resolve({
              success: false,
              error: `Unsupported format: ${source.type}. Supported formats: PNG, GIF, WebP`
            });
            return;
          }

          const reader = new FileReader();
          reader.onload = (e) => {
            img.src = e.target?.result as string;
          };
          reader.onerror = () => {
            resolve({
              success: false,
              error: 'Failed to read file'
            });
          };
          reader.readAsDataURL(source);
        } else {
          img.src = source;
        }
      });
    } catch (error) {
      return {
        success: false,
        error: `Image loading error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Extract metadata from an image
   */
  static extractMetadata(img: HTMLImageElement, file?: File): SpriteSheetMetadata {
    // Create temporary canvas to analyze image data
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(img.width, 100); // Sample for analysis
    canvas.height = Math.min(img.height, 100);
    const ctx = canvas.getContext('2d')!;
    
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Check for transparency
    let hasTransparency = false;
    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] < 255) {
        hasTransparency = true;
        break;
      }
    }

    return {
      originalDimensions: { width: img.width, height: img.height },
      fileSize: file?.size || 0,
      format: file?.type || 'unknown',
      hasTransparency,
      colorDepth: 32 // Assume 32-bit RGBA
    };
  }

  /**
   * Create a canvas from an image
   */
  static createCanvasFromImage(img: HTMLImageElement): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    
    return canvas;
  }

  /**
   * Extract a rectangular region from an image
   */
  static extractRegion(
    source: HTMLImageElement | HTMLCanvasElement,
    x: number,
    y: number,
    width: number,
    height: number
  ): ProcessingResult<HTMLCanvasElement> {
    try {
      // Validate coordinates
      const sourceWidth = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
      const sourceHeight = source instanceof HTMLImageElement ? source.naturalHeight : source.height;

      if (x < 0 || y < 0 || x + width > sourceWidth || y + height > sourceHeight) {
        return {
          success: false,
          error: `Invalid region: (${x},${y},${width},${height}) exceeds source bounds (${sourceWidth}x${sourceHeight})`
        };
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(source, x, y, width, height, 0, 0, width, height);
      
      return { success: true, data: canvas };
    } catch (error) {
      return {
        success: false,
        error: `Region extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Resize an image using specified algorithm
   */
  static resizeImage(
    source: HTMLImageElement | HTMLCanvasElement,
    newWidth: number,
    newHeight: number,
    algorithm: 'nearest' | 'bilinear' = 'bilinear'
  ): ProcessingResult<HTMLCanvasElement> {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      const ctx = canvas.getContext('2d')!;
      
      // Set image smoothing based on algorithm
      ctx.imageSmoothingEnabled = algorithm === 'bilinear';
      if (algorithm === 'nearest') {
        ctx.imageSmoothingQuality = 'low';
      }
      
      ctx.drawImage(source, 0, 0, newWidth, newHeight);
      
      return { success: true, data: canvas };
    } catch (error) {
      return {
        success: false,
        error: `Resize failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Rotate an image by specified degrees
   */
  static rotateImage(
    source: HTMLImageElement | HTMLCanvasElement,
    degrees: number
  ): ProcessingResult<HTMLCanvasElement> {
    try {
      const sourceWidth = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
      const sourceHeight = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
      
      // Calculate new dimensions after rotation
      const radians = (degrees * Math.PI) / 180;
      const cos = Math.abs(Math.cos(radians));
      const sin = Math.abs(Math.sin(radians));
      const newWidth = Math.ceil(sourceWidth * cos + sourceHeight * sin);
      const newHeight = Math.ceil(sourceWidth * sin + sourceHeight * cos);
      
      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;
      
      const ctx = canvas.getContext('2d')!;
      
      // Move to center and rotate
      ctx.translate(newWidth / 2, newHeight / 2);
      ctx.rotate(radians);
      ctx.drawImage(source, -sourceWidth / 2, -sourceHeight / 2);
      
      return { success: true, data: canvas };
    } catch (error) {
      return {
        success: false,
        error: `Rotation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Flip an image horizontally or vertically
   */
  static flipImage(
    source: HTMLImageElement | HTMLCanvasElement,
    direction: 'horizontal' | 'vertical'
  ): ProcessingResult<HTMLCanvasElement> {
    try {
      const sourceWidth = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
      const sourceHeight = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
      
      const canvas = document.createElement('canvas');
      canvas.width = sourceWidth;
      canvas.height = sourceHeight;
      
      const ctx = canvas.getContext('2d')!;
      
      if (direction === 'horizontal') {
        ctx.scale(-1, 1);
        ctx.drawImage(source, -sourceWidth, 0);
      } else {
        ctx.scale(1, -1);
        ctx.drawImage(source, 0, -sourceHeight);
      }
      
      return { success: true, data: canvas };
    } catch (error) {
      return {
        success: false,
        error: `Flip failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Convert canvas to data URL
   */
  static canvasToDataURL(canvas: HTMLCanvasElement, format: 'png' | 'jpeg' = 'png', quality = 1.0): string {
    if (format === 'jpeg') {
      return canvas.toDataURL('image/jpeg', quality);
    }
    return canvas.toDataURL('image/png');
  }

  /**
   * Convert canvas to blob
   */
  static canvasToBlob(canvas: HTMLCanvasElement, format: 'png' | 'jpeg' = 'png', quality = 1.0): Promise<Blob | null> {
    return new Promise((resolve) => {
      if (format === 'jpeg') {
        canvas.toBlob(resolve, 'image/jpeg', quality);
      } else {
        canvas.toBlob(resolve, 'image/png');
      }
    });
  }

  /**
   * Analyze image for potential frame boundaries using edge detection
   */
  static analyzeFrameBoundaries(img: HTMLImageElement): ProcessingResult<{ x: number; y: number }[]> {
    try {
      const canvas = this.createCanvasFromImage(img);
      const ctx = canvas.getContext('2d')!;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      const boundaries: { x: number; y: number }[] = [];
      
      // Simple edge detection - look for significant color changes
      const threshold = 50; // Adjust based on testing
      
      // Vertical boundaries (columns)
      for (let x = 1; x < canvas.width - 1; x++) {
        let edgeStrength = 0;
        for (let y = 0; y < canvas.height; y++) {
          const leftPixel = (y * canvas.width + (x - 1)) * 4;
          const rightPixel = (y * canvas.width + (x + 1)) * 4;
          
          // Calculate color difference
          const rDiff = Math.abs(data[leftPixel] - data[rightPixel]);
          const gDiff = Math.abs(data[leftPixel + 1] - data[rightPixel + 1]);
          const bDiff = Math.abs(data[leftPixel + 2] - data[rightPixel + 2]);
          
          edgeStrength += (rDiff + gDiff + bDiff) / 3;
        }
        
        if (edgeStrength / canvas.height > threshold) {
          boundaries.push({ x, y: 0 });
        }
      }
      
      // Horizontal boundaries (rows)
      for (let y = 1; y < canvas.height - 1; y++) {
        let edgeStrength = 0;
        for (let x = 0; x < canvas.width; x++) {
          const topPixel = ((y - 1) * canvas.width + x) * 4;
          const bottomPixel = ((y + 1) * canvas.width + x) * 4;
          
          // Calculate color difference
          const rDiff = Math.abs(data[topPixel] - data[bottomPixel]);
          const gDiff = Math.abs(data[topPixel + 1] - data[bottomPixel + 1]);
          const bDiff = Math.abs(data[topPixel + 2] - data[bottomPixel + 2]);
          
          edgeStrength += (rDiff + gDiff + bDiff) / 3;
        }
        
        if (edgeStrength / canvas.width > threshold) {
          boundaries.push({ x: 0, y });
        }
      }
      
      return { success: true, data: boundaries };
    } catch (error) {
      return {
        success: false,
        error: `Boundary analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validate that a region contains meaningful content (not empty/transparent)
   */
  static validateRegionContent(
    source: HTMLImageElement | HTMLCanvasElement,
    x: number,
    y: number,
    width: number,
    height: number
  ): boolean {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(source, x, y, width, height, 0, 0, width, height);
      
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      
      // Check if region has any non-transparent pixels
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] > 0) { // Alpha channel > 0
          return true;
        }
      }
      
      return false;
    } catch {
      return false;
    }
  }
}
