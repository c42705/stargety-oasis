# Quick Start Guide - Map Editor Konva

This guide helps developers quickly understand and work with the Konva-based map editor.

## 🚀 Getting Started

### Prerequisites
- Familiarity with React and TypeScript
- Understanding of React hooks
- Basic knowledge of Konva (or willingness to learn)
- Review the POC at `client/src/modules/map-editor-poc/`

### Key Concepts

#### 1. Declarative vs Imperative
**Fabric.js (Old)**: Imperative - directly manipulate canvas objects
```typescript
// ❌ Old way (Fabric.js)
const rect = new fabric.Rect({ ... });
canvas.add(rect);
rect.set({ left: 100 }); // Direct mutation
canvas.renderAll();
```

**React Konva (New)**: Declarative - state drives rendering
```typescript
// ✅ New way (React Konva)
const [shapes, setShapes] = useState<Shape[]>([]);
setShapes([...shapes, newShape]); // State update
// React automatically re-renders
```

#### 2. Coordinate Systems
Always use transformation utilities:

```typescript
import { screenToWorld, worldToScreen } from '../utils/coordinateTransform';

// Mouse event → Canvas coordinates
const handleClick = (e: KonvaEventObject) => {
  const stage = e.target.getStage();
  const pointerPos = stage.getPointerPosition();
  const worldPos = screenToWorld(pointerPos.x, pointerPos.y, viewport);
  // Now worldPos is in canvas coordinates, accounting for zoom/pan
};
```

#### 3. Hook Pattern
Each feature is a hook that returns handlers and state:

```typescript
const zoom = useKonvaZoom({
  viewport,
  onViewportChange: setViewport,
});

// Use in JSX
<Stage onWheel={zoom.handleWheel}>
  {/* ... */}
</Stage>

// Use programmatically
<Button onClick={zoom.zoomIn}>Zoom In</Button>
```

## 📖 Common Tasks

### Adding a New Shape Type

1. **Define the type** in `types/shapes.types.ts`:
```typescript
export interface CircleGeometry {
  type: 'circle';
  x: number;
  y: number;
  radius: number;
}
```

2. **Create a factory** in `utils/shapeFactories.ts`:
```typescript
export const createCircleShape = (
  x: number,
  y: number,
  radius: number,
  category: ShapeCategory
): Shape => ({
  id: uuidv4(),
  category,
  geometry: { type: 'circle', x, y, radius },
  style: STYLES[category],
  metadata: {},
});
```

3. **Add rendering** in `KonvaMapCanvas.tsx`:
```typescript
const renderShape = (shape: Shape) => {
  if (shape.geometry.type === 'circle') {
    return <Circle key={shape.id} {...shape.geometry} {...shape.style} />;
  }
  // ... other types
};
```

### Creating a New Hook

1. **Create the file** `hooks/useKonvaFeature.ts`:
```typescript
import { useCallback, useState } from 'react';
import { KonvaEventObject } from 'konva/lib/Node';

interface UseKonvaFeatureProps {
  enabled: boolean;
  viewport: Viewport;
  onFeatureComplete: (data: FeatureData) => void;
}

interface FeatureState {
  isActive: boolean;
  // ... other state
}

export const useKonvaFeature = (props: UseKonvaFeatureProps) => {
  const { enabled, viewport, onFeatureComplete } = props;
  const [state, setState] = useState<FeatureState>({ isActive: false });

  const handleMouseDown = useCallback((e: KonvaEventObject) => {
    if (!enabled) return;
    // Handle event
  }, [enabled]);

  const handleMouseMove = useCallback((e: KonvaEventObject) => {
    if (!enabled || !state.isActive) return;
    // Handle event
  }, [enabled, state.isActive]);

  const handleMouseUp = useCallback(() => {
    if (!enabled || !state.isActive) return;
    // Complete feature
    onFeatureComplete(/* data */);
  }, [enabled, state.isActive, onFeatureComplete]);

  return {
    state,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
  };
};
```

2. **Use in KonvaMapCanvas**:
```typescript
const feature = useKonvaFeature({
  enabled: currentTool === 'feature',
  viewport,
  onFeatureComplete: handleFeatureComplete,
});

// In Stage
<Stage
  onMouseDown={(e) => {
    feature.handleMouseDown(e);
    // ... other handlers
  }}
  // ...
>
```

### Handling Zoom/Pan Correctly

Always account for viewport transformation:

