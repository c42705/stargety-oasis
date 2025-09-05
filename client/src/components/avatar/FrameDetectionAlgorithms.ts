/**
 * Frame Detection Algorithms
 * Advanced algorithms to automatically detect frame boundaries and suggest grid layouts
 */

import { SpriteSheetProcessor, ProcessingResult } from './SpriteSheetProcessor';

export interface GridSuggestion {
  columns: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
  confidence: number; // 0-1 scale
  method: string;
  totalFrames: number;
}

export interface FrameBoundary {
  x: number;
  y: number;
  type: 'vertical' | 'horizontal';
  strength: number;
}

export interface DetectionResult {
  suggestions: GridSuggestion[];
  boundaries: FrameBoundary[];
  analysis: {
    imageSize: { width: number; height: number };
    hasTransparency: boolean;
    dominantColors: string[];
    edgeCount: number;
  };
}

/**
 * Frame detection algorithms for sprite sheets
 */
export class FrameDetectionAlgorithms {
  private static readonly COMMON_GRID_SIZES = [
    { cols: 1, rows: 1 }, { cols: 2, rows: 1 }, { cols: 3, rows: 1 }, { cols: 4, rows: 1 },
    { cols: 1, rows: 2 }, { cols: 2, rows: 2 }, { cols: 3, rows: 2 }, { cols: 4, rows: 2 },
    { cols: 1, rows: 3 }, { cols: 2, rows: 3 }, { cols: 3, rows: 3 }, { cols: 4, rows: 3 },
    { cols: 1, rows: 4 }, { cols: 2, rows: 4 }, { cols: 3, rows: 4 }, { cols: 4, rows: 4 },
    { cols: 5, rows: 1 }, { cols: 6, rows: 1 }, { cols: 8, rows: 1 }, { cols: 8, rows: 2 },
    { cols: 5, rows: 2 }, { cols: 6, rows: 2 }, { cols: 8, rows: 4 }, { cols: 16, rows: 1 }
  ];

