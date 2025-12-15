# Phaser Renderer / World Map Issues — Investigation & Recommendations

Date: 2025-12-12

Summary
- Multiple runtime errors appear in the browser console while rendering the world using Phaser:
  - "Cannot read properties of null (reading 'renderer')" (Phaser Texture/TextureSource path)
  - "Cannot read properties of null (reading 'add')"
  - "rect.setStrokeStyle is not a function" when toggling debug / setting stroke on objects
- These originate from `client/src/modules/world/PhaserMapRenderer.ts` and occur when Phaser scene systems (renderer, textures, scene.add) are not available or when code assumes certain GameObject shapes/types.

Files inspected
- `client/src/modules/world/PhaserMapRenderer.ts`
- `client/src/modules/world/GameScene.ts`
- `client/src/modules/world/WorldModule.tsx`
- Runtime logs: `docs/ogd.log` (attached during investigation)

Observed errors (representative)
- TypeError: Cannot read properties of null (reading 'renderer')
  - Stack: TextureSource -> Texture -> TextureManager.create -> image.onload
  - Trigger: `this.scene.textures.addBase64` / `this.scene.load.image` / creating texture before renderer exists
- TypeError: Cannot read properties of null (reading 'add')
  - Stack: GameObjectFactory.rectangle -> PhaserMapRenderer.renderDefaultBackground
  - Trigger: calling `this.scene.add.rectangle` when `scene.add` / internal factory is not available
- TypeError: rect.setStrokeStyle is not a function
  - Occurs in `PhaserMapRenderer.setDebugMode` when calling `obj.setStrokeStyle(...)` on an object that doesn't implement that function (object is not the expected Rectangle GameObject)

Root causes
1. Race between async operations and Phaser lifecycle
   - Phaser `scene.sys.game.renderer`, `scene.add`, and `scene.textures` may be undefined during early scene lifecycle or if the game is being destroyed. Calls to texture APIs or `scene.add.*` during that window throw inside Phaser internals.
   - Async callbacks (setTimeout, image onload, filecomplete handlers) sometimes run after the scene/game is torn down.
2. Unsafe runtime assumptions about GameObject types
   - Code assumes objects stored in maps/groups are Phaser `Rectangle` and have `setStrokeStyle`. When objects are `Graphics`, containers, or mutated items (or if the group was destroyed and object replaced), calling non-existent functions results in crashes.
3. Destroy / teardown timing
   - `PhaserMapRenderer.destroy()` and React unmount can run while earlier async tasks still expect a valid scene, producing null accesses.

Concrete recommendations (priority ordered)
1. Add readiness guards before calling Phaser systems (high priority)
   - Before calling `this.scene.textures.addBase64`, `this.scene.load.image`, `this.scene.add.image`, `this.scene.add.rectangle`, check that `this.scene` exists and that `this.scene.sys && this.scene.sys.game && this.scene.sys.game.renderer` are present.
   - If not ready, either (a) wait for the Phaser game/scene `ready` event, or (b) schedule a short retry using `setTimeout` and re-check. Use exponential/backoff or a small retry count to avoid infinite loops.
   - Example guard pattern:
     ```ts
     const game = (this.scene as any)?.sys?.game;
     if (!game || !game.renderer || !(this.scene as any)?.textures) {
       // retry or abort
       setTimeout(() => this.addAsset(asset), 100);
       return;
     }
     ```

2. Make calls to texture API safer (high)
   - In `addAsset`, `createAssetImage`, and `createSimpleBackground` ensure `this.scene.textures` and `this.scene.sys.game.renderer` exist before calling `textures.addBase64` or `load.image`.
   - When using `scene.load` handlers, guard the callback to confirm the scene still exists.
   - On failure, fall back to `renderDefaultBackground()` (for background image loads) or log and skip asset creation for that asset.

3. Replace truthy property checks with function checks (medium)
   - When calling methods like `setStrokeStyle` and `setAlpha`, test `typeof obj.setStrokeStyle === 'function'` rather than truthiness. This avoids calling non-functions.
   - Example:
     ```ts
     if (shapeObject && typeof shapeObject.setAlpha === 'function') {
       shapeObject.setAlpha(...);
       if (typeof shapeObject.setStrokeStyle === 'function') {
         shapeObject.setStrokeStyle(...);
       }
     }
     ```

4. Defend async callbacks against teardown (medium)
   - In every async callback (setTimeout, onload, filecomplete handlers), check `this.scene` and `this.scene.sys?.game` before creating GameObjects or textures.
   - If the scene is destroyed, cancel the callback's actions.

5. Harden `destroy()` (low/medium)
   - Check existence and method types before calling `group.destroy(true)` or `textures.remove`.
   - Clear pending timeouts or mark an `isDestroyed` flag to quickly abort outstanding callbacks.

6. Improve logging during failures (low)
   - Add targeted logs listing `this.scene.sys.game` state and `group` existence when an error is caught, to make future debugging faster.

Recommended code edits (where to apply)
- File: `client/src/modules/world/PhaserMapRenderer.ts`
  - Methods to update or harden: `initialize()`, `initializeGroups()`, `renderBackground()`, `renderDefaultBackground()`, `createSimpleBackground()`, `addAsset()`, `createAssetImage()`, `addInteractiveArea()`, `addCollisionArea()`, `setDebugMode()`, `destroy()`.

Conservative example patches (conceptual)
- Guard in `initialize()` before continuing:
  ```ts
  const game = (this.scene as any)?.sys?.game;
  if (!game || !game.renderer) {
    logger.warn('[PhaserMapRenderer] initialize: renderer missing, waiting for game ready');
    await new Promise(resolve => {
      if (game) game.events.once('ready', () => resolve(undefined));
      else setTimeout(() => resolve(undefined), 100);
    });
  }
  ```

- Safer stroke/alpha calls in `setDebugMode()`:
  ```ts
  if (shapeObject && typeof shapeObject.setAlpha === 'function') {
    shapeObject.setAlpha(enabled ? 0.7 : 0);
    if (typeof shapeObject.setStrokeStyle === 'function') {
      // safe to call
    }
  }
  ```

Testing steps
- Start the dev server: `cd client && npm start` (or from repo root run where appropriate).
- Open the app and navigate to the page that mounts `WorldModule`.
- Reproduce the previous flows:
  - Load a map with background (base64 or URL) and assets.
  - Toggle admin debug / showMapAreas to invoke `setDebugMode`.
  - Rapidly mount/unmount the world or navigate away while map is loading to test teardown safety.
- Confirm no console errors for `reading 'renderer'`, `reading 'add'`, or `setStrokeStyle`.

Next actions
- Apply the guards and type checks to `PhaserMapRenderer.ts` (small targeted edits). I recommend doing these in a single focused PR so the behavior can be validated.
- Optionally add a small test harness or dev-only debug mode that logs `obj.constructor?.name` for `collisionAreaObjects` before calling methods on them to detect unexpected object types early.

Notes & rationale
- These changes are defensive: they avoid calls into Phaser internals when the scene is not in a valid state. Phaser often throws deep errors when its internal systems are missing; pre-checks avoid noisy, hard-to-follow stack traces.
- The root issues are timing-related and type-safety related; addressing both will remove the errors and make rendering more robust under rapid UI changes or slow network image loads.

If you want, I can implement the minimal edits in `PhaserMapRenderer.ts` now and run a quick smoke-check (update file, search for other call sites, and report diffs).