```typescript
// ✅ Correct
const screenToWorld = (screenX: number, screenY: number) => ({
  x: (screenX - viewport.pan.x) / viewport.zoom,
  y: (screenY - viewport.pan.y) / viewport.zoom,
});

// ❌ Incorrect - doesn't account for zoom/pan
const worldPos = { x: mouseX, y: mouseY };
```

### Adding Keyboard Shortcuts

```typescript
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Prevent shortcuts when typing in inputs
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    if (e.key === 'g' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      toggleGrid();
    }

    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      undo();
    }

    // ... more shortcuts
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [/* dependencies */]);
```

## 🐛 Common Pitfalls

### 1. Forgetting to Check `enabled` Flag
```typescript
// ❌ Wrong - will interfere with other tools
const handleClick = (e: KonvaEventObject) => {
  addVertex(e);
};

// ✅ Correct - only active when tool is enabled
const handleClick = (e: KonvaEventObject) => {
  if (!enabled) return;
  addVertex(e);
};
```

### 2. Not Using `useCallback` for Event Handlers
```typescript
// ❌ Wrong - creates new function on every render
const handleClick = (e: KonvaEventObject) => {
  // ...
};

// ✅ Correct - memoized function
const handleClick = useCallback((e: KonvaEventObject) => {
  // ...
}, [/* dependencies */]);
```

### 3. Mutating State Directly
```typescript
// ❌ Wrong - mutates state
shapes[0].geometry.x = 100;
setShapes(shapes);

// ✅ Correct - creates new state
setShapes(shapes.map((shape, i) => 
  i === 0 
    ? { ...shape, geometry: { ...shape.geometry, x: 100 } }
    : shape
));
```

### 4. Incorrect Coordinate Transformation
```typescript
// ❌ Wrong - uses screen coordinates directly
const handleClick = (e: KonvaEventObject) => {
  const pos = stage.getPointerPosition();
  createShape(pos.x, pos.y); // Wrong!
};

// ✅ Correct - transforms to world coordinates
const handleClick = (e: KonvaEventObject) => {
  const pos = stage.getPointerPosition();
  const worldPos = screenToWorld(pos.x, pos.y, viewport);
  createShape(worldPos.x, worldPos.y);
};
```

## 🔍 Debugging Tips

### 1. Use the Debug Overlay
```typescript
// Add to KonvaMapCanvas for debugging
{process.env.NODE_ENV === 'development' && (
  <Layer>
    <Text
      text={`Zoom: ${viewport.zoom.toFixed(2)}\nPan: ${viewport.pan.x}, ${viewport.pan.y}\nShapes: ${shapes.length}`}
      x={10}
      y={10}
      fontSize={12}
      fill="red"
    />
  </Layer>
)}
```

### 2. Log Coordinate Transformations
```typescript
const worldPos = screenToWorld(mouseX, mouseY, viewport);
console.log('Screen:', { x: mouseX, y: mouseY });
console.log('World:', worldPos);
console.log('Viewport:', viewport);
```

### 3. Visualize Hit Areas
```typescript
// Temporarily add visible rectangles to debug hit detection
<Rect
  x={shape.x}
  y={shape.y}
  width={shape.width}
  height={shape.height}
  stroke="red"
  strokeWidth={2}
  listening={false}
/>
```

## 📚 Learning Resources

### Internal
- **POC Implementation**: `client/src/modules/map-editor-poc/`
- **Migration Plan**: `client/src/docs/fabricjs-to-react-konva-migration-plan.md`
- **POC Guide**: `client/src/docs/konva-poc-implementation-guide.md`

### External
- [React Konva Documentation](https://konvajs.org/docs/react/)
- [Konva API Reference](https://konvajs.org/api/Konva.html)
- [React Hooks Guide](https://react.dev/reference/react)

## 🤝 Getting Help

1. **Check the POC**: Most patterns are demonstrated in `map-editor-poc/`
2. **Review existing hooks**: See how similar features are implemented
3. **Read the migration plan**: Understand the overall architecture
4. **Ask questions**: Don't hesitate to reach out to the team

## ✅ Checklist for New Features

- [ ] Type definitions added to `types/`
- [ ] Constants added to `constants/` if needed
- [ ] Utility functions added to `utils/` if needed
- [ ] Hook created in `hooks/` following the pattern
- [ ] Hook integrated into `KonvaMapCanvas`
- [ ] Coordinate transformation handled correctly
- [ ] `enabled` flag checked in event handlers
- [ ] Event handlers memoized with `useCallback`
- [ ] State updates are immutable
- [ ] Keyboard shortcuts added if applicable
- [ ] Documentation updated
- [ ] Tests written (Phase 7)

Happy coding! 🎨

