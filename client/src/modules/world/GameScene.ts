import Phaser from 'phaser';
import { PhaserMapRenderer } from './PhaserMapRenderer';
import { CollisionSystem } from './CollisionSystem';
import { WorldBoundsManager } from './WorldBoundsManager';
import { PlayerManager } from './PlayerManager';
import { MovementController } from './MovementController';
import { CameraController } from './CameraController';
import { DebugDiagnostics } from './DebugDiagnostics';
import { RemotePlayerManager } from './RemotePlayerManager';
import { WorldSocketService } from '../../services/WorldSocketService';
import { worldChatIntegration } from '../../services/integration/WorldChatIntegration';
import { shouldBlockBackgroundInteractions } from '../../shared/ModalStateManager';
import { logger } from '../../shared/logger';

/**
 * GameScene - Main Phaser scene for the game world
 * 
 * This is a thin orchestration layer that delegates to specialized modules:
 * - CollisionSystem: Handles collision detection
 * - WorldBoundsManager: Manages world dimensions
 * - PlayerManager: Manages player character
 * - MovementController: Handles input and movement
 * - CameraController: Manages camera and zoom
 * - DebugDiagnostics: Debug and diagnostic methods
 */
export class GameScene extends Phaser.Scene {
  private eventBus: any;
  private playerId: string;
  private worldRoomId: string;
  private onAreaClick: (areaId: string) => void;

  // Core systems
  private mapRenderer!: PhaserMapRenderer;
  private collisionSystem!: CollisionSystem;
  private worldBoundsManager!: WorldBoundsManager;
  private playerManager!: PlayerManager;
  private movementController!: MovementController;
  private cameraController!: CameraController;
  private debugDiagnostics!: DebugDiagnostics;

  // Multiplayer systems
  private remotePlayerManager!: RemotePlayerManager;
  private worldSocketService!: WorldSocketService;

  private myServerId: string | null = null;

  // Movement tracking
  private lastPlayerX: number = 0;
  private lastPlayerY: number = 0;

  // Double-click detection for teleportation
  private lastClickTime: number = 0;
  private doubleClickDelay: number = 300;
  private lastClickPosition: { x: number; y: number } = { x: 0, y: 0 };
  private doubleClickTolerance: number = 10;

  constructor(eventBus: any, playerId: string, worldRoomId: string, onAreaClick: (areaId: string) => void) {
    super({ key: 'GameScene' });
    logger.debug(`🎮🎮🎮 GameScene CONSTRUCTOR called for player: ${playerId} in room: ${worldRoomId}`);
    this.eventBus = eventBus;
    this.playerId = playerId;
    this.worldRoomId = worldRoomId;
    this.onAreaClick = onAreaClick;
  }

  preload(): void {
    // V1 player-sheet removed - now using Avatar V2 system only
    // V1 player-sheet removed - now using Avatar V2 system only
    // NOTE: PhaserMapRenderer instantiation moved to `create()` to ensure
    // Phaser renderer/texture systems are fully initialized before we call
    // any `scene.add` / texture APIs. This prevents `null` renderer errors.
  }

  /**
   * Set map areas visibility (for admin debug toggle)
   */
  setMapAreasVisibility(visible: boolean): void {
    if (this.mapRenderer) {
      this.mapRenderer.setDebugMode(visible);
    }
  }

  /**
   * Update map data from Redux (called from React component)
   */
  updateMapData(mapData: import('../../shared/MapDataContext').MapData | null): void {
    if (this.mapRenderer) {
      this.mapRenderer.updateMapData(mapData);
      logger.debug('[GameScene] Updated map data from Redux');
    }
    
    // Update world bounds when map dimensions are available
    // Only update if worldBoundsManager is initialized (after create() is called)
    if (mapData && mapData.worldDimensions && this.worldBoundsManager) {
      this.worldBoundsManager.updateWorldBounds(
        mapData.worldDimensions.width,
        mapData.worldDimensions.height,
        'redux-map-data'
      );
      logger.debug('[GameScene] Updated world bounds from map dimensions');
    }
  }

