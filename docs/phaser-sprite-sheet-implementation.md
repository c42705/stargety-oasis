# Phaser.js Sprite Sheet Implementation - Best Practices

## Overview
Implemented proper Phaser.js sprite sheet animation system to replace custom canvas manipulation approach. This follows Phaser.js official documentation and best practices for sprite sheet animations.

## Key Changes Made

### 1. **Phaser Built-in Sprite Sheet System**
**Before (Custom Canvas Approach):**
```javascript
// Manual canvas manipulation
const frameCanvas = document.createElement('canvas');
frameCtx.drawImage(img, x, y, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
this.scene.textures.addCanvas(frameTextureKey, frameCanvas);
```

**After (Phaser Best Practice):**
```javascript
// Phaser built-in sprite sheet system
this.scene.textures.addSpriteSheet(textureKey, img, {
  frameWidth: frameWidth,
  frameHeight: frameHeight,
  startFrame: 0,
  endFrame: 8 // 9 frames total (0-8)
});
```

### 2. **Proper Animation Frame References**
**Before (Individual Canvas Textures):**
```javascript
frames: [
  { key: frameTextures[0] },
  { key: frameTextures[1] },
  { key: frameTextures[2] }
]
```

**After (Sprite Sheet Frame Numbers):**
```javascript
frames: this.scene.anims.generateFrameNumbers(spriteSheetKey, { start: 0, end: 2 })
```

### 3. **Code Organization and Documentation**

#### Standard Phaser Methods (Recommended):
- `createMovementAnimationsFromSpriteSheet()` - Uses Phaser built-in sprite sheet system
- `createSpriteSheetFromUrl()` - Uses `addSpriteSheet()` method

#### Legacy/Custom Methods (Documented):
- `createMovementAnimations()` - Manual canvas texture approach
- `createIndividualFrameTextures()` - Canvas manipulation method

Each legacy method includes documentation explaining:
- **WHERE**: The custom implementation occurs
- **WHY**: It's necessary (e.g., dynamic avatar composition)
- **WHAT**: The standard Phaser approach would be
- **WHEN**: To use custom vs standard approach

## Frame Layout (3x3 Grid)

```
Frame 0 | Frame 1 | Frame 2    (Row 0: Walking Down)
Frame 3 | Frame 4 | Frame 5    (Row 1: Walking Left)
Frame 6 | Frame 7 | Frame 8    (Row 2: Walking Up)
```

## Animation Mapping

| Direction | Frames Used | Animation Key | Notes |
|-----------|-------------|---------------|-------|
| Down      | 0, 1, 2     | `{username}_walk_down` | Row 0 of sprite sheet |
| Left      | 3, 4, 5     | `{username}_walk_left` | Row 1 of sprite sheet |
| Up        | 6, 7, 8     | `{username}_walk_up` | Row 2 of sprite sheet |
| Right     | 3, 4, 5     | `{username}_walk_right` | Reuses left frames, sprite flipped |
| Idle      | 1           | `{username}_idle` | Middle frame of down animation |

## Verification Steps

### 1. **Check Console Logs**
Enable debug logging and look for:
```
[AvatarRenderer:SpriteSheetLoading] Creating sprite sheet using Phaser built-in system
[AvatarRenderer:AnimationCreation] Creating animations using Phaser sprite sheet frames
[AvatarRenderer:SpriteDisplay] Sprite resized to match sprite sheet frame dimensions
```

### 2. **Visual Verification**
- Sprites should display individual frames during animation
- No full sprite sheet should be visible at any time
- Frame transitions should be smooth between individual frames
- Sprite size should match individual frame dimensions (not full sheet)

### 3. **Animation Playback**
Test each direction:
```javascript
// In browser console
avatarRenderer.playPlayerAnimation('username', 'down');
avatarRenderer.playPlayerAnimation('username', 'left');
avatarRenderer.playPlayerAnimation('username', 'up');
avatarRenderer.playPlayerAnimation('username', 'right');
avatarRenderer.playPlayerAnimation('username', 'idle');
```

### 4. **Frame Size Verification**
Check that sprite display size matches individual frame size:
```javascript
// Expected: frameWidth = totalWidth / 3, frameHeight = totalHeight / 3
// Not: sprite size = full sprite sheet size
```

## Benefits of Phaser Built-in System

### Performance
- **Optimized**: Phaser's sprite sheet system is optimized for performance
- **Memory Efficient**: Single texture with frame references vs multiple canvas textures
- **GPU Friendly**: Better GPU texture management

### Maintainability
- **Standard API**: Uses documented Phaser methods
- **Predictable**: Follows established patterns
- **Debuggable**: Better integration with Phaser dev tools

### Reliability
- **Tested**: Phaser's sprite sheet system is battle-tested
- **Consistent**: Reliable frame selection and animation playback
- **Compatible**: Works with all Phaser features and plugins

## Integration with Map/World Editor

The implementation maintains compatibility with the map/world editor system while using standard Phaser approaches where possible. Custom implementations are clearly documented and isolated to specific use cases where they're necessary for dynamic avatar composition or editor integration.

## Debugging

### Enable Debug Logging
```javascript
avatarRenderer.setDebugMode(true);
avatarRenderer.logDebuggingInfo();
```

### Key Debug Phases
1. **SpriteSheetLoading** - Tracks Phaser sprite sheet creation
2. **AnimationCreation** - Monitors sprite sheet animation setup
3. **SpriteDisplay** - Verifies proper frame sizing
4. **AnimationPlayback** - Confirms frame-by-frame animation

### Common Issues and Solutions

**Issue**: Sprite still shows full texture
**Solution**: Check that `setDisplaySize()` is called with frame dimensions, not full texture dimensions

**Issue**: Animations not playing
**Solution**: Verify sprite sheet was created successfully and animation keys exist

**Issue**: Wrong frame size
**Solution**: Confirm 3x3 grid calculations: `frameWidth = totalWidth / 3`

This implementation provides a solid foundation for sprite sheet animations that follows Phaser.js best practices while maintaining the flexibility needed for the map editor system.
