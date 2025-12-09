/**
 * PlayerManager Test Suite
 *
 * Comprehensive tests for the PlayerManager class
 */

import Phaser from 'phaser';
import { PlayerManager } from '../PlayerManager';
import { AvatarRenderer as AvatarRendererV2 } from '../../../components/avatar/v2';
import { AnimationCategory } from '../../../components/avatar/AvatarBuilderTypes';
import { CharacterApiService } from '../../../services/api/CharacterApiService';

// Mock dependencies
jest.mock('phaser');
jest.mock('../../../components/avatar/v2');
jest.mock('../../../shared/logger');
jest.mock('../../../services/api/CharacterApiService');

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock window.addEventListener
const addEventListenerMock = jest.fn();
global.window.addEventListener = addEventListenerMock;

// Mock CustomEvent
global.CustomEvent = jest.fn();

// Test utilities
const createMockScene = (): Phaser.Scene => ({
  add: {
    graphics: jest.fn().mockReturnValue({
      fillStyle: jest.fn().mockReturnThis(),
      fillCircle: jest.fn().mockReturnThis(),
      lineStyle: jest.fn().mockReturnThis(),
      strokeCircle: jest.fn().mockReturnThis(),
      generateTexture: jest.fn().mockReturnThis(),
      destroy: jest.fn(),
    }),
    sprite: jest.fn().mockReturnValue({
      setOrigin: jest.fn().mockReturnThis(),
      setDepth: jest.fn().mockReturnThis(),
      setVisible: jest.fn().mockReturnThis(),
      setActive: jest.fn().mockReturnThis(),
      setPosition: jest.fn().mockReturnThis(),
      setFlipX: jest.fn().mockReturnThis(),
      destroy: jest.fn(),
      x: 0,
      y: 0,
      width: 32,
      height: 32,
      depth: 500,
      visible: true,
      active: true,
      texture: { key: 'player-placeholder' },
    }),
  },
} as any);

const createMockEventBus = () => ({
  publish: jest.fn(),
});

