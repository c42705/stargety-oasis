/**
 * InteractiveAreaActionDispatcher Test Suite
 *
 * Comprehensive tests for the InteractiveAreaActionDispatcher component, focusing on:
 * - Jitsi action handling
 * - Event subscription and unsubscription
 * - Area lookup and validation
 * - Action dispatching
 * - Error handling
 */

import { InteractiveAreaActionDispatcher } from '../InteractiveAreaActionDispatcher';
import { EventBus } from '../EventBusContext';
import { InteractiveArea, JitsiActionConfig } from '../MapDataContext';
import { logger } from '../logger';

// Mock dependencies
jest.mock('../logger');
jest.mock('../EventBusContext');

// Mock logger
const mockLogger = logger as jest.Mocked<typeof logger>;

// Mock EventBus
const mockEventBus = {
  subscribe: jest.fn(),
  unsubscribe: jest.fn(),
  publish: jest.fn(),
} as unknown as EventBus;

// Mock area data
const createMockJitsiArea = (overrides: Partial<InteractiveArea> = {}): InteractiveArea => ({
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
  },
  ...overrides
});

describe('InteractiveAreaActionDispatcher', () => {
  let dispatcher: InteractiveAreaActionDispatcher;
  let mockAreas: InteractiveArea[];
  let mockGetAreaById: (areaId: string) => InteractiveArea | undefined;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    mockLogger.info.mockClear();
    mockLogger.warn.mockClear();
    mockLogger.debug.mockClear();

    // Mock areas
    mockAreas = [
      createMockJitsiArea(),
      createMockJitsiArea({
        id: 'jitsi-room-2',
        name: 'Small Conference',
        x: 400,
        y: 400,
        width: 100,
        height: 100,
        shapeType: 'rectangle'
      })
    ];

    // Mock area lookup
    mockGetAreaById = (areaId: string) => {
      return mockAreas.find(area => area.id === areaId);
    };

    // Create dispatcher
    dispatcher = new InteractiveAreaActionDispatcher({
      eventBus: mockEventBus,
      getAreaById: mockGetAreaById,
    });
  });

  afterEach(() => {
    dispatcher.stop();
  });

  describe('Lifecycle Management', () => {
    it('should start listening to area events', () => {
      dispatcher.start();

      expect(mockEventBus.subscribe).toHaveBeenCalledTimes(2);
      expect(mockEventBus.subscribe).toHaveBeenCalledWith('area-entered', expect.any(Function));
      expect(mockEventBus.subscribe).toHaveBeenCalledWith('area-exited', expect.any(Function));
      expect(mockLogger.info).toHaveBeenCalledWith('[ActionDispatcher] Started listening to area events');
    });

    it('should stop listening to area events', () => {
      const unsubscribeMock = jest.fn();
      (mockEventBus.subscribe as jest.Mock).mockReturnValue(unsubscribeMock);

      dispatcher.start();
      dispatcher.stop();

      expect(unsubscribeMock).toHaveBeenCalledTimes(2);
      expect(mockLogger.info).toHaveBeenCalledWith('[ActionDispatcher] Stopped listening to area events');
    });
  });

  describe('Area Entry Handling', () => {
    beforeEach(() => {
      dispatcher.start();
    });

    it('should handle area entered event', () => {
      const areaEnteredData = {
        areaId: 'jitsi-room-1',
        areaName: 'Main Meeting Room',
        roomId: 'jitsi-room-1'
      };

      const enteredHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[0][1];
      enteredHandler(areaEnteredData);

      expect(mockEventBus.publish).toHaveBeenCalledWith('jitsi:join', {
        roomName: 'stargety-jitsi-room-1',
        areaName: 'Main Meeting Room'
      });
      expect(mockLogger.info).toHaveBeenCalledWith('[ActionDispatcher] Area entered', {
        name: 'Main Meeting Room',
        actionType: 'jitsi'
      });
    });

    it('should handle area not found gracefully', () => {
      const areaEnteredData = {
        areaId: 'non-existent-area',
        areaName: 'Non-existent Area',
        roomId: 'non-existent-area'
      };

      const enteredHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[0][1];
      enteredHandler(areaEnteredData);

      expect(mockEventBus.publish).not.toHaveBeenCalled();
      expect(mockLogger.warn).toHaveBeenCalledWith('[ActionDispatcher] Area not found', {
        areaId: 'non-existent-area'
      });
    });

    it('should handle undefined area data gracefully', () => {
      const enteredHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[0][1];
      
      // @ts-ignore - Testing error case
      enteredHandler(undefined);

      expect(mockLogger.warn).toHaveBeenCalledWith('[ActionDispatcher] Area not found', {
        areaId: undefined
      });
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('should emit jitsi:join event for area with autoJoinOnEntry enabled', () => {
      const areaEnteredData = {
        areaId: 'jitsi-room-1',
        areaName: 'Main Meeting Room',
        roomId: 'jitsi-room-1'
      };

      const enteredHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[0][1];
      enteredHandler(areaEnteredData);

      expect(mockEventBus.publish).toHaveBeenCalledWith('jitsi:join', {
        roomName: 'stargety-jitsi-room-1',
        areaName: 'Main Meeting Room'
      });
    });

    it('should not emit jitsi:join event for area with autoJoinOnEntry disabled', () => {
      const noJoinArea = createMockJitsiArea({
        id: 'no-join-area',
        name: 'No Join Area',
        actionConfig: {
          autoJoinOnEntry: false,
          autoLeaveOnExit: true,
        }
      });
      mockAreas.push(noJoinArea);

      const areaEnteredData = {
        areaId: 'no-join-area',
        areaName: 'No Join Area',
        roomId: 'no-join-area'
      };

      const enteredHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[0][1];
      enteredHandler(areaEnteredData);

      expect(mockEventBus.publish).not.toHaveBeenCalledWith('jitsi:join', expect.any(Object));
    });

    it('should handle alert actions on entry', () => {
      const alertArea = createMockJitsiArea({
        id: 'alert-area',
        name: 'Alert Area',
        actionType: 'alert',
        actionConfig: {
          message: 'Test alert message',
          alertType: 'info',
          duration: 5000
        }
      });
      mockAreas.push(alertArea);

      const areaEnteredData = {
        areaId: alertArea.id,
        areaName: alertArea.name,
        roomId: alertArea.id
      };

      const enteredHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[0][1];
      enteredHandler(areaEnteredData);

      // Should not publish jitsi events for alert actions
      expect(mockEventBus.publish).not.toHaveBeenCalledWith('jitsi:join', expect.any(Object));
    });

    it('should handle url actions on entry', () => {
      const urlArea = createMockJitsiArea({
        id: 'url-area',
        name: 'URL Area',
        actionType: 'url',
        actionConfig: {
          url: 'https://example.com',
          openMode: 'newTab'
        }
      });
      mockAreas.push(urlArea);

      const areaEnteredData = {
        areaId: urlArea.id,
        areaName: urlArea.name,
        roomId: urlArea.id
      };

      const enteredHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[0][1];
      enteredHandler(areaEnteredData);

      // Should not publish jitsi events for url actions
      expect(mockEventBus.publish).not.toHaveBeenCalledWith('jitsi:join', expect.any(Object));
    });

    it('should handle impassable areas (no action)', () => {
      const impassableArea = createMockJitsiArea({
        id: 'impassable-area',
        name: 'Impassable Area',
        actionType: 'impassable',
        actionConfig: null
      });
      mockAreas.push(impassableArea);

      const areaEnteredData = {
        areaId: impassableArea.id,
        areaName: impassableArea.name,
        roomId: impassableArea.id
      };

      const enteredHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[0][1];
      enteredHandler(areaEnteredData);

      // Should not publish any events for impassable areas
      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });
  });

  describe('Area Exit Handling', () => {
    beforeEach(() => {
      dispatcher.start();
    });

    it('should handle area exited event', () => {
      const areaExitedData = {
        areaId: 'jitsi-room-1',
        areaName: 'Main Meeting Room'
      };

      const exitedHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[1][1];
      exitedHandler(areaExitedData);

      expect(mockEventBus.publish).toHaveBeenCalledWith('jitsi:leave', {
        areaName: 'Main Meeting Room'
      });
      expect(mockLogger.info).toHaveBeenCalledWith('[ActionDispatcher] Area exited', {
        name: 'Main Meeting Room'
      });
    });

    it('should emit jitsi:leave event for area with autoLeaveOnExit enabled', () => {
      const areaExitedData = {
        areaId: 'jitsi-room-1',
        areaName: 'Main Meeting Room'
      };

      const exitedHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[1][1];
      exitedHandler(areaExitedData);

      expect(mockEventBus.publish).toHaveBeenCalledWith('jitsi:leave', {
        areaName: 'Main Meeting Room'
      });
    });

    it('should not emit jitsi:leave event for area with autoLeaveOnExit disabled', () => {
      const noLeaveArea = createMockJitsiArea({
        id: 'no-leave-area',
        name: 'No Leave Area',
        actionConfig: {
          autoJoinOnEntry: true,
          autoLeaveOnExit: false,
        }
      });
      mockAreas.push(noLeaveArea);

      const areaExitedData = {
        areaId: 'no-leave-area',
        areaName: 'No Leave Area'
      };

      const exitedHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[1][1];
      exitedHandler(areaExitedData);

      expect(mockEventBus.publish).not.toHaveBeenCalledWith('jitsi:leave', expect.any(Object));
    });

    it('should handle area not found on exit gracefully', () => {
      const areaExitedData = {
        areaId: 'non-existent-area',
        areaName: 'Non-existent Area'
      };

      const exitedHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[1][1];
      exitedHandler(areaExitedData);

      expect(mockEventBus.publish).not.toHaveBeenCalled();
    });

    it('should clear current Jitsi area on exit', () => {
      const areaEnteredData = {
        areaId: 'jitsi-room-1',
        areaName: 'Main Meeting Room',
        roomId: 'jitsi-room-1'
      };

      const areaExitedData = {
        areaId: 'jitsi-room-1',
        areaName: 'Main Meeting Room'
      };

      const enteredHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[0][1];
      const exitedHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[1][1];

      enteredHandler(areaEnteredData);
      expect((dispatcher as any).currentJitsiArea).not.toBeNull();

      exitedHandler(areaExitedData);
      expect((dispatcher as any).currentJitsiArea).toBeNull();
    });

    it('should not clear current Jitsi area for different area exit', () => {
      const areaEnteredData = {
        areaId: 'jitsi-room-1',
        areaName: 'Main Meeting Room',
        roomId: 'jitsi-room-1'
      };

      const areaExitedData = {
        areaId: 'jitsi-room-2',
        areaName: 'Small Conference'
      };

      const enteredHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[0][1];
      const exitedHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[1][1];

      enteredHandler(areaEnteredData);
      expect((dispatcher as any).currentJitsiArea).not.toBeNull();

      exitedHandler(areaExitedData);
      expect((dispatcher as any).currentJitsiArea).not.toBeNull();
    });
  });

  describe('Jitsi Action Handling', () => {
    beforeEach(() => {
      dispatcher.start();
    });

    it('should handle Jitsi action with autoJoinOnEntry enabled', () => {
      const area = createMockJitsiArea({
        actionConfig: {
          autoJoinOnEntry: true,
          autoLeaveOnExit: false,
        }
      });

      const enteredHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[0][1];
      enteredHandler({
        areaId: area.id,
        areaName: area.name,
        roomId: area.id
      });

      expect(mockEventBus.publish).toHaveBeenCalledWith('jitsi:join', {
        roomName: 'stargety-jitsi-room-1',
        areaName: 'Main Meeting Room'
      });
    });

    it('should handle Jitsi action with autoJoinOnEntry disabled', () => {
      const area = createMockJitsiArea({
        actionConfig: {
          autoJoinOnEntry: false,
          autoLeaveOnExit: true,
        }
      });

      const enteredHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[0][1];
      enteredHandler({
        areaId: area.id,
        areaName: area.name,
        roomId: area.id
      });

      expect(mockEventBus.publish).not.toHaveBeenCalledWith('jitsi:join', expect.any(Object));
    });

    it('should handle Jitsi action with autoLeaveOnExit enabled', () => {
      const area = createMockJitsiArea({
        actionConfig: {
          autoJoinOnEntry: true,
          autoLeaveOnExit: true,
        }
      });

      const exitedHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[1][1];
      exitedHandler({
        areaId: area.id,
        areaName: area.name
      });

      expect(mockEventBus.publish).toHaveBeenCalledWith('jitsi:leave', {
        areaName: 'Main Meeting Room'
      });
    });

    it('should handle Jitsi action with autoLeaveOnExit disabled', () => {
      const area = createMockJitsiArea({
        actionConfig: {
          autoJoinOnEntry: true,
          autoLeaveOnExit: false,
        }
      });

      const exitedHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[1][1];
      exitedHandler({
        areaId: area.id,
        areaName: area.name
      });

      expect(mockEventBus.publish).not.toHaveBeenCalledWith('jitsi:leave', expect.any(Object));
    });

    it('should handle Jitsi action with null config', () => {
      const area = createMockJitsiArea({
        actionConfig: null
      });

      const enteredHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[0][1];
      enteredHandler({
        areaId: area.id,
        areaName: area.name,
        roomId: area.id
      });

      expect(mockEventBus.publish).toHaveBeenCalledWith('jitsi:join', {
        roomName: 'stargety-jitsi-room-1',
        areaName: 'Main Meeting Room'
      });
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      dispatcher.start();
    });

    it('should handle malformed area data gracefully', () => {
      const malformedArea = {
        id: 'malformed-area',
        name: 'Malformed Area',
        x: 'invalid' as any,
        y: 100,
        width: 100,
        height: 100,
        actionType: 'jitsi',
        actionConfig: null,
        shapeType: 'rectangle'
      };
      mockAreas.push(malformedArea);

      const areaEnteredData = {
        areaId: 'malformed-area',
        areaName: 'Malformed Area',
        roomId: 'malformed-area'
      };

      const enteredHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[0][1];
      expect(() => {
        enteredHandler(areaEnteredData);
      }).not.toThrow();
    });

    it('should handle missing action config', () => {
      const noConfigArea = createMockJitsiArea({
        actionConfig: undefined
      });
      mockAreas.push(noConfigArea);

      const areaEnteredData = {
        areaId: noConfigArea.id,
        areaName: noConfigArea.name,
        roomId: noConfigArea.id
      };

      const enteredHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[0][1];
      enteredHandler(areaEnteredData);

      expect(mockEventBus.publish).toHaveBeenCalledWith('jitsi:join', {
        roomName: 'stargety-jitsi-room-1',
        areaName: 'Main Meeting Room'
      });
    });

    it('should handle concurrent area transitions', () => {
      const areaEnteredData = {
        areaId: 'jitsi-room-1',
        areaName: 'Main Meeting Room',
        roomId: 'jitsi-room-1'
      };

      const enteredHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[0][1];
      
      // Simulate rapid area transitions
      enteredHandler(areaEnteredData);
      enteredHandler(areaEnteredData);
      enteredHandler(areaEnteredData);

      // Should still only process one event
      expect(mockEventBus.publish).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration Tests', () => {
    beforeEach(() => {
      dispatcher.start();
    });

    it('should handle complete workflow: area entry → jitsi join → area exit → jitsi leave', () => {
      const areaEnteredData = {
        areaId: 'jitsi-room-1',
        areaName: 'Main Meeting Room',
        roomId: 'jitsi-room-1'
      };

      const areaExitedData = {
        areaId: 'jitsi-room-1',
        areaName: 'Main Meeting Room'
      };

      const enteredHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[0][1];
      const exitedHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[1][1];

      // Area entry
      enteredHandler(areaEnteredData);
      expect(mockEventBus.publish).toHaveBeenCalledWith('jitsi:join', {
        roomName: 'stargety-jitsi-room-1',
        areaName: 'Main Meeting Room'
      });

      // Area exit
      mockEventBus.publish.mockClear();
      exitedHandler(areaExitedData);
      expect(mockEventBus.publish).toHaveBeenCalledWith('jitsi:leave', {
        areaName: 'Main Meeting Room'
      });
    });

    it('should handle multiple areas independently', () => {
      const area1Entered = {
        areaId: 'jitsi-room-1',
        areaName: 'Main Meeting Room',
        roomId: 'jitsi-room-1'
      };

      const area2Entered = {
        areaId: 'jitsi-room-2',
        areaName: 'Small Conference',
        roomId: 'jitsi-room-2'
      };

      const area1Exited = {
        areaId: 'jitsi-room-1',
        areaName: 'Main Meeting Room'
      };

      const area2Exited = {
        areaId: 'jitsi-room-2',
        areaName: 'Small Conference'
      };

      const enteredHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[0][1];
      const exitedHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[1][1];

      // Enter both areas
      enteredHandler(area1Entered);
      enteredHandler(area2Entered);

      expect(mockEventBus.publish).toHaveBeenCalledWith('jitsi:join', {
        roomName: 'stargety-jitsi-room-1',
        areaName: 'Main Meeting Room'
      });
      expect(mockEventBus.publish).toHaveBeenCalledWith('jitsi:join', {
        roomName: 'stargety-jitsi-room-2',
        areaName: 'Small Conference'
      });

      // Exit both areas
      mockEventBus.publish.mockClear();
      exitedHandler(area1Exited);
      exitedHandler(area2Exited);

      expect(mockEventBus.publish).toHaveBeenCalledWith('jitsi:leave', {
        areaName: 'Main Meeting Room'
      });
      expect(mockEventBus.publish).toHaveBeenCalledWith('jitsi:leave', {
        areaName: 'Small Conference'
      });
    });

    it('should handle mixed action types', () => {
      const alertArea = createMockJitsiArea({
        id: 'alert-area',
        name: 'Alert Area',
        actionType: 'alert',
        actionConfig: {
          message: 'Test alert',
          alertType: 'info',
          duration: 3000
        }
      });
      mockAreas.push(alertArea);

      const urlArea = createMockJitsiArea({
        id: 'url-area',
        name: 'URL Area',
        actionType: 'url',
        actionConfig: {
          url: 'https://example.com',
          openMode: 'newTab'
        }
      });
      mockAreas.push(urlArea);

      const enteredHandler = (mockEventBus.subscribe as jest.Mock).mock.calls[0][1];

      // Enter alert area
      enteredHandler({
        areaId: 'alert-area',
        areaName: 'Alert Area',
        roomId: 'alert-area'
      });

      // Should not publish jitsi events for alert
      expect(mockEventBus.publish).not.toHaveBeenCalledWith('jitsi:join', expect.any(Object));

      // Enter url area
      enteredHandler({
        areaId: 'url-area',
        areaName: 'URL Area',
        roomId: 'url-area'
      });

      // Should not publish jitsi events for url
      expect(mockEventBus.publish).not.toHaveBeenCalledWith('jitsi:join', expect.any(Object));

      // Enter jitsi area
      enteredHandler({
        areaId: 'jitsi-room-1',
        areaName: 'Main Meeting Room',
        roomId: 'jitsi-room-1'
      });

      // Should publish jitsi events for jitsi area
      expect(mockEventBus.publish).toHaveBeenCalledWith('jitsi:join', {
        roomName: 'stargety-jitsi-room-1',
        areaName: 'Main Meeting Room'
      });
    });
  });
});