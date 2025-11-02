# Constants - Konva Map Editor

This directory contains all configuration constants for the Konva-based map editor.

## File: `konvaConstants.ts`

Centralized configuration for all editor features. All magic numbers and configuration values are defined here.

## Categories

### Canvas Configuration
```typescript
import { CANVAS } from '../constants/konvaConstants';

const width = CANVAS.DEFAULT_WIDTH;  // 1920
const height = CANVAS.DEFAULT_HEIGHT; // 1080
```

### Zoom Configuration
```typescript
import { ZOOM, ZOOM_CONFIG } from '../constants/konvaConstants';

// Basic zoom limits
const minZoom = ZOOM.min;  // 0.3 (30%)
const maxZoom = ZOOM.max;  // 5.0 (500%)

// Advanced zoom settings
const animationDuration = ZOOM_CONFIG.ANIMATION_DURATION; // 300ms
```

### Grid Configuration
```typescript
import { GRID_DEFAULTS, GRID_CONFIG } from '../constants/konvaConstants';

// Default grid settings
const grid = GRID_DEFAULTS; // { visible: true, spacing: 32, ... }

// Grid options
const spacings = GRID_CONFIG.SPACING_OPTIONS; // [16, 32, 64, 128]
```

### Shape Styles
```typescript
import { COLLISION_STYLE, INTERACTIVE_STYLE, SELECTION_STYLE } from '../constants/konvaConstants';

// Apply collision style
const collisionShape = {
  ...COLLISION_STYLE,
  // Override specific properties if needed
};

// Selection appearance
const selectionStroke = SELECTION_STYLE.STROKE; // '#00aaff'
```

### Polygon Drawing
```typescript
import { POLYGON_DRAWING } from '../constants/konvaConstants';

const minVertices = POLYGON_DRAWING.MIN_VERTICES; // 3
const closeThreshold = POLYGON_DRAWING.CLOSE_THRESHOLD; // 15px
const vertexRadius = POLYGON_DRAWING.VERTEX_RADIUS; // 6px
```

### Keyboard Shortcuts
```typescript
import { KEYBOARD_SHORTCUTS } from '../constants/konvaConstants';

if (e.key === KEYBOARD_SHORTCUTS.SELECT_TOOL) {
  setTool('select');
}

if (e.key === KEYBOARD_SHORTCUTS.UNDO && (e.ctrlKey || e.metaKey)) {
  undo();
}
```

### Layer Configuration
```typescript
import { LAYERS, LAYER_Z_INDEX } from '../constants/konvaConstants';

const gridLayerName = LAYERS.GRID; // 'grid'
const gridZIndex = LAYER_Z_INDEX.GRID; // 0
```

### Performance Settings
```typescript
import { PERFORMANCE } from '../constants/konvaConstants';

if (shapes.length > PERFORMANCE.MAX_SHAPES_WARNING) {
  console.warn('Performance may degrade');
}

const enableCaching = PERFORMANCE.ENABLE_LAYER_CACHING; // true
```

### Colors
```typescript
import { COLORS } from '../constants/konvaConstants';

const meetingRoomColor = COLORS.MEETING_ROOM; // '#4A90E2'
const collisionColor = COLORS.COLLISION; // '#ef4444'
```

## Usage Best Practices

### 1. Always Import from Constants

```typescript
// ✅ Good
import { ZOOM } from '../constants/konvaConstants';
const minZoom = ZOOM.min;

// ❌ Bad - magic number
const minZoom = 0.3;
```

### 2. Use Destructuring for Clarity

```typescript
// ✅ Good
import { POLYGON_DRAWING } from '../constants/konvaConstants';
const { MIN_VERTICES, CLOSE_THRESHOLD, VERTEX_RADIUS } = POLYGON_DRAWING;

// ⚠️ Less clear
import { POLYGON_DRAWING } from '../constants/konvaConstants';
const minVertices = POLYGON_DRAWING.MIN_VERTICES;
const closeThreshold = POLYGON_DRAWING.CLOSE_THRESHOLD;
```

