import { CollisionSystem } from '../CollisionSystem';
import { InteractiveAreaActionDispatcher } from '../../../shared/InteractiveAreaActionDispatcher';
import { logger } from '../../../shared/logger';
import { InteractiveAreaActionType } from '../../../shared/MapDataContext';

// Mock logger
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  error: jest.fn(),
} as jest.Mocked<typeof logger>;

// Mock the CollisionSystem dependencies
const mockScene = {
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
};

const mockEventBus = {
  publish: jest.fn(),
  subscribe: jest.fn().mockImplementation((event, handler) => {
    // Store handlers for direct access
    if (event === 'area-entered') {
      mockEventBus.areaEnteredHandler = handler;
    } else if (event === 'area-exited') {
      mockEventBus.areaExitedHandler = handler;
    } else if (event === 'jitsi:join') {
      mockEventBus.jitsiJoinHandler = handler;
    } else if (event === 'jitsi:leave') {
      mockEventBus.jitsiLeaveHandler = handler;
    }
    return jest.fn();
  }),
  unsubscribe: jest.fn(),
  clear: jest.fn(),
  areaEnteredHandler: null as any,
  areaExitedHandler: null as any,
  jitsiJoinHandler: null as any,
  jitsiLeaveHandler: null as any
};

const mockOnAreaClick = jest.fn();

const mockMapData = {
  interactiveAreas: [
    {
      id: 'jitsi-room-1',
      name: 'Main Meeting Room',
      shapeType: 'polygon',
      actionType: 'jitsi',
      actionConfig: {
        autoJoinOnEntry: true,
        autoLeaveOnExit: true,
        jitsiServerUrl: 'meet.stargety.com'
      },
      x: 100,
      y: 100,
      width: 200,
      height: 150,
      points: [
        { x: 100, y: 100 },
        { x: 300, y: 100 },
        { x: 300, y: 250 },
        { x: 100, y: 250 }
      ]
    },
    {
      id: 'url-area-1',
      name: 'Resource Link',
      shapeType: 'rectangle',
      actionType: 'url',
      actionConfig: {
        url: 'https://example.com',
        openMode: 'newTab'
      },
      x: 400,
      y: 100,
      width: 150,
      height: 100,
      points: []
    }
  ],
  impassableAreas: [],
  worldDimensions: { width: 800, height: 600 },
  backgroundImage: '',
  backgroundImageDimensions: { width: 0, height: 0 },
  assets: []
};

