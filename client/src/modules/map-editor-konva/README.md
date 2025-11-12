# Map Editor - React Konva Implementation

This module contains the production implementation of the map editor using React Konva, replacing the previous Fabric.js implementation.

## 📁 Module Structure

```
map-editor-konva/
├── hooks/              # Custom React hooks for editor features
│   ├── useKonvaZoom.ts           # Zoom in/out functionality
│   ├── useKonvaPan.ts            # Canvas panning
│   ├── useKonvaPolygonDrawing.ts # Polygon drawing tool
│   ├── useKonvaSelection.ts      # Shape selection system
│   ├── useKonvaTransform.ts      # Object transformation (move, resize)
│   ├── useKonvaHistory.ts        # Undo/redo system
│   ├── useKonvaGrid.ts           # Grid rendering
│   ├── useKonvaBackground.ts     # Background image support
│   └── useKonvaLayers.ts         # Layer management
│
├── components/         # React components
│   ├── KonvaMapCanvas.tsx        # Main canvas component
│   ├── TransformableShape.tsx    # Wrapper for transformable shapes
│   ├── PolygonEditor.tsx         # Polygon vertex editing UI
│   └── SelectionRect.tsx         # Selection rectangle component
│
├── types/              # TypeScript type definitions
│   ├── konva.types.ts            # Core Konva types (viewport, tools, etc.)
│   └── shapes.types.ts           # Shape-specific types
│
├── constants/          # Configuration and constants
│   └── konvaConstants.ts         # Canvas config, zoom limits, styles, etc.
│
├── utils/              # Utility functions
│   ├── coordinateTransform.ts    # Screen ↔ world coordinate conversion
│   ├── shapeFactories.ts         # Factory functions for creating shapes
│   └── validation.ts             # Shape and input validation
│
├── index.ts            # Module exports
└── README.md           # This file
```

## 🎯 Architecture Principles

This implementation follows a hook-based architecture pattern:

### 1. Hook-Based Architecture
Each feature is isolated in its own hook, making the code:
- **Modular**: Easy to understand and maintain
- **Testable**: Each hook can be tested independently
- **Reusable**: Hooks can be composed and reused

### 2. Declarative State Management
All canvas state is managed through React state:
- No imperative Konva node mutations
- Single source of truth
- Predictable state updates
- Easy to serialize for undo/redo

### 3. Coordinate Transformation
Clean separation between screen and world coordinates:
- `screenToWorld`: Mouse position → canvas coordinates
- `worldToScreen`: Canvas coordinates → screen position
- Properly accounts for zoom and pan

### 4. Layer Management
Proper layering for performance and visual correctness:
1. **Grid Layer** (cached, static)
2. **Background Layer** (image, cached)
3. **Shapes Layer** (dynamic, interactive)
4. **Selection Layer** (highlights, handles)
5. **UI Layer** (temporary drawing previews)

## 🔄 Integration Points

### MapDataContext
- Adapter layer converts between Konva shapes and MapData format
- Handles bidirectional data flow

### SharedMap
- Real-time synchronization of shape changes
- Handles incoming updates from other users/systems
- Optimistic updates with rollback

### Existing UI
- Integrates with existing toolbar and controls
- Uses existing modals for area properties
- Maintains consistent UX with rest of application

## 🚀 Status

**Migration Status**: ✅ **COMPLETE**

The migration from Fabric.js to React Konva has been successfully completed. The Konva editor is now fully integrated and ready for production use.

### Current Features
- ✅ Shape selection and transformation (drag, resize, rotate)
- ✅ Pan tool for canvas navigation
- ✅ Polygon drawing for collision areas
- ✅ Rectangle drawing for interactive areas
- ✅ Grid rendering with visibility toggle
- ✅ Background image support
- ✅ Zoom controls (buttons + mouse wheel)
- ✅ Undo/Redo functionality
- ✅ localStorage persistence via map store
- ✅ Modal-based area creation/editing
- ✅ Preview mode
- ✅ Keyboard shortcuts

### Known Limitations
- LayersPanel (left sidebar) not yet implemented
- Multi-select (drag to select multiple shapes) not implemented

See `FEATURE_PARITY_COMPARISON.md` for detailed feature comparison with Fabric.js editor.

## 📚 Implementation Details

This is the production-ready Konva-based map editor implementation with the following characteristics:

| Aspect | Implementation |
|--------|----------------|
| **Purpose** | Production-ready code |
| **Data** | Backend + SharedMap |
| **Error Handling** | Comprehensive |
| **Testing** | Automated tests |
| **Integration** | Full integration |
| **Performance** | Optimized |

## 🛠️ Development Guidelines

### Adding a New Hook

```typescript
// hooks/useKonvaFeature.ts
import { useCallback, useState } from 'react';
import { KonvaEventObject } from 'konva/lib/Node';

interface UseKonvaFeatureProps {
  enabled: boolean;
  viewport: Viewport;
  onStateChange: (state: FeatureState) => void;
}

export const useKonvaFeature = (props: UseKonvaFeatureProps) => {
  const { enabled, viewport, onStateChange } = props;
  const [state, setState] = useState<FeatureState>(initialState);
  
  const handleEvent = useCallback((e: KonvaEventObject) => {
    if (!enabled) return;
    // Event handling logic
  }, [enabled]);
  
  return {
    state,
    handleEvent,
  };
};
```

### Coordinate Transformation

Always use the utility functions for coordinate conversion:

```typescript
import { screenToWorld, worldToScreen } from '../utils/coordinateTransform';

// Convert mouse position to canvas coordinates
const worldPos = screenToWorld(mouseX, mouseY, viewport);

// Convert canvas coordinates to screen position
const screenPos = worldToScreen(canvasX, canvasY, viewport);
```

### State Management Pattern

```typescript
interface EditorState {
  viewport: {
    zoom: number;
    pan: { x: number; y: number };
  };
  shapes: Shape[];
  selectedIds: string[];
  currentTool: Tool;
  history: {
    past: EditorState[];
    future: EditorState[];
  };
}
```

## 📖 Additional Documentation

- **Migration Plan**: `client/src/docs/fabricjs-to-react-konva-migration-plan.md`

## 🤝 Contributing

When working on this module:

1. **Follow Hook-Based Architecture**: Keep hooks focused and modular
2. **Keep Hooks Focused**: Each hook should have a single responsibility
3. **Test Thoroughly**: Write tests for all new functionality
4. **Document Changes**: Update this README and related docs
5. **Performance First**: Consider performance implications of all changes

## 📝 Notes

- All files should be under 490 lines of code (use imports/references to reduce size)
- Prefer Ant Design components for UI consistency
- Use meaningful naming for variables, functions, and components
- Follow DRY principle - avoid code duplication
- Add TODO comments for future database migration where applicable

