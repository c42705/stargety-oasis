/**
 * CollisionSystem Test Suite
 *
 * Comprehensive tests for the CollisionSystem component, focusing on:
 * - Polygon area detection
 * - Rectangle area detection
 * - Area entry/exit event handling
 * - Performance optimization
 */

import { CollisionSystem } from '../CollisionSystem';
import { logger } from '../../shared/logger';

// Mock dependencies
jest.mock('../../shared/logger');

// Mock logger
const mockLogger = logger as jest.Mocked<typeof logger>;

// Mock Phaser
jest.mock('phaser', () => ({
  Scene: jest.fn(() => ({
    sys: {
      events: {
        once: jest.fn(),
        on: jest.fn(),
        off: jest.fn(),
      },
      game: {
        events: {
          once: jest.fn(),
          on: jest.fn(),
          off: jest.fn(),
        }
      }
    },
    scene: {
      key: 'GameScene'
    },
    add: {
      graphics: jest.fn(() => ({
        fillStyle: jest.fn().mockReturnThis(),
        fillCircle: jest.fn().mockReturnThis(),
        lineStyle: jest.fn().mockReturnThis(),
        strokeCircle: jest.fn().mockReturnThis(),
        generateTexture: jest.fn(),
        destroy: jest.fn(),
      })),
      sprite: jest.fn(() => ({
        setOrigin: jest.fn().mockReturnThis(),
        setDepth: jest.fn().mockReturnThis(),
        setVisible: jest.fn().mockReturnThis(),
        setActive: jest.fn().mockReturnThis(),
        play: jest.fn(),
        x: 0,
        y: 0,
      })),
    },
    events: {
      on: jest.fn(),
    },
    input: {
      on: jest.fn()
    },
    scale: {
      on: jest.fn()
    },
    cameras: {
      main: {
        setBackgroundColor: jest.fn()
      }
    }
  })),
  GameObjects: {
    Sprite: jest.fn(),
    Text: jest.fn(),
  },
  Math: {
    Clamp: jest.fn((value) => value),
    Distance: {
      Between: jest.fn(() => 0)
    }
  },
  Display: {
    Color: {
      HSLToColor: jest.fn(() => ({ color: 0xffffff }))
    }
  }
}));

