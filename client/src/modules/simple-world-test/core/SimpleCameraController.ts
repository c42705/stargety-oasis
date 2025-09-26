/**
 * Simple Camera Controller
 *
 * Handles camera following, zoom functionality, and world boundaries
 * using Phaser's native camera methods for optimal performance.
 */

interface CameraConfig {
  minZoom: number;
  maxZoom: number;
  zoomDuration: number;
  worldBounds: { width: number; height: number };
}

export class SimpleCameraController {
  private camera: Phaser.Cameras.Scene2D.Camera;
  private config: CameraConfig;
  private target: Phaser.GameObjects.Sprite | null = null;
  private isZooming: boolean = false;

  constructor(camera: Phaser.Cameras.Scene2D.Camera, config: CameraConfig) {
    this.camera = camera;
    this.config = config;

    // Set camera world bounds using Phaser's native method
    this.setBounds(0, 0, config.worldBounds.width, config.worldBounds.height);

    console.log('📷 SimpleCameraController initialized with native Phaser methods');
  }

  /**
   * Set camera world bounds using Phaser's native method
   */
  setBounds(x: number, y: number, width: number, height: number): void {
    this.camera.setBounds(x, y, width, height);
    console.log('📷 Camera bounds set:', { x, y, width, height });
  }

  /**
   * Set the target for camera to follow
   */
  setTarget(target: Phaser.GameObjects.Sprite): void {
    this.target = target;
    console.log('📷 Camera target set');
  }

  /**
   * Start following the target using Phaser's native method
   */
  startFollowing(): void {
    if (!this.target) {
      console.warn('⚠️ Cannot start following: no target set');
      return;
    }

    // Use Phaser's native startFollow method for smooth following
    this.camera.startFollow(this.target, true, 0.1, 0.1);
    console.log('📷 Camera following started with native Phaser method');
  }

  /**
   * Stop following the target using Phaser's native method
   */
  stopFollowing(): void {
    this.camera.stopFollow();
    console.log('📷 Camera following stopped');
  }

  /**
   * Center camera on target immediately (rarely needed with native following)
   */
  centerOnTarget(): void {
    if (!this.target) return;
    this.camera.centerOn(this.target.x, this.target.y);
  }

  /**
   * Update camera (minimal logic since Phaser handles following natively)
   */
  update(_delta: number): void {
    // Phaser's native camera following handles all movement automatically
    // This method only exists for zoom state management compatibility
  }

  /**
   * Zoom in
   */
  zoomIn(): void {
    if (this.isZooming) return;

    const currentZoom = this.camera.zoom;
    const newZoom = Math.min(currentZoom * 1.2, this.config.maxZoom);
    
    if (newZoom !== currentZoom) {
      this.smoothZoomTo(newZoom);
    }
  }

  /**
   * Zoom out
   */
  zoomOut(): void {
    if (this.isZooming) return;

    const currentZoom = this.camera.zoom;
    const newZoom = Math.max(currentZoom / 1.2, this.config.minZoom);
    
    if (newZoom !== currentZoom) {
      this.smoothZoomTo(newZoom);
    }
  }

  /**
   * Check if can zoom in
   */
  canZoomIn(): boolean {
    return !this.isZooming && this.camera.zoom < this.config.maxZoom;
  }

  /**
   * Check if can zoom out
   */
  canZoomOut(): boolean {
    return !this.isZooming && this.camera.zoom > this.config.minZoom;
  }

  /**
   * Get current zoom as percentage
   */
  getZoomPercentage(): number {
    return Math.round(this.camera.zoom * 100);
  }

  /**
   * Smooth zoom to target level using Phaser's native method
   */
  private smoothZoomTo(targetZoom: number): void {
    if (this.isZooming) return;

    this.isZooming = true;
    const constrainedZoom = Phaser.Math.Clamp(targetZoom, this.config.minZoom, this.config.maxZoom);

    // Use Phaser's native camera zoom with smooth animation
    this.camera.zoomTo(constrainedZoom, this.config.zoomDuration, 'Power2', false, (_, progress) => {
      if (progress === 1) {
        this.isZooming = false;
        console.log('📷 Zoom completed to:', constrainedZoom);
      }
    });

    console.log('📷 Zooming to:', constrainedZoom, 'from:', this.camera.zoom);
  }

  /**
   * Set zoom level directly using Phaser's native method
   */
  setZoom(zoom: number): void {
    const constrainedZoom = Phaser.Math.Clamp(zoom, this.config.minZoom, this.config.maxZoom);
    this.camera.setZoom(constrainedZoom);
    console.log('📷 Zoom set to:', constrainedZoom);
  }

  /**
   * Pan camera to specific position
   */
  panTo(x: number, y: number, duration: number = 500): void {
    this.camera.pan(x, y, duration, 'Power2');
  }

  /**
   * Get camera bounds
   */
  getBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.camera.scrollX,
      y: this.camera.scrollY,
      width: this.camera.width,
      height: this.camera.height
    };
  }

  /**
   * Check if point is visible in camera
   */
  isPointVisible(x: number, y: number): boolean {
    const bounds = this.getBounds();
    return x >= bounds.x && x <= bounds.x + bounds.width &&
           y >= bounds.y && y <= bounds.y + bounds.height;
  }

  /**
   * Get world point from screen coordinates
   */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    const worldPoint = this.camera.getWorldPoint(screenX, screenY);
    return { x: worldPoint.x, y: worldPoint.y };
  }

  /**
   * Update world bounds and camera bounds
   */
  updateWorldBounds(width: number, height: number): void {
    this.config.worldBounds = { width, height };
    this.setBounds(0, 0, width, height);
    console.log('📷 Camera world bounds updated:', { width, height });
  }

  /**
   * Reset camera to default state
   */
  reset(): void {
    this.camera.setZoom(1);
    this.camera.centerOn(this.config.worldBounds.width / 2, this.config.worldBounds.height / 2);
    this.isZooming = false;
    console.log('📷 Camera reset to default state');
  }
}