  /**
   * Main detection method that combines multiple algorithms
   */
  static async detectFrames(img: HTMLImageElement): Promise<ProcessingResult<DetectionResult>> {
    try {
      const canvas = SpriteSheetProcessor.createCanvasFromImage(img);
      const ctx = canvas.getContext('2d')!;
      
      // Perform various analyses
      const edgeAnalysis = this.analyzeEdges(canvas);
      const colorAnalysis = this.analyzeColors(canvas);
      const transparencyAnalysis = this.analyzeTransparency(canvas);
      const gridAnalysis = this.analyzeCommonGrids(canvas);
      
      // Combine results
      const boundaries = [
        ...edgeAnalysis.boundaries,
        ...transparencyAnalysis.boundaries
      ].sort((a, b) => b.strength - a.strength);

      const suggestions = [
        ...gridAnalysis.suggestions,
        ...this.generateGridSuggestions(canvas, boundaries),
        ...this.generateAspectRatioSuggestions(canvas)
      ].sort((a, b) => b.confidence - a.confidence);

      // Remove duplicate suggestions
      const uniqueSuggestions = this.removeDuplicateSuggestions(suggestions);

      const result: DetectionResult = {
        suggestions: uniqueSuggestions.slice(0, 10), // Top 10 suggestions
        boundaries,
        analysis: {
          imageSize: { width: canvas.width, height: canvas.height },
          hasTransparency: transparencyAnalysis.hasTransparency,
          dominantColors: colorAnalysis.dominantColors,
          edgeCount: boundaries.length
        }
      };

      return { success: true, data: result };
    } catch (error) {
      return {
        success: false,
        error: `Frame detection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Analyze edges to find potential frame boundaries
   */
  private static analyzeEdges(canvas: HTMLCanvasElement): { boundaries: FrameBoundary[] } {
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const boundaries: FrameBoundary[] = [];

    // Vertical edge detection
    for (let x = 1; x < canvas.width - 1; x++) {
      let edgeStrength = 0;
      let samples = 0;

      for (let y = 0; y < canvas.height; y++) {
        const leftIdx = (y * canvas.width + (x - 1)) * 4;
        const rightIdx = (y * canvas.width + (x + 1)) * 4;

        // Skip transparent pixels
        if (data[leftIdx + 3] === 0 && data[rightIdx + 3] === 0) continue;

        const leftLuma = 0.299 * data[leftIdx] + 0.587 * data[leftIdx + 1] + 0.114 * data[leftIdx + 2];
        const rightLuma = 0.299 * data[rightIdx] + 0.587 * data[rightIdx + 1] + 0.114 * data[rightIdx + 2];

        edgeStrength += Math.abs(leftLuma - rightLuma);
        samples++;
      }

      if (samples > 0) {
        const avgStrength = edgeStrength / samples;
        if (avgStrength > 30) { // Threshold for significant edge
          boundaries.push({
            x,
            y: 0,
            type: 'vertical',
            strength: avgStrength
          });
        }
      }
    }

    // Horizontal edge detection
    for (let y = 1; y < canvas.height - 1; y++) {
      let edgeStrength = 0;
      let samples = 0;

      for (let x = 0; x < canvas.width; x++) {
        const topIdx = ((y - 1) * canvas.width + x) * 4;
        const bottomIdx = ((y + 1) * canvas.width + x) * 4;

        // Skip transparent pixels
        if (data[topIdx + 3] === 0 && data[bottomIdx + 3] === 0) continue;

        const topLuma = 0.299 * data[topIdx] + 0.587 * data[topIdx + 1] + 0.114 * data[topIdx + 2];
        const bottomLuma = 0.299 * data[bottomIdx] + 0.587 * data[bottomIdx + 1] + 0.114 * data[bottomIdx + 2];

        edgeStrength += Math.abs(topLuma - bottomLuma);
        samples++;
      }

      if (samples > 0) {
        const avgStrength = edgeStrength / samples;
        if (avgStrength > 30) {
          boundaries.push({
            x: 0,
            y,
            type: 'horizontal',
            strength: avgStrength
          });
        }
      }
    }

    return { boundaries };
  }

  /**
   * Analyze color distribution
   */
  private static analyzeColors(canvas: HTMLCanvasElement): { dominantColors: string[] } {
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const colorCounts = new Map<string, number>();

    // Sample every 4th pixel for performance
    for (let i = 0; i < data.length; i += 16) {
      if (data[i + 3] > 0) { // Skip transparent pixels
        const color = `rgb(${data[i]},${data[i + 1]},${data[i + 2]})`;
        colorCounts.set(color, (colorCounts.get(color) || 0) + 1);
      }
    }

    // Get top 5 colors
    const sortedColors = Array.from(colorCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([color]) => color);

    return { dominantColors: sortedColors };
  }

  /**
   * Analyze transparency patterns
   */
  private static analyzeTransparency(canvas: HTMLCanvasElement): { 
    hasTransparency: boolean; 
    boundaries: FrameBoundary[] 
  } {
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const boundaries: FrameBoundary[] = [];
    let hasTransparency = false;

    // Check for transparency boundaries (vertical)
    for (let x = 0; x < canvas.width; x++) {
      let transparentCount = 0;
      for (let y = 0; y < canvas.height; y++) {
        const idx = (y * canvas.width + x) * 4;
        if (data[idx + 3] === 0) {
          transparentCount++;
          hasTransparency = true;
        }
      }

      // If entire column is transparent or mostly transparent, it's likely a boundary
      if (transparentCount > canvas.height * 0.8) {
        boundaries.push({
          x,
          y: 0,
          type: 'vertical',
          strength: transparentCount / canvas.height * 100
        });
      }
    }

    // Check for transparency boundaries (horizontal)
    for (let y = 0; y < canvas.height; y++) {
      let transparentCount = 0;
      for (let x = 0; x < canvas.width; x++) {
        const idx = (y * canvas.width + x) * 4;
        if (data[idx + 3] === 0) {
          transparentCount++;
        }
      }

      if (transparentCount > canvas.width * 0.8) {
        boundaries.push({
          x: 0,
          y,
          type: 'horizontal',
          strength: transparentCount / canvas.width * 100
        });
      }
    }

    return { hasTransparency, boundaries };
  }

  /**
   * Test common grid layouts
   */
  private static analyzeCommonGrids(canvas: HTMLCanvasElement): { suggestions: GridSuggestion[] } {
    const suggestions: GridSuggestion[] = [];

    for (const grid of this.COMMON_GRID_SIZES) {
      const frameWidth = Math.floor(canvas.width / grid.cols);
      const frameHeight = Math.floor(canvas.height / grid.rows);

      // Skip if frames would be too small
      if (frameWidth < 16 || frameHeight < 16) continue;

      // Calculate confidence based on how well the grid fits
      const widthRemainder = canvas.width % grid.cols;
      const heightRemainder = canvas.height % grid.rows;
      const fitScore = 1 - (widthRemainder + heightRemainder) / (canvas.width + canvas.height);

      // Bonus for common game sprite dimensions
      let dimensionBonus = 0;
      if (this.isCommonSpriteDimension(frameWidth, frameHeight)) {
        dimensionBonus = 0.2;
      }

      // Bonus for square frames
      let squareBonus = 0;
      if (frameWidth === frameHeight) {
        squareBonus = 0.1;
      }

      const confidence = Math.min(fitScore + dimensionBonus + squareBonus, 1.0);

      if (confidence > 0.3) { // Only include reasonable suggestions
        suggestions.push({
          columns: grid.cols,
          rows: grid.rows,
          frameWidth,
          frameHeight,
          confidence,
          method: 'common_grid',
          totalFrames: grid.cols * grid.rows
        });
      }
    }

    return { suggestions };
  }

  /**
   * Generate suggestions based on detected boundaries
   */
  private static generateGridSuggestions(canvas: HTMLCanvasElement, boundaries: FrameBoundary[]): GridSuggestion[] {
    const suggestions: GridSuggestion[] = [];
    
    const verticalBoundaries = boundaries
      .filter(b => b.type === 'vertical' && b.strength > 50)
      .map(b => b.x)
      .sort((a, b) => a - b);
    
    const horizontalBoundaries = boundaries
      .filter(b => b.type === 'horizontal' && b.strength > 50)
      .map(b => b.y)
      .sort((a, b) => a - b);

    // Add image edges as boundaries
    const allVertical = [0, ...verticalBoundaries, canvas.width];
    const allHorizontal = [0, ...horizontalBoundaries, canvas.height];

    // Generate grid suggestions from boundary combinations
    for (let vCount = 2; vCount <= Math.min(allVertical.length, 9); vCount++) {
      for (let hCount = 2; hCount <= Math.min(allHorizontal.length, 9); hCount++) {
        const cols = vCount - 1;
        const rows = hCount - 1;
        
        // Calculate average frame dimensions
        const frameWidth = Math.floor(canvas.width / cols);
        const frameHeight = Math.floor(canvas.height / rows);

        if (frameWidth < 16 || frameHeight < 16) continue;

        // Calculate confidence based on boundary strength
        const avgVerticalStrength = verticalBoundaries.length > 0 
          ? verticalBoundaries.reduce((sum, _, i) => sum + (boundaries.find(b => b.x === verticalBoundaries[i])?.strength || 0), 0) / verticalBoundaries.length
          : 0;
        
        const avgHorizontalStrength = horizontalBoundaries.length > 0
          ? horizontalBoundaries.reduce((sum, _, i) => sum + (boundaries.find(b => b.y === horizontalBoundaries[i])?.strength || 0), 0) / horizontalBoundaries.length
          : 0;

        const confidence = Math.min((avgVerticalStrength + avgHorizontalStrength) / 200, 0.9);

        if (confidence > 0.2) {
          suggestions.push({
            columns: cols,
            rows,
            frameWidth,
            frameHeight,
            confidence,
            method: 'boundary_detection',
            totalFrames: cols * rows
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Generate suggestions based on aspect ratios
   */
  private static generateAspectRatioSuggestions(canvas: HTMLCanvasElement): GridSuggestion[] {
    const suggestions: GridSuggestion[] = [];
    const aspectRatio = canvas.width / canvas.height;

    // Common sprite sheet aspect ratios
    const commonRatios = [
      { ratio: 1, cols: 1, rows: 1 },    // Square
      { ratio: 2, cols: 2, rows: 1 },    // 2:1
      { ratio: 3, cols: 3, rows: 1 },    // 3:1
      { ratio: 4, cols: 4, rows: 1 },    // 4:1
      { ratio: 1.5, cols: 3, rows: 2 },  // 3:2
      { ratio: 2, cols: 4, rows: 2 },    // 4:2
    ];

    for (const { ratio, cols, rows } of commonRatios) {
      const ratioDiff = Math.abs(aspectRatio - ratio);
      if (ratioDiff < 0.2) { // Close match
        const frameWidth = Math.floor(canvas.width / cols);
        const frameHeight = Math.floor(canvas.height / rows);

        if (frameWidth >= 16 && frameHeight >= 16) {
          const confidence = Math.max(0.1, 0.8 - ratioDiff * 2);
          
          suggestions.push({
            columns: cols,
            rows,
            frameWidth,
            frameHeight,
            confidence,
            method: 'aspect_ratio',
            totalFrames: cols * rows
          });
        }
      }
    }

    return suggestions;
  }

  /**
   * Check if dimensions are common for game sprites
   */
  private static isCommonSpriteDimension(width: number, height: number): boolean {
    const commonSizes = [16, 24, 32, 48, 64, 96, 128, 256];
    return commonSizes.includes(width) && commonSizes.includes(height);
  }

  /**
   * Remove duplicate suggestions
   */
  private static removeDuplicateSuggestions(suggestions: GridSuggestion[]): GridSuggestion[] {
    const seen = new Set<string>();
    return suggestions.filter(suggestion => {
      const key = `${suggestion.columns}x${suggestion.rows}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Validate a grid suggestion by checking frame content
   */
  static validateGridSuggestion(
    canvas: HTMLCanvasElement, 
    suggestion: GridSuggestion
  ): { isValid: boolean; emptyFrames: number; contentFrames: number } {
    let emptyFrames = 0;
    let contentFrames = 0;

    for (let row = 0; row < suggestion.rows; row++) {
      for (let col = 0; col < suggestion.columns; col++) {
        const x = col * suggestion.frameWidth;
        const y = row * suggestion.frameHeight;

        const hasContent = SpriteSheetProcessor.validateRegionContent(
          canvas, x, y, suggestion.frameWidth, suggestion.frameHeight
        );

        if (hasContent) {
          contentFrames++;
        } else {
          emptyFrames++;
        }
      }
    }

    // A valid grid should have at least 50% frames with content
    const isValid = contentFrames >= suggestion.totalFrames * 0.5;

    return { isValid, emptyFrames, contentFrames };
  }
}
