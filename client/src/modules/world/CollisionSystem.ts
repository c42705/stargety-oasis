import Phaser from 'phaser';
import { SharedMapSystem } from '../../shared/SharedMapSystem';
import { logger } from '../../shared/logger';

/**
 * CollisionSystem - Handles all collision detection for the game world
 * 
 * Responsibilities:
 * - Polygon collision detection
 * - Point-in-polygon checks
 * - Impassable area collision detection
 * - Interactive area collision detection
 * - Area entry/exit event handling
 */
export class CollisionSystem {
  private scene: Phaser.Scene;
  private sharedMapSystem: SharedMapSystem;
  private eventBus: any;
  private onAreaClick: (areaId: string) => void;
  
  // Area tracking
  private currentArea: string | null = null;
  private previousArea: string | null = null;

  constructor(
    scene: Phaser.Scene,
    eventBus: any,
    onAreaClick: (areaId: string) => void
  ) {
    this.scene = scene;
    this.eventBus = eventBus;
    this.onAreaClick = onAreaClick;
    this.sharedMapSystem = SharedMapSystem.getInstance();
  }

  /**
   * Check if a point is inside a polygon using ray casting algorithm
   */
  private isPointInPolygon(point: { x: number; y: number }, polygon: { x: number; y: number }[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].x;
      const yi = polygon[i].y;
      const xj = polygon[j].x;
      const yj = polygon[j].y;

      const intersect = ((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /**
   * Check if player bounding box collides with a polygon
   * Uses two-phase detection: quick AABB check first, then precise polygon check
   */
  private checkPolygonCollision(
    polygon: { x: number; y: number }[],
    playerLeft: number,
    playerRight: number,
    playerTop: number,
    playerBottom: number
  ): boolean {
    // Check if any corner of the player bounding box is inside the polygon
    const corners = [
      { x: playerLeft, y: playerTop },
      { x: playerRight, y: playerTop },
      { x: playerLeft, y: playerBottom },
      { x: playerRight, y: playerBottom }
    ];

    for (const corner of corners) {
      if (this.isPointInPolygon(corner, polygon)) {
        return true;
      }
    }

    // Also check if player center is inside polygon
    const centerX = (playerLeft + playerRight) / 2;
    const centerY = (playerTop + playerBottom) / 2;
    if (this.isPointInPolygon({ x: centerX, y: centerY }, polygon)) {
      return true;
    }

    return false;
  }

  /**
   * Check if player position would collide with any impassable areas
   * Checks BOTH legacy impassableAreas AND interactiveAreas with actionType: 'impassable'
   */
  public checkCollisionWithImpassableAreas(x: number, y: number, playerSize: number): boolean {
    const mapData = this.sharedMapSystem.getMapData();
    if (!mapData) {
      logger.warn('[Collision] NO MAP DATA available for collision check!');
      return false;
    }

    // Player bounding box (centered on player position)
    const playerLeft = x - playerSize / 2;
    const playerRight = x + playerSize / 2;
    const playerTop = y - playerSize / 2;
    const playerBottom = y + playerSize / 2;

    // Get InteractiveAreas with actionType: 'impassable' (new unified approach)
    const impassableInteractiveAreas = (mapData.interactiveAreas || []).filter(
      area => area.actionType === 'impassable'
    );

    // Combine with legacy impassableAreas for backward compatibility
    const legacyImpassableAreas = mapData.impassableAreas || [];
    const totalImpassableCount = impassableInteractiveAreas.length + legacyImpassableAreas.length;

    if (totalImpassableCount === 0) {
      return false; // No collision areas defined
    }

    // Debug logging (5% sample rate)
    if (Math.random() < 0.05) {
      logger.debug('[Collision] Checking impassable areas:', {
        interactiveImpassable: impassableInteractiveAreas.length,
        legacyImpassable: legacyImpassableAreas.length,
        playerPos: { x, y },
      });
    }

    // Check collision with InteractiveAreas that have actionType: 'impassable'
    for (const area of impassableInteractiveAreas) {
      if (area.shapeType === 'polygon' && area.points && area.points.length > 0) {
        // Polygon collision check
        const areaLeft = area.x;
        const areaRight = area.x + area.width;
        const areaTop = area.y;
        const areaBottom = area.y + area.height;

        if (playerLeft < areaRight && playerRight > areaLeft &&
            playerTop < areaBottom && playerBottom > areaTop) {
          if (this.checkPolygonCollision(area.points, playerLeft, playerRight, playerTop, playerBottom)) {
            logger.debug('[Collision] POLYGON (interactive) collision detected!', { areaId: area.id });
            return true;
          }
        }
      } else {
        // Rectangle collision check
        const areaLeft = area.x;
        const areaRight = area.x + area.width;
        const areaTop = area.y;
        const areaBottom = area.y + area.height;

        if (playerLeft < areaRight && playerRight > areaLeft &&
            playerTop < areaBottom && playerBottom > areaTop) {
          logger.debug('[Collision] RECTANGLE (interactive) collision detected!', { areaId: area.id });
          return true;
        }
      }
    }

    // Check collision with legacy impassableAreas (backward compatibility)
    for (const area of legacyImpassableAreas) {
      if (area.type === 'polygon' && area.points && area.points.length > 0) {
        const areaLeft = area.x;
        const areaRight = area.x + area.width;
        const areaTop = area.y;
        const areaBottom = area.y + area.height;

        if (playerLeft < areaRight && playerRight > areaLeft &&
            playerTop < areaBottom && playerBottom > areaTop) {
          if (this.checkPolygonCollision(area.points, playerLeft, playerRight, playerTop, playerBottom)) {
            logger.debug('[Collision] POLYGON (legacy) collision detected!', { areaId: area.id });
            return true;
          }
        }
      } else {
        const areaLeft = area.x;
        const areaRight = area.x + area.width;
        const areaTop = area.y;
        const areaBottom = area.y + area.height;

        if (playerLeft < areaRight && playerRight > areaLeft &&
            playerTop < areaBottom && playerBottom > areaTop) {
          logger.debug('[Collision] RECTANGLE (legacy) collision detected!', { areaId: area.id });
          return true;
        }
      }
    }

    return false; // No collision
  }

  /**
   * Check for collisions with interactive areas and emit events
   */
  public checkAreaCollisions(player: Phaser.GameObjects.Sprite | Phaser.GameObjects.Container): void {
    // Only check collisions if player exists
    if (!player) {
      return;
    }

    // Get areas from SharedMapSystem (localStorage) instead of hardcoded data
    const mapData = this.sharedMapSystem.getMapData();

    if (!mapData) {
      return; // No map data available
    }

    const areas = mapData.interactiveAreas;
    let currentlyInArea: string | null = null;

    // Find which area player is currently in
    areas.forEach(area => {
      // Check if player is within area bounds
      if (player.x >= area.x &&
          player.x <= area.x + area.width &&
          player.y >= area.y &&
          player.y <= area.y + area.height) {
        currentlyInArea = area.id;
      }
    });

    // Detect area changes and emit events for Jitsi auto-join/leave
    if (currentlyInArea !== this.previousArea) {
      // Import shouldBlockBackgroundInteractions here to avoid circular dependency
      const { shouldBlockBackgroundInteractions } = require('../../shared/ModalStateManager');
      
      // Exited previous area
      if (this.previousArea && !shouldBlockBackgroundInteractions()) {
        const previousAreaData = areas.find(a => a.id === this.previousArea);
        if (previousAreaData) {
          this.eventBus.publish('area-exited', {
            areaId: previousAreaData.id,
            areaName: previousAreaData.name
          });
        }
      }

      // Entered new area
      if (currentlyInArea && !shouldBlockBackgroundInteractions()) {
        const currentAreaData = areas.find(a => a.id === currentlyInArea);
        if (currentAreaData) {
          this.eventBus.publish('area-entered', {
            areaId: currentAreaData.id,
            areaName: currentAreaData.name,
            roomId: currentAreaData.id // Use area ID as default room ID
          });

          // Also trigger the legacy area click handler for backward compatibility
          this.onAreaClick(currentAreaData.id);
        }
      }

      this.previousArea = currentlyInArea;
    }

    this.currentArea = currentlyInArea;
  }

  /**
   * Get current area player is in
   */
  public getCurrentArea(): string | null {
    return this.currentArea;
  }

  /**
   * Get previous area player was in
   */
  public getPreviousArea(): string | null {
    return this.previousArea;
  }

  /**
   * Reset area tracking
   */
  public resetAreaTracking(): void {
    this.currentArea = null;
    this.previousArea = null;
  }
}

