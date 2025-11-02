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

This implementation follows the patterns validated in the POC (`map-editor-poc/`):

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

## 🚀 Migration Status

This module is part of an 18-week migration from Fabric.js to React Konva:

- **Phase 1** (Weeks 1-2): Foundation & Infrastructure ← **Current**
- **Phase 2** (Weeks 3-4): Core Canvas Features
- **Phase 3** (Weeks 5-7): Drawing Tools
- **Phase 4** (Weeks 8-9): Selection & Manipulation
- **Phase 5** (Weeks 10-11): State Management & Persistence
- **Phase 6** (Weeks 12-13): Advanced Features
- **Phase 7** (Weeks 14-15): Testing & Validation
- **Phase 8** (Weeks 16-18): Integration & Rollout

See `client/src/docs/fabricjs-to-react-konva-migration-plan.md` for full details.

## 📚 Reference Implementation

The POC implementation at `client/src/modules/map-editor-poc/` serves as the reference for this production implementation. Key differences:

| Aspect | POC | Production |
|--------|-----|------------|
| **Purpose** | Validate feasibility | Production-ready code |
| **Data** | localStorage | Backend + SharedMap |
| **Error Handling** | Basic | Comprehensive |
| **Testing** | Manual | Automated tests |
| **Integration** | Standalone | Full integration |
| **Performance** | Good enough | Optimized |

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
- **POC Implementation Guide**: `client/src/docs/konva-poc-implementation-guide.md`
- **POC Evaluation**: `client/src/docs/konva-poc-evaluation-checklist.md`

## 🤝 Contributing

When working on this module:

1. **Follow POC Patterns**: Use the POC as a reference for architecture and patterns
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

