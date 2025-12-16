/**
 * Jitsi Workflow Integration Test Suite
 *
 * Comprehensive end-to-end tests for the complete Jitsi workflow:
 * Player Movement → Area Detection → Event Processing → Video Call Initiation
 */

import { CollisionSystem } from '../CollisionSystem';
import { InteractiveAreaActionDispatcher } from '../../../shared/InteractiveAreaActionDispatcher';
import { logger } from '../../../shared/logger';

// Mock dependencies
jest.mock('../../../shared/logger');
jest.mock('../../../shared/EventBusContext');

// Mock logger
const mockLogger = logger as jest.Mocked<typeof logger>;

// Mock EventBus
const mockEventBus = {
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  publish: jest.fn(),
} as any;

// Mock area data
const createMockJitsiArea = (overrides: Partial<any> = {}): any => ({
  id: 'jitsi-room-1',
  name: 'Main Meeting Room',
  x: 100,
  y: 100,
  width: 200,
  height: 150,
  actionType: 'jitsi',
  actionConfig: {
    autoJoinOnEntry: true,
    autoLeaveOnExit: true,
  },
  shapeType: 'polygon',
  points: [
    { x: 100, y: 100 },
    { x: 300, y: 100 },
    { x: 300, y: 250 },
    { x: 100, y: 250 }
  ],
  ...overrides
});

