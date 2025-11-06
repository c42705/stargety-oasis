import Phaser from 'phaser';
import { SharedMapSystem } from '../../shared/SharedMapSystem';

/**
 * DebugDiagnostics - Debug and diagnostic methods for the game
 * 
 * Most methods are disabled for performance but kept for debugging purposes
 * 
 * Responsibilities:
 * - Test methods
 * - Debug data collection
 * - Diagnostic analysis
 * - Validation methods
 */
export class DebugDiagnostics {
  private scene: Phaser.Scene;
  private sharedMapSystem: SharedMapSystem;
  
  // Callbacks
  private getPlayer: () => Phaser.GameObjects.Sprite | null;
  private getWorldBounds: () => { width: number; height: number };

  constructor(
    scene: Phaser.Scene,
    callbacks: {
      getPlayer: () => Phaser.GameObjects.Sprite | null;
      getWorldBounds: () => { width: number; height: number };
    }
  ) {
    this.scene = scene;
    this.getPlayer = callbacks.getPlayer;
    this.getWorldBounds = callbacks.getWorldBounds;
    this.sharedMapSystem = SharedMapSystem.getInstance();
  }

  /**
   * Collect enhanced debug data
   */
  public collectEnhancedDebugData(): any {
    const camera = this.scene.cameras.main;
    const scale = this.scene.scale;
    const gameSize = scale.gameSize;
    const displaySize = scale.displaySize;
    const canvas = scale.canvas;
    const player = this.getPlayer();
    const worldBounds = this.getWorldBounds();

    // Performance timing data
    const performanceData = {
      timestamp: new Date().toISOString(),
      frameRate: this.scene.game.loop.actualFps,
      targetFrameRate: this.scene.game.loop.targetFps,
      renderTime: this.scene.game.loop.delta,
      updateTime: this.scene.time.now
    };

    // Container and DOM information
    const containerData = {
      gameContainer: {
        exists: !!this.scene.game.canvas?.parentElement,
        dimensions: this.scene.game.canvas?.parentElement ? {
          width: this.scene.game.canvas.parentElement.clientWidth,
          height: this.scene.game.canvas.parentElement.clientHeight,
          offsetWidth: this.scene.game.canvas.parentElement.offsetWidth,
          offsetHeight: this.scene.game.canvas.parentElement.offsetHeight
        } : null,
        boundingRect: this.scene.game.canvas?.parentElement?.getBoundingClientRect() || null
      },
      canvas: {
        exists: !!canvas,
        dimensions: canvas ? {
          width: canvas.width,
          height: canvas.height,
          clientWidth: canvas.clientWidth,
          clientHeight: canvas.clientHeight,
          offsetWidth: canvas.offsetWidth,
          offsetHeight: canvas.offsetHeight
        } : null,
        style: canvas ? {
          width: canvas.style.width,
          height: canvas.style.height,
          position: canvas.style.position,
          display: canvas.style.display
        } : null
      }
    };

    // State validation
    const stateValidation = {
      dimensionConsistency: camera.width === gameSize.width && camera.height === gameSize.height,
      boundaryAlignment: worldBounds.width > 0 && worldBounds.height > 0,
      objectPositioning: !!player &&
        player.x >= 0 && player.x <= worldBounds.width &&
        player.y >= 0 && player.y <= worldBounds.height,
      scaleManagerSync: scale.scaleMode === Phaser.Scale.RESIZE && scale.autoCenter === Phaser.Scale.CENTER_BOTH
    };

    return {
      timestamp: performanceData.timestamp,
      performance: performanceData,
      container: containerData,
      validation: stateValidation,
      scaleManager: {
        mode: scale.scaleMode,
        autoCenter: scale.autoCenter,
        gameSize: { width: gameSize.width, height: gameSize.height },
        displaySize: { width: displaySize.width, height: displaySize.height },
        baseSize: { width: scale.baseSize.width, height: scale.baseSize.height },
        parentSize: { width: scale.parentSize.width, height: scale.parentSize.height },
        zoom: scale.zoom
      },
      camera: {
        bounds: camera.getBounds(),
        scroll: { x: camera.scrollX, y: camera.scrollY },
        zoom: camera.zoom,
        size: { width: camera.width, height: camera.height },
        viewport: {
          worldWidth: camera.width / camera.zoom,
          worldHeight: camera.height / camera.zoom
        }
      },
      worldBounds: { ...worldBounds },
      player: player ? {
        position: { x: player.x, y: player.y },
        size: { width: player.displayWidth, height: player.displayHeight },
        visible: player.visible,
        active: player.active
      } : null,
      overallHealth: {
        critical: !stateValidation.dimensionConsistency,
        warnings: !stateValidation.boundaryAlignment || !stateValidation.objectPositioning,
        optimal: Object.values(stateValidation).every(v => v === true)
      }
    };
  }

