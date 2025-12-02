import Phaser from 'phaser';
import { PhaserMapRenderer } from './PhaserMapRenderer';
import { SharedMapSystem } from '../../shared/SharedMapSystem';
import { CollisionSystem } from './CollisionSystem';
import { WorldBoundsManager } from './WorldBoundsManager';
import { PlayerManager } from './PlayerManager';
import { MovementController } from './MovementController';
import { CameraController } from './CameraController';
import { DebugDiagnostics } from './DebugDiagnostics';
import { RemotePlayerManager } from './RemotePlayerManager';
import { WorldSocketService } from '../../services/WorldSocketService';
import { shouldBlockBackgroundInteractions } from '../../shared/ModalStateManager';
import { logger } from '../../shared/logger';

console.log('🎮🎮🎮 GameScene.ts FILE LOADED 🎮🎮🎮');

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
  private sharedMapSystem!: SharedMapSystem;
  private collisionSystem!: CollisionSystem;
  private worldBoundsManager!: WorldBoundsManager;
  private playerManager!: PlayerManager;
  private movementController!: MovementController;
  private cameraController!: CameraController;
  private debugDiagnostics!: DebugDiagnostics;

  // Multiplayer systems
  private remotePlayerManager!: RemotePlayerManager;
  private worldSocketService!: WorldSocketService;

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
    console.log('🎮🎮🎮 GameScene CONSTRUCTOR called for player:', playerId, 'in room:', worldRoomId);
    this.eventBus = eventBus;
    this.playerId = playerId;
    this.worldRoomId = worldRoomId;
    this.onAreaClick = onAreaClick;
    this.sharedMapSystem = SharedMapSystem.getInstance();
  }

  preload(): void {
    // V1 player-sheet removed - now using Avatar V2 system only
    // Initialize map renderer
    this.mapRenderer = new PhaserMapRenderer({
      scene: this,
      enablePhysics: false,
      enableInteractions: true,
      debugMode: false
    });
  }

  /**
   * Set map areas visibility (for admin debug toggle)
   */
  setMapAreasVisibility(visible: boolean): void {
    if (this.mapRenderer) {
      this.mapRenderer.setDebugMode(visible);
    }
  }

  create(): void {
    // Initialize and render map from localStorage
    this.mapRenderer.initialize().then(() => {
      // Map loaded successfully
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

    // Initialize collision system
    this.collisionSystem = new CollisionSystem(this, this.eventBus, this.onAreaClick);

    // Initialize movement controller
    this.movementController = new MovementController(this, this.eventBus, this.playerId, {
      getPlayer: () => this.playerManager.getPlayer(),
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
      getPlayer: () => this.playerManager.getPlayer(),
      getWorldBounds: () => this.worldBoundsManager.getWorldBounds(),
      calculateMinZoom: () => this.worldBoundsManager.calculateMinZoom()
    });
    this.cameraController.initialize(this.movementController.getCursors().space);

    // Initialize debug diagnostics
    this.debugDiagnostics = new DebugDiagnostics(this, {
      getPlayer: () => this.playerManager.getPlayer(),
      getWorldBounds: () => this.worldBoundsManager.getWorldBounds()
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
        logger.info(`[GameScene] onPlayerJoined callback: ${player.playerId}, self: ${this.playerId}`);
        if (player.playerId !== this.playerId) {
          this.remotePlayerManager.addPlayer(player);
        }
      },
      onPlayerMoved: (data) => {
        if (data.playerId !== this.playerId) {
          this.remotePlayerManager.updatePlayerPosition(data.playerId, data.x, data.y);
        }
      },
      onPlayerLeft: (data) => {
        logger.info(`[GameScene] onPlayerLeft callback: ${data.playerId}`);
        this.remotePlayerManager.removePlayer(data.playerId);
      },
      onWorldState: (data) => {
        logger.info(`[GameScene] onWorldState: received ${data.players.length} players, my playerId="${this.playerId}" (type: ${typeof this.playerId})`);
        // Log all players for debugging with detailed comparison
        data.players.forEach(p => {
          const isMe = p.id === this.playerId;
          const idMatch = `id="${p.id}" === playerId="${this.playerId}" ? ${isMe}`;
          logger.info(`[GameScene] Player in world-state: ${idMatch}, name="${p.name}", pos=(${p.x}, ${p.y})`);
        });
        // Add all existing players except self
        const otherPlayers = data.players.filter(p => p.id !== this.playerId);
        logger.info(`[GameScene] After filtering self: ${otherPlayers.length} other players (filtered out ${data.players.length - otherPlayers.length})`);
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
      this.worldSocketService.joinWorld(
        this.playerId,
        this.worldRoomId,
        initialX,
        initialY,
        this.playerId // Use playerId as display name (it's actually the username)
      );
    } else {
      logger.error('[GameScene] Failed to connect to socket server, multiplayer disabled');
    }
  }

  update(): void {
    const player = this.playerManager.getPlayer();
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
    this.collisionSystem.checkAreaCollisions(player);
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
    const player = this.playerManager.getPlayer();
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

