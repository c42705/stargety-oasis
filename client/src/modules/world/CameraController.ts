import Phaser from 'phaser';
import { logger } from '../../shared/logger';

/**
 * CameraController - Manages camera controls and zoom
 * 
 * Responsibilities:
 * - Zoom in/out/reset methods
 * - Camera following logic
 * - Pan controls setup
 * - Scroll wheel zoom
 * - Camera centering methods
 * - Viewport adjustment
 */
export class CameraController {
  private scene: Phaser.Scene;
  
  // Zoom and camera properties
  private defaultZoom: number = 1;
  private staticMinZoom: number = 0.25; // Fallback minimum zoom
  private maxZoom: number = 2; // Max zoom is 2.0 (200%)
  private zoomStep: number = 0.25;

  // Camera panning properties
  private isPanning: boolean = false;
  private panStartX: number = 0;
  private panStartY: number = 0;
  private panStartScrollX: number = 0;
  private panStartScrollY: number = 0;
  private panSensitivity: number = 1;

  // Enhanced panning state tracking for zoom conflict resolution
  private hasManuallePanned: boolean = false;
  private panOffsetFromPlayer: { x: number; y: number } = { x: 0, y: 0 };

  // Prevent multiple simultaneous calls to setDefaultZoomAndCenter
  private isSettingDefaultZoom: boolean = false;

  // Callbacks
  private getPlayer: () => Phaser.GameObjects.Sprite | null;
  private getWorldBounds: () => { width: number; height: number };
  private calculateMinZoom: () => number;
  private spaceKey?: Phaser.Input.Keyboard.Key;

  constructor(
    scene: Phaser.Scene,
    callbacks: {
      getPlayer: () => Phaser.GameObjects.Sprite | null;
      getWorldBounds: () => { width: number; height: number };
      calculateMinZoom: () => number;
    }
  ) {
    this.scene = scene;
    this.getPlayer = callbacks.getPlayer;
    this.getWorldBounds = callbacks.getWorldBounds;
    this.calculateMinZoom = callbacks.calculateMinZoom;
  }

  /**
   * Initialize camera controls
   */
  public initialize(spaceKey: Phaser.Input.Keyboard.Key): void {
    this.spaceKey = spaceKey;
    
    // Initialize native Phaser camera following
    const player = this.getPlayer();
    if (player) {
      this.scene.cameras.main.startFollow(player, true, 0.1, 0.1);
    }

    // Set default zoom and center on player initially
    this.scene.time.delayedCall(100, () => {
      this.setDefaultZoomAndCenter();
    });

    // Set up camera panning controls
    this.setupCameraPanning();

    // Set up scroll wheel zoom controls
    this.setupScrollWheelZoom();
  }

