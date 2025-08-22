project:
  name: Simple Map Builder & 2D Game module
  description: >
    A web application for building tile-based maps with multiple layers, importing sprites,
    and playing a simple 2D game. Uses fabric.js for editing, Phaser for animation and movement,
    and includes save/load functionality and a "Test Play" feature.
  tech_stack:
    - fabric.js (map editing)
    - Phaser 3 (animation, movement, collision)
    - LocalStorage/File API (save/load)

---
# Features & Implementation

features:
  - name: Map Editor
    description: >
      Import a large bitmap as background, add images to 3 layers, and define impassable areas.
      Playable area is visually distinct (e.g., semi-transparent overlay or grid).
    implementation:
      - Use fabric.js for rendering and editing layers.
      - Mark impassable areas with fabric.Rect/fabric.Polygon.
      - Highlight playable area with a semi-transparent overlay or colored grid.

  - name: Sprite Importer & Animation
    description: >
      Import sprite sheets, split into frames, and animate using Phaser.
    implementation:
      - Load sprite sheets with fabric.js.
      - Animate sprites using Phaser for smooth game-like movement.
      - Configure frame size, animation speed, and loops in Phaser.

  - name: Play Mode
    description: >
      Keyboard-controlled character with collision detection and animated movement.
    implementation:
      - Use Phaser for sprite animation, movement, and collision.
      - Impassable areas block movement.

  - name: Test Play
    description: >
      Quick preview of play mode without leaving edit mode.
    implementation:
      - Add "Test Play" button to toggle a temporary play mode overlay.
      - Use Phaser to render character and movement during test play.

  - name: Save/Load
    description: >
      Save and load maps, sprites, and impassable areas as JSON files.
    implementation:
      - Export/import fabric.js canvas state and Phaser config as JSON.
      - Use File API for file dialogs and LocalStorage for quick saves.

---
# Detailed Implementation

fabric_js:
  setup:
    - Initialize fabric.Canvas for the map editor.
    - Configure 3 layers: background, midground, foreground.
  image_handling:
    - Load images with something like fabric.Image.fromURL().
    - Store images and impassable areas as fabric objects with metadata.
  playable_area:
    - Overlay a semi-transparent color or grid to visually distinguish playable area.

phaser:
  setup:
    - Initialize Phaser game instance for animation and movement.
    - Load sprite sheets and define animations (e.g., walk cycles).
  animation example:
    ```javascript
    this.anims.create({
      key: 'walk',
      frames: this.anims.generateFrameNumbers('player', { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1
    });
    ```
  movement:
    - Use Phaser's cursor keys for input.
    - Update character position and play animations based on input.
  collision:
    - Use Phaser's collision groups or arcades physics for impassable areas.

test_play:
  implementation:
    - Toggle a Phaser overlay on the fabric.js canvas.
    - Render character and enable movement/collision during test play.

save_load:
  format: JSON
  implementation:
    - Serialize fabric.js canvas and Phaser config.
    - Use File API for file save/load dialogs.
    - Store quick saves in LocalStorage.

---
# Next Steps