describe('PlayerManager', () => {
  let scene: Phaser.Scene;
  let eventBus: any;
  let playerId: string;
  let playerManager: PlayerManager;

  beforeEach(() => {
    scene = createMockScene();
    eventBus = createMockEventBus();
    playerId = 'test-player';
    playerManager = new PlayerManager(scene, eventBus, playerId);

    // Reset mocks
    jest.clearAllMocks();
    localStorageMock.clear();
    addEventListenerMock.mockClear();
  });

  const initializePlayerManager = () => {
    playerManager.initialize(100, 200);
    playerManager.playerContainer = scene.add.container(100, 200);
  };

  afterEach(() => {
    // Cleanup if needed
  });

  describe('Constructor', () => {
    it('should initialize with correct parameters', () => {
      const playerManager = new PlayerManager(scene, eventBus, playerId);
      expect(playerManager).toBeInstanceOf(PlayerManager);
    });

    it('should set scene, eventBus, and playerId properties', () => {
      const playerManager = new PlayerManager(scene, eventBus, playerId);
      expect((playerManager as any).scene).toBe(scene);
      expect((playerManager as any).eventBus).toBe(eventBus);
      expect((playerManager as any).playerId).toBe(playerId);
    });
  });

  describe('Initialization', () => {
    describe('initialize method', () => {
      it('should create avatar renderer V2', () => {
        playerManager.initialize(100, 200);
        expect(playerManager.avatarRendererV2).toBeInstanceOf(AvatarRendererV2);
      });

      it('should create placeholder sprite', () => {
        playerManager.initialize(100, 200);
        expect(playerManager.player).toBeDefined();
        expect(playerManager.player.texture.key).toBe('player-placeholder');
      });

      it('should set sprite properties correctly', () => {
        playerManager.initialize(100, 200);
        expect(playerManager.player.x).toBe(100);
        expect(playerManager.player.y).toBe(200);
        expect(playerManager.player.originX).toBe(0.5);
        expect(playerManager.player.originY).toBe(0.5);
        expect(playerManager.player.depth).toBe(500);
        expect(playerManager.player.visible).toBe(true);
        expect(playerManager.player.active).toBe(true);
      });

      it('should call initializePlayerAsync', () => {
        const spy = jest.spyOn(playerManager as any, 'initializePlayerAsync');
        playerManager.initialize(100, 200);
        expect(spy).toHaveBeenCalled();
      });

      it('should call setupCharacterSwitchingV2', () => {
        const spy = jest.spyOn(playerManager as any, 'setupCharacterSwitchingV2');
        playerManager.initialize(100, 200);
        expect(spy).toHaveBeenCalled();
      });
    });

    describe('initializePlayerAsync method', () => {
      it('should check localStorage for character data', async () => {
        initializePlayerManager();
        localStorageMock.getItem.mockReturnValue(null);
        const spy = jest.spyOn(localStorage, 'getItem');
        await (playerManager as any).initializePlayerAsync();
        expect(spy).toHaveBeenCalledWith(`stargety_v2_active_character_${playerId}`);
      });

      it('should load V2 character successfully', async () => {
        const mockSprite = { setPosition: jest.fn(), setOrigin: jest.fn() };
        jest.spyOn(playerManager.avatarRendererV2, 'createOrUpdateSprite').mockResolvedValue(mockSprite as any);
        playerManager.playerContainer = scene.add.container(100, 200);

        await (playerManager as any).initializePlayerAsync();

        expect(playerManager.avatarRendererV2.createOrUpdateSprite).toHaveBeenCalledWith(playerId, 100, 200);
        expect(eventBus.publish).toHaveBeenCalledWith('world:playerJoined', {
          playerId,
          x: 100,
          y: 200,
        });
      });

      it('should handle V2 character loading failure', async () => {
        initializePlayerManager();
        jest.spyOn(playerManager.avatarRendererV2, 'createOrUpdateSprite').mockResolvedValue(null);

        await (playerManager as any).initializePlayerAsync();

        expect(eventBus.publish).toHaveBeenCalledWith('world:playerJoined', {
          playerId,
          x: 100,
          y: 200,
        });
      });

      it('should publish playerJoined event on success', async () => {
        initializePlayerManager();
        const mockSprite = { setPosition: jest.fn(), setOrigin: jest.fn() };
        jest.spyOn(playerManager.avatarRendererV2, 'createOrUpdateSprite').mockResolvedValue(mockSprite as any);

        await (playerManager as any).initializePlayerAsync();

        expect(eventBus.publish).toHaveBeenCalledWith('world:playerJoined', {
          playerId,
          x: 100,
          y: 200,
        });
      });

      it('should publish playerJoined event on failure', async () => {
        initializePlayerManager();
        jest.spyOn(playerManager.avatarRendererV2, 'createOrUpdateSprite').mockRejectedValue(new Error('Load failed'));

        await (playerManager as any).initializePlayerAsync();

        expect(eventBus.publish).toHaveBeenCalledWith('world:playerJoined', {
          playerId,
          x: 100,
          y: 200,
        });
      });
    });
  });

  describe('Character Switching', () => {
    describe('setupCharacterSwitchingV2 method', () => {
      it('should add event listener for characterSwitchedV2', () => {
        (playerManager as any).setupCharacterSwitchingV2();
        expect(addEventListenerMock).toHaveBeenCalledWith('characterSwitchedV2', expect.any(Function));
      });

      it('should handle characterSwitchedV2 events for current player', async () => {
        initializePlayerManager();
        (playerManager as any).setupCharacterSwitchingV2();
        const eventHandler = addEventListenerMock.mock.calls[0][1];

        const mockEvent = {
          detail: { username: playerId, slotNumber: 2 }
        };

        const updateSpy = jest.spyOn(playerManager as any, 'updatePlayerCharacterV2').mockResolvedValue(undefined);

        await eventHandler(mockEvent);

        expect(updateSpy).toHaveBeenCalledWith(2);
      });

      it('should ignore characterSwitchedV2 events for other players', async () => {
        (playerManager as any).setupCharacterSwitchingV2();
        const eventHandler = addEventListenerMock.mock.calls[0][1];

        const mockEvent = {
          detail: { username: 'other-player', slotNumber: 2 }
        };

        const updateSpy = jest.spyOn(playerManager as any, 'updatePlayerCharacterV2');

        await eventHandler(mockEvent);

        expect(updateSpy).not.toHaveBeenCalled();
      });
    });

    describe('updatePlayerCharacterV2 method', () => {
      it('should update player character to specified slot', async () => {
        initializePlayerManager();
        const mockSprite = { setPosition: jest.fn(), setOrigin: jest.fn(), setVisible: jest.fn(), setActive: jest.fn() };
        playerManager.player = { x: 100, y: 200, destroy: jest.fn() } as any;
        playerManager.playerContainer = { remove: jest.fn(), add: jest.fn(), x: 100, y: 200 } as any;

        jest.spyOn(playerManager.avatarRendererV2, 'createOrUpdateSprite').mockResolvedValue(mockSprite as any);
        jest.spyOn(playerManager.avatarRendererV2, 'playAnimation').mockReturnValue(true);

        await (playerManager as any).updatePlayerCharacterV2(1);

        expect(playerManager.avatarRendererV2.createOrUpdateSprite).toHaveBeenCalledWith(playerId, 100, 200, 1);
        expect(playerManager.avatarRendererV2.playAnimation).toHaveBeenCalledWith(playerId, AnimationCategory.IDLE);
      });

      it('should handle sprite update failure', async () => {
        initializePlayerManager();
        playerManager.player = { x: 100, y: 200 } as any;

        jest.spyOn(playerManager.avatarRendererV2, 'createOrUpdateSprite').mockResolvedValue(null);

        await (playerManager as any).updatePlayerCharacterV2(1);

        // Should not crash, just log warning
        expect(playerManager.avatarRendererV2.createOrUpdateSprite).toHaveBeenCalledWith(playerId, 100, 200, 1);
      });

      it('should play idle animation after update', async () => {
        const mockSprite = { setPosition: jest.fn(), setOrigin: jest.fn(), setVisible: jest.fn(), setActive: jest.fn() };
        playerManager.player = { x: 100, y: 200, destroy: jest.fn() } as any;
        playerManager.playerContainer = { remove: jest.fn(), add: jest.fn() } as any;

        jest.spyOn(playerManager.avatarRendererV2, 'createOrUpdateSprite').mockResolvedValue(mockSprite as any);
        const playAnimationSpy = jest.spyOn(playerManager.avatarRendererV2, 'playAnimation').mockReturnValue(true);

        await (playerManager as any).updatePlayerCharacterV2(1);

        expect(playAnimationSpy).toHaveBeenCalledWith(playerId, AnimationCategory.IDLE);
      });

      it('should log errors on failure', async () => {
        playerManager.player = { x: 100, y: 200 } as any;

        jest.spyOn(playerManager.avatarRendererV2, 'createOrUpdateSprite').mockRejectedValue(new Error('Update failed'));

        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        await (playerManager as any).updatePlayerCharacterV2(1);

        expect(consoleSpy).toHaveBeenCalledWith('[PlayerManager] ❌ Error updating player character:', expect.any(Error));
      });
    });
  });

  describe('Animation Handling', () => {
    describe('playAnimation method', () => {
      it('should play V2 animation for valid directions', () => {
        initializePlayerManager();
        playerManager.player = { setFlipX: jest.fn() } as any;
        jest.spyOn(playerManager.avatarRendererV2, 'hasSprite').mockReturnValue(true);
        jest.spyOn(playerManager.avatarRendererV2, 'playAnimation').mockReturnValue(true);

        playerManager.playAnimation('up');

        expect(playerManager.avatarRendererV2.playAnimation).toHaveBeenCalledWith(playerId, AnimationCategory.WALK_UP);
      });

      it('should handle idle animation', () => {
        initializePlayerManager();
        playerManager.player = { setFlipX: jest.fn() } as any;
        jest.spyOn(playerManager.avatarRendererV2, 'hasSprite').mockReturnValue(true);
        jest.spyOn(playerManager.avatarRendererV2, 'playAnimation').mockReturnValue(true);

        playerManager.playAnimation('idle');

        expect(playerManager.avatarRendererV2.playAnimation).toHaveBeenCalledWith(playerId, AnimationCategory.IDLE);
      });

      it('should warn and do nothing when V2 sprite is not available', () => {
        initializePlayerManager();
        playerManager.player = { setFlipX: jest.fn() } as any;
        jest.spyOn(playerManager.avatarRendererV2, 'hasSprite').mockReturnValue(false);
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
        const playAnimationSpy = jest.spyOn(playerManager.avatarRendererV2, 'playAnimation');

        playerManager.playAnimation('left');

        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('No V2 sprite available'));
        expect(playAnimationSpy).not.toHaveBeenCalled();
        expect(playerManager.player.setFlipX).not.toHaveBeenCalled();
      });
    });
  });

  describe('Position Management', () => {
    describe('getPosition method', () => {
      it('should return current player position', () => {
        playerManager.player = { x: 150, y: 250 } as any;
        const position = playerManager.getPosition();
        expect(position).toEqual({ x: 150, y: 250 });
      });
    });

    describe('setPosition method', () => {
      it('should update player position', () => {
        playerManager.player = { x: 0, y: 0 } as any;
        playerManager.setPosition(300, 400);
        expect(playerManager.player.x).toBe(300);
        expect(playerManager.player.y).toBe(400);
      });
    });

    describe('updateOriginalY method', () => {
      it('should update original Y position', () => {
        playerManager.updateOriginalY(350);
        expect(playerManager.originalY).toBe(350);
      });
    });
  });

  describe('Sprite and Container Access', () => {
    describe('getPlayer method', () => {
      it('should return the player sprite', () => {
        const mockSprite = { x: 100, y: 200 } as any;
        playerManager.player = mockSprite;
        expect(playerManager.getPlayer()).toBe(mockSprite);
      });
    });

    describe('getPlayerContainer method', () => {
      it('should return the player container', () => {
        const mockContainer = { x: 100, y: 200 } as any;
        playerManager.playerContainer = mockContainer;
        expect(playerManager.getPlayerContainer()).toBe(mockContainer);
      });
    });
  });

  describe('Cleanup', () => {
    describe('destroy method', () => {
      it('should cleanup avatar renderer resources', () => {
        const cleanupSpy = jest.spyOn(playerManager.avatarRendererV2, 'cleanup');
        playerManager.destroy();
        expect(cleanupSpy).toHaveBeenCalled();
      });
    });
  });
});