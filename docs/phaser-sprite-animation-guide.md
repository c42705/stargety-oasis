# Comprehensive Phaser.js Sprite Animation Guide

## Table of Contents
1. [Fundamental Concepts](#fundamental-concepts)
2. [Current Game Analysis](#current-game-analysis)
3. [Enhancement Opportunities](#enhancement-opportunities)
4. [Advanced Animation Techniques](#advanced-animation-techniques)
5. [Performance Optimization](#performance-optimization)
6. [Implementation Examples](#implementation-examples)

## Fundamental Concepts

### 1. Asset Loading and Sprite Sheets

**Basic Sprite Sheet Loading:**
```javascript
// In preload() function
this.load.spritesheet('character', 'assets/character.png', {
    frameWidth: 32,
    frameHeight: 48
});
```

**Key Principles:**
- **Asset Keys**: String identifiers for loaded assets (e.g., 'character', 'dude')
- **Frame Dimensions**: Must match your sprite sheet's individual frame size
- **Consistent Naming**: Use descriptive, consistent naming conventions

### 2. Animation Creation System

**Global Animation Manager:**
```javascript
// Animations are globally available to all Game Objects
this.anims.create({
    key: 'walk-left',
    frames: this.anims.generateFrameNumbers('character', { start: 0, end: 3 }),
    frameRate: 10,
    repeat: -1  // -1 = infinite loop
});
```

**Animation Properties:**
- `key`: Unique identifier for the animation
- `frames`: Array of frame references or frame numbers
- `frameRate`: Frames per second (affects animation speed)
- `repeat`: Number of loops (-1 for infinite, 0 for once)

### 3. Physics Integration

**Creating Physics-Enabled Sprites:**
```javascript
// Dynamic physics body (affected by gravity, velocity)
player = this.physics.add.sprite(100, 450, 'character');
player.setBounce(0.2);
player.setCollideWorldBounds(true);

// Static physics body (platforms, walls)
platforms = this.physics.add.staticGroup();
platforms.create(400, 568, 'ground').setScale(2).refreshBody();
```

## Current Game Analysis

### Strengths in Your Implementation

1. **Advanced Frame Management**: Your Terra Branford POC uses individual frame textures
2. **State Tracking**: Prevents unnecessary animation restarts with `lastAnimation`
3. **Direction-Based Logic**: Clean separation of movement and animation logic
4. **Sprite Flipping**: Efficient reuse of left animations for right movement
5. **Physics Integration**: Proper collision detection and world bounds

### Current Animation System Structure

```javascript
// Your current approach (sprite-movement-poc)
createAnimations() {
    this.anims.create({
        key: 'terra_walk_down',
        frames: [
            { key: this.frameTextures[0] },
            { key: this.frameTextures[1] },
            { key: this.frameTextures[2] }
        ],
        frameRate: 8,
        repeat: -1
    });
}
```

## Enhancement Opportunities

### 1. Animation State Machine

**Current Issue**: Basic direction-based switching
**Enhancement**: Implement a proper state machine

```javascript
class AnimationStateMachine {
    constructor(sprite) {
        this.sprite = sprite;
        this.currentState = 'idle';
        this.states = {
            idle: { animation: 'character_idle', transitions: ['walking', 'jumping', 'attacking'] },
            walking: { animation: 'character_walk', transitions: ['idle', 'jumping', 'attacking'] },
            jumping: { animation: 'character_jump', transitions: ['idle', 'falling'] },
            attacking: { animation: 'character_attack', transitions: ['idle'] },
            falling: { animation: 'character_fall', transitions: ['idle', 'walking'] }
        };
    }

    transition(newState) {
        const current = this.states[this.currentState];
        if (current.transitions.includes(newState)) {
            this.currentState = newState;
            this.sprite.play(this.states[newState].animation);
            return true;
        }
        return false;
    }
}
```

### 2. Enhanced Movement Animations

**Add Diagonal Movement:**
```javascript
handleDiagonalMovement() {
    const { left, right, up, down } = this.cursors;
    
    // Diagonal movement combinations
    if ((left.isDown || this.wasd.A.isDown) && (up.isDown || this.wasd.W.isDown)) {
        this.player.body.setVelocity(-this.speed * 0.7, -this.speed * 0.7);
        this.currentDirection = 'up-left';
        this.isMoving = true;
    }
    // Add other diagonal combinations...
}
```

### 3. Action-Based Animations

**Combat System Integration:**
```javascript
createCombatAnimations() {
    // Attack animations
    this.anims.create({
        key: 'terra_attack_melee',
        frames: this.anims.generateFrameNumbers('terra_combat', { start: 0, end: 4 }),
        frameRate: 12,
        repeat: 0  // Play once
    });

    // Magic casting
    this.anims.create({
        key: 'terra_cast_spell',
        frames: this.anims.generateFrameNumbers('terra_magic', { start: 0, end: 6 }),
        frameRate: 8,
        repeat: 0
    });
}
```

## Advanced Animation Techniques

### 1. Animation Chaining

```javascript
// Chain animations together
this.player.on('animationcomplete', (animation) => {
    if (animation.key === 'terra_attack_melee') {
        this.player.play('terra_idle');
    } else if (animation.key === 'terra_cast_spell') {
        this.createMagicEffect();
        this.player.play('terra_idle');
    }
});
```

### 2. Dynamic Frame Rate Adjustment

```javascript
adjustAnimationSpeed(speedMultiplier) {
    const currentAnim = this.player.anims.currentAnim;
    if (currentAnim) {
        this.player.anims.msPerFrame = currentAnim.msPerFrame / speedMultiplier;
    }
}
```

### 3. Conditional Animation Frames

```javascript
createConditionalAnimations() {
    // Different animations based on health
    const healthPercentage = this.player.health / this.player.maxHealth;
    
    if (healthPercentage < 0.3) {
        // Injured walking animation
        this.anims.create({
            key: 'terra_walk_injured',
            frames: this.anims.generateFrameNumbers('terra_injured', { start: 0, end: 3 }),
            frameRate: 6,  // Slower when injured
            repeat: -1
        });
    }
}
```

## Performance Optimization

### 1. Animation Pooling

```javascript
class AnimationPool {
    constructor() {
        this.pool = new Map();
    }

    getAnimation(key) {
        if (!this.pool.has(key)) {
            this.pool.set(key, this.createAnimation(key));
        }
        return this.pool.get(key);
    }

    createAnimation(key) {
        // Create animation based on key
        return animationConfig;
    }
}
```

### 2. Efficient Frame Management

```javascript
// Your current approach is already efficient with individual frame textures
// Consider texture atlasing for better performance
createTextureAtlas() {
    const atlas = this.add.renderTexture(0, 0, 1024, 1024);
    // Pack multiple sprites into single texture
    return atlas;
}
```

### 3. Animation Culling

```javascript
update() {
    // Only animate visible sprites
    if (this.player.visible && this.cameras.main.worldView.contains(this.player.x, this.player.y)) {
        this.updateAnimations();
    }
}
```

## Implementation Examples

### 1. Enhanced Terra Branford System

```javascript
// Extend your current Terra system
class EnhancedTerraAnimations extends SpriteMovementPOC {
    createAdvancedAnimations() {
        // Add jump animation
        this.anims.create({
            key: 'terra_jump',
            frames: [{ key: this.frameTextures[7] }], // Use up-facing frame
            frameRate: 1
        });

        // Add landing animation
        this.anims.create({
            key: 'terra_land',
            frames: [
                { key: this.frameTextures[1] },
                { key: this.frameTextures[7] },
                { key: this.frameTextures[1] }
            ],
            frameRate: 15,
            repeat: 0
        });
    }

    handleJumping() {
        if (this.cursors.space.isDown && this.player.body.touching.down) {
            this.player.setVelocityY(-330);
            this.player.play('terra_jump');
            this.isJumping = true;
        }

        // Detect landing
        if (this.isJumping && this.player.body.touching.down) {
            this.player.play('terra_land');
            this.isJumping = false;
        }
    }
}
```

### 2. Multi-Character Animation Manager

```javascript
class MultiCharacterAnimationManager {
    constructor(scene) {
        this.scene = scene;
        this.characters = new Map();
    }

    addCharacter(username, spriteSheet) {
        const animations = this.createCharacterAnimations(username, spriteSheet);
        this.characters.set(username, animations);
    }

    createCharacterAnimations(username, spriteSheet) {
        const directions = ['down', 'left', 'up', 'right'];
        const animations = {};

        directions.forEach((direction, index) => {
            const startFrame = index * 3;
            animations[`walk_${direction}`] = {
                key: `${username}_walk_${direction}`,
                frames: this.scene.anims.generateFrameNumbers(spriteSheet, {
                    start: startFrame,
                    end: startFrame + 2
                }),
                frameRate: 8,
                repeat: -1
            };
        });

        return animations;
    }
}
```

## Specific Enhancements for Your Game

### 1. Integrate with Your Avatar System

**Enhance AvatarGameRenderer.ts:**
```typescript
// Add to AvatarGameRenderer class
public createAdvancedAnimations(username: string, textureKey: string): void {
    const directions = ['down', 'left', 'up', 'right'];
    const animationTypes = ['walk', 'run', 'idle'];

    animationTypes.forEach(type => {
        directions.forEach((direction, index) => {
            const animKey = `${username}_${type}_${direction}`;

            if (type === 'idle') {
                // Single frame idle animation
                this.scene.anims.create({
                    key: animKey,
                    frames: [{ key: textureKey, frame: index * 3 + 1 }], // Middle frame
                    frameRate: 1
                });
            } else {
                // Multi-frame walking/running
                const frameRate = type === 'run' ? 12 : 8;
                this.scene.anims.create({
                    key: animKey,
                    frames: this.scene.anims.generateFrameNumbers(textureKey, {
                        start: index * 3,
                        end: index * 3 + 2
                    }),
                    frameRate,
                    repeat: -1
                });
            }
        });
    });
}

// Enhanced animation playing with state management
public playAdvancedAnimation(username: string, action: string, direction: string): void {
    const sprite = this.avatarSprites.get(username);
    if (!sprite) return;

    const animKey = `${username}_${action}_${direction}`;

    // Check if animation exists before playing
    if (this.scene.anims.exists(animKey)) {
        // Only change animation if it's different
        if (sprite.anims.currentAnim?.key !== animKey) {
            sprite.play(animKey);
        }
    }
}
```

### 2. Enhanced Movement System for WorldModule

**Add to GameScene class in WorldModule.tsx:**
```typescript
// Add these properties to GameScene class
private movementState: {
    isMoving: boolean;
    direction: string;
    speed: number;
    isRunning: boolean;
} = {
    isMoving: false,
    direction: 'down',
    speed: 150,
    isRunning: false
};

// Enhanced update method
update(): void {
    if (!this.player) return;

    this.handleAdvancedMovement();
    this.updatePlayerAnimations();
    this.checkAreaInteractions();
}

private handleAdvancedMovement(): void {
    const { left, right, up, down } = this.cursors;

    // Reset movement
    this.movementState.isMoving = false;
    this.player.body.setVelocity(0);

    // Check for running (shift key)
    this.movementState.isRunning = this.input.keyboard.checkDown(
        this.input.keyboard.addKey('SHIFT')
    );

    const currentSpeed = this.movementState.isRunning ?
        this.movementState.speed * 1.5 : this.movementState.speed;

    // Handle movement with priority system
    if (up.isDown) {
        this.player.body.setVelocityY(-currentSpeed);
        this.movementState.direction = 'up';
        this.movementState.isMoving = true;
    } else if (down.isDown) {
        this.player.body.setVelocityY(currentSpeed);
        this.movementState.direction = 'down';
        this.movementState.isMoving = true;
    }

    if (left.isDown) {
        this.player.body.setVelocityX(-currentSpeed);
        this.movementState.direction = 'left';
        this.movementState.isMoving = true;
    } else if (right.isDown) {
        this.player.body.setVelocityX(currentSpeed);
        this.movementState.direction = 'right';
        this.movementState.isMoving = true;
    }
}

private updatePlayerAnimations(): void {
    if (!this.avatarRenderer) return;

    const action = this.movementState.isMoving ?
        (this.movementState.isRunning ? 'run' : 'walk') : 'idle';

    this.avatarRenderer.playAdvancedAnimation(
        this.playerId,
        action,
        this.movementState.direction
    );
}
```

### 3. Combat Animation System

**Create CombatAnimationManager.ts:**
```typescript
export class CombatAnimationManager {
    private scene: Phaser.Scene;
    private combatSprites: Map<string, Phaser.GameObjects.Sprite> = new Map();

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    createCombatAnimations(username: string, textureKey: string): void {
        const combatActions = [
            { name: 'attack_melee', frames: [0, 1, 2, 1, 0], frameRate: 15 },
            { name: 'attack_magic', frames: [3, 4, 5, 6, 5, 4], frameRate: 10 },
            { name: 'defend', frames: [7], frameRate: 1 },
            { name: 'hurt', frames: [8, 9, 8], frameRate: 12 },
            { name: 'victory', frames: [10, 11, 12, 11], frameRate: 6 }
        ];

        combatActions.forEach(action => {
            this.scene.anims.create({
                key: `${username}_${action.name}`,
                frames: action.frames.map(frame => ({ key: textureKey, frame })),
                frameRate: action.frameRate,
                repeat: action.name === 'defend' ? -1 : 0
            });
        });
    }

    playCombatAnimation(username: string, action: string): Promise<void> {
        return new Promise((resolve) => {
            const sprite = this.combatSprites.get(username);
            if (!sprite) {
                resolve();
                return;
            }

            const animKey = `${username}_${action}`;

            // Listen for animation complete
            sprite.once('animationcomplete', () => {
                resolve();
            });

            sprite.play(animKey);
        });
    }
}
```

### 4. Environmental Animations

**Add to your game for enhanced immersion:**
```javascript
class EnvironmentalAnimations {
    constructor(scene) {
        this.scene = scene;
        this.effects = [];
    }

    createWaterAnimation(x, y, width, height) {
        const water = this.scene.add.tileSprite(x, y, width, height, 'water_texture');

        // Animated water flow
        this.scene.tweens.add({
            targets: water,
            tilePositionX: water.tilePositionX + 100,
            duration: 3000,
            repeat: -1,
            ease: 'Linear'
        });

        return water;
    }

    createFireEffect(x, y) {
        const fire = this.scene.add.sprite(x, y, 'fire_spritesheet');

        this.scene.anims.create({
            key: 'fire_burn',
            frames: this.scene.anims.generateFrameNumbers('fire_spritesheet', { start: 0, end: 7 }),
            frameRate: 12,
            repeat: -1
        });

        fire.play('fire_burn');
        return fire;
    }

    createWindEffect() {
        // Particle system for wind
        const particles = this.scene.add.particles(0, 0, 'leaf_texture', {
            x: { min: 0, max: 800 },
            y: -10,
            speedY: { min: 50, max: 100 },
            speedX: { min: -20, max: 20 },
            scale: { start: 0.3, end: 0.1 },
            alpha: { start: 0.8, end: 0 },
            lifespan: 3000
        });

        return particles;
    }
}
```

## Best Practices Summary

### 1. Performance Guidelines
- **Limit Active Animations**: Only animate visible sprites
- **Use Object Pooling**: Reuse animation objects when possible
- **Optimize Frame Rates**: Match animation frame rates to game needs
- **Texture Management**: Use texture atlases for better memory usage

### 2. Code Organization
- **Separate Concerns**: Keep animation logic separate from game logic
- **Consistent Naming**: Use clear, consistent animation key naming
- **State Management**: Implement proper state machines for complex animations
- **Error Handling**: Always check if animations exist before playing

### 3. User Experience
- **Smooth Transitions**: Avoid jarring animation changes
- **Visual Feedback**: Provide clear visual feedback for all actions
- **Accessibility**: Consider animation preferences and motion sensitivity
- **Performance Scaling**: Allow users to adjust animation quality

## Next Steps for Implementation

1. **Start with Enhanced Movement**: Implement the advanced movement system in your WorldModule
2. **Upgrade Avatar Renderer**: Add the enhanced animation methods to AvatarGameRenderer
3. **Add Combat System**: Implement combat animations for future features
4. **Environmental Effects**: Add atmospheric animations to enhance immersion
5. **Performance Testing**: Monitor performance with multiple animated sprites

This comprehensive guide should provide you with everything needed to significantly enhance your game's sprite animation system while maintaining the excellent foundation you've already built.