describe('CollisionSystem', () => {
  let collisionSystem: CollisionSystem;
  let mockEventBus: any;
  let mockMapData: any;
  let mockPlayer: any;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    mockLogger.info.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.debug.mockClear();

    // Mock event bus
    mockEventBus = {
      publish: jest.fn(),
    };

    // Mock map data
    mockMapData = {
      interactiveAreas: [],
      impassableAreas: [],
      worldDimensions: { width: 800, height: 600 },
      backgroundImage: '',
      backgroundImageDimensions: { width: 800, height: 600 }
    };

    // Mock player sprite
    mockPlayer = {
      x: 0,
      y: 0,
    };

    // Create collision system
    collisionSystem = new CollisionSystem(
      {} as any, // Mock scene
      mockEventBus,
      jest.fn(),
      () => mockMapData
    );
  });

  describe('Polygon Area Detection', () => {
    it('should detect point inside simple polygon', () => {
      const polygon = [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 200, y: 200 },
        { x: 100, y: 200 }
      ];

      const result = collisionSystem['isPointInPolygon']({ x: 150, y: 150 }, polygon);
      expect(result).toBe(true);
    });

    it('should detect point outside simple polygon', () => {
      const polygon = [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 200, y: 200 },
        { x: 100, y: 200 }
      ];

      const result = collisionSystem['isPointInPolygon']({ x: 50, y: 50 }, polygon);
      expect(result).toBe(false);
    });

    it('should detect point on polygon edge', () => {
      const polygon = [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 200, y: 200 },
        { x: 100, y: 200 }
      ];

      const result = collisionSystem['isPointInPolygon']({ x: 100, y: 150 }, polygon);
      expect(result).toBe(true);
    });

    it('should handle complex polygon shapes', () => {
      const polygon = [
        { x: 100, y: 100 },
        { x: 150, y: 50 },
        { x: 200, y: 100 },
        { x: 250, y: 150 },
        { x: 200, y: 200 },
        { x: 150, y: 250 },
        { x: 100, y: 200 }
      ];

      // Test point inside
      const insideResult = collisionSystem['isPointInPolygon']({ x: 150, y: 150 }, polygon);
      expect(insideResult).toBe(true);

      // Test point outside
      const outsideResult = collisionSystem['isPointInPolygon']({ x: 50, y: 50 }, polygon);
      expect(outsideResult).toBe(false);
    });

    it('should handle polygon with holes', () => {
      // Create a polygon with a hole (L-shape)
      const polygon = [
        { x: 100, y: 100 },
        { x: 300, y: 100 },
        { x: 300, y: 300 },
        { x: 100, y: 300 },
        { x: 100, y: 200 },
        { x: 200, y: 200 },
        { x: 200, y: 100 }
      ];

      // Test point in the hole (should be outside)
      const holeResult = collisionSystem['isPointInPolygon']({ x: 150, y: 150 }, polygon);
      expect(holeResult).toBe(false);

      // Test point in the main area (should be inside)
      const mainAreaResult = collisionSystem['isPointInPolygon']({ x: 250, y: 250 }, polygon);
      expect(mainAreaResult).toBe(true);
    });

    it('should handle degenerate polygon', () => {
      const polygon = [
        { x: 100, y: 100 },
        { x: 100, y: 100 },
        { x: 100, y: 100 }
      ];

      const result = collisionSystem['isPointInPolygon']({ x: 100, y: 100 }, polygon);
      expect(result).toBe(false); // Degenerate polygon should not contain points
    });

    it('should handle empty polygon', () => {
      const polygon: any[] = [];

      const result = collisionSystem['isPointInPolygon']({ x: 100, y: 100 }, polygon);
      expect(result).toBe(false);
    });
  });

  describe('Polygon Collision Detection', () => {
    it('should detect player collision with polygon', () => {
      const polygon = [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 200, y: 200 },
        { x: 100, y: 200 }
      ];

      const result = collisionSystem['checkPolygonCollision'](
        polygon,
        140, // playerLeft
        160, // playerRight
        140, // playerTop
        160  // playerBottom
      );
      expect(result).toBe(true);
    });

    it('should detect player outside polygon', () => {
      const polygon = [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 200, y: 200 },
        { x: 100, y: 200 }
      ];

      const result = collisionSystem['checkPolygonCollision'](
        polygon,
        50, // playerLeft
        70, // playerRight
        50, // playerTop
        70  // playerBottom
      );
      expect(result).toBe(false);
    });

    it('should handle player partially overlapping polygon', () => {
      const polygon = [
        { x: 100, y: 100 },
        { x: 200, y: 100 },
        { x: 200, y: 200 },
        { x: 100, y: 200 }
      ];

      // Player overlaps left edge of polygon
      const result = collisionSystem['checkPolygonCollision'](
        polygon,
        90, // playerLeft
        110, // playerRight
        150, // playerTop
        170  // playerBottom
      );
      expect(result).toBe(true);
    });
  });

  describe('Area Collision Detection', () => {
    beforeEach(() => {
      // Add test areas
      mockMapData.interactiveAreas = [
        {
          id: 'polygon-area',
          name: 'Polygon Area',
          x: 100,
          y: 100,
          width: 100,
          height: 100,
          actionType: 'jitsi',
          actionConfig: { autoJoinOnEntry: true },
          shapeType: 'polygon',
          points: [
            { x: 100, y: 100 },
            { x: 200, y: 100 },
            { x: 200, y: 200 },
            { x: 100, y: 200 }
          ]
        },
        {
          id: 'rectangle-area',
          name: 'Rectangle Area',
          x: 300,
          y: 300,
          width: 100,
          height: 100,
          actionType: 'jitsi',
          actionConfig: { autoJoinOnEntry: true },
          shapeType: 'rectangle'
        }
      ];
    });

    it('should detect polygon area entry', () => {
      mockPlayer.x = 150;
      mockPlayer.y = 150;

      collisionSystem.checkAreaCollisions(mockPlayer);

      expect(mockEventBus.publish).toHaveBeenCalledWith('area-entered', {
        areaId: 'polygon-area',
        areaName: 'Polygon Area',
        roomId: 'polygon-area'
      });
    });

    it('should detect rectangle area entry', () => {
      mockPlayer.x = 350;
      mockPlayer.y = 350;

      collisionSystem.checkAreaCollisions(mockPlayer);

      expect(mockEventBus.publish).toHaveBeenCalledWith('area-entered', {
        areaId: 'rectangle-area',
        areaName: 'Rectangle Area',
        roomId: 'rectangle-area'
      });
    });

    it('should detect area exit', () => {
      // Player enters area
      mockPlayer.x = 150;
      mockPlayer.y = 150;
      collisionSystem.checkAreaCollisions(mockPlayer);

      // Player exits area
      mockPlayer.x = 50;
      mockPlayer.y = 50;
      collisionSystem.checkAreaCollisions(mockPlayer);

      expect(mockEventBus.publish).toHaveBeenCalledWith('area-exited', {
        areaId: 'polygon-area',
        areaName: 'Polygon Area'
      });
    });

    it('should handle multiple area entries', () => {
      // Player enters first area
      mockPlayer.x = 150;
      mockPlayer.y = 150;
      collisionSystem.checkAreaCollisions(mockPlayer);

      // Player enters second area
      mockPlayer.x = 350;
      mockPlayer.y = 350;
      collisionSystem.checkAreaCollisions(mockPlayer);

      expect(mockEventBus.publish).toHaveBeenCalledTimes(2);
      expect(mockEventBus.publish).toHaveBeenCalledWith('area-entered', expect.objectContaining({
        areaId: 'polygon-area'
      }));
      expect(mockEventBus.publish).toHaveBeenCalledWith('area-entered', expect.objectContaining({
        areaId: 'rectangle-area'
      }));
    });

    it('should not emit duplicate events', () => {
      // Player stays in same area
      mockPlayer.x = 150;
      mockPlayer.y = 150;
      
      collisionSystem.checkAreaCollisions(mockPlayer);
      collisionSystem.checkAreaCollisions(mockPlayer);
      collisionSystem.checkAreaCollisions(mockPlayer);

      // Should only emit area-entered once
      const areaEnteredCalls = mockEventBus.publish.mock.calls.filter(
        call => call[0] === 'area-entered'
      );
      expect(areaEnteredCalls.length).toBe(1);
    });

    it('should handle area with no action type', () => {
      mockMapData.interactiveAreas.push({
        id: 'no-action-area',
        name: 'No Action Area',
        x: 400,
        y: 100,
        width: 100,
        height: 100,
        actionType: 'none',
        actionConfig: null,
        shapeType: 'rectangle'
      });

      mockPlayer.x = 450;
      mockPlayer.y = 150;

      collisionSystem.checkAreaCollisions(mockPlayer);

      // Should still detect area entry but no action should be taken
      expect(mockEventBus.publish).toHaveBeenCalledWith('area-entered', {
        areaId: 'no-action-area',
        areaName: 'No Action Area',
        roomId: 'no-action-area'
      });
    });
  });

  describe('Impassable Area Detection', () => {
    beforeEach(() => {
      mockMapData.impassableAreas = [
        {
          id: 'impassable-1',
          type: 'rectangle',
          x: 200,
          y: 200,
          width: 100,
          height: 100
        }
      ];
    });

    it('should detect collision with impassable area', () => {
      const result = collisionSystem.checkCollisionWithImpassableAreas(250, 250, 32);
      expect(result).toBe(true);
    });

    it('should detect no collision with impassable area', () => {
      const result = collisionSystem.checkCollisionWithImpassableAreas(50, 50, 32);
      expect(result).toBe(false);
    });

    it('should handle impassable areas with interactive areas', () => {
      mockMapData.interactiveAreas.push({
        id: 'impassable-interactive',
        name: 'Impassable Interactive',
        x: 300,
        y: 300,
        width: 100,
        height: 100,
        actionType: 'impassable',
        actionConfig: null,
        shapeType: 'rectangle'
      });

      // Test collision with interactive impassable area
      const result1 = collisionSystem.checkCollisionWithImpassableAreas(350, 350, 32);
      expect(result1).toBe(true);

      // Test no collision
      const result2 = collisionSystem.checkCollisionWithImpassableAreas(50, 50, 32);
      expect(result2).toBe(false);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing map data', () => {
      const getMapData = () => null;
      const collisionSystem = new CollisionSystem(
        {} as any,
        mockEventBus,
        jest.fn(),
        getMapData
      );

      expect(() => {
        collisionSystem.checkAreaCollisions(mockPlayer);
      }).not.toThrow();
    });

    it('should handle empty areas array', () => {
      mockMapData.interactiveAreas = [];

      collisionSystem.checkAreaCollisions(mockPlayer);

      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('should handle malformed area data', () => {
      mockMapData.interactiveAreas.push({
        id: 'malformed-area',
        name: 'Malformed Area',
        x: 'invalid' as any,
        y: 100,
        width: 100,
        height: 100,
        actionType: 'jitsi',
        actionConfig: null,
        shapeType: 'rectangle'
      });

      expect(() => {
        collisionSystem.checkAreaCollisions(mockPlayer);
      }).not.toThrow();
    });

    it('should handle missing player', () => {
      expect(() => {
        collisionSystem.checkAreaCollisions(null);
      }).not.toThrow();
    });

    it('should handle missing area points', () => {
      mockMapData.interactiveAreas.push({
        id: 'no-points-area',
        name: 'No Points Area',
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        actionType: 'jitsi',
        actionConfig: null,
        shapeType: 'polygon',
        points: null
      });

      expect(() => {
        collisionSystem.checkAreaCollisions(mockPlayer);
      }).not.toThrow();
    });
  });

  describe('Performance Tests', () => {
    it('should handle many areas efficiently', () => {
      // Add many areas
      for (let i = 0; i < 100; i++) {
        mockMapData.interactiveAreas.push({
          id: `area-${i}`,
          name: `Area ${i}`,
          x: i * 10,
          y: i * 10,
          width: 50,
          height: 50,
          actionType: 'jitsi',
          actionConfig: { autoJoinOnEntry: true },
          shapeType: 'rectangle'
        });
      }

      const startTime = performance.now();
      
      for (let i = 0; i < 50; i++) {
        mockPlayer.x = Math.random() * 800;
        mockPlayer.y = Math.random() * 600;
        collisionSystem.checkAreaCollisions(mockPlayer);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should handle complex polygons efficiently', () => {
      // Add complex polygon
      const complexPolygon = {
        id: 'complex-polygon',
        name: 'Complex Polygon',
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        actionType: 'jitsi',
        actionConfig: { autoJoinOnEntry: true },
        shapeType: 'polygon',
        points: Array.from({ length: 50 }, (_, i) => ({
          x: 100 + Math.cos(i * Math.PI / 25) * 100,
          y: 100 + Math.sin(i * Math.PI / 25) * 100
        }))
      };

      mockMapData.interactiveAreas = [complexPolygon];

      const startTime = performance.now();
      
      for (let i = 0; i < 100; i++) {
        mockPlayer.x = Math.random() * 800;
        mockPlayer.y = Math.random() * 600;
        collisionSystem.checkAreaCollisions(mockPlayer);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(200); // Should complete in under 200ms
    });
  });

  describe('State Management', () => {
    it('should track current area correctly', () => {
      mockPlayer.x = 150;
      mockPlayer.y = 150;

      collisionSystem.checkAreaCollisions(mockPlayer);
      expect(collisionSystem.getCurrentArea()).toBe('polygon-area');

      mockPlayer.x = 50;
      mockPlayer.y = 50;
      collisionSystem.checkAreaCollisions(mockPlayer);
      expect(collisionSystem.getCurrentArea()).toBeNull();
    });

    it('should track previous area correctly', () => {
      mockPlayer.x = 150;
      mockPlayer.y = 150;
      collisionSystem.checkAreaCollisions(mockPlayer);
      expect(collisionSystem.getPreviousArea()).toBeNull();

      mockPlayer.x = 350;
      mockPlayer.y = 350;
      collisionSystem.checkAreaCollisions(mockPlayer);
      expect(collisionSystem.getPreviousArea()).toBe('polygon-area');
    });

    it('should reset area tracking', () => {
      mockPlayer.x = 150;
      mockPlayer.y = 150;
      collisionSystem.checkAreaCollisions(mockPlayer);

      collisionSystem.resetAreaTracking();
      expect(collisionSystem.getCurrentArea()).toBeNull();
      expect(collisionSystem.getPreviousArea()).toBeNull();
    });
  });
});