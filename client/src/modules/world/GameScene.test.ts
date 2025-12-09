import { GameScene } from './GameScene';
import { WorldSocketService } from '../../services/WorldSocketService';
import { RemotePlayerManager } from './RemotePlayerManager';

// Mock dependencies
jest.mock('../../services/WorldSocketService');
jest.mock('./RemotePlayerManager');
jest.mock('phaser', () => {
    return {
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
    };
});

describe('GameScene Multiplayer', () => {
    let gameScene: any;
    let mockWorldSocketService: jest.Mocked<WorldSocketService>;
    let mockRemotePlayerManager: any; // This will be the instance from the mock constructor
    let eventBus: any;
    let socketCallbacks: any;

    const localPlayerId = 'localPlayer';
    const remotePlayerId = 'remotePlayer';

    beforeEach(async () => {
        // Clear all mocks
        jest.clearAllMocks();

        // Mock singleton getInstance
        mockWorldSocketService = new (WorldSocketService as any)();
        (WorldSocketService.getInstance as jest.Mock) = jest.fn(() => mockWorldSocketService);

        // Capture the callbacks
        mockWorldSocketService.initialize.mockImplementation((callbacks) => {
            socketCallbacks = callbacks;
        });

        // Mock waitForConnection to simulate a successful connection
        mockWorldSocketService.waitForConnection.mockResolvedValue(true);

        eventBus = { publish: jest.fn() };
        
        // We need to bypass the constructor and manually initialize for testing
        gameScene = new GameScene(eventBus, localPlayerId, 'test-room', jest.fn());

        // Mock other managers that are initialized in create()
        gameScene.worldBoundsManager = {
            getWorldBounds: jest.fn().mockReturnValue({ width: 800, height: 600 }),
            destroy: jest.fn(),
        };
        gameScene.playerManager = {
            getPlayer: jest.fn(),
            playerSize: 32,
            destroy: jest.fn(),
        };

        // Manually call the initialization method that sets up socket listeners
        // This will create a mock instance of RemotePlayerManager
        await gameScene.initializeMultiplayer();

        // Get the mock instance that was created inside GameScene
        mockRemotePlayerManager = (RemotePlayerManager as jest.Mock).mock.instances[0];
    });

    afterEach(() => {
        gameScene.shutdown();
    });

    test('Test Case 1: A remote player joins the room', () => {
        // Simulate the onPlayerJoined event
        const remotePlayerData = { playerId: remotePlayerId, name: remotePlayerId, x: 100, y: 100, avatarData: {} };
        
        socketCallbacks.onPlayerJoined(remotePlayerData);

        expect(mockRemotePlayerManager.addPlayer).toHaveBeenCalledTimes(1);
        expect(mockRemotePlayerManager.addPlayer).toHaveBeenCalledWith(remotePlayerData);
    });

    test('Test Case 2: The local player does not render themselves as a remote player', () => {
        // Simulate the onPlayerJoined event for the local player
        const localPlayerData = { playerId: localPlayerId, name: localPlayerId, x: 100, y: 100, avatarData: {} };
        
        socketCallbacks.onPlayerJoined(localPlayerData);

        expect(mockRemotePlayerManager.addPlayer).not.toHaveBeenCalled();
    });

    test('Test Case 3: Initial world state with multiple players', () => {
        // Simulate the onWorldState event
        const players = [
            { id: localPlayerId, name: localPlayerId, x: 50, y: 50, avatarData: {} },
            { id: remotePlayerId, name: remotePlayerId, x: 100, y: 100, avatarData: {} }
        ];
        
        socketCallbacks.onWorldState({ players });

        const expectedRemotePlayerData = {
            playerId: remotePlayerId,
            x: 100,
            y: 100,
            name: remotePlayerId,
            avatarData: {}
        };

        expect(mockRemotePlayerManager.handleWorldState).toHaveBeenCalledTimes(1);
        expect(mockRemotePlayerManager.handleWorldState).toHaveBeenCalledWith([expectedRemotePlayerData]);
    });

    test('Test Case 4: A remote player leaves', () => {
        // Simulate the onPlayerLeft event
        socketCallbacks.onPlayerLeft({ playerId: remotePlayerId });

        expect(mockRemotePlayerManager.removePlayer).toHaveBeenCalledTimes(1);
        expect(mockRemotePlayerManager.removePlayer).toHaveBeenCalledWith(remotePlayerId);
    });

    test('Test Case 5: When two players are in a room, they should see each other', () => {
        // Simulate the initial world state having the local player and one remote player
        const initialRemotePlayer = { id: 'remotePlayer1', name: 'remotePlayer1', x: 100, y: 100, avatarData: {} };
        const playersInWorld = [
            { id: localPlayerId, name: localPlayerId, x: 50, y: 50, avatarData: {} },
            initialRemotePlayer
        ];
        
        socketCallbacks.onWorldState({ players: playersInWorld });

        const expectedRemotePlayerData = {
            playerId: initialRemotePlayer.id,
            x: initialRemotePlayer.x,
            y: initialRemotePlayer.y,
            name: initialRemotePlayer.name,
            avatarData: initialRemotePlayer.avatarData
        };

        // Verify that the remote player from the world state is rendered.
        // This is the local player "seeing" the remote player that was already in the room.
        expect(mockRemotePlayerManager.handleWorldState).toHaveBeenCalledTimes(1);
        expect(mockRemotePlayerManager.handleWorldState).toHaveBeenCalledWith([expectedRemotePlayerData]);

        // Now, simulate a second remote player joining the room
        const newRemotePlayer = { playerId: 'remotePlayer2', name: 'remotePlayer2', x: 200, y: 200, avatarData: {} };
        socketCallbacks.onPlayerJoined(newRemotePlayer);
        
        // Verify that the new remote player is also rendered.
        // This is the local player "seeing" a new player that joins.
        expect(mockRemotePlayerManager.addPlayer).toHaveBeenCalledTimes(1);
        expect(mockRemotePlayerManager.addPlayer).toHaveBeenCalledWith(newRemotePlayer);
    });
});
