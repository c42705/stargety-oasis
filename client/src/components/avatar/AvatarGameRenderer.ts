import { AvatarConfig } from './avatarTypes';
import { composeAvatarSpriteSheet } from './composeAvatar';
import { loadAvatarConfig } from './avatarStorage';

/**
 * Simplified Avatar Game Renderer
 * Focuses on core sprite movement animations with clean, maintainable code
 */
export class AvatarGameRenderer {
  private scene: Phaser.Scene;
  private avatarSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();
  private lastAnimations: Map<string, string> = new Map(); // Track last animation to prevent unnecessary restarts
  private updateTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private debugMode: boolean = true; // Enable detailed logging for debugging

  /**
   * Enable or disable debug logging
   */
  public setDebugMode(enabled: boolean): void {
    this.debugMode = enabled;
    console.log(`AvatarGameRenderer debug logging ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Create a timestamped log message with username context
   */
  private log(phase: string, username: string, message: string, data?: any): void {
    if (!this.debugMode) return;

    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [AvatarRenderer:${phase}] [${username}] ${message}`;

    if (data !== undefined) {
      console.log(logMessage, data);
    } else {
      console.log(logMessage);
    }
  }

  /**
   * Log error with context
   */
  private logError(phase: string, username: string, message: string, error?: any): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [AvatarRenderer:${phase}] [${username}] ERROR: ${message}`;

    if (error !== undefined) {
      console.error(logMessage, error);
    } else {
      console.error(logMessage);
    }
  }

  /**
   * Log a summary of the debugging phases available
   */
  public logDebuggingInfo(): void {
    console.log(`
🔍 AvatarGameRenderer Debug Logging Phases:

1. SpriteSheetLoading - Tracks sprite sheet URL composition and loading
2. FrameTextureCreation - Monitors individual frame extraction from 3x3 grid
3. AnimationCreation - Logs creation of movement animations (up/down/left/right/idle)
4. SpriteDisplay - Tracks sprite creation and texture assignment
5. AnimationPlayback - Monitors animation playback requests and execution

Debug mode: ${this.debugMode ? 'ENABLED' : 'DISABLED'}
Use avatarRenderer.setDebugMode(true/false) to toggle logging.

Current issue: Sprites displaying as full textures instead of individual frames.
Focus on FrameTextureCreation phase to debug sprite sheet frame division.
    `);
  }

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    // Listen for avatar updates with debouncing
    window.addEventListener('avatarConfigUpdated', async (event) => {
      const customEvent = event as CustomEvent;
      const { username, config } = customEvent.detail;

      // Clear any existing timeout for this user
      const existingTimeout = this.updateTimeouts.get(username);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Debounce avatar updates to prevent rapid successive calls
      const timeout = setTimeout(async () => {
        await this.updatePlayerAvatar(username, config);
        this.updateTimeouts.delete(username);
      }, 300);

      this.updateTimeouts.set(username, timeout);
    });
  }

  /**
   * Load and create avatar sprite sheet for animations
   * Simplified approach focusing on reliability and maintainability
   */
  public async loadPlayerAvatarSpriteSheet(username: string): Promise<string | null> {
    this.log('SpriteLoadingPhase', username, 'Sprite sheet texture loading begins');

    try {
      this.log('SpriteLoadingPhase', username, 'Loading avatar configuration');

      // Load saved avatar config for this user
      const config = loadAvatarConfig(username);
      if (!config) {
        this.log('SpriteLoadingPhase', username, 'No config found, using default texture', {
          fallbackTexture: 'terra-branford'
        });
        return this.createDefaultSpriteSheet(username);
      }

      this.log('SpriteLoadingPhase', username, 'Avatar config loaded successfully', {
        configKeys: Object.keys(config), configValid: true
      });

      // Compose the avatar into a sprite sheet
      this.log('SpriteLoadingPhase', username, 'Composing avatar sprite sheet from config');
      const avatarSpriteSheetUrl = await composeAvatarSpriteSheet(config);

      if (!avatarSpriteSheetUrl) {
        this.logError('SpriteLoadingPhase', username, 'Composition failed, using default texture');
        return this.createDefaultSpriteSheet(username);
      }

      this.log('SpriteLoadingPhase', username, 'Avatar sprite sheet composed successfully', {
        urlLength: avatarSpriteSheetUrl.length, dataType: 'base64', compositionSuccess: true
      });

      return this.createSpriteSheetFromUrl(username, avatarSpriteSheetUrl);

    } catch (error) {
      this.logError('SpriteSheetLoading', username, 'Error loading avatar sprite sheet', error);
      return this.createDefaultSpriteSheet(username);
    }
  }

  /**
   * Create sprite sheet from URL using Phaser's built-in sprite sheet system
   * FOLLOWS PHASER BEST PRACTICES: Uses addSpriteSheet() instead of manual canvas manipulation
   */
  private async createSpriteSheetFromUrl(username: string, spriteSheetUrl: string): Promise<string | null> {
    const textureKey = `avatar_sheet_${username}`;
    this.log('SpriteSheetLoading', username, 'Creating sprite sheet using Phaser built-in system', { textureKey });

    // Check if texture already exists and is valid - if so, reuse it
    if (this.scene.textures.exists(textureKey)) {
      this.log('SpriteSheetLoading', username, 'Texture already exists, reusing existing sprite sheet', { textureKey });

      // Create animations for existing texture and return it
      this.createMovementAnimationsFromSpriteSheet(username, textureKey);
      this.log('SpriteSheetLoading', username, 'Avatar sprite sheet loading completed successfully (reused existing)');
      return textureKey;
    }

    return new Promise<string | null>((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          // Log texture dimensions and validation
          const dimensions = {
            width: img.width, height: img.height,
            naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight
          };
          this.log('SpriteLoadingPhase', username, 'Texture dimensions loaded', dimensions);

          // Validate texture dimensions
          const validDimensions = img.width > 0 && img.height > 0 && img.width === img.height;
          const expectedSize = img.width >= 192; // Minimum for 3x3 grid with 64px frames
          this.log('SpriteLoadingPhase', username, 'Texture validation status', {
            validDimensions, expectedSize, isSquare: img.width === img.height
          });

          // Calculate frame dimensions for 3x3 grid
          const frameWidth = Math.floor(img.width / 3);
          const frameHeight = Math.floor(img.height / 3);
          this.log('SpriteSheetLoading', username, 'Calculated frame dimensions for 3x3 grid', {
            frameWidth,
            frameHeight,
            totalFrames: 9
          });

          // Validate scene is still active
          if (!this.scene?.textures?.game) {
            this.logError('SpriteSheetLoading', username, 'Scene not ready for sprite sheet creation');
            resolve(null);
            return;
          }

          // PHASER BEST PRACTICE: Use built-in addSpriteSheet method
          this.log('PhaserTextureProcessing', username, 'Calling addSpriteSheet() with frame params', {
            frameWidth, frameHeight, startFrame: 0, endFrame: 8
          });

          try {
            // Create sprite sheet using Phaser's built-in method
            this.scene.textures.addSpriteSheet(textureKey, img, {
              frameWidth: frameWidth,
              frameHeight: frameHeight,
              startFrame: 0,
              endFrame: 8 // 9 frames total (0-8)
            });

            // Validate sprite sheet registration
            const texture = this.scene.textures.get(textureKey);
            const frameCount = texture ? Object.keys(texture.frames).length - 1 : 0; // -1 for __BASE frame

            this.log('PhaserTextureProcessing', username, 'Sprite sheet registered in Phaser texture manager', {
              textureKey, frameCount, registrationSuccess: frameCount === 9
            });

            // Validate individual frames exist
            let validFrameCount = 0;
            for (let i = 0; i < 9; i++) {
              try {
                const frameKey = i.toString();
                const frameExists = texture && texture.frames && (frameKey in texture.frames);
                if (frameExists) {
                  validFrameCount++;
                } else {
                  this.logError('PhaserTextureProcessing', username, `Frame ${i} validation failed`);
                }
              } catch (frameError) {
                this.logError('PhaserTextureProcessing', username, `Frame ${i} check error`, frameError);
              }
            }

            this.log('PhaserTextureProcessing', username, 'Frame validation completed', {
              totalFrames: 9, validFrames: validFrameCount, allFramesValid: validFrameCount === 9
            });

            // Create animations using Phaser sprite sheet frames
            this.createMovementAnimationsFromSpriteSheet(username, textureKey);

            this.log('SpriteLoadingPhase', username, 'Sprite sheet texture loading completes', {
              textureKey, loadingSuccess: true, readyForSprites: true
            });

            // Return the sprite sheet texture key (Phaser will handle frame selection)
            resolve(textureKey);

          } catch (spriteSheetError) {
            this.logError('SpriteSheetLoading', username, 'Failed to create sprite sheet with Phaser method', spriteSheetError);
            resolve(null);
          }

        } catch (error) {
          this.logError('SpriteSheetLoading', username, 'Error creating sprite sheet', error);
          resolve(null);
        }
      };

      img.onerror = () => {
        this.logError('SpriteSheetLoading', username, 'Failed to load sprite sheet image from URL');
        resolve(null);
      };

      img.src = spriteSheetUrl;
    });
  }

  /**
   * Create default sprite sheet using Terra Branford texture
   */
  private createDefaultSpriteSheet(username: string): string | null {
    try {
      const textureKey = `terra_sheet_${username}`;

      // Remove existing texture if it exists
      if (this.scene.textures.exists(textureKey)) {
        this.scene.textures.remove(textureKey);
      }

      // Check if Terra Branford texture is available
      if (!this.scene.textures.exists('terra-branford')) {
        console.warn(`Terra Branford texture not found for ${username}`);
        return null;
      }

      // Create simple frame textures using Terra Branford
      const frameTextures = this.createDefaultFrameTextures(username);
      if (frameTextures.length > 0) {
        this.createMovementAnimations(username, frameTextures);
        console.log(`Default Terra Branford sprite sheet created for ${username}`);
        return frameTextures[1]; // Return idle frame
      }

      return null;
    } catch (error) {
      console.error(`Error creating default sprite sheet for ${username}:`, error);
      return null;
    }
  }

  /**
   * PHASER BEST PRACTICE: Create movement animations from sprite sheet using built-in frame system
   * This method follows Phaser.js official documentation for sprite sheet animations
   */
  private createMovementAnimationsFromSpriteSheet(username: string, spriteSheetKey: string): void {
    this.log('AnimationSystemSetup', username, 'Starting animation system setup', {
      spriteSheetKey, totalAnimations: 5
    });

    const animPrefix = `${username}_`;

    // Check if animations already exist - if so, skip creation to avoid conflicts
    const existingAnims = ['walk_down', 'walk_left', 'walk_up', 'walk_right', 'idle'];
    const animationsExist = existingAnims.every(anim => this.scene.anims.exists(`${animPrefix}${anim}`));

    if (animationsExist) {
      this.log('AnimationCreation', username, 'All animations already exist, skipping creation', {
        existingAnimKeys: existingAnims.map(anim => `${animPrefix}${anim}`)
      });
      return;
    }

    this.log('AnimationCreation', username, 'Creating new animations (some may not exist yet)', { existingAnims });

    // PHASER BEST PRACTICE: Use sprite sheet frame references
    // Frame layout in 3x3 grid:
    // 0 1 2  (Row 0: Walking down)
    // 3 4 5  (Row 1: Walking left)
    // 6 7 8  (Row 2: Walking up)

    try {
      // Walking down animation (frames 0, 1, 2)
      const walkDownKey = `${animPrefix}walk_down`;
      if (!this.scene.anims.exists(walkDownKey)) {
        this.log('AnimationSystemSetup', username, 'Creating walk_down animation', {
          key: walkDownKey, frames: [0, 1, 2], frameRate: 8
        });

        try {
          this.scene.anims.create({
            key: walkDownKey,
            frames: this.scene.anims.generateFrameNumbers(spriteSheetKey, { start: 0, end: 2 }),
            frameRate: 8,
            repeat: -1
          });

          const registered = this.scene.anims.exists(walkDownKey);
          this.log('AnimationSystemSetup', username, 'walk_down registration result', {
            success: registered, key: walkDownKey
          });
        } catch (animError) {
          this.logError('AnimationSystemSetup', username, 'walk_down creation failed', animError);
        }
      } else {
        this.log('AnimationSystemSetup', username, 'walk_down already exists, skipping');
      }

      // Walking left animation (frames 3, 4, 5)
      const walkLeftKey = `${animPrefix}walk_left`;
      if (!this.scene.anims.exists(walkLeftKey)) {
        this.log('AnimationCreation', username, 'Creating walk_left animation with sprite sheet frames', {
          animationKey: walkLeftKey,
          frames: [3, 4, 5],
          spriteSheetKey
        });

        this.scene.anims.create({
          key: walkLeftKey,
          frames: this.scene.anims.generateFrameNumbers(spriteSheetKey, { start: 3, end: 5 }),
          frameRate: 8,
          repeat: -1
        });
      } else {
        this.log('AnimationCreation', username, 'walk_left animation already exists, skipping', { walkLeftKey });
      }

      // Walking up animation (frames 6, 7, 8)
      const walkUpKey = `${animPrefix}walk_up`;
      if (!this.scene.anims.exists(walkUpKey)) {
        this.log('AnimationCreation', username, 'Creating walk_up animation with sprite sheet frames', {
          animationKey: walkUpKey,
          frames: [6, 7, 8],
          spriteSheetKey
        });

        this.scene.anims.create({
          key: walkUpKey,
          frames: this.scene.anims.generateFrameNumbers(spriteSheetKey, { start: 6, end: 8 }),
          frameRate: 8,
          repeat: -1
        });
      } else {
        this.log('AnimationCreation', username, 'walk_up animation already exists, skipping', { walkUpKey });
      }

      // Walking right animation (reuse left frames, sprite will be flipped)
      const walkRightKey = `${animPrefix}walk_right`;
      if (!this.scene.anims.exists(walkRightKey)) {
        this.log('AnimationCreation', username, 'Creating walk_right animation with sprite sheet frames', {
          animationKey: walkRightKey,
          frames: [3, 4, 5],
          spriteSheetKey,
          note: 'Reusing left frames, sprite will be flipped'
        });

        this.scene.anims.create({
          key: walkRightKey,
          frames: this.scene.anims.generateFrameNumbers(spriteSheetKey, { start: 3, end: 5 }),
          frameRate: 8,
          repeat: -1
        });
      } else {
        this.log('AnimationCreation', username, 'walk_right animation already exists, skipping', { walkRightKey });
      }

      // Idle animation (single frame - middle frame of walking down)
      const idleKey = `${animPrefix}idle`;
      if (!this.scene.anims.exists(idleKey)) {
        this.log('AnimationCreation', username, 'Creating idle animation with sprite sheet frame', {
          animationKey: idleKey,
          frame: 1,
          spriteSheetKey
        });

        this.scene.anims.create({
          key: idleKey,
          frames: this.scene.anims.generateFrameNumbers(spriteSheetKey, { start: 1, end: 1 }),
          frameRate: 1
        });
      } else {
        this.log('AnimationCreation', username, 'idle animation already exists, skipping', { idleKey });
      }

      // Verify all animations were created successfully
      const createdAnimations = [walkDownKey, walkLeftKey, walkUpKey, walkRightKey, idleKey];
      const successfulAnimations = createdAnimations.filter(key => this.scene.anims.exists(key));

      this.log('AnimationCreation', username, 'Sprite sheet animation creation completed', {
        totalAnimations: createdAnimations.length,
        successfulAnimations: successfulAnimations.length,
        createdKeys: successfulAnimations,
        failedKeys: createdAnimations.filter(key => !this.scene.anims.exists(key)),
        method: 'Phaser built-in sprite sheet system'
      });

    } catch (error) {
      this.logError('AnimationCreation', username, 'Error creating sprite sheet animations', error);
    }
  }

  /**
   * LEGACY/CUSTOM METHOD: Create individual frame textures from sprite sheet image
   *
   * WHY CUSTOM: This method was created for manual frame extraction using canvas manipulation
   * STANDARD APPROACH: Use Phaser's built-in addSpriteSheet() method instead
   * WHEN TO USE: Only if dynamic avatar composition requires individual texture manipulation
   *
   * NOTE: This method is kept for backward compatibility but is not recommended
   * for standard sprite sheet animations. Use createMovementAnimationsFromSpriteSheet() instead.
   */
  private createIndividualFrameTextures(
    username: string,
    img: HTMLImageElement,
    frameWidth: number,
    frameHeight: number
  ): string[] {
    this.log('FrameTextureCreation', username, 'Starting frame texture creation', {
      imageWidth: img.width,
      imageHeight: img.height,
      frameWidth,
      frameHeight,
      expectedFrames: 9
    });

    const frameTextures: string[] = [];
    const baseKey = `avatar_sheet_${username}`;

    try {
      for (let i = 0; i < 9; i++) {
        const col = i % 3;
        const row = Math.floor(i / 3);
        const x = col * frameWidth;
        const y = row * frameHeight;

        this.log('FrameTextureCreation', username, `Creating frame ${i}`, {
          frameIndex: i,
          gridPosition: { col, row },
          sourceCoords: { x, y },
          frameSize: { width: frameWidth, height: frameHeight }
        });

        // Create canvas for this frame
        const frameCanvas = document.createElement('canvas');
        frameCanvas.width = frameWidth;
        frameCanvas.height = frameHeight;
        const frameCtx = frameCanvas.getContext('2d');

        if (frameCtx) {
          // Draw only the specific frame portion
          frameCtx.drawImage(img, x, y, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);

          this.log('FrameTextureCreation', username, `Frame ${i} drawn to canvas`, {
            canvasSize: { width: frameCanvas.width, height: frameCanvas.height },
            drawParams: { sx: x, sy: y, sw: frameWidth, sh: frameHeight, dx: 0, dy: 0, dw: frameWidth, dh: frameHeight }
          });

          // Create texture for this frame
          const frameTextureKey = `${baseKey}_frame_${i}`;

          try {
            this.scene.textures.addCanvas(frameTextureKey, frameCanvas);

            // Verify texture was created successfully
            if (this.scene.textures.exists(frameTextureKey)) {
              frameTextures.push(frameTextureKey);
              this.log('FrameTextureCreation', username, `Frame ${i} texture created successfully`, {
                textureKey: frameTextureKey,
                textureExists: true
              });
            } else {
              this.logError('FrameTextureCreation', username, `Frame ${i} texture creation failed - texture does not exist`, {
                textureKey: frameTextureKey
              });
            }
          } catch (textureError) {
            this.logError('FrameTextureCreation', username, `Failed to add canvas texture for frame ${i}`, {
              textureKey: frameTextureKey,
              error: textureError
            });
          }
        } else {
          this.logError('FrameTextureCreation', username, `Failed to get 2D context for frame ${i} canvas`);
        }
      }

      this.log('FrameTextureCreation', username, 'Frame texture creation completed', {
        totalFramesCreated: frameTextures.length,
        expectedFrames: 9,
        success: frameTextures.length === 9,
        createdTextureKeys: frameTextures
      });

    } catch (error) {
      this.logError('FrameTextureCreation', username, 'Error creating individual frame textures', error);
    }

    return frameTextures;
  }

  /**
   * Create default frame textures using Terra Branford
   */
  private createDefaultFrameTextures(username: string): string[] {
    const frameTextures: string[] = [];
    const baseKey = `terra_sheet_${username}`;

    try {
      // Create 9 frame textures using Terra Branford texture
      for (let i = 0; i < 9; i++) {
        const frameTextureKey = `${baseKey}_frame_${i}`;
        
        // Use Terra Branford texture for all frames (simple approach)
        if (this.scene.textures.exists('terra-branford')) {
          // Copy the Terra Branford texture for each frame
          const terraTexture = this.scene.textures.get('terra-branford');
          const terraFrame = terraTexture.get();
          
          if (terraFrame.source.image instanceof HTMLImageElement) {
            const canvas = document.createElement('canvas');
            canvas.width = 32;
            canvas.height = 32;
            const ctx = canvas.getContext('2d');
            
            if (ctx) {
              ctx.drawImage(terraFrame.source.image, 0, 0, 32, 32);
              this.scene.textures.addCanvas(frameTextureKey, canvas);
              frameTextures.push(frameTextureKey);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Error creating default frame textures for ${username}:`, error);
    }

    return frameTextures;
  }

  /**
   * LEGACY/CUSTOM METHOD: Create movement animations using individual frame textures
   *
   * WHY CUSTOM: This method creates animations from manually extracted canvas textures
   * STANDARD APPROACH: Use createMovementAnimationsFromSpriteSheet() with Phaser's built-in sprite sheet system
   * WHEN TO USE: Only if dynamic avatar composition requires individual texture manipulation
   *
   * NOTE: This method is kept for backward compatibility but is not recommended
   * for standard sprite sheet animations. Use createMovementAnimationsFromSpriteSheet() instead.
   */
  private createMovementAnimations(username: string, frameTextures: string[]): void {
    this.log('AnimationCreation', username, 'Starting movement animation creation', {
      frameTextureCount: frameTextures.length,
      frameTextures: frameTextures
    });

    const animPrefix = `${username}_`;

    // Remove existing animations for this player
    const existingAnims = ['walk_down', 'walk_left', 'walk_up', 'walk_right', 'idle'];
    this.log('AnimationCreation', username, 'Removing existing animations', { existingAnims });

    existingAnims.forEach(anim => {
      const key = `${animPrefix}${anim}`;
      if (this.scene.anims.exists(key)) {
        this.scene.anims.remove(key);
        this.log('AnimationCreation', username, `Removed existing animation: ${key}`);
      }
    });

    // Create movement animations using individual frame textures
    // Row 0 (frames 0,1,2): Walking down
    const walkDownKey = `${animPrefix}walk_down`;
    const walkDownFrames = [frameTextures[0], frameTextures[1], frameTextures[2]];
    this.log('AnimationCreation', username, 'Creating walk_down animation', {
      animationKey: walkDownKey,
      frameKeys: walkDownFrames,
      frameRate: 8
    });

    try {
      this.scene.anims.create({
        key: walkDownKey,
        frames: walkDownFrames.map(key => ({ key })),
        frameRate: 8,
        repeat: -1
      });

      if (this.scene.anims.exists(walkDownKey)) {
        this.log('AnimationCreation', username, 'walk_down animation created successfully');
      } else {
        this.logError('AnimationCreation', username, 'walk_down animation creation failed - animation does not exist');
      }
    } catch (error) {
      this.logError('AnimationCreation', username, 'Error creating walk_down animation', error);
    }

    // Row 1 (frames 3,4,5): Walking left
    const walkLeftKey = `${animPrefix}walk_left`;
    const walkLeftFrames = [frameTextures[3], frameTextures[4], frameTextures[5]];
    this.log('AnimationCreation', username, 'Creating walk_left animation', {
      animationKey: walkLeftKey,
      frameKeys: walkLeftFrames,
      frameRate: 8
    });

    try {
      this.scene.anims.create({
        key: walkLeftKey,
        frames: walkLeftFrames.map(key => ({ key })),
        frameRate: 8,
        repeat: -1
      });

      if (this.scene.anims.exists(walkLeftKey)) {
        this.log('AnimationCreation', username, 'walk_left animation created successfully');
      } else {
        this.logError('AnimationCreation', username, 'walk_left animation creation failed - animation does not exist');
      }
    } catch (error) {
      this.logError('AnimationCreation', username, 'Error creating walk_left animation', error);
    }

    // Row 2 (frames 6,7,8): Walking up
    const walkUpKey = `${animPrefix}walk_up`;
    const walkUpFrames = [frameTextures[6], frameTextures[7], frameTextures[8]];
    this.log('AnimationCreation', username, 'Creating walk_up animation', {
      animationKey: walkUpKey,
      frameKeys: walkUpFrames,
      frameRate: 8
    });

    try {
      this.scene.anims.create({
        key: walkUpKey,
        frames: walkUpFrames.map(key => ({ key })),
        frameRate: 8,
        repeat: -1
      });

      if (this.scene.anims.exists(walkUpKey)) {
        this.log('AnimationCreation', username, 'walk_up animation created successfully');
      } else {
        this.logError('AnimationCreation', username, 'walk_up animation creation failed - animation does not exist');
      }
    } catch (error) {
      this.logError('AnimationCreation', username, 'Error creating walk_up animation', error);
    }

    // Walking right (reuse left frames, will flip sprite)
    const walkRightKey = `${animPrefix}walk_right`;
    const walkRightFrames = [frameTextures[3], frameTextures[4], frameTextures[5]];
    this.log('AnimationCreation', username, 'Creating walk_right animation', {
      animationKey: walkRightKey,
      frameKeys: walkRightFrames,
      frameRate: 8,
      note: 'Reusing left frames, sprite will be flipped'
    });

    try {
      this.scene.anims.create({
        key: walkRightKey,
        frames: walkRightFrames.map(key => ({ key })),
        frameRate: 8,
        repeat: -1
      });

      if (this.scene.anims.exists(walkRightKey)) {
        this.log('AnimationCreation', username, 'walk_right animation created successfully');
      } else {
        this.logError('AnimationCreation', username, 'walk_right animation creation failed - animation does not exist');
      }
    } catch (error) {
      this.logError('AnimationCreation', username, 'Error creating walk_right animation', error);
    }

    // Idle animation (single frame)
    const idleKey = `${animPrefix}idle`;
    const idleFrame = frameTextures[1]; // Use middle frame of first row
    this.log('AnimationCreation', username, 'Creating idle animation', {
      animationKey: idleKey,
      frameKey: idleFrame,
      frameRate: 1
    });

    try {
      this.scene.anims.create({
        key: idleKey,
        frames: [{ key: idleFrame }],
        frameRate: 1
      });

      if (this.scene.anims.exists(idleKey)) {
        this.log('AnimationCreation', username, 'idle animation created successfully');
      } else {
        this.logError('AnimationCreation', username, 'idle animation creation failed - animation does not exist');
      }
    } catch (error) {
      this.logError('AnimationCreation', username, 'Error creating idle animation', error);
    }

    // Summary of created animations
    const createdAnimations = [walkDownKey, walkLeftKey, walkUpKey, walkRightKey, idleKey];
    const successfulAnimations = createdAnimations.filter(key => this.scene.anims.exists(key));

    this.log('AnimationCreation', username, 'Animation creation completed', {
      totalAnimations: createdAnimations.length,
      successfulAnimations: successfulAnimations.length,
      createdKeys: successfulAnimations,
      failedKeys: createdAnimations.filter(key => !this.scene.anims.exists(key))
    });
  }

  /**
   * Update an existing player's avatar (simplified)
   */
  public async updatePlayerAvatar(username: string, _config?: AvatarConfig): Promise<void> {
    try {
      console.log(`Updating avatar for ${username}`);

      // Validate scene is still active
      if (!this.scene?.textures?.game) {
        console.warn(`Scene not available for avatar update for ${username}`);
        return;
      }

      // Reload the avatar sprite sheet system
      const newTextureKey = await this.loadPlayerAvatarSpriteSheet(username);

      if (newTextureKey) {
        // Update existing sprite if it exists
        const sprite = this.avatarSprites.get(username);
        if (sprite) {
          sprite.setTexture(newTextureKey);
          console.log(`Avatar sprite updated for ${username}`);
        }
      }
    } catch (error) {
      console.error(`Error updating avatar for ${username}:`, error);
    }
  }

  /**
   * Create an animated player sprite with their avatar sprite sheet
   * Simplified to focus on core functionality
   */
  public createAnimatedPlayerSprite(username: string, x: number, y: number): Phaser.GameObjects.Sprite | null {
    this.log('SpriteDisplay', username, 'Creating animated player sprite', { x, y });

    try {
      // Try to create sprite with existing loaded texture first
      const sprite = this.getPlayerSprite(username);
      if (sprite) {
        this.log('SpriteDisplay', username, 'Sprite already exists, returning existing sprite', {
          spritePosition: { x: sprite.x, y: sprite.y },
          currentTexture: sprite.texture.key
        });
        return sprite;
      }

      this.log('SpriteDisplay', username, 'No existing sprite found, creating new sprite');

      // Create default sprite first, then load avatar asynchronously
      const defaultSprite = this.createDefaultSprite(username, x, y);

      if (defaultSprite) {
        this.log('SpriteDisplay', username, 'Default sprite created successfully', {
          textureKey: defaultSprite.texture.key,
          position: { x: defaultSprite.x, y: defaultSprite.y }
        });
      } else {
        this.logError('SpriteDisplay', username, 'Failed to create default sprite');
      }

      // Load avatar sprite sheet asynchronously and update sprite when ready
      this.log('SpriteDisplay', username, 'Starting asynchronous avatar sprite sheet loading');

      this.loadPlayerAvatarSpriteSheet(username).then((textureKey) => {
        this.log('SpriteDisplay', username, 'Avatar sprite sheet loading completed', {
          textureKey,
          textureExists: textureKey ? this.scene.textures.exists(textureKey) : false
        });

        if (textureKey && this.scene.textures.exists(textureKey)) {
          const existingSprite = this.avatarSprites.get(username);
          if (existingSprite) {
            this.log('SpriteDisplay', username, 'Updating existing sprite with sprite sheet texture', {
              oldTexture: existingSprite.texture.key,
              newSpriteSheetTexture: textureKey,
              method: 'Phaser built-in sprite sheet'
            });

            // PHASER BEST PRACTICE: Set texture to sprite sheet and let animations handle frame selection
            existingSprite.setTexture(textureKey);

            // PHASER SPRITE SHEET: Get frame dimensions from the sprite sheet
            const spriteSheetTexture = this.scene.textures.get(textureKey);
            if (spriteSheetTexture && spriteSheetTexture.source && spriteSheetTexture.source[0]) {
              // Calculate individual frame size (3x3 grid)
              const totalWidth = spriteSheetTexture.source[0].width;
              const totalHeight = spriteSheetTexture.source[0].height;
              const frameWidth = Math.floor(totalWidth / 3);
              const frameHeight = Math.floor(totalHeight / 3);

              // Set sprite size to match individual frame dimensions
              existingSprite.setDisplaySize(frameWidth, frameHeight);

              this.log('SpriteDisplay', username, 'Sprite resized to match sprite sheet frame dimensions', {
                totalSize: { width: totalWidth, height: totalHeight },
                frameSize: { width: frameWidth, height: frameHeight },
                spriteSheetKey: textureKey,
                method: 'Phaser sprite sheet frame sizing (3x3 grid)'
              });
            } else {
              this.logError('SpriteDisplay', username, 'Could not access sprite sheet texture data', { textureKey });
            }

            // Start with idle animation
            const idleAnimKey = `${username}_idle`;
            this.log('SpriteDisplay', username, 'Attempting to play idle animation from sprite sheet', {
              animationKey: idleAnimKey,
              animationExists: this.scene.anims.exists(idleAnimKey),
              spriteSheetKey: textureKey
            });

            if (this.scene.anims.exists(idleAnimKey)) {
              existingSprite.play(idleAnimKey);
              this.log('SceneIntegration', username, 'Initial animation playback setup completed', {
                animationKey: idleAnimKey, isPlaying: existingSprite.anims.isPlaying
              });
            } else {
              this.logError('SceneIntegration', username, 'Initial animation setup failed', { animationKey: idleAnimKey });
            }

            // Log sprite readiness for user input
            this.log('SceneIntegration', username, 'Sprite visible and active in scene', {
              visible: existingSprite.visible, active: existingSprite.active, depth: existingSprite.depth
            });

            // Final validation and movement readiness
            this.validateSpriteReadiness(username, existingSprite);

            this.log('SpriteDisplay', username, 'Avatar sprite updated successfully with sprite sheet system');
          } else {
            this.logError('SpriteDisplay', username, 'No existing sprite found to update');
          }
        } else {
          this.logError('SpriteDisplay', username, 'Invalid sprite sheet texture key or texture does not exist', {
            textureKey,
            textureExists: textureKey ? this.scene.textures.exists(textureKey) : false
          });
        }
      }).catch((error) => {
        this.logError('SpriteDisplay', username, 'Error loading avatar sprite sheet', error);
      });

      return defaultSprite;
    } catch (error) {
      this.logError('SpriteDisplay', username, 'Error creating animated sprite', error);
      return this.createDefaultSprite(username, x, y);
    }
  }

  /**
   * Create a player sprite with their avatar (single frame) - for compatibility
   */
  public createPlayerSprite(username: string, x: number, y: number): Phaser.GameObjects.Sprite | null {
    // Delegate to animated sprite creation for simplicity
    return this.createAnimatedPlayerSprite(username, x, y);
  }

  /**
   * Load player avatar (single frame) - for compatibility
   */
  public async loadPlayerAvatar(username: string): Promise<string | null> {
    // Delegate to sprite sheet loading for simplicity
    return this.loadPlayerAvatarSpriteSheet(username);
  }

  /**
   * Validate sprite readiness for movement and user input
   */
  private validateSpriteReadiness(username: string, sprite: Phaser.GameObjects.Sprite): void {
    this.log('MovementReadiness', username, 'Starting sprite readiness validation');

    // Check sprite state
    const spriteReady = sprite && sprite.active && sprite.visible;
    this.log('MovementReadiness', username, 'Sprite state validation', {
      exists: !!sprite, active: sprite?.active, visible: sprite?.visible, ready: spriteReady
    });

    // Check texture state
    const textureValid = sprite?.texture && sprite.texture.key !== '__MISSING';
    this.log('MovementReadiness', username, 'Texture state validation', {
      hasTexture: !!sprite?.texture, textureKey: sprite?.texture?.key, valid: textureValid
    });

    // Check animation availability
    const animationsReady = ['idle', 'walk_down', 'walk_left', 'walk_up', 'walk_right']
      .every(anim => this.scene.anims.exists(`${username}_${anim}`));
    this.log('MovementReadiness', username, 'Animation availability check', {
      allAnimationsExist: animationsReady, totalAnimations: 5
    });

    // Check scene integration
    const inScene = this.avatarSprites.has(username) && this.avatarSprites.get(username) === sprite;
    this.log('MovementReadiness', username, 'Scene integration validation', {
      registeredInMap: inScene, spriteMapSize: this.avatarSprites.size
    });

    // Final readiness determination
    const fullyReady = spriteReady && textureValid && animationsReady && inScene;
    this.log('MovementReadiness', username, 'Final readiness status', {
      ready: fullyReady, canAcceptMovement: fullyReady, enableUserControls: fullyReady
    });

    if (fullyReady) {
      this.log('MovementReadiness', username, 'Sprite fully initialized and ready for movement commands');
    } else {
      this.logError('MovementReadiness', username, 'Sprite not ready for movement', {
        spriteReady, textureValid, animationsReady, inScene
      });
    }
  }

  /**
   * Create default sprite using Terra Branford texture
   */
  private createDefaultSprite(username: string, x: number, y: number): Phaser.GameObjects.Sprite | null {
    this.log('SpriteObjectCreation', username, 'Starting Phaser sprite object instantiation', {
      position: { x, y }
    });

    try {
      // Determine texture to use
      const defaultTexture = this.scene.textures.exists('terra-branford') ? 'terra-branford' : 'player-fallback';
      this.log('SpriteObjectCreation', username, 'Selected texture for sprite creation', {
        textureKey: defaultTexture, textureExists: this.scene.textures.exists(defaultTexture)
      });

      // Instantiate Phaser sprite object
      const sprite = this.scene.add.sprite(x, y, defaultTexture);
      this.log('SpriteObjectCreation', username, 'Phaser sprite object instantiated', {
        spriteId: sprite.name || 'unnamed', textureKey: sprite.texture.key
      });

      // Set initial texture assignment and position
      sprite.setDisplaySize(64, 64);
      this.log('SpriteObjectCreation', username, 'Initial texture assignment completed', {
        displaySize: { width: 64, height: 64 }, position: { x: sprite.x, y: sprite.y }
      });

      // Add sprite to scene and layer assignment
      this.avatarSprites.set(username, sprite);
      this.log('SceneIntegration', username, 'Sprite added to scene and registered', {
        spriteCount: this.avatarSprites.size, visible: sprite.visible, active: sprite.active
      });

      return sprite;
    } catch (error) {
      this.logError('SpriteObjectCreation', username, 'Failed to create default sprite', error);
      return null;
    }
  }

  /**
   * Play animation on player sprite with state tracking
   * Supports both 2-parameter and 3-parameter calls for compatibility
   */
  public playPlayerAnimation(username: string, direction: 'up' | 'down' | 'left' | 'right' | 'idle', flipX?: boolean): void {
    this.log('AnimationPlayback', username, 'Animation playback requested', {
      direction,
      flipX,
      hasFlipXParameter: flipX !== undefined
    });

    const sprite = this.avatarSprites.get(username);
    if (!sprite) {
      this.logError('AnimationPlayback', username, 'No sprite found for animation playback');
      return;
    }

    this.log('AnimationPlayback', username, 'Sprite found for animation', {
      currentTexture: sprite.texture.key,
      spritePosition: { x: sprite.x, y: sprite.y },
      spriteVisible: sprite.visible,
      spriteActive: sprite.active
    });

    // Determine animation key based on direction
    const animKey = direction === 'idle' ? `${username}_idle` : `${username}_walk_${direction}`;
    this.log('AnimationPlayback', username, 'Animation key determined', { animKey });

    // Check if this animation is already playing (prevent unnecessary restarts)
    const lastAnim = this.lastAnimations.get(username);
    const currentAnim = sprite.anims.currentAnim;

    this.log('AnimationPlayback', username, 'Checking animation state', {
      requestedAnimKey: animKey,
      lastAnimKey: lastAnim,
      currentAnimKey: currentAnim ? currentAnim.key : null,
      isPlaying: sprite.anims.isPlaying,
      flipXRequested: flipX
    });

    if (lastAnim === animKey && flipX === undefined) {
      this.log('AnimationPlayback', username, 'Animation already playing, skipping restart');
      return; // Animation already playing and no flip change requested
    }

    // Check if animation exists before attempting to play
    const animExists = this.scene.anims.exists(animKey);
    this.log('AnimationPlayback', username, 'Animation existence check', {
      animKey,
      exists: animExists
    });

    // Play animation if it exists
    if (animExists) {
      try {
        this.log('AnimationPlayback', username, 'Starting animation playback', { animKey });
        sprite.play(animKey);
        this.lastAnimations.set(username, animKey);

        // Verify animation started
        const newCurrentAnim = sprite.anims.currentAnim;
        this.log('AnimationPlayback', username, 'Animation playback initiated', {
          newCurrentAnimKey: newCurrentAnim ? newCurrentAnim.key : null,
          isNowPlaying: sprite.anims.isPlaying,
          animationStarted: newCurrentAnim && newCurrentAnim.key === animKey
        });

        // Handle sprite flipping - use parameter if provided, otherwise auto-detect for right movement
        const shouldFlip = flipX !== undefined ? flipX : (direction === 'right');
        sprite.setFlipX(shouldFlip);

        this.log('AnimationPlayback', username, 'Animation playback completed successfully', {
          animKey,
          flipX: shouldFlip,
          finalState: {
            currentAnim: sprite.anims.currentAnim ? sprite.anims.currentAnim.key : null,
            isPlaying: sprite.anims.isPlaying,
            flippedX: sprite.flipX
          }
        });

      } catch (error) {
        this.logError('AnimationPlayback', username, 'Error during animation playback', {
          animKey,
          error
        });
      }
    } else {
      this.logError('AnimationPlayback', username, 'Animation not found', {
        requestedAnimKey: animKey,
        direction
      });
    }
  }

  /**
   * Get existing player sprite
   */
  public getPlayerSprite(username: string): Phaser.GameObjects.Sprite | null {
    return this.avatarSprites.get(username) || null;
  }

  /**
   * Check if player has animated sprite sheet
   */
  public hasAnimatedSprite(username: string): boolean {
    const sprite = this.avatarSprites.get(username);
    return sprite ? this.scene.anims.exists(`${username}_walk_down`) : false;
  }

  /**
   * Cleanup resources and timeouts
   */
  public cleanup(): void {
    // Clear all pending timeouts
    this.updateTimeouts.forEach((timeout) => {
      clearTimeout(timeout);
    });
    this.updateTimeouts.clear();

    // Clear sprite and animation state references
    this.avatarSprites.clear();
    this.lastAnimations.clear();
  }
}