  create(): void {
    // Instantiate the map renderer now that the scene is created and Phaser
    // systems (renderer, textures, add, etc.) are available.
    if (!this.mapRenderer) {
      this.mapRenderer = new PhaserMapRenderer({
        scene: this,
        enablePhysics: false,
        enableInteractions: true,
        debugMode: false
      });
    }

    // Initialize and render map from localStorage
    this.mapRenderer.initialize().then(() => {
      logger.debug('Map loaded from localStorage');
    }).catch(error => {
      logger.error('Failed to load map data from localStorage', error);
    });

    // Set up interactive area click handling
    this.events.on('interactiveAreaClicked', (area: any) => {
      this.onAreaClick(area.id);
    });

    // Set camera background color to transparent
    this.cameras.main.setBackgroundColor('transparent');

    // V1 player_idle animation removed - now using Avatar V2 system only

    // Initialize world bounds manager
    this.worldBoundsManager = new WorldBoundsManager(this, () => {
      this.cameraController?.adjustViewportWithoutZoomReset();
    });
    this.worldBoundsManager.initialize();

    // Initialize player manager
    this.playerManager = new PlayerManager(this, this.eventBus, this.playerId);
    const worldBounds = this.worldBoundsManager.getWorldBounds();
    this.playerManager.initialize(worldBounds.width / 2, worldBounds.height / 2);

    // Initialize collision system with getMapData callback
    this.collisionSystem = new CollisionSystem(
      this,
      this.eventBus,
      this.onAreaClick,
      () => this.mapRenderer?.getMapData() ?? null
    );

    // Initialize movement controller (use container as authoritative position)
    this.movementController = new MovementController(this, this.eventBus, this.playerId, {
      getPlayer: () => this.playerManager.getPlayerContainer(),
      getOriginalY: () => this.playerManager.originalY,
      setOriginalY: (y: number) => this.playerManager.updateOriginalY(y),
      checkCollision: (x: number, y: number, size: number) => 
        this.collisionSystem.checkCollisionWithImpassableAreas(x, y, size),
      getWorldBounds: () => this.worldBoundsManager.getWorldBounds(),
      getPlayerSize: () => this.playerManager.playerSize
    });
    this.movementController.initialize();

    // Initialize camera controller
    this.cameraController = new CameraController(this, {
      // Camera should follow the container (world position)
      getPlayer: () => this.playerManager.getPlayerContainer(),
      getWorldBounds: () => this.worldBoundsManager.getWorldBounds(),
      calculateMinZoom: () => this.worldBoundsManager.calculateMinZoom()
    });
    this.cameraController.initialize(this.movementController.getCursors().space);

    // Initialize debug diagnostics with getMapData callback
    this.debugDiagnostics = new DebugDiagnostics(this, {
      // Diagnostics should inspect the container position as authoritative
      getPlayer: () => this.playerManager.getPlayerContainer(),
      getWorldBounds: () => this.worldBoundsManager.getWorldBounds(),
      getMapData: () => this.mapRenderer?.getMapData() ?? null
    });

    // Set up double-click teleportation
    this.setupDoubleClickTeleportation();

    // Set up resize observer
    this.setupResizeObserver();

    // Initialize multiplayer systems
    this.initializeMultiplayer();
  }

