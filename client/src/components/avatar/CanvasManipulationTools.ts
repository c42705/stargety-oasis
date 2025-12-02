/**
 * Canvas Manipulation Tools
 * Advanced utilities for cropping, resizing, rotating, and extracting frames from sprite sheets
 */

import { SpriteSheetProcessor, ProcessingResult } from './SpriteSheetProcessor';

export interface CropOperation {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ResizeOperation {
  width: number;
  height: number;
  algorithm: 'nearest' | 'bilinear';
  maintainAspectRatio?: boolean;
}

export interface RotateOperation {
  degrees: number;
  backgroundColor?: string;
}

export interface FlipOperation {
  direction: 'horizontal' | 'vertical';
}

export interface FrameExtractionResult {
  frameCanvas: HTMLCanvasElement;
  frameData: string; // base64 data URL
  metadata: {
    originalPosition: { x: number; y: number };
    dimensions: { width: number; height: number };
    isEmpty: boolean;
    hasTransparency: boolean;
  };
}

export interface BatchOperation {
  type: 'crop' | 'resize' | 'rotate' | 'flip';
  parameters: CropOperation | ResizeOperation | RotateOperation | FlipOperation;
}

/**
 * Advanced canvas manipulation tools for sprite sheet editing
 */
export class CanvasManipulationTools {
  private static operationHistory: Array<{
    operation: string;
    timestamp: number;
    canvas: HTMLCanvasElement;
  }> = [];

  private static readonly MAX_HISTORY = 20;

