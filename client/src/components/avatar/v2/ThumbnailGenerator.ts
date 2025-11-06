/**
 * Thumbnail Generator V2
 * Utility for extracting and generating character thumbnails from sprite sheets
 * 
 * @version 2.0.0
 * @date 2025-11-06
 */

import { SpriteSheetDefinition, AnimationCategory, FrameDefinition } from '../AvatarBuilderTypes';

export interface ThumbnailOptions {
  /** Target width for thumbnail (default: 64) */
  width?: number;
  
  /** Target height for thumbnail (default: 64) */
  height?: number;
  
  /** Image format (default: 'png') */
  format?: 'png' | 'jpeg' | 'webp';
  
  /** Image quality 0-1 (default: 0.9) */
  quality?: number;
  
  /** Background color for transparent areas (default: transparent) */
  backgroundColor?: string;
}

export interface ThumbnailResult {
  success: boolean;
  data?: string; // Base64 data URL
  error?: string;
}

/**
 * Thumbnail Generator
 * Extracts idle pose frame and generates thumbnail for character preview
 */
export class ThumbnailGenerator {
  
  /**
   * Generate thumbnail from sprite sheet definition
   */
  static async generateThumbnail(
    definition: SpriteSheetDefinition,
    options: ThumbnailOptions = {}
  ): Promise<ThumbnailResult> {
    try {
      // Set default options
      const opts: Required<ThumbnailOptions> = {
        width: options.width || 64,
        height: options.height || 64,
        format: options.format || 'png',
        quality: options.quality || 0.9,
        backgroundColor: options.backgroundColor || 'transparent'
      };

      // Find idle animation frame
      const frame = this.findIdleFrame(definition);
      if (!frame) {
        return {
          success: false,
          error: 'No idle animation frame found'
        };
      }

      // Load source image
      const sourceImage = await this.loadImage(definition.source.imageData);
      if (!sourceImage) {
        return {
          success: false,
          error: 'Failed to load source image'
        };
      }

      // Extract frame from sprite sheet
      const frameCanvas = this.extractFrame(sourceImage, frame);
      if (!frameCanvas) {
        return {
          success: false,
          error: 'Failed to extract frame'
        };
      }

      // Resize to thumbnail size
      const thumbnailCanvas = this.resizeCanvas(frameCanvas, opts.width, opts.height, opts.backgroundColor);

      // Convert to data URL
      const mimeType = `image/${opts.format}`;
      const dataUrl = thumbnailCanvas.toDataURL(mimeType, opts.quality);

      return {
        success: true,
        data: dataUrl
      };

    } catch (error) {
      return {
        success: false,
        error: `Thumbnail generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Find the first frame of idle animation
   */
  private static findIdleFrame(definition: SpriteSheetDefinition): FrameDefinition | null {
    try {
      // Find idle animation
      const idleAnimation = definition.animations?.find(
        anim => anim.category === AnimationCategory.IDLE
      );

      if (!idleAnimation || !idleAnimation.sequence?.frameIds || idleAnimation.sequence.frameIds.length === 0) {
        // Fallback to first frame
        if (definition.frames && definition.frames.length > 0) {
          return definition.frames[0];
        }
        return null;
      }

      // Get first frame of idle animation
      const firstFrameId = idleAnimation.sequence.frameIds[0];
      const frame = definition.frames?.find(f => f.id === firstFrameId);

      return frame || null;

    } catch (error) {
      console.error('Failed to find idle frame:', error);
      return null;
    }
  }

  /**
   * Load image from data URL
   */
  private static loadImage(dataUrl: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = dataUrl;
    });
  }

  /**
   * Extract a specific frame from sprite sheet
   */
  private static extractFrame(sourceImage: HTMLImageElement, frame: FrameDefinition): HTMLCanvasElement | null {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        return null;
      }

      const { sourceRect } = frame;
      
      // Set canvas size to frame size
      canvas.width = sourceRect.width;
      canvas.height = sourceRect.height;

      // Draw the specific frame from sprite sheet
      ctx.drawImage(
        sourceImage,
        sourceRect.x,
        sourceRect.y,
        sourceRect.width,
        sourceRect.height,
        0,
        0,
        sourceRect.width,
        sourceRect.height
      );

      return canvas;

    } catch (error) {
      console.error('Failed to extract frame:', error);
      return null;
    }
  }

  /**
   * Resize canvas to thumbnail size
   */
  private static resizeCanvas(
    sourceCanvas: HTMLCanvasElement,
    targetWidth: number,
    targetHeight: number,
    backgroundColor: string
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      return sourceCanvas; // Return original if context creation fails
    }

    canvas.width = targetWidth;
    canvas.height = targetHeight;

    // Fill background if specified
    if (backgroundColor !== 'transparent') {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, targetWidth, targetHeight);
    }

    // Calculate scaling to fit within thumbnail while maintaining aspect ratio
    const sourceAspect = sourceCanvas.width / sourceCanvas.height;
    const targetAspect = targetWidth / targetHeight;

    let drawWidth: number;
    let drawHeight: number;
    let offsetX: number;
    let offsetY: number;

    if (sourceAspect > targetAspect) {
      // Source is wider - fit to width
      drawWidth = targetWidth;
      drawHeight = targetWidth / sourceAspect;
      offsetX = 0;
      offsetY = (targetHeight - drawHeight) / 2;
    } else {
      // Source is taller - fit to height
      drawHeight = targetHeight;
      drawWidth = targetHeight * sourceAspect;
      offsetX = (targetWidth - drawWidth) / 2;
      offsetY = 0;
    }

    // Use high-quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Draw resized image centered
    ctx.drawImage(
      sourceCanvas,
      0,
      0,
      sourceCanvas.width,
      sourceCanvas.height,
      offsetX,
      offsetY,
      drawWidth,
      drawHeight
    );

    return canvas;
  }

  /**
   * Generate thumbnail from existing character slot
   * Convenience method for regenerating thumbnails
   */
  static async regenerateThumbnail(
    spriteSheet: SpriteSheetDefinition,
    options?: ThumbnailOptions
  ): Promise<ThumbnailResult> {
    return this.generateThumbnail(spriteSheet, options);
  }

  /**
   * Batch generate thumbnails for multiple sprite sheets
   */
  static async generateBatchThumbnails(
    definitions: SpriteSheetDefinition[],
    options?: ThumbnailOptions
  ): Promise<Map<string, ThumbnailResult>> {
    const results = new Map<string, ThumbnailResult>();

    for (const definition of definitions) {
      const result = await this.generateThumbnail(definition, options);
      results.set(definition.id, result);
    }

    return results;
  }

  /**
   * Validate thumbnail data URL
   */
  static isValidThumbnail(dataUrl: string): boolean {
    if (!dataUrl || typeof dataUrl !== 'string') {
      return false;
    }

    // Check if it's a valid data URL
    const dataUrlPattern = /^data:image\/(png|jpeg|webp);base64,/;
    return dataUrlPattern.test(dataUrl);
  }

  /**
   * Get thumbnail size in bytes
   */
  static getThumbnailSize(dataUrl: string): number {
    if (!this.isValidThumbnail(dataUrl)) {
      return 0;
    }

    // Remove data URL prefix and calculate base64 size
    const base64Data = dataUrl.split(',')[1];
    if (!base64Data) {
      return 0;
    }

    // Base64 encoding increases size by ~33%
    // Actual size = (base64 length * 3) / 4
    return Math.ceil((base64Data.length * 3) / 4);
  }
}

export default ThumbnailGenerator;

