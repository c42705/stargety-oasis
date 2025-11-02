# Konva Map Editor - Utilities

This directory contains utility functions for the Konva map editor.

## Files

### `coordinateTransform.ts`
Coordinate transformation utilities for converting between screen and world coordinates.

**Key Functions:**
- `screenToWorld()` - Convert mouse coordinates to canvas coordinates
- `worldToScreen()` - Convert canvas coordinates to screen coordinates
- `zoomToPoint()` - Calculate viewport for zooming to a specific point
- `fitBoundsInView()` - Calculate viewport to fit bounds in view

### `shapeFactories.ts`
Factory functions for creating shapes with proper defaults and validation.

**Key Functions:**
- `createPolygonShape()` - Create polygon shape from vertices
- `createRectangleShape()` - Create rectangle shape
- `duplicateShape()` - Duplicate shape with new ID and offset
- `cloneShape()` - Clone shape (deep copy)

### `validation.ts`
Validation functions for shapes, coordinates, and editor constraints.

**Key Functions:**
- `validateShape()` - Validate complete shape
- `validatePolygon()` - Validate polygon geometry
- `validateRectangle()` - Validate rectangle geometry
- `isValidCoordinate()` - Validate single coordinate value

### `mapDataAdapter.ts`
Adapter for converting between Konva shapes and MapDataContext format.

**Key Functions:**
- `shapeToInteractiveArea()` - Convert shape to InteractiveArea
- `shapeToImpassableArea()` - Convert shape to ImpassableArea
- `interactiveAreaToShape()` - Convert InteractiveArea to shape
- `impassableAreaToShape()` - Convert ImpassableArea to shape
- `mapDataToShapes()` - Convert MapData to shapes array
- `shapesToMapData()` - Convert shapes array to MapData

### `sharedMapAdapter.ts`
Adapter for integrating with SharedMapSystem for real-time synchronization.

**Key Classes:**
- `SharedMapAdapter` - Main adapter class for SharedMap integration

**Key Functions:**
- `createSharedMapAdapter()` - Factory function for creating adapter
- `setupSharedMapListeners()` - Setup event listeners for React components

## Usage Examples

### Coordinate Transformation
```typescript
import { screenToWorld, worldToScreen } from '../utils/coordinateTransform';

const handleClick = (e: KonvaEventObject) => {
  const stage = e.target.getStage();
  const pointerPos = stage.getPointerPosition();
  const worldPos = screenToWorld(pointerPos.x, pointerPos.y, viewport);
  console.log('Clicked at:', worldPos);
};
```

### Shape Creation
```typescript
import { createPolygonShape, createRectangleShape } from '../utils/shapeFactories';

const polygon = createPolygonShape({
  vertices: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }],
  category: 'collision',
  name: 'Wall',
});

const rect = createRectangleShape({
  x: 200,
  y: 200,
  width: 100,
  height: 100,
  category: 'interactive',
  name: 'Meeting Room',
});
```

### Validation
```typescript
import { validateShape, validatePolygon } from '../utils/validation';

const result = validateShape(shape);
if (!result.isValid) {
  console.error('Validation errors:', result.errors);
}
if (result.warnings.length > 0) {
  console.warn('Validation warnings:', result.warnings);
}
```

### MapData Conversion
```typescript
import { mapDataToShapes, shapesToMapData } from '../utils/mapDataAdapter';

// Load shapes from MapData
const shapes = mapDataToShapes(
  mapData.interactiveAreas,
  mapData.impassableAreas
);

// Save shapes to MapData
const { interactiveAreas, impassableAreas } = shapesToMapData(shapes);
```

### SharedMap Integration
```typescript
import { createSharedMapAdapter, setupSharedMapListeners } from '../utils/sharedMapAdapter';

const adapter = createSharedMapAdapter({
  autoSync: true,
  syncDebounceMs: 100,
});

await adapter.initialize();

const cleanup = setupSharedMapListeners(adapter, {
  onMapChanged: (data) => console.log('Map changed:', data),
  onElementAdded: (data) => console.log('Element added:', data),
});

// Later...
cleanup();
adapter.disconnect();
```

## Best Practices

1. **Always use coordinate transformation utilities** when working with mouse/pointer events
2. **Use factory functions** to create shapes instead of manual construction
3. **Validate shapes** before adding them to the editor
4. **Use adapters** for all MapData and SharedMap interactions
5. **Clean up** SharedMap listeners when components unmount

## Performance Tips

1. Coordinate transformations are lightweight - use them freely
2. Shape validation can be expensive for complex polygons - validate only when necessary
3. Batch MapData updates when possible
4. Use debounced sync for frequent shape updates
5. Cache validation results for unchanged shapes