  /**
   * Advanced cropping with validation and optimization
   */
  static cropAdvanced(
    source: HTMLImageElement | HTMLCanvasElement,
    operation: CropOperation
  ): ProcessingResult<HTMLCanvasElement> {
    try {
      // Validate crop parameters
      const sourceWidth = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
      const sourceHeight = source instanceof HTMLImageElement ? source.naturalHeight : source.height;

      if (operation.x < 0 || operation.y < 0 || 
          operation.x + operation.width > sourceWidth || 
          operation.y + operation.height > sourceHeight) {
        return {
          success: false,
          error: `Crop region (${operation.x}, ${operation.y}, ${operation.width}, ${operation.height}) exceeds source bounds (${sourceWidth}x${sourceHeight})`
        };
      }

      if (operation.width <= 0 || operation.height <= 0) {
        return {
          success: false,
          error: 'Crop dimensions must be positive'
        };
      }

      // Perform crop
      const result = SpriteSheetProcessor.extractRegion(
        source, operation.x, operation.y, operation.width, operation.height
      );

      if (result.success && result.data) {
        this.addToHistory('crop', result.data);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Crop operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Smart resize with aspect ratio preservation
   */
  static resizeAdvanced(
    source: HTMLImageElement | HTMLCanvasElement,
    operation: ResizeOperation
  ): ProcessingResult<HTMLCanvasElement> {
    try {
      const sourceWidth = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
      const sourceHeight = source instanceof HTMLImageElement ? source.naturalHeight : source.height;

      let { width, height } = operation;

      // Maintain aspect ratio if requested
      if (operation.maintainAspectRatio) {
        const aspectRatio = sourceWidth / sourceHeight;
        if (width / height > aspectRatio) {
          width = Math.round(height * aspectRatio);
        } else {
          height = Math.round(width / aspectRatio);
        }
      }

      // Validate dimensions
      if (width <= 0 || height <= 0) {
        return {
          success: false,
          error: 'Resize dimensions must be positive'
        };
      }

      if (width > 4096 || height > 4096) {
        return {
          success: false,
          error: 'Resize dimensions too large (max 4096x4096)'
        };
      }

      const result = SpriteSheetProcessor.resizeImage(source, width, height, operation.algorithm);

      if (result.success && result.data) {
        this.addToHistory('resize', result.data);
      }

      return result;
    } catch (error) {
      return {
        success: false,
        error: `Resize operation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Rotate with background color support
   */
  static rotateAdvanced(
    source: HTMLImageElement | HTMLCanvasElement,
    operation: RotateOperation
  ): ProcessingResult<HTMLCanvasElement> {
    try {
      // Normalize angle to 0-360 range
      const normalizedDegrees = ((operation.degrees % 360) + 360) % 360;

      const sourceWidth = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
      const sourceHeight = source instanceof HTMLImageElement ? source.naturalHeight : source.height;

      // Calculate new dimensions
      const radians = (normalizedDegrees * Math.PI) / 180;
      const cos = Math.abs(Math.cos(radians));
      const sin = Math.abs(Math.sin(radians));
      const newWidth = Math.ceil(sourceWidth * cos + sourceHeight * sin);
      const newHeight = Math.ceil(sourceWidth * sin + sourceHeight * cos);

      const canvas = document.createElement('canvas');
      canvas.width = newWidth;
      canvas.height = newHeight;
      const ctx = canvas.getContext('2d')!;

      // Set background color if specified
      if (operation.backgroundColor) {
        ctx.fillStyle = operation.backgroundColor;
        ctx.fillRect(0, 0, newWidth, newHeight);
      }

      // Perform rotation
      ctx.translate(newWidth / 2, newHeight / 2);
      ctx.rotate(radians);
      ctx.drawImage(source, -sourceWidth / 2, -sourceHeight / 2);

      this.addToHistory('rotate', canvas);

      return { success: true, data: canvas };
    } catch (error) {
      return {
        success: false,
        error: `Rotation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Extract multiple frames from a sprite sheet
   */
  static extractFrames(
    source: HTMLImageElement | HTMLCanvasElement,
    frameDefinitions: Array<{ id: string; x: number; y: number; width: number; height: number }>
  ): ProcessingResult<Map<string, FrameExtractionResult>> {
    try {
      const results = new Map<string, FrameExtractionResult>();

      for (const frame of frameDefinitions) {
        const cropResult = this.cropAdvanced(source, {
          x: frame.x,
          y: frame.y,
          width: frame.width,
          height: frame.height
        });

        if (!cropResult.success || !cropResult.data) {
          return {
            success: false,
            error: `Failed to extract frame ${frame.id}: ${cropResult.error}`
          };
        }

        // Analyze frame content
        const isEmpty = !SpriteSheetProcessor.validateRegionContent(
          source, frame.x, frame.y, frame.width, frame.height
        );

        const hasTransparency = this.checkTransparency(cropResult.data);

        results.set(frame.id, {
          frameCanvas: cropResult.data,
          frameData: SpriteSheetProcessor.canvasToDataURL(cropResult.data),
          metadata: {
            originalPosition: { x: frame.x, y: frame.y },
            dimensions: { width: frame.width, height: frame.height },
            isEmpty,
            hasTransparency
          }
        });
      }

      return { success: true, data: results };
    } catch (error) {
      return {
        success: false,
        error: `Frame extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Batch process multiple operations
   */
  static batchProcess(
    source: HTMLImageElement | HTMLCanvasElement,
    operations: BatchOperation[]
  ): ProcessingResult<HTMLCanvasElement> {
    try {
      let currentCanvas: HTMLCanvasElement;

      // Convert source to canvas if needed
      if (source instanceof HTMLImageElement) {
        currentCanvas = SpriteSheetProcessor.createCanvasFromImage(source);
      } else {
        // Clone the canvas
        currentCanvas = document.createElement('canvas');
        currentCanvas.width = source.width;
        currentCanvas.height = source.height;
        const ctx = currentCanvas.getContext('2d')!;
        ctx.drawImage(source, 0, 0);
      }

      for (const operation of operations) {
        let result: ProcessingResult<HTMLCanvasElement>;

        switch (operation.type) {
          case 'crop':
            result = this.cropAdvanced(currentCanvas, operation.parameters as CropOperation);
            break;
          case 'resize':
            result = this.resizeAdvanced(currentCanvas, operation.parameters as ResizeOperation);
            break;
          case 'rotate':
            result = this.rotateAdvanced(currentCanvas, operation.parameters as RotateOperation);
            break;
          case 'flip':
            result = SpriteSheetProcessor.flipImage(
              currentCanvas, 
              (operation.parameters as FlipOperation).direction
            );
            break;
          default:
            return {
              success: false,
              error: `Unknown operation type: ${operation.type}`
            };
        }

        if (!result.success || !result.data) {
          return {
            success: false,
            error: `Batch operation failed at step ${operation.type}: ${result.error}`
          };
        }

        currentCanvas = result.data;
      }

      this.addToHistory('batch', currentCanvas);

      return { success: true, data: currentCanvas };
    } catch (error) {
      return {
        success: false,
        error: `Batch processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Create a composite image from multiple frames
   */
  static composeFrames(
    frames: Array<{
      canvas: HTMLCanvasElement;
      position: { x: number; y: number };
      opacity?: number;
      blendMode?: GlobalCompositeOperation;
    }>,
    outputSize: { width: number; height: number },
    backgroundColor?: string
  ): ProcessingResult<HTMLCanvasElement> {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = outputSize.width;
      canvas.height = outputSize.height;
      const ctx = canvas.getContext('2d')!;

      // Set background
      if (backgroundColor) {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, outputSize.width, outputSize.height);
      }

      // Composite frames
      for (const frame of frames) {
        ctx.save();

        if (frame.opacity !== undefined) {
          ctx.globalAlpha = frame.opacity;
        }

        if (frame.blendMode) {
          ctx.globalCompositeOperation = frame.blendMode;
        }

        ctx.drawImage(frame.canvas, frame.position.x, frame.position.y);
        ctx.restore();
      }

      this.addToHistory('compose', canvas);

      return { success: true, data: canvas };
    } catch (error) {
      return {
        success: false,
        error: `Frame composition failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Apply filters to a canvas
   */
  static applyFilter(
    source: HTMLImageElement | HTMLCanvasElement,
    filter: {
      type: 'brightness' | 'contrast' | 'saturation' | 'hue' | 'blur';
      value: number;
    }
  ): ProcessingResult<HTMLCanvasElement> {
    try {
      const canvas = document.createElement('canvas');
      const sourceWidth = source instanceof HTMLImageElement ? source.naturalWidth : source.width;
      const sourceHeight = source instanceof HTMLImageElement ? source.naturalHeight : source.height;
      
      canvas.width = sourceWidth;
      canvas.height = sourceHeight;
      const ctx = canvas.getContext('2d')!;

      // Apply CSS filter
      switch (filter.type) {
        case 'brightness':
          ctx.filter = `brightness(${filter.value}%)`;
          break;
        case 'contrast':
          ctx.filter = `contrast(${filter.value}%)`;
          break;
        case 'saturation':
          ctx.filter = `saturate(${filter.value}%)`;
          break;
        case 'hue':
          ctx.filter = `hue-rotate(${filter.value}deg)`;
          break;
        case 'blur':
          ctx.filter = `blur(${filter.value}px)`;
          break;
        default:
          return {
            success: false,
            error: `Unknown filter type: ${filter.type}`
          };
      }

      ctx.drawImage(source, 0, 0);

      this.addToHistory('filter', canvas);

      return { success: true, data: canvas };
    } catch (error) {
      return {
        success: false,
        error: `Filter application failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Check if canvas has transparency
   */
  private static checkTransparency(canvas: HTMLCanvasElement): boolean {
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) {
        return true;
      }
    }

    return false;
  }

  /**
   * Add operation to history for undo functionality
   */
  private static addToHistory(operation: string, canvas: HTMLCanvasElement): void {
    // Clone canvas for history
    const historyCanvas = document.createElement('canvas');
    historyCanvas.width = canvas.width;
    historyCanvas.height = canvas.height;
    const ctx = historyCanvas.getContext('2d')!;
    ctx.drawImage(canvas, 0, 0);

    this.operationHistory.push({
      operation,
      timestamp: Date.now(),
      canvas: historyCanvas
    });

    // Limit history size
    if (this.operationHistory.length > this.MAX_HISTORY) {
      this.operationHistory.shift();
    }
  }

  /**
   * Get operation history
   */
  static getHistory(): Array<{ operation: string; timestamp: number }> {
    return this.operationHistory.map(({ operation, timestamp }) => ({ operation, timestamp }));
  }

  /**
   * Undo last operation
   */
  static undo(): HTMLCanvasElement | null {
    if (this.operationHistory.length < 2) {
      return null; // Need at least 2 entries to undo
    }

    // Remove current state and return previous
    this.operationHistory.pop();
    const previous = this.operationHistory[this.operationHistory.length - 1];
    
    // Clone canvas to avoid reference issues
    const canvas = document.createElement('canvas');
    canvas.width = previous.canvas.width;
    canvas.height = previous.canvas.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(previous.canvas, 0, 0);

    return canvas;
  }

  /**
   * Clear operation history
   */
  static clearHistory(): void {
    this.operationHistory = [];
  }

  /**
   * Get canvas memory usage estimate
   */
  static getMemoryUsage(canvas: HTMLCanvasElement): number {
    // Estimate: width * height * 4 bytes per pixel (RGBA)
    return canvas.width * canvas.height * 4;
  }

  /**
   * Optimize canvas for memory usage
   */
  static optimizeCanvas(canvas: HTMLCanvasElement): ProcessingResult<HTMLCanvasElement> {
    try {
      // Create optimized canvas with minimal size
      const ctx = canvas.getContext('2d')!;
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Find actual content bounds
      let minX = canvas.width, minY = canvas.height, maxX = 0, maxY = 0;
      const data = imageData.data;

      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const idx = (y * canvas.width + x) * 4;
          if (data[idx + 3] > 0) { // Non-transparent pixel
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x);
            maxY = Math.max(maxY, y);
          }
        }
      }

      // If no content found, return minimal canvas
      if (minX >= maxX || minY >= maxY) {
        const optimized = document.createElement('canvas');
        optimized.width = 1;
        optimized.height = 1;
        return { success: true, data: optimized };
      }

      // Create optimized canvas with content bounds
      const optimized = document.createElement('canvas');
      optimized.width = maxX - minX + 1;
      optimized.height = maxY - minY + 1;
      const optimizedCtx = optimized.getContext('2d')!;
      
      optimizedCtx.drawImage(
        canvas, 
        minX, minY, optimized.width, optimized.height,
        0, 0, optimized.width, optimized.height
      );

      return { success: true, data: optimized };
    } catch (error) {
      return {
        success: false,
        error: `Canvas optimization failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}