  /**
   * Validate object positioning
   */
  public validateObjectPositioning(): any {
    const camera = this.scene.cameras.main;
    const mapData = this.sharedMapSystem.getMapData();
    const player = this.getPlayer();
    const worldBounds = this.getWorldBounds();

    const gameObjects: any[] = [];

    // Player object
    if (player) {
      gameObjects.push({
        type: 'player',
        name: 'Player Character',
        x: player.x,
        y: player.y,
        width: player.width || 32,
        height: player.height || 32,
        bounds: {
          left: player.x - (player.width || 32) / 2,
          right: player.x + (player.width || 32) / 2,
          top: player.y - (player.height || 32) / 2,
          bottom: player.y + (player.height || 32) / 2
        },
        visible: player.visible,
        active: player.active
      });
    }

    // Interactive areas from map data
    if (mapData?.interactiveAreas) {
      mapData.interactiveAreas.forEach(area => {
        gameObjects.push({
          type: 'interactive_area',
          name: area.name,
          id: area.id,
          x: area.x + area.width / 2,
          y: area.y + area.height / 2,
          width: area.width,
          height: area.height,
          bounds: {
            left: area.x,
            right: area.x + area.width,
            top: area.y,
            bottom: area.y + area.height
          },
          areaType: area.type,
          color: area.color
        });
      });
    }

    // Collision areas from map data
    if (mapData?.impassableAreas) {
      mapData.impassableAreas.forEach(area => {
        gameObjects.push({
          type: 'collision_area',
          name: area.name,
          id: area.id,
          x: area.x + area.width / 2,
          y: area.y + area.height / 2,
          width: area.width,
          height: area.height,
          bounds: {
            left: area.x,
            right: area.x + area.width,
            top: area.y,
            bottom: area.y + area.height
          }
        });
      });
    }

    const worldBoundsObj = {
      left: 0,
      right: worldBounds.width,
      top: 0,
      bottom: worldBounds.height
    };

    return {
      timestamp: new Date().toISOString(),
      worldBounds: { ...worldBounds },
      camera: {
        bounds: camera.getBounds(),
        viewport: {
          left: camera.scrollX,
          right: camera.scrollX + camera.width,
          top: camera.scrollY,
          bottom: camera.scrollY + camera.height
        },
        zoom: camera.zoom
      },
      totalObjects: gameObjects.length,
      objectsByType: {
        player: gameObjects.filter(obj => obj.type === 'player').length,
        interactive_areas: gameObjects.filter(obj => obj.type === 'interactive_area').length,
        collision_areas: gameObjects.filter(obj => obj.type === 'collision_area').length
      },
      positioningIssues: {
        outsideWorldBounds: gameObjects.filter(obj =>
          obj.bounds.left < worldBoundsObj.left ||
          obj.bounds.right > worldBoundsObj.right ||
          obj.bounds.top < worldBoundsObj.top ||
          obj.bounds.bottom > worldBoundsObj.bottom
        ),
        partiallyOutside: gameObjects.filter(obj =>
          (obj.bounds.left < worldBoundsObj.left && obj.bounds.right > worldBoundsObj.left) ||
          (obj.bounds.right > worldBoundsObj.right && obj.bounds.left < worldBoundsObj.right) ||
          (obj.bounds.top < worldBoundsObj.top && obj.bounds.bottom > worldBoundsObj.top) ||
          (obj.bounds.bottom > worldBoundsObj.bottom && obj.bounds.top < worldBoundsObj.bottom)
        ),
        atWorldEdges: gameObjects.filter(obj =>
          obj.bounds.left <= 5 || obj.bounds.right >= worldBoundsObj.right - 5 ||
          obj.bounds.top <= 5 || obj.bounds.bottom >= worldBoundsObj.bottom - 5
        )
      },
      allObjects: gameObjects
    };
  }

  /**
   * Test character centering
   */
  public testCharacterCentering(): any {
    const camera = this.scene.cameras.main;
    const scale = this.scene.scale;
    const gameSize = scale.gameSize;
    const player = this.getPlayer();

    if (!player) {
      return { error: 'No player found' };
    }

    const test = {
      timestamp: new Date().toISOString(),
      playerWorldPosition: {
        x: player.x,
        y: player.y
      },
      centeringAccuracy: {
        expectedPlayerAtCenter: {
          x: camera.scrollX + (gameSize.width / camera.zoom) / 2,
          y: camera.scrollY + (gameSize.height / camera.zoom) / 2
        },
        actualPlayerPosition: {
          x: player.x,
          y: player.y
        },
        offset: { x: 0, y: 0 },
        offsetMagnitude: 0,
        isAccurate: false
      },
      recommendations: [] as string[]
    };

    // Calculate centering accuracy
    const expectedCenterX = camera.scrollX + (gameSize.width / camera.zoom) / 2;
    const expectedCenterY = camera.scrollY + (gameSize.height / camera.zoom) / 2;

    test.centeringAccuracy.offset.x = player.x - expectedCenterX;
    test.centeringAccuracy.offset.y = player.y - expectedCenterY;
    test.centeringAccuracy.offsetMagnitude = Math.sqrt(
      test.centeringAccuracy.offset.x ** 2 + test.centeringAccuracy.offset.y ** 2
    );
    test.centeringAccuracy.isAccurate = test.centeringAccuracy.offsetMagnitude < 5;

    if (!test.centeringAccuracy.isAccurate) {
      test.recommendations.push(`Player is ${test.centeringAccuracy.offsetMagnitude.toFixed(1)} pixels off center`);
    } else {
      test.recommendations.push('Character centering appears accurate');
    }

    return test;
  }

  /**
   * Disabled debug methods (kept for reference)
   */
  public runAutomatedTestSuite(): any {
    return { message: 'Debug test suite disabled for performance' };
  }

  public validateDebugOverlayCoordinates(): any {
    return { status: 'disabled' };
  }

  public testViewportBoundsAccuracy(): any {
    return { status: 'disabled' };
  }

  public getDebugLoggingStatus(): any {
    return { status: 'disabled' };
  }
}