describe('Jitsi Workflow Integration', () => {
  let collisionSystem: CollisionSystem;
  let actionDispatcher: InteractiveAreaActionDispatcher;
  let mockMapData: any;
  let mockPlayer: any;
  let mockGetAreaById: (areaId: string) => any;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    mockLogger.info.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.debug.mockClear();

    // Mock map data with Jitsi areas
    mockMapData = {
      interactiveAreas: [
        createMockJitsiArea(),
        createMockJitsiArea({
          id: 'jitsi-room-2',
          name: 'Small Conference',
          x: 400,
          y: 400,
          width: 100,
          height: 100,
          shapeType: 'rectangle'
        }),
        createMockJitsiArea({
          id: 'polygon-jitsi-room',
          name: 'Polygon Meeting Room',
          x: 200,
          y: 300,
          width: 150,
          height: 150,
          shapeType: 'polygon',
          points: [
            { x: 200, y: 300 },
            { x: 350, y: 300 },
            { x: 350, y: 450 },
            { x: 200, y: 450 }
          ]
        })
      ],
      impassableAreas: [],
      worldDimensions: { width: 800, height: 600 },
      backgroundImage: '',
      backgroundImageDimensions: { width: 800, height: 600 }
    };

    // Mock area lookup
    mockGetAreaById = (areaId: string) => {
      return mockMapData.interactiveAreas.find(area => area.id === areaId);
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

    // Create action dispatcher
    actionDispatcher = new InteractiveAreaActionDispatcher({
      eventBus: mockEventBus,
      getAreaById: mockGetAreaById,
    });

    // Start the action dispatcher
    actionDispatcher.start();
  });

  afterEach(() => {
    actionDispatcher.stop();
  });

  describe('Complete Workflow: Polygon Jitsi Room', () => {
    it('should detect polygon area entry and trigger Jitsi join', () => {
      // Step 1: Player moves into polygon area
      mockPlayer.x = 250;
      mockPlayer.y = 350;

      // Step 2: CollisionSystem detects area entry
      collisionSystem.checkAreaCollisions(mockPlayer);

      // Verify area-entered event was published
      expect(mockEventBus.publish).toHaveBeenCalledWith('area-entered', {
        areaId: 'polygon-jitsi-room',
        areaName: 'Polygon Meeting Room',
        roomId: 'polygon-jitsi-room'
      });

      // Step 3: ActionDispatcher processes area-entered event
      const enteredHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[0][1];
      enteredHandler({
        areaId: 'polygon-jitsi-room',
        areaName: 'Polygon Meeting Room',
        roomId: 'polygon-jitsi-room'
      });

      // Verify jitsi:join event was published
      expect(mockEventBus.publish).toHaveBeenCalledWith('jitsi:join', {
        roomName: 'stargety-polygon-meeting-room',
        areaName: 'Polygon Meeting Room'
      });

      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith('[ActionDispatcher] Area entered', {
        name: 'Polygon Meeting Room',
        actionType: 'jitsi'
      });
      expect(mockLogger.info).toHaveBeenCalledWith('[ActionDispatcher] Emitting jitsi:join event', {
        roomName: 'stargety-polygon-meeting-room',
        areaName: 'Polygon Meeting Room'
      });
    });

    it('should detect polygon area exit and trigger Jitsi leave', () => {
      // First, player enters polygon area
      mockPlayer.x = 250;
      mockPlayer.y = 350;
      collisionSystem.checkAreaCollisions(mockPlayer);

      const enteredHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[0][1];
      enteredHandler({
        areaId: 'polygon-jitsi-room',
        areaName: 'Polygon Meeting Room',
        roomId: 'polygon-jitsi-room'
      });

      // Clear publish mock to track exit events
      mockEventBus.publish.mockClear();

      // Step 1: Player moves out of polygon area
      mockPlayer.x = 50;
      mockPlayer.y = 50;

      // Step 2: CollisionSystem detects area exit
      collisionSystem.checkAreaCollisions(mockPlayer);

      // Verify area-exited event was published
      expect(mockEventBus.publish).toHaveBeenCalledWith('area-exited', {
        areaId: 'polygon-jitsi-room',
        areaName: 'Polygon Meeting Room'
      });

      // Step 3: ActionDispatcher processes area-exited event
      const exitedHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[1][1];
      exitedHandler({
        areaId: 'polygon-jitsi-room',
        areaName: 'Polygon Meeting Room'
      });

      // Verify jitsi:leave event was published
      expect(mockEventBus.publish).toHaveBeenCalledWith('jitsi:leave', {
        areaName: 'Polygon Meeting Room'
      });

      // Verify logging
      expect(mockLogger.info).toHaveBeenCalledWith('[ActionDispatcher] Area exited', {
        name: 'Polygon Meeting Room'
      });
      expect(mockLogger.info).toHaveBeenCalledWith('[ActionDispatcher] Emitting jitsi:leave event', {
        areaName: 'Polygon Meeting Room'
      });
    });
  });

  describe('Rectangle Jitsi Room Workflow', () => {
    it('should detect rectangle area entry and trigger Jitsi join', () => {
      // Step 1: Player moves into rectangle area
      mockPlayer.x = 450;
      mockPlayer.y = 450;

      // Step 2: CollisionSystem detects area entry
      collisionSystem.checkAreaCollisions(mockPlayer);

      // Verify area-entered event was published
      expect(mockEventBus.publish).toHaveBeenCalledWith('area-entered', {
        areaId: 'jitsi-room-2',
        areaName: 'Small Conference',
        roomId: 'jitsi-room-2'
      });

      // Step 3: ActionDispatcher processes area-entered event
      const enteredHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[0][1];
      enteredHandler({
        areaId: 'jitsi-room-2',
        areaName: 'Small Conference',
        roomId: 'jitsi-room-2'
      });

      // Verify jitsi:join event was published
      expect(mockEventBus.publish).toHaveBeenCalledWith('jitsi:join', {
        roomName: 'stargety-small-conference',
        areaName: 'Small Conference'
      });
    });
  });

  describe('Multiple Area Transitions', () => {
    it('should handle rapid area transitions correctly', () => {
      // Player enters first area
      mockPlayer.x = 150;
      mockPlayer.y = 150;
      collisionSystem.checkAreaCollisions(mockPlayer);

      const enteredHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[0][1];
      enteredHandler({
        areaId: 'jitsi-room-1',
        areaName: 'Main Meeting Room',
        roomId: 'jitsi-room-1'
      });

      // Player enters second area
      mockPlayer.x = 450;
      mockPlayer.y = 450;
      collisionSystem.checkAreaCollisions(mockPlayer);

      enteredHandler({
        areaId: 'jitsi-room-2',
        areaName: 'Small Conference',
        roomId: 'jitsi-room-2'
      });

      // Should have published two area-entered events
      const areaEnteredCalls = mockEventBus.publish.mock.calls.filter(
        call => call[0] === 'area-entered'
      );
      expect(areaEnteredCalls.length).toBe(2);

      // Should have published two jitsi:join events
      const jitsiJoinCalls = mockEventBus.publish.mock.calls.filter(
        call => call[0] === 'jitsi:join'
      );
      expect(jitsiJoinCalls.length).toBe(2);
    });

    it('should prevent duplicate event processing', () => {
      // Player stays in same area
      mockPlayer.x = 150;
      mockPlayer.y = 150;
      
      // Call collision detection multiple times
      collisionSystem.checkAreaCollisions(mockPlayer);
      collisionSystem.checkAreaCollisions(mockPlayer);
      collisionSystem.checkAreaCollisions(mockPlayer);

      const enteredHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[0][1];
      enteredHandler({
        areaId: 'jitsi-room-1',
        areaName: 'Main Meeting Room',
        roomId: 'jitsi-room-1'
      });

      // Should only publish area-entered once
      const areaEnteredCalls = mockEventBus.publish.mock.calls.filter(
        call => call[0] === 'area-entered'
      );
      expect(areaEnteredCalls.length).toBe(1);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing map data gracefully', () => {
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

    it('should handle malformed area data gracefully', () => {
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

      mockPlayer.x = 50;
      mockPlayer.y = 50;

      expect(() => {
        collisionSystem.checkAreaCollisions(mockPlayer);
      }).not.toThrow();
    });

    it('should handle area with no action type', () => {
      mockMapData.interactiveAreas.push({
        id: 'no-action-area',
        name: 'No Action Area',
        x: 50,
        y: 50,
        width: 100,
        height: 100,
        actionType: 'none',
        actionConfig: null,
        shapeType: 'rectangle'
      });

      mockPlayer.x = 100;
      mockPlayer.y = 100;

      collisionSystem.checkAreaCollisions(mockPlayer);

      // Should still detect area entry but no jitsi events
      expect(mockEventBus.publish).toHaveBeenCalledWith('area-entered', {
        areaId: 'no-action-area',
        areaName: 'No Action Area',
        roomId: 'no-action-area'
      });

      const jitsiJoinCalls = mockEventBus.publish.mock.calls.filter(
        call => call[0] === 'jitsi:join'
      );
      expect(jitsiJoinCalls.length).toBe(0);
    });

    it('should handle area with disabled auto-join', () => {
      const noJoinArea = createMockJitsiArea({
        id: 'no-join-area',
        name: 'No Join Area',
        actionConfig: {
          autoJoinOnEntry: false,
          autoLeaveOnExit: true,
        }
      });
      mockMapData.interactiveAreas.push(noJoinArea);

      mockPlayer.x = 100;
      mockPlayer.y = 100;

      collisionSystem.checkAreaCollisions(mockPlayer);

      const enteredHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[0][1];
      enteredHandler({
        areaId: 'no-join-area',
        areaName: 'no-join-area',
        roomId: 'no-join-area'
      });

      // Should not publish jitsi:join event
      const jitsiJoinCalls = mockEventBus.publish.mock.calls.filter(
        call => call[0] === 'jitsi:join'
      );
      expect(jitsiJoinCalls.length).toBe(0);
    });
  });

  describe('Performance Tests', () => {
    it('should handle many areas efficiently', () => {
      // Add many areas
      for (let i = 0; i < 50; i++) {
        mockMapData.interactiveAreas.push(createMockJitsiArea({
          id: `area-${i}`,
          name: `Area ${i}`,
          x: i * 15,
          y: i * 15,
          width: 50,
          height: 50,
          shapeType: 'rectangle'
        }));
      }

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

    it('should handle complex polygons efficiently', () => {
      // Add complex polygon
      const complexPolygon = createMockJitsiArea({
        id: 'complex-polygon',
        name: 'Complex Polygon',
        x: 100,
        y: 100,
        width: 200,
        height: 200,
        shapeType: 'polygon',
        points: Array.from({ length: 100 }, (_, i) => ({
          x: 100 + Math.cos(i * Math.PI / 50) * 100,
          y: 100 + Math.sin(i * Math.PI / 50) * 100
        }))
      });
      mockMapData.interactiveAreas = [complexPolygon];

      const startTime = performance.now();
      
      for (let i = 0; i < 50; i++) {
        mockPlayer.x = Math.random() * 800;
        mockPlayer.y = Math.random() * 600;
        collisionSystem.checkAreaCollisions(mockPlayer);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(150); // Should complete in under 150ms
    });
  });

  describe('State Management', () => {
    it('should track current and previous areas correctly', () => {
      // Player enters first area
      mockPlayer.x = 150;
      mockPlayer.y = 150;
      collisionSystem.checkAreaCollisions(mockPlayer);
      expect(collisionSystem.getCurrentArea()).toBe('jitsi-room-1');
      expect(collisionSystem.getPreviousArea()).toBe('jitsi-room-1');

      // Player enters second area
      mockPlayer.x = 450;
      mockPlayer.y = 450;
      collisionSystem.checkAreaCollisions(mockPlayer);
      expect(collisionSystem.getCurrentArea()).toBe('jitsi-room-2');
      expect(collisionSystem.getPreviousArea()).toBe('jitsi-room-2');

      // Player exits all areas
      mockPlayer.x = 50;
      mockPlayer.y = 50;
      collisionSystem.checkAreaCollisions(mockPlayer);
      expect(collisionSystem.getCurrentArea()).toBeNull();
      expect(collisionSystem.getPreviousArea()).toBeNull();
    });

    it('should reset area tracking correctly', () => {
      mockPlayer.x = 150;
      mockPlayer.y = 150;
      collisionSystem.checkAreaCollisions(mockPlayer);

      collisionSystem.resetAreaTracking();
      expect(collisionSystem.getCurrentArea()).toBeNull();
      expect(collisionSystem.getPreviousArea()).toBeNull();
    });
  });

  describe('Logging and Debugging', () => {
    it('should log area detection events', () => {
      mockPlayer.x = 150;
      mockPlayer.y = 150;

      collisionSystem.checkAreaCollisions(mockPlayer);

      expect(mockLogger.debug).toHaveBeenCalledWith('[Collision] Player entered area', {
        areaId: 'jitsi-room-1',
        areaName: 'Main Meeting Room',
        shapeType: 'polygon',
        actionType: 'jitsi',
        playerPos: { x: 150, y: 150 },
        areaBounds: { x: 100, y: 100, width: 200, height: 150 },
        isPolygon: true,
        hasPoints: true
      });
    });

    it('should log action dispatcher events', () => {
      mockPlayer.x = 150;
      mockPlayer.y = 150;
      collisionSystem.checkAreaCollisions(mockPlayer);

      const enteredHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[0][1];
      enteredHandler({
        areaId: 'jitsi-room-1',
        areaName: 'Main Meeting Room',
        roomId: 'jitsi-room-1'
      });

      expect(mockLogger.debug).toHaveBeenCalledWith('[ActionDispatcher] Area entered event received', {
        areaId: 'jitsi-room-1',
        areaName: 'Main Meeting Room',
        actionType: 'jitsi',
        areaConfig: {
          autoJoinOnEntry: true,
          autoLeaveOnExit: true
        },
        shapeType: 'polygon',
        hasJitsiConfig: true
      });
    });

    describe('Complete End-to-End Workflow Test', () => {
      it('should trigger complete Jitsi workflow from polygon area entry to video call display', () => {
        // Step 1: Player enters polygon Jitsi area
        mockPlayer.x = 250;
        mockPlayer.y = 350;

        // Step 2: CollisionSystem detects area entry and publishes event
        collisionSystem.checkAreaCollisions(mockPlayer);

        // Verify area-entered event was published
        expect(mockEventBus.publish).toHaveBeenCalledWith('area-entered', {
          areaId: 'polygon-jitsi-room',
          areaName: 'Polygon Meeting Room',
          roomId: 'polygon-jitsi-room'
        });

        // Step 3: ActionDispatcher processes area-entered event
        const enteredHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[0][1];
        enteredHandler({
          areaId: 'polygon-jitsi-room',
          areaName: 'Polygon Meeting Room',
          roomId: 'polygon-jitsi-room'
        });

        // Verify jitsi:join event was published
        expect(mockEventBus.publish).toHaveBeenCalledWith('jitsi:join', {
          roomName: 'stargety-polygon-meeting-room',
          areaName: 'Polygon Meeting Room'
        });

        // Step 4: VideoCommunicationPanel receives jitsi:join event
        // (This would normally be handled by the VideoCommunicationPanel component)
        // The component would set currentAreaRoom state after debounce
        const joinHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[1][1];
        joinHandler({
          roomName: 'stargety-polygon-meeting-room',
          areaName: 'Polygon Meeting Room'
        });

        // Step 5: Video call should be rendered in the panel
        // (This would be tested in VideoCommunicationPanel tests)
        // The VideoCallModule would be rendered with the correct room configuration

        // Verify the complete workflow chain
        const allPublishCalls = mockEventBus.publish.mock.calls;
        const areaEnteredCalls = allPublishCalls.filter(call => call[0] === 'area-entered');
        const jitsiJoinCalls = allPublishCalls.filter(call => call[0] === 'jitsi:join');

        expect(areaEnteredCalls.length).toBe(1);
        expect(jitsiJoinCalls.length).toBe(1);
        expect(areaEnteredCalls[0][1].areaId).toBe('polygon-jitsi-room');
        expect(jitsiJoinCalls[0][1].roomName).toBe('stargety-polygon-meeting-room');

        // Verify logging throughout the workflow
        expect(mockLogger.info).toHaveBeenCalledWith('[ActionDispatcher] Area entered', {
          name: 'Polygon Meeting Room',
          actionType: 'jitsi'
        });
        expect(mockLogger.info).toHaveBeenCalledWith('[ActionDispatcher] Emitting jitsi:join event', {
          roomName: 'stargety-polygon-meeting-room',
          areaName: 'Polygon Meeting Room'
        });
      });

      it('should handle complete workflow with rectangle Jitsi area', () => {
        // Step 1: Player enters rectangle Jitsi area
        mockPlayer.x = 450;
        mockPlayer.y = 450;

        // Step 2: CollisionSystem detects area entry
        collisionSystem.checkAreaCollisions(mockPlayer);

        // Step 3: ActionDispatcher processes area-entered event
        const enteredHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[0][1];
        enteredHandler({
          areaId: 'jitsi-room-2',
          areaName: 'Small Conference',
          roomId: 'jitsi-room-2'
        });

        // Verify complete workflow for rectangle area
        const allPublishCalls = mockEventBus.publish.mock.calls;
        const areaEnteredCalls = allPublishCalls.filter(call => call[0] === 'area-entered');
        const jitsiJoinCalls = allPublishCalls.filter(call => call[0] === 'jitsi:join');

        expect(areaEnteredCalls.length).toBe(1);
        expect(jitsiJoinCalls.length).toBe(1);
        expect(areaEnteredCalls[0][1].areaId).toBe('jitsi-room-2');
        expect(jitsiJoinCalls[0][1].roomName).toBe('stargety-small-conference');
      });

      it('should handle workflow with disabled auto-join gracefully', () => {
        // Create area with disabled auto-join
        const noJoinArea = createMockJitsiArea({
          id: 'no-join-area',
          name: 'No Join Area',
          actionConfig: {
            autoJoinOnEntry: false,
            autoLeaveOnExit: true,
          }
        });
        mockMapData.interactiveAreas.push(noJoinArea);

        // Step 1: Player enters area with disabled auto-join
        mockPlayer.x = 100;
        mockPlayer.y = 100;
        collisionSystem.checkAreaCollisions(mockPlayer);

        // Step 2: ActionDispatcher processes area-entered event
        const enteredHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[0][1];
        enteredHandler({
          areaId: 'no-join-area',
          areaName: 'no-join-area',
          roomId: 'no-join-area'
        });

        // Verify area-entered was published but no jitsi:join
        const allPublishCalls = mockEventBus.publish.mock.calls;
        const areaEnteredCalls = allPublishCalls.filter(call => call[0] === 'area-entered');
        const jitsiJoinCalls = allPublishCalls.filter(call => call[0] === 'jitsi:join');

        expect(areaEnteredCalls.length).toBe(1);
        expect(jitsiJoinCalls.length).toBe(0); // No jitsi join event
      });
    });
  });
});