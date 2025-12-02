# Map Editor Konva - Detailed Structure

This document provides a detailed breakdown of the module structure, including the purpose and responsibilities of each file.

## 📂 Directory Structure

### `/hooks` - Custom React Hooks

Each hook encapsulates a specific feature or functionality of the map editor.

#### Core Interaction Hooks
- **`useKonvaZoom.ts`**
  - Handles zoom in/out functionality
  - Mouse wheel zoom
  - Zoom buttons (in/out/reset/fit)
  - Zoom limits (min/max)
  - Integration with camera controls

- **`useKonvaPan.ts`**
  - Canvas panning functionality
  - Middle mouse button panning
  - Pan tool with left click
  - Touch device support
  - Viewport state management

#### Drawing Hooks
- **`useKonvaPolygonDrawing.ts`**
  - Polygon drawing with click-to-add-vertex workflow
  - Preview line connecting to cursor
  - Double-click to complete
  - Grid snapping support
  - Validation (min vertices, area size)

- **`useKonvaRectDrawing.ts`** (if needed)
  - Rectangle drawing with drag
  - Grid snapping
  - Size validation

#### Selection & Manipulation Hooks
- **`useKonvaSelection.ts`**
  - Single-click selection
  - Ctrl+click multi-select
  - Drag-to-select rectangle
  - Selection state management
  - Visual feedback

- **`useKonvaTransform.ts`**
  - Drag-to-move selected shapes
  - Resize with Konva.Transformer
  - Rotation (if needed)
  - Grid snapping during transform
  - Coordinate handling

#### State Management Hooks
- **`useKonvaHistory.ts`**
  - Undo/redo system
  - State snapshot management
  - Past/future state stacks
  - Integration with all operations
  - Keyboard shortcuts (Ctrl+Z, Ctrl+Y)

#### Rendering Hooks
- **`useKonvaGrid.ts`**
  - Grid rendering with configurable spacing
  - Pattern options (dots, lines)
  - Opacity control
  - Layer caching for performance
  - Toggle visibility

- **`useKonvaBackground.ts`**
  - Background image loading
  - Image scaling and positioning
  - Layer caching
  - Quality at different zoom levels

- **`useKonvaLayers.ts`**
  - Layer ordering management
  - Layer caching configuration
  - Layer visibility control
  - Performance optimization

### `/components` - React Components

Reusable UI components for the map editor.

- **`KonvaMapCanvas.tsx`**
  - Main canvas component
  - Stage/Layer setup
  - Hook composition
  - Event coordination
  - Integration with MapDataContext

- **`TransformableShape.tsx`**
  - Wrapper component for shapes that can be transformed
  - Integrates Konva.Transformer
  - Handles resize/rotate
  - Provides TransformableRect, TransformablePolygon, and TransformableImage components

- **`PolygonEditor.tsx`**
  - Polygon vertex editing UI
  - Draggable vertex handles
  - Edge midpoint handles for adding vertices
  - Visual feedback
  - Coordinate snapping

- **`SelectionRect.tsx`**
  - Visual selection rectangle for drag-to-select
  - Coordinate handling
  - Style configuration

### `/types` - TypeScript Type Definitions

Type-safe interfaces for all editor entities.

- **`konva.types.ts`**
  - Core types: `Viewport`, `Tool`, `EditorState`
  - Event types
  - Configuration types
  - Hook prop types
  - Hook return types

- **`shapes.types.ts`**
  - Shape base interface
  - Polygon shape type
  - Rectangle shape type
  - Shape geometry types
  - Shape style types
  - Shape metadata types

### `/constants` - Configuration Constants

- **`konvaConstants.ts`**
  - Canvas dimensions
  - Zoom configuration (min, max, step)
  - Grid defaults (spacing, pattern, opacity)
  - Style configurations (colors, stroke widths)
  - Tool defaults
  - Layer names and z-indices
  - Keyboard shortcuts

### `/utils` - Utility Functions

Pure functions for common operations.

- **`coordinateTransform.ts`**
  - `screenToWorld(x, y, viewport)`: Convert mouse to canvas coordinates
  - `worldToScreen(x, y, viewport)`: Convert canvas to screen coordinates
  - Handles zoom and pan transformations
  - Essential for accurate drawing and interaction

- **`shapeFactories.ts`**
  - `createPolygonShape(points, category, style)`: Create polygon shape
  - `createRectangleShape(x, y, width, height, category, style)`: Create rectangle
  - Factory functions with proper defaults
  - Validation integration
  - ID generation