  /**
   * Initialize multiplayer systems (RemotePlayerManager + WorldSocketService)
   */
  private initializeMultiplayer(): void {
    logger.info('[GameScene] Initializing multiplayer for room:', this.worldRoomId);

    // Initialize remote player manager
    this.remotePlayerManager = new RemotePlayerManager(this);

    // Get WorldSocketService singleton
    this.worldSocketService = WorldSocketService.getInstance();

    // Initialize socket with callbacks
    this.worldSocketService.initialize({
      onPlayerJoined: (player) => {
        logger.debug(`[GameScene] onPlayerJoined callback: ${player.playerId}, self: ${this.playerId}`);
        if (player.name !== this.playerId) {
          this.remotePlayerManager.addPlayer(player);
        }
      },
      onPlayerMoved: (data) => {
        if (data.playerId !== this.myServerId) {
          this.remotePlayerManager.updatePlayerPosition(data.playerId, data.x, data.y);
        }
      },
      onPlayerLeft: (data) => {
        logger.debug(`[GameScene] onPlayerLeft callback: ${data.playerId}`);
        this.remotePlayerManager.removePlayer(data.playerId);
      },
      onWorldState: (data) => {
        logger.debug(`[GameScene] onWorldState: received ${data.players.length} players, my playerId="${this.playerId}"`);
        
        // Find the local player in the list to get their server-side ID
        const me = data.players.find(p => p.name === this.playerId);
        if (me) {
          this.myServerId = me.id;
          this.worldSocketService.setServerId(this.myServerId);
        }

        // Log all players for debugging with detailed comparison
        data.players.forEach(p => {
          const isMe = p.id === this.myServerId;
          const idMatch = `id="${p.id}" === myServerId="${this.myServerId}" ? ${isMe}`;
          logger.debug(`[GameScene] Player in world-state: ${idMatch}, name="${p.name}", pos=(${p.x}, ${p.y})`);
        });
        // Add all existing players except self
        const otherPlayers = data.players.filter(p => p.id !== this.myServerId);
        logger.debug(`[GameScene] After filtering self: ${otherPlayers.length} other players`);
        this.remotePlayerManager.handleWorldState(
          otherPlayers.map(p => ({
            playerId: p.id,
            x: p.x,
            y: p.y,
            name: p.name,
            avatarData: p.avatarData
          }))
        );
      },
      onError: (error) => {
        logger.error(`[GameScene] Socket error: ${error.message}`);
      }
    });

    // Wait for socket connection, then join world room
    this.joinMultiplayerWorld();

    // Set up character switch listener to emit avatar updates to other players
    this.setupCharacterSwitchListener();
  }

  /**
   * Listen for character switch events and emit avatar updates to multiplayer
   */
  private setupCharacterSwitchListener(): void {
    this.eventBus.subscribe('world:characterSwitched', async (data: { playerId: string; slotNumber: number }) => {
      logger.debug('[GameScene] Character switched event received:', data);

      // Get the updated character data to send to other players
      try {
        // Import CharacterStorage to load the character data
        const { CharacterStorage } = await import('../../components/avatar/v2/CharacterStorage');
        
        const result = CharacterStorage.loadCharacterSlot(data.playerId, data.slotNumber);
        if (result.success && result.data && 'spriteSheet' in result.data) {
          const character = result.data as any;
          
          // Prepare avatar sync data
          const avatarSyncData = {
            spriteSheetImageData: character.spriteSheet?.source?.imageData || '',
            frameWidth: character.spriteSheet?.gridLayout?.frameWidth || 32,
            frameHeight: character.spriteSheet?.gridLayout?.frameHeight || 32,
            characterName: character.name || 'Unknown'
          };

          // Emit avatar update through socket to other players
          if (this.worldSocketService) {
            this.worldSocketService.emitAvatarUpdate(avatarSyncData);
            logger.debug('[GameScene] Avatar update emitted for character:', character.name);
          }
        }
      } catch (error) {
        logger.error('[GameScene] Error emitting avatar update:', error);
      }
    });
  }