describe('ActionDispatcher Debug Test', () => {
  let collisionSystem: CollisionSystem;
  let actionDispatcher: InteractiveAreaActionDispatcher;
  let mockGetMapData: () => any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetMapData = jest.fn(() => mockMapData);
    
    collisionSystem = new CollisionSystem(
      mockScene as any,
      mockEventBus,
      mockOnAreaClick,
      mockGetMapData
    );

    actionDispatcher = new InteractiveAreaActionDispatcher({
      eventBus: mockEventBus,
      getAreaById: (areaId: string) => mockMapData.interactiveAreas.find(area => area.id === areaId) as any
    });

    // Start the action dispatcher
    actionDispatcher.start();
  });

  afterEach(() => {
    actionDispatcher.stop();
  });

  test('should publish area-entered event when player enters polygon area', () => {
    // Create a mock player container
    const mockPlayer = {
      x: 150,
      y: 150,
      width: 32,
      height: 32
    };

    // Call collision detection
    collisionSystem.checkAreaCollisions(mockPlayer as any);

    // Verify that area-entered event was published
    expect(mockEventBus.publish).toHaveBeenCalledWith('area-entered', {
      areaId: 'jitsi-room-1',
      areaName: 'Main Meeting Room',
      roomId: 'jitsi-room-1'
    });

    // Manually call the action dispatcher handler using the stored handler
    mockEventBus.areaEnteredHandler({
      areaId: 'jitsi-room-1',
      areaName: 'Main Meeting Room',
      roomId: 'jitsi-room-1'
    });

    // Verify that action dispatcher received the event
    expect(mockLogger.info).toHaveBeenCalledWith('[ActionDispatcher] Area entered', {
      name: 'Main Meeting Room',
      actionType: 'jitsi'
    });
  });

  test('should publish area-exited event when player leaves polygon area', () => {
    // First, simulate player entering the area
    const mockPlayerEnter = {
      x: 150,
      y: 150,
      width: 32,
      height: 32
    };
    collisionSystem.checkAreaCollisions(mockPlayerEnter as any);

    // Manually call the action dispatcher handler for entry
    const enteredHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[0][1];
    enteredHandler({
      areaId: 'jitsi-room-1',
      areaName: 'Main Meeting Room',
      roomId: 'jitsi-room-1'
    });

    // Clear publish calls to track exit event
    jest.clearAllMocks();

    // Then, simulate player leaving the area
    const mockPlayerLeave = {
      x: 50,
      y: 50,
      width: 32,
      height: 32
    };
    collisionSystem.checkAreaCollisions(mockPlayerLeave as any);

    // Verify that area-exited event was published
    expect(mockEventBus.publish).toHaveBeenCalledWith('area-exited', {
      areaId: 'jitsi-room-1',
      areaName: 'Main Meeting Room'
    });

    // Manually call the action dispatcher handler using the stored handler
    mockEventBus.areaExitedHandler({
      areaId: 'jitsi-room-1',
      areaName: 'Main Meeting Room'
    });

    // Verify that action dispatcher received the exit event
    expect(mockLogger.info).toHaveBeenCalledWith('[ActionDispatcher] Area exited', {
      name: 'Main Meeting Room'
    });
  });

  test('should publish jitsi:join event when entering jitsi area', () => {
    // Simulate player entering jitsi area
    const mockPlayer = {
      x: 150,
      y: 150,
      width: 32,
      height: 32
    };
    collisionSystem.checkAreaCollisions(mockPlayer as any);

    // Manually call the action dispatcher handler
    const enteredHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[0][1];
    enteredHandler({
      areaId: 'jitsi-room-1',
      areaName: 'Main Meeting Room',
      roomId: 'jitsi-room-1'
    });

    // Verify that jitsi:join event was published
    expect(mockEventBus.publish).toHaveBeenCalledWith('jitsi:join', {
      roomName: 'stargety-main-meeting-room',
      areaName: 'Main Meeting Room'
    });
  });

  test('should publish jitsi:leave event when leaving jitsi area', () => {
    // First, simulate player entering the area
    const mockPlayerEnter = {
      x: 150,
      y: 150,
      width: 32,
      height: 32
    };
    collisionSystem.checkAreaCollisions(mockPlayerEnter as any);

    // Manually call the action dispatcher handler using the stored handler
    mockEventBus.areaEnteredHandler({
      areaId: 'jitsi-room-1',
      areaName: 'Main Meeting Room',
      roomId: 'jitsi-room-1'
    });

    // Clear publish calls to track exit event
    jest.clearAllMocks();

    // Then, simulate player leaving the area
    const mockPlayerLeave = {
      x: 50,
      y: 50,
      width: 32,
      height: 32
    };
    collisionSystem.checkAreaCollisions(mockPlayerLeave as any);

    // Manually call the action dispatcher handler using the stored handler
    mockEventBus.areaExitedHandler({
      areaId: 'jitsi-room-1',
      areaName: 'Main Meeting Room'
    });

    // Verify that jitsi:leave event was published
    expect(mockEventBus.publish).toHaveBeenCalledWith('jitsi:leave', {
      areaName: 'Main Meeting Room'
    });
  });

  test('should handle url action type correctly', () => {
    // Simulate player entering URL area
    const mockPlayer = {
      x: 450,
      y: 150,
      width: 32,
      height: 32
    };
    collisionSystem.checkAreaCollisions(mockPlayer as any);

    // Verify that area-entered event was published
    expect(mockEventBus.publish).toHaveBeenCalledWith('area-entered', {
      areaId: 'url-area-1',
      areaName: 'Resource Link',
      roomId: 'url-area-1'
    });

    // Manually call the action dispatcher handler using the stored handler
    mockEventBus.areaEnteredHandler({
      areaId: 'url-area-1',
      areaName: 'Resource Link',
      roomId: 'url-area-1'
    });

    // Verify that action dispatcher received the event
    expect(mockLogger.info).toHaveBeenCalledWith('[ActionDispatcher] Area entered', {
      name: 'Resource Link',
      actionType: 'url'
    });
  });

  test('should handle missing map data gracefully', () => {
    const originalGetMapData = mockGetMapData;
    mockGetMapData = jest.fn().mockReturnValue(null);

    const mockPlayer = {
      x: 150,
      y: 150,
      width: 32,
      height: 32
    };
    collisionSystem.checkAreaCollisions(mockPlayer as any);

    // Should not publish any events when map data is missing
    expect(mockEventBus.publish).not.toHaveBeenCalled();

    // Restore original function
    mockGetMapData = originalGetMapData;
  });

  test('should handle malformed area data gracefully', () => {
    const malformedMapData = {
      interactiveAreas: [
        {
          id: 'malformed-area',
          name: 'Malformed Area',
          shapeType: 'polygon',
          actionType: 'jitsi',
          // Missing required fields
          x: undefined,
          y: undefined,
          width: undefined,
          height: undefined,
          points: null
        }
      ]
    };

    const originalGetMapData = mockGetMapData;
    mockGetMapData = jest.fn().mockReturnValue(malformedMapData);

    const mockPlayer = {
      x: 150,
      y: 150,
      width: 32,
      height: 32
    };
    collisionSystem.checkAreaCollisions(mockPlayer as any);

    // Should not crash and should not publish events for malformed data
    expect(mockEventBus.publish).not.toHaveBeenCalled();

    // Restore original function
    mockGetMapData = originalGetMapData;
  });
});