### 3. Override Constants When Needed

```typescript
// ✅ Good - use spread to override
import { COLLISION_STYLE } from '../constants/konvaConstants';

const customStyle = {
  ...COLLISION_STYLE,
  opacity: 0.9, // Override specific property
};

// ❌ Bad - mutating constant
COLLISION_STYLE.opacity = 0.9;
```

### 4. Type Safety with `as const`

All constants use `as const` for literal types:

```typescript
// Constants are readonly and have literal types
const layers = LAYERS; // { readonly GRID: "grid", ... }
const gridLayer: "grid" = LAYERS.GRID; // Type is "grid", not string
```

## Configuration Sections

### Canvas
- Default dimensions (1920x1080)
- Min/max dimensions
- Background color

### Zoom
- Range: 0.3x to 5.0x (supports 3.1x+ requirement)
- Step: 0.1 (10%)
- Wheel sensitivity
- Animation duration

### Grid
- Default spacing: 32px
- Spacing options: 16, 32, 64, 128
- Patterns: dots, lines
- Opacity range: 0.1 to 1.0

### Shapes
- Collision style (red, semi-transparent)
- Interactive style (blue, semi-transparent)
- Selection style (cyan highlight)
- Hover style (white outline)

### Drawing
- Polygon: min 3 vertices, close threshold 15px
- Rectangle: min 10x10px
- Vertex editing: handle radius 6px

### Selection
- Rectangle stroke: cyan
- Dash pattern: [5, 5]
- Min drag distance: 5px

### History
- Max undo states: 50
- Auto-snapshot debounce: 500ms

### Layers
- Order: Grid → Background → Shapes → UI
- Z-index: 0, 1, 2, 3

### Performance
- Layer caching: enabled
- Max shapes warning: 500
- Max shapes limit: 1000
- Canvas update debounce: 16ms (~60fps)

### Keyboard Shortcuts
- Tools: S (select), P (pan), G (polygon)
- Actions: Delete, Ctrl+Z (undo), Ctrl+Y (redo)
- View: G (toggle grid), +/- (zoom), 0 (reset)
- Drawing: Enter (complete), Escape (cancel)

### Validation
- Min shape area: 100 sq px
- Max shape area: 1,000,000 sq px
- Coordinate range: -10,000 to 10,000
- Self-intersection check: enabled

### Colors
- Interactive types: Meeting Room, Presentation Hall, Coffee Corner, Game Zone
- Collision: Red (#ef4444)
- UI: Grid, Selection, Vertex, Preview

### Storage
- Editor state key
- Viewport preferences key
- Grid preferences key
- Tool preferences key
- **TODO**: Migrate to database persistence

## Modifying Constants

When adding or modifying constants:

1. **Add to appropriate section** in `konvaConstants.ts`
2. **Use `as const`** for readonly literal types
3. **Add JSDoc comments** for documentation
4. **Update this README** with usage examples
5. **Update CHANGELOG** with changes

## Example: Adding a New Constant

```typescript
// In konvaConstants.ts

/**
 * New feature configuration
 */
export const NEW_FEATURE = {
  /** Feature enabled by default */
  ENABLED: true,
  /** Feature timeout (ms) */
  TIMEOUT: 1000,
  /** Feature color */
  COLOR: '#ff00ff',
} as const;
```

Then update this README:

```markdown
### New Feature
\`\`\`typescript
import { NEW_FEATURE } from '../constants/konvaConstants';

if (NEW_FEATURE.ENABLED) {
  // Use feature
}
\`\`\`
```

## Version History

- **v0.1.2-alpha** (2025-11-02): Initial constants file
  - All configuration categories
  - Comprehensive coverage of editor features
  - Based on POC and Fabric.js editor

## References

- **POC Constants**: `client/src/modules/map-editor-poc/constants/konvaConstants.ts`
- **Fabric.js Constants**: `client/src/modules/map-editor/constants/editorConstants.ts`
- **Type Definitions**: `client/src/modules/map-editor-konva/types/`