  /**
   * Wait for socket connection and join the world
   */
  private async joinMultiplayerWorld(): Promise<void> {
    const worldBounds = this.worldBoundsManager.getWorldBounds();
    const initialX = worldBounds.width / 2;
    const initialY = worldBounds.height / 2;

    // Wait for socket to be connected (with 5 second timeout)
    const connected = await this.worldSocketService.waitForConnection(5000);

    if (connected) {
      logger.info('[GameScene] Socket connected, joining world room:', this.worldRoomId);

      // Attempt to load active character/avatar data and include with join
      let avatarData: any = undefined;
      try {
        const { CharacterStorage } = await import('../../components/avatar/v2/CharacterStorage');
        const activeResult = CharacterStorage.getActiveCharacterSlot(this.playerId);
        if (activeResult.success && activeResult.data && !(activeResult.data as any).isEmpty) {
          const character = activeResult.data as any;
          avatarData = {
            spriteSheetImageData: character.cachedTexture || character.spriteSheet?.source?.imageData || '',
            frameWidth: character.spriteSheet?.gridLayout?.frameWidth || 32,
            frameHeight: character.spriteSheet?.gridLayout?.frameHeight || 32,
            characterName: character.name || ''
          };
          logger.debug('[GameScene] Found active character for join, attaching avatarData');
        } else {
          logger.debug('[GameScene] No active character found for player on join');
        }
      } catch (error) {
        logger.debug('[GameScene] Error loading active character for avatarData on join', error);
      }

      this.worldSocketService.joinWorld(
        this.playerId,
        this.worldRoomId,
        initialX,
        initialY,
        this.playerId, // Use playerId as display name (it's actually the username)
        avatarData
      );
    } else {
      logger.error('[GameScene] Failed to connect to socket server, multiplayer disabled');
    }
  }

  update(): void {
    // Use the player container as the authoritative world position
    const player = this.playerManager.getPlayerContainer();
    if (!player) return;

    // Check if background interactions are blocked (modal open)
    if (shouldBlockBackgroundInteractions()) {
      return; // Skip all movement and interaction logic
    }

    const cursors = this.movementController.getCursors();
    const speed = 4;
    let moved = false;
    let newX = player.x;
    let newY = player.y;

    // Handle movement input
    if (cursors.left.isDown) {
      newX -= speed;
      moved = true;
      this.playerManager.playAnimation('left');
    } else if (cursors.right.isDown) {
      newX += speed;
      moved = true;
      this.playerManager.playAnimation('right');
    }

    if (cursors.up.isDown) {
      newY -= speed;
      moved = true;
      this.playerManager.playAnimation('up');
    } else if (cursors.down.isDown) {
      newY += speed;
      moved = true;
      this.playerManager.playAnimation('down');
    }

    // Constrain to world bounds
    const worldBounds = this.worldBoundsManager.getWorldBounds();
    const playerSize = this.playerManager.playerSize;
    newX = Phaser.Math.Clamp(newX, playerSize / 2, worldBounds.width - playerSize / 2);
    newY = Phaser.Math.Clamp(newY, playerSize / 2, worldBounds.height - playerSize / 2);

    // Check collision before moving
    if (moved) {
      if (!this.collisionSystem.checkCollisionWithImpassableAreas(newX, newY, playerSize)) {
        // Update container position (authoritative)
        player.x = newX;
        player.y = newY;
        this.playerManager.updateOriginalY(player.y);
      }
    } else if (!this.movementController.isCurrentlyJumping()) {
      this.playerManager.playAnimation('idle');
    }

    // Publish movement events (local + network)
    if (player.x !== this.lastPlayerX || player.y !== this.lastPlayerY) {
      // Local event bus
      this.eventBus.publish('world:playerMoved', {
        playerId: this.playerId,
        x: player.x,
        y: player.y,
      });

      // Network: emit position to server for other players
      this.worldSocketService?.emitMove(player.x, player.y);

      this.lastPlayerX = player.x;
      this.lastPlayerY = player.y;
    }

    // Update remote players (smooth interpolation)
    this.remotePlayerManager?.update();

    // Check area collisions
    // Pass the container to area collision checks (signature accepts container now)
    this.collisionSystem.checkAreaCollisions(player as any);
  }

