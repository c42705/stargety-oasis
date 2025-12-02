/**
 * Shared Camera Control System
 * 
 * This system provides consistent camera control functionality that can be used
 * by both the WorldModule (Phaser.js) and Map Editor (Fabric.js) to ensure
 * identical user experience across both interfaces.
 */

export interface CameraState {
  zoom: number;
  scrollX: number;
  scrollY: number;
  width: number;
  height: number;
}

export interface WorldBounds {
  width: number;
  height: number;
}

export interface CameraConstraints {
  minZoom: number;
  maxZoom: number;
  zoomStep: number;
  worldBounds: WorldBounds;
}

export interface CameraControlConfig {
  constraints: CameraConstraints;
  panSensitivity?: number;
  lerpFactor?: number;
}

/**
 * Shared camera control logic that can be used by both Phaser.js and Fabric.js
 */
export class CameraControlSystem {
  private constraints: CameraConstraints;
  private panSensitivity: number;
  private lerpFactor: number;

  constructor(config: CameraControlConfig) {
    this.constraints = config.constraints;
    this.panSensitivity = config.panSensitivity || 1.0;
    this.lerpFactor = config.lerpFactor || 0.1;
  }

  /**
   * Calculate zoom in value
   */
  public calculateZoomIn(currentZoom: number): number {
    return Math.min(currentZoom + this.constraints.zoomStep, this.constraints.maxZoom);
  }

  /**
   * Calculate zoom out value
   */
  public calculateZoomOut(currentZoom: number): number {
    return Math.max(currentZoom - this.constraints.zoomStep, this.constraints.minZoom);
  }

  /**
   * Check if zoom in is possible
   */
  public canZoomIn(currentZoom: number): boolean {
    return currentZoom < this.constraints.maxZoom;
  }

  /**
   * Check if zoom out is possible
   */
  public canZoomOut(currentZoom: number): boolean {
    return currentZoom > this.constraints.minZoom;
  }

  /**
   * Constrain camera position to world bounds
   */
  public constrainCameraToWorldBounds(
    scrollX: number, 
    scrollY: number, 
    cameraState: CameraState
  ): { x: number; y: number } {
    const { zoom, width, height } = cameraState;
    const { worldBounds } = this.constraints;

    // Calculate the visible area size at current zoom
    const visibleWidth = width / zoom;
    const visibleHeight = height / zoom;

    // Constrain scroll position to keep camera within world bounds
    const maxScrollX = Math.max(0, worldBounds.width - visibleWidth);
    const maxScrollY = Math.max(0, worldBounds.height - visibleHeight);

    const constrainedX = Math.max(0, Math.min(scrollX, maxScrollX));
    const constrainedY = Math.max(0, Math.min(scrollY, maxScrollY));

    return { x: constrainedX, y: constrainedY };
  }

  /**
   * Calculate fit-to-screen zoom level
   */
  public calculateFitToScreenZoom(viewportWidth: number, viewportHeight: number): number {
    const { worldBounds } = this.constraints;
    
    const scaleX = viewportWidth / worldBounds.width;
    const scaleY = viewportHeight / worldBounds.height;
    const fitZoom = Math.min(scaleX, scaleY);

    // Ensure fit zoom is within constraints
    return Math.max(this.constraints.minZoom, Math.min(fitZoom, this.constraints.maxZoom));
  }

  /**
   * Calculate center position for fit-to-screen
   */
  public calculateFitToScreenCenter(
    viewportWidth: number, 
    viewportHeight: number, 
    fitZoom: number
  ): { x: number; y: number } {
    const { worldBounds } = this.constraints;
    
    const centerX = worldBounds.width / 2;
    const centerY = worldBounds.height / 2;
    
    const scrollX = centerX - viewportWidth / (2 * fitZoom);
    const scrollY = centerY - viewportHeight / (2 * fitZoom);

    return { x: scrollX, y: scrollY };
  }

  /**
   * Apply pan delta with sensitivity
   */
  public applyPanDelta(
    currentScrollX: number,
    currentScrollY: number,
    deltaX: number,
    deltaY: number,
    cameraState: CameraState
  ): { x: number; y: number } {
    const newScrollX = currentScrollX - (deltaX * this.panSensitivity);
    const newScrollY = currentScrollY - (deltaY * this.panSensitivity);

    return this.constrainCameraToWorldBounds(newScrollX, newScrollY, cameraState);
  }

  /**
   * Update constraints (e.g., when world dimensions change)
   */
  public updateConstraints(newConstraints: Partial<CameraConstraints>): void {
    this.constraints = { ...this.constraints, ...newConstraints };
  }

  /**
   * Get current constraints
   */
  public getConstraints(): CameraConstraints {
    return { ...this.constraints };
  }

  /**
   * Convert screen coordinates to world coordinates
   */
  public screenToWorld(
    screenX: number,
    screenY: number,
    cameraState: CameraState
  ): { x: number; y: number } {
    const worldX = screenX / cameraState.zoom + cameraState.scrollX;
    const worldY = screenY / cameraState.zoom + cameraState.scrollY;
    
    return { x: worldX, y: worldY };
  }

  /**
   * Convert world coordinates to screen coordinates
   */
  public worldToScreen(
    worldX: number,
    worldY: number,
    cameraState: CameraState
  ): { x: number; y: number } {
    const screenX = (worldX - cameraState.scrollX) * cameraState.zoom;
    const screenY = (worldY - cameraState.scrollY) * cameraState.zoom;
    
    return { x: screenX, y: screenY };
  }
}

/**
 * Default camera constraints that match WorldModule settings
 */
export const DEFAULT_CAMERA_CONSTRAINTS: CameraConstraints = {
  minZoom: 0.3,
  maxZoom: 3.0,
  zoomStep: 0.2,
  worldBounds: { width: 800, height: 600 }
};

/**
 * Create camera control system with default settings
 */
export function createCameraControlSystem(
  worldBounds: WorldBounds,
  overrides?: Partial<CameraControlConfig>
): CameraControlSystem {
  const constraints: CameraConstraints = {
    ...DEFAULT_CAMERA_CONSTRAINTS,
    worldBounds
  };

  const config: CameraControlConfig = {
    constraints,
    panSensitivity: 1.0,
    lerpFactor: 0.1,
    ...overrides
  };

  return new CameraControlSystem(config);
}