- **`validation.ts`**
  - `validatePolygon(points)`: Check polygon validity
  - `validateShapeSize(width, height)`: Check minimum size
  - `validateCoordinates(x, y)`: Check coordinate bounds
  - `checkSelfIntersection(points)`: Detect self-intersecting polygons
  - Error message generation

## 🔄 Data Flow

```
User Interaction
    ↓
Event Handler (in hook)
    ↓
State Update (React state)
    ↓
Re-render (declarative)
    ↓
Konva Canvas Update
    ↓
Visual Feedback
```

## 🎯 Hook Composition Pattern

The main `KonvaMapCanvas` component composes multiple hooks:

```typescript
export const KonvaMapCanvas: React.FC<Props> = (props) => {
  // State
  const [viewport, setViewport] = useState<Viewport>(defaults);
  const [shapes, setShapes] = useState<Shape[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentTool, setCurrentTool] = useState<Tool>('select');

  // Hooks
  const zoom = useKonvaZoom({ viewport, onViewportChange: setViewport });
  const pan = useKonvaPan({ viewport, onViewportChange: setViewport, enabled: currentTool === 'pan' });
  const grid = useKonvaGrid({ viewport, gridConfig });
  const background = useKonvaBackground({ viewport, imageUrl });
  const polygonDrawing = useKonvaPolygonDrawing({ enabled: currentTool === 'polygon', onShapeCreate });
  const selection = useKonvaSelection({ enabled: currentTool === 'select', selectedIds, onSelectionChange: setSelectedIds });
  const transform = useKonvaTransform({ selectedIds, shapes, onShapesUpdate: setShapes });
  const history = useKonvaHistory({ state: { shapes, selectedIds }, onStateRestore });

  // Render
  return (
    <Stage {...}>
      <Layer>{grid.render()}</Layer>
      <Layer>{background.render()}</Layer>
      <Layer>{shapes.map(renderShape)}</Layer>
      <Layer>{selection.render()}</Layer>
      <Layer>{polygonDrawing.render()}</Layer>
    </Stage>
  );
};
```

## 📝 File Naming Conventions

- **Hooks**: `useKonva[Feature].ts` (e.g., `useKonvaZoom.ts`)
- **Components**: `[ComponentName].tsx` (PascalCase)
- **Types**: `[category].types.ts` (e.g., `shapes.types.ts`)
- **Utils**: `[functionality].ts` (camelCase)
- **Constants**: `[category]Constants.ts` (e.g., `konvaConstants.ts`)

## 🧪 Testing Structure (Phase 7)

Each file will have corresponding test files:

```
hooks/
  useKonvaZoom.ts
  useKonvaZoom.test.ts
  
components/
  KonvaMapCanvas.tsx
  KonvaMapCanvas.test.tsx
  
utils/
  coordinateTransform.ts
  coordinateTransform.test.ts
```

## 📊 Implementation Order

Files will be created in this order (following the 8-phase migration plan):

### Phase 1: Foundation (Current)
1. ✅ Directory structure
2. ✅ README.md
3. ✅ STRUCTURE.md
4. ✅ index.ts
5. ⏳ types/konva.types.ts
6. ⏳ types/shapes.types.ts
7. ⏳ constants/konvaConstants.ts
8. ⏳ utils/coordinateTransform.ts
9. ⏳ utils/shapeFactories.ts
10. ⏳ utils/validation.ts
11. ⏳ components/KonvaMapCanvas.tsx (basic)
12. ⏳ hooks/useKonvaLayers.ts

### Phase 2: Core Canvas Features
- hooks/useKonvaZoom.ts
- hooks/useKonvaPan.ts
- hooks/useKonvaGrid.ts
- hooks/useKonvaBackground.ts

### Phase 3: Drawing Tools
- hooks/useKonvaPolygonDrawing.ts
- hooks/useKonvaRectDrawing.ts (if needed)

### Phase 4: Selection & Manipulation
- hooks/useKonvaSelection.ts
- hooks/useKonvaTransform.ts
- components/TransformableShape.tsx
- components/PolygonEditor.tsx
- components/SelectionRect.tsx

### Phase 5: State Management
- hooks/useKonvaHistory.ts
- Adapters for MapDataContext and SharedMap

### Phases 6-8
- Advanced features, testing, and rollout

## 🔗 Dependencies

This module depends on:
- `react` - Core React library
- `react-konva` - React bindings for Konva
- `konva` - Canvas library
- `uuid` - ID generation
- Existing modules:
  - `MapDataContext` - Map data management
  - `SharedMap` - Real-time synchronization
  - UI components from `antd`

## 📚 References

- Migration Plan: `client/src/docs/fabricjs-to-react-konva-migration-plan.md`