  /**
   * Set up double-click teleportation
   */
  private setupDoubleClickTeleportation(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // Check if background interactions are blocked
      if (shouldBlockBackgroundInteractions()) {
        return;
      }

      const currentTime = this.time.now;
      const timeSinceLastClick = currentTime - this.lastClickTime;
      const distanceFromLastClick = Phaser.Math.Distance.Between(
        pointer.worldX,
        pointer.worldY,
        this.lastClickPosition.x,
        this.lastClickPosition.y
      );

      if (timeSinceLastClick < this.doubleClickDelay && 
          distanceFromLastClick < this.doubleClickTolerance) {
        // Double-click detected
        this.teleportPlayerToPosition(pointer.worldX, pointer.worldY);
      }

      this.lastClickTime = currentTime;
      this.lastClickPosition = { x: pointer.worldX, y: pointer.worldY };
    });
  }

  /**
   * Teleport player to position
   */
  private teleportPlayerToPosition(x: number, y: number): void {
    const player = this.playerManager.getPlayerContainer();
    if (!player) return;

    const worldBounds = this.worldBoundsManager.getWorldBounds();
    const playerSize = this.playerManager.playerSize;

    // Constrain to world bounds
    const constrainedX = Phaser.Math.Clamp(x, playerSize / 2, worldBounds.width - playerSize / 2);
    const constrainedY = Phaser.Math.Clamp(y, playerSize / 2, worldBounds.height - playerSize / 2);

    // Check collision at target position
    if (!this.collisionSystem.checkCollisionWithImpassableAreas(constrainedX, constrainedY, playerSize)) {
      player.x = constrainedX;
      player.y = constrainedY;
      this.playerManager.updateOriginalY(player.y);

      // Publish movement event
      this.eventBus.publish('world:playerMoved', {
        playerId: this.playerId,
        x: player.x,
        y: player.y,
      });

      logger.debug('Player teleported to:', { x: constrainedX, y: constrainedY });
    } else {
      logger.warn('Cannot teleport to position - collision detected');
    }
  }

  /**
   * Set up resize observer
   */
  private setupResizeObserver(): void {
    this.scale.on('resize', () => {
      this.cameraController?.adjustViewportWithoutZoomReset();
    });
  }

  shutdown(): void {
    // Cleanup all systems
    this.mapRenderer?.destroy();
    this.playerManager?.destroy();
    this.movementController?.destroy();
    this.cameraController?.destroy();
    this.worldBoundsManager?.destroy();
    this.collisionSystem?.resetAreaTracking();
  }

  // Public API for React component

  public zoomIn(): void {
    if (!this.cameraController) return;
    this.cameraController.zoomIn();
  }

  public zoomOut(): void {
    if (!this.cameraController) return;
    this.cameraController.zoomOut();
  }

  public resetZoom(): void {
    if (!this.cameraController) return;
    this.cameraController.resetZoom();
  }

  public canZoomIn(): boolean {
    if (!this.cameraController) return false;
    return this.cameraController.canZoomIn();
  }

  public canZoomOut(): boolean {
    if (!this.cameraController) return false;
    return this.cameraController.canZoomOut();
  }

  public centerCameraOnPlayer(): void {
    if (!this.cameraController) return;
    this.cameraController.centerCameraOnPlayer();
  }

  public enableCameraFollowing(): void {
    this.cameraController.enableCameraFollowing();
  }

  public disableCameraFollowing(): void {
    if (!this.cameraController) return;
    this.cameraController.disableCameraFollowing();
  }

  public isCameraFollowingPlayer(): boolean {
    if (!this.cameraController) return false;
    return this.cameraController.isCameraFollowingPlayer();
  }

  public getPlayer(): Phaser.GameObjects.Sprite | null {
    return this.playerManager?.getPlayer() || null;
  }

  public getWorldBounds(): { width: number; height: number } {
    return this.worldBoundsManager.getWorldBounds();
  }

  // Debug methods (delegated to DebugDiagnostics)

  public collectEnhancedDebugData(): any {
    return this.debugDiagnostics.collectEnhancedDebugData();
  }

  public validateObjectPositioning(): any {
    return this.debugDiagnostics.validateObjectPositioning();
  }

  public testCharacterCentering(): any {
    return this.debugDiagnostics.testCharacterCentering();
  }

  public adjustViewportWithoutZoomReset(): void {
    if (!this.cameraController) return;
    this.cameraController.adjustViewportWithoutZoomReset();
  }
}

