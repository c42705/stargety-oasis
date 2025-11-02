# Type Definitions - Konva Map Editor

This directory contains all TypeScript type definitions for the Konva-based map editor.

## Files

### `konva.types.ts`
Core type definitions for the editor:
- **Viewport & Camera**: `Viewport`, `ZoomConfig`
- **Grid**: `GridConfig`
- **Tools**: `EditorTool`, `ToolState`
- **Shapes**: `Shape`, `ShapeGeometry`, `ShapeStyle`, `ShapeCategory`, `ShapeMetadata`
- **Selection**: `SelectionState`, `SelectionRect`
- **History**: `HistoryState`, `EditorSnapshot`
- **Editor State**: `EditorState` (complete editor state)
- **Drawing State**: `PolygonDrawingState`, `RectangleDrawingState`
- **Transformation**: `TransformState`
- **Events**: `EditorEventType`, `EditorEvent`
- **Konva References**: `StageRef`, `LayerRef`

### `shapes.types.ts`
Shape-specific type definitions:
- **Creation**: `CreateShapeParams`, `CreatePolygonParams`, `CreateRectangleParams`
- **Updates**: `UpdateShapeParams`, `MoveShapeParams`, `ResizeShapeParams`, `RotateShapeParams`
- **Vertex Editing**: `VertexHandle`, `EdgeHandle`, `PolygonEditState`
- **Validation**: `ShapeValidationResult`, `PolygonValidationOptions`, `RectangleValidationOptions`
- **Conversion**: Types for converting between Konva shapes and MapDataContext types
- **Queries**: `ShapeQuery`, `ShapeQueryResult`
- **Bounds**: `ShapeBounds`
- **Operations**: `ShapeOperationResult`, `BatchShapeOperation`, `BatchOperationResult`
- **Serialization**: `SerializedShape`, `SerializationOptions`
- **Type Guards**: `isPolygonGeometry`, `isRectangleGeometry`, `isCollisionShape`, `isInteractiveShape`

### `hooks.types.ts`
Type definitions for all custom hooks:
- **Zoom**: `UseKonvaZoomParams`, `UseKonvaZoomReturn`
- **Pan**: `UseKonvaPanParams`, `UseKonvaPanReturn`
- **Grid**: `UseKonvaGridParams`, `UseKonvaGridReturn`
- **Polygon Drawing**: `UseKonvaPolygonDrawingParams`, `UseKonvaPolygonDrawingReturn`
- **Rectangle Drawing**: `UseKonvaRectangleDrawingParams`, `UseKonvaRectangleDrawingReturn`
- **Selection**: `UseKonvaSelectionParams`, `UseKonvaSelectionReturn`
- **Transform**: `UseKonvaTransformParams`, `UseKonvaTransformReturn`
- **History**: `UseKonvaHistoryParams`, `UseKonvaHistoryReturn`
- **Layers**: `UseKonvaLayersParams`, `UseKonvaLayersReturn`, `LayerRefs`
- **Keyboard Shortcuts**: `KeyboardShortcut`, `UseKonvaKeyboardShortcutsParams`, `UseKonvaKeyboardShortcutsReturn`
- **Background**: `UseKonvaBackgroundParams`, `UseKonvaBackgroundReturn`

### `index.ts`
Central export point for all types. **Always import from this file** for consistency:

```typescript
import type { Shape, Viewport, EditorTool } from '../types';
```

## Usage Examples

### Basic Shape Creation

```typescript
import type { Shape, CreatePolygonParams } from '../types';

const params: CreatePolygonParams = {
  vertices: [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 0, y: 100 },
  ],
  category: 'collision',
  name: 'Wall Section',
};
```

### Hook Usage

```typescript
import type { UseKonvaZoomParams, UseKonvaZoomReturn } from '../types';

const zoomParams: UseKonvaZoomParams = {
  viewport,
  onViewportChange: setViewport,
  config: {
    min: 0.3,
    max: 3.1,
    step: 0.1,
  },
};

const zoom: UseKonvaZoomReturn = useKonvaZoom(zoomParams);
```

### Type Guards

```typescript
import { isPolygonGeometry, isCollisionShape } from '../types';

if (isPolygonGeometry(shape.geometry)) {
  // TypeScript knows geometry is PolygonGeometry
  const points = shape.geometry.points;
}

if (isCollisionShape(shape)) {
  // Shape is a collision area
  console.log('Collision shape:', shape.id);
}
```