  /**
   * Set up camera panning controls
   */
  private setupCameraPanning(): void {
    // Mouse/pointer events for panning
    this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Support both spacebar + left click and middle mouse button for panning
      if (this.spaceKey?.isDown || pointer.button === 1) {
        this.isPanning = true;
        this.panStartX = pointer.x;
        this.panStartY = pointer.y;
        this.panStartScrollX = this.scene.cameras.main.scrollX;
        this.panStartScrollY = this.scene.cameras.main.scrollY;
        
        // Disable camera following during manual panning
        this.scene.cameras.main.stopFollow();

        // Change cursor to indicate panning mode
        this.scene.game.canvas.style.cursor = 'grabbing';

        // Update React UI state to show camera follow is OFF
        if (window && window.dispatchEvent) {
          const evt = new CustomEvent('phaser-camera-follow-changed', { detail: false });
          window.dispatchEvent(evt);
        }
      }
    });

    this.scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      // Support panning with either spacebar + drag or middle mouse drag
      if (this.isPanning && (this.spaceKey?.isDown || pointer.button === 1)) {
        const deltaX = (pointer.x - this.panStartX) * this.panSensitivity;
        const deltaY = (pointer.y - this.panStartY) * this.panSensitivity;

        const newScrollX = this.panStartScrollX - deltaX;
        const newScrollY = this.panStartScrollY - deltaY;

        // Apply world bounds constraints
        const constrainedScroll = this.constrainCameraToWorldBounds(newScrollX, newScrollY);

        this.scene.cameras.main.setScroll(constrainedScroll.x, constrainedScroll.y);

        // Track that user has manually panned and calculate offset from player
        this.hasManuallePanned = true;
        this.updatePanOffsetFromPlayer();
      }
    });

    this.scene.input.on('pointerup', () => {
      if (this.isPanning) {
        this.isPanning = false;
        this.scene.game.canvas.style.cursor = 'default';

        // Update final panning offset when panning ends
        this.updatePanOffsetFromPlayer();
      }
    });

    // Handle spacebar for pan mode cursor
    this.scene.input.keyboard!.on('keydown-SPACE', () => {
      if (!this.isPanning) {
        this.scene.game.canvas.style.cursor = 'grab';
      }
    });

    this.scene.input.keyboard!.on('keyup-SPACE', () => {
      if (!this.isPanning) {
        this.scene.game.canvas.style.cursor = 'default';
      }
    });
  }

  /**
   * Set up scroll wheel zoom controls
   */
  private setupScrollWheelZoom(): void {
    const canvas = this.scene.game.canvas;
    if (!canvas) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault(); // Prevent page scrolling

      // Determine zoom direction based on wheel delta
      const zoomDirection = event.deltaY > 0 ? 'out' : 'in';
      const camera = this.scene.cameras.main;
      const currentZoom = camera.zoom;

      // Calculate new zoom level
      let newZoom: number;
      if (zoomDirection === 'in') {
        newZoom = Math.min(currentZoom + this.zoomStep, this.maxZoom);
        if (currentZoom >= this.maxZoom) {
          return; // Already at max zoom
        }
      } else {
        const dynamicMinZoom = this.calculateMinZoom();
        newZoom = Math.max(currentZoom - this.zoomStep, dynamicMinZoom);
        if (currentZoom <= dynamicMinZoom) {
          return; // Already at min zoom
        }
      }

      // Apply zoom with smooth animation
      camera.zoomTo(newZoom, 200, 'Power2');

      // Re-enable camera following and center on player (same as zoom buttons)
      this.enableCameraFollowing();
      this.centerCameraOnPlayer();
    };

    // Add event listener
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    // Store reference for cleanup
    (this.scene as any).wheelEventHandler = handleWheel;
  }

  /**
   * Constrain camera to world bounds
   */
  private constrainCameraToWorldBounds(scrollX: number, scrollY: number): { x: number, y: number } {
    const camera = this.scene.cameras.main;
    const zoom = camera.zoom;
    const viewWidth = camera.width / zoom;
    const viewHeight = camera.height / zoom;
    const worldBounds = this.getWorldBounds();

    // Calculate bounds
    const minScrollX = 0;
    const maxScrollX = Math.max(0, worldBounds.width - viewWidth);
    const minScrollY = 0;
    const maxScrollY = Math.max(0, worldBounds.height - viewHeight);

    return {
      x: Phaser.Math.Clamp(scrollX, minScrollX, maxScrollX),
      y: Phaser.Math.Clamp(scrollY, minScrollY, maxScrollY)
    };
  }

  /**
   * Update the panning offset from player position
   */
  private updatePanOffsetFromPlayer(): void {
    const player = this.getPlayer();
    if (!player) return;

    const camera = this.scene.cameras.main;
    const scale = this.scene.scale;
    const gameSize = scale.gameSize;

    // Calculate current viewport center
    const viewportWidth = gameSize.width / camera.zoom;
    const viewportHeight = gameSize.height / camera.zoom;
    const viewportCenterX = camera.scrollX + viewportWidth / 2;
    const viewportCenterY = camera.scrollY + viewportHeight / 2;

    // Calculate offset from player
    this.panOffsetFromPlayer = {
      x: viewportCenterX - player.x,
      y: viewportCenterY - player.y
    };
  }

  /**
   * Reset manual panning state and center on player
   */
  public resetPanningState(): void {
    this.hasManuallePanned = false;
    this.panOffsetFromPlayer = { x: 0, y: 0 };

    // Re-enable camera following
    const player = this.getPlayer();
    if (player) {
      this.scene.cameras.main.startFollow(player, true, 0.1, 0.1);
    }
  }

  /**
   * Enable camera following
   */
  public enableCameraFollowing(): void {
    const player = this.getPlayer();
    if (player) {
      this.scene.cameras.main.startFollow(player, true, 0.1, 0.1);
    }
  }

  /**
   * Disable camera following
   */
  public disableCameraFollowing(): void {
    this.scene.cameras.main.stopFollow();
  }

  /**
   * Check if camera is following player
   */
  public isCameraFollowingPlayer(): boolean {
    return (this.scene.cameras.main as any)._follow !== null;
  }

  /**
   * Center camera on player
   */
  public centerCameraOnPlayer(): void {
    const player = this.getPlayer();
    if (!player) {
      logger.warn('CAMERA CENTERING: No player found');
      return;
    }

    const camera = this.scene.cameras.main;

    // Simplified centering with native Phaser camera
    if (this.hasManuallePanned) {
      // Preserve manual panning offset during zoom operations
      const scale = this.scene.scale;
      const gameSize = scale.gameSize;
      const viewportWidth = gameSize.width / camera.zoom;
      const viewportHeight = gameSize.height / camera.zoom;

      const targetCenterX = player.x + this.panOffsetFromPlayer.x;
      const targetCenterY = player.y + this.panOffsetFromPlayer.y;
      const targetScrollX = targetCenterX - viewportWidth / 2;
      const targetScrollY = targetCenterY - viewportHeight / 2;

      const constrainedScroll = this.constrainCameraToWorldBounds(targetScrollX, targetScrollY);
      camera.setScroll(constrainedScroll.x, constrainedScroll.y);
    } else {
      // Standard centering - native Phaser handles this
      camera.centerOn(player.x, player.y);
      this.updatePanOffsetFromPlayer();
    }
  }

  /**
   * Zoom in
   */
  public zoomIn(): void {
    const camera = this.scene.cameras.main;
    const currentZoom = camera.zoom;
    const newZoom = Math.min(currentZoom + this.zoomStep, this.maxZoom);

    if (currentZoom >= this.maxZoom) {
      return;
    }

    // Use Phaser's native camera zoom animation
    camera.zoomTo(newZoom, 400, 'Power2');
  }

  /**
   * Zoom out
   */
  public zoomOut(): void {
    const camera = this.scene.cameras.main;
    const currentZoom = camera.zoom;
    const dynamicMinZoom = this.calculateMinZoom();
    const newZoom = Math.max(currentZoom - this.zoomStep, dynamicMinZoom);

    if (currentZoom <= dynamicMinZoom) {
      return;
    }

    // Use Phaser's native camera zoom animation
    camera.zoomTo(newZoom, 400, 'Power2');
  }

  /**
   * Reset zoom to default
   */
  public resetZoom(): void {
    this.setDefaultZoomAndCenter();
  }

  /**
   * Check if can zoom in
   */
  public canZoomIn(): boolean {
    const currentZoom = this.scene.cameras.main.zoom;
    return currentZoom < this.maxZoom;
  }

  /**
   * Check if can zoom out
   */
  public canZoomOut(): boolean {
    const currentZoom = this.scene.cameras.main.zoom;
    const dynamicMinZoom = this.calculateMinZoom();
    return currentZoom > dynamicMinZoom;
  }

  /**
   * Set default zoom level and center camera on player
   */
  public setDefaultZoomAndCenter(): void {
    // Prevent multiple simultaneous calls
    if (this.isSettingDefaultZoom) {
      return;
    }

    this.isSettingDefaultZoom = true;
    const camera = this.scene.cameras.main;

    // Use Phaser's native camera zoom
    camera.zoomTo(this.defaultZoom, 300, 'Power2', false, () => {
      this.isSettingDefaultZoom = false;
    });

    // Reset the flag after animation completes
    this.scene.time.delayedCall(400, () => {
      this.isSettingDefaultZoom = false;
    });
  }

  /**
   * Adjust viewport to new container size while preserving zoom level
   */
  public adjustViewportWithoutZoomReset(): void {
    const camera = this.scene.cameras.main;
    const gameWidth = this.scene.scale.gameSize.width;
    const gameHeight = this.scene.scale.gameSize.height;

    if (gameWidth === 0 || gameHeight === 0) {
      return;
    }

    const worldBounds = this.getWorldBounds();

    // Update camera bounds to match the new viewport size
    camera.setBounds(0, 0, worldBounds.width, worldBounds.height);

    // Re-center camera on player to maintain player centering with preserved zoom
    const player = this.getPlayer();
    if (player) {
      this.centerCameraOnPlayer();
    } else {
      const centerX = worldBounds.width / 2;
      const centerY = worldBounds.height / 2;
      camera.centerOn(centerX, centerY);
    }
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    // Clean up scroll wheel event listener
    const canvas = this.scene.game.canvas;
    const wheelHandler = (this.scene as any).wheelEventHandler;
    if (canvas && wheelHandler) {
      canvas.removeEventListener('wheel', wheelHandler);
    }
  }
}