### Editor State

```typescript
import type { EditorState } from '../types';

const initialState: EditorState = {
  viewport: { zoom: 1, pan: { x: 0, y: 0 } },
  grid: { visible: true, spacing: 20, pattern: 'dots', color: '#ccc', opacity: 0.5 },
  shapes: [],
  selection: { selectedIds: [], isMultiSelect: false, selectionRect: null },
  tool: { current: 'select', previous: null, isActive: false },
  history: { past: [], future: [], maxSize: 50 },
  worldDimensions: { width: 800, height: 600 },
  isPreviewMode: false,
  isDirty: false,
};
```

## Type Safety Best Practices

### 1. Always Use Type Annotations for Hook Parameters

```typescript
// ✅ Good
const handleZoom = useCallback((viewport: Viewport) => {
  setViewport(viewport);
}, []);

// ❌ Bad - no type annotation
const handleZoom = useCallback((viewport) => {
  setViewport(viewport);
}, []);
```

### 2. Use Type Guards for Runtime Checks

```typescript
// ✅ Good
if (isPolygonGeometry(geometry)) {
  // TypeScript knows this is PolygonGeometry
  processPolygon(geometry.points);
}

// ❌ Bad - type assertion without check
const points = (geometry as PolygonGeometry).points;
```

### 3. Leverage Discriminated Unions

```typescript
// Geometry types are discriminated by 'type' field
function getShapeArea(geometry: ShapeGeometry): number {
  switch (geometry.type) {
    case 'rectangle':
      return geometry.width * geometry.height;
    case 'polygon':
      return calculatePolygonArea(geometry.points);
    default:
      // TypeScript ensures exhaustive checking
      const _exhaustive: never = geometry;
      return 0;
  }
}
```

### 4. Use Partial for Updates

```typescript
// ✅ Good - use Partial for optional updates
const updateShape = (id: string, updates: Partial<Shape>) => {
  // ...
};

// ❌ Bad - requires all fields
const updateShape = (id: string, updates: Shape) => {
  // ...
};
```

### 5. Prefer Type Imports

```typescript
// ✅ Good - explicit type import
import type { Shape, Viewport } from '../types';

// ⚠️ Acceptable but less clear
import { Shape, Viewport } from '../types';
```

## Integration with MapDataContext

The types are designed to integrate seamlessly with existing `MapDataContext` types:

```typescript
import type { InteractiveArea, ImpassableArea } from '../types';

// These are re-exported from MapDataContext for convenience
// You can use them alongside Konva types

function convertToInteractiveArea(shape: Shape): InteractiveArea {
  // Conversion logic
}
```

## Extending Types

When adding new features, follow these patterns:

### Adding a New Geometry Type

1. Add to `konva.types.ts`:
```typescript
export interface CircleGeometry extends BaseGeometry {
  type: 'circle';
  x: number;
  y: number;
  radius: number;
}

export type ShapeGeometry = RectangleGeometry | PolygonGeometry | CircleGeometry;
```

2. Add type guard to `shapes.types.ts`:
```typescript
export function isCircleGeometry(geometry: ShapeGeometry): geometry is CircleGeometry {
  return geometry.type === 'circle';
}
```

3. Export from `index.ts`:
```typescript
export type { CircleGeometry } from './konva.types';
export { isCircleGeometry } from './shapes.types';
```

### Adding a New Hook

1. Add types to `hooks.types.ts`:
```typescript
export interface UseKonvaFeatureParams {
  // params
}

export interface UseKonvaFeatureReturn {
  // return value
}
```

2. Export from `index.ts`:
```typescript
export type {
  UseKonvaFeatureParams,
  UseKonvaFeatureReturn,
} from './hooks.types';
```

## Documentation

All types include comprehensive JSDoc comments. Use your IDE's IntelliSense to view:
- Type descriptions
- Field explanations
- Usage examples
- Related types

## Version History

- **v0.1.1-alpha** (2025-11-02): Initial production-grade type definitions
  - Core types (konva.types.ts)
  - Shape types (shapes.types.ts)
  - Hook types (hooks.types.ts)
  - Central exports (index.ts)

## References

- **POC Types**: `client/src/modules/map-editor-poc/types/konva.types.ts`
- **MapDataContext**: `client/src/shared/MapDataContext.tsx`
- **Migration Plan**: `client/src/docs/fabricjs-to-react-konva-migration-plan.md`

