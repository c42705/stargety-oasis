# Stargety Oasis - Project Brief

## Overview

**Stargety Oasis** is a comprehensive virtual world platform that combines real-time chat, video calling (Jitsi Meet), and an interactive 2D world experience (Phaser.js) with a powerful map editor (Konva.js). It's designed for seamless communication and collaboration in a virtual office-like environment.

---

## Project Preferences & Guidelines

### Architecture Principles
- **Simpler is better**: Prefer straightforward architectures over complex multi-system setups
- **Redux for state**: Single source of truth via Redux Toolkit (not Zustand)
- **PostgreSQL for persistence**: All data (maps, settings, avatars) stored in PostgreSQL
- **Konva + PostgreSQL only**: No legacy SharedMapSystem or localStorage fallbacks for map editing

### UI/UX Standards
- **Ant Design first**: Use Ant Design components wherever possible; minimize custom CSS
- **Theme-driven**: Rely on Ant Design's theme system for colors and styling
- **Modal behavior**: Disable background game interactions when modals are open

### Map Editor Guidelines
- **Fixed toolbars**: Tool selection and zoom controls at top
- **Status bar**: Bottom bar showing coordinates and tool state
- **SVG grid**: Configurable spacing/opacity for precise placement
- **Unified sidebar**: Tabs, content panels, and toolbars integrated in single sidebar
- **Canvas sizing**: Account for dynamic splitter panels, avoid weird margins
- **Zoom compatibility**: Support 0.3x to 3.1x+ zoom levels
- **Selection features**: Shift+click range selection, drag-to-select box on canvas
- **Polygon drawing**: Use Konva native methods, prioritize working code over perfection

### Game Development (Phaser.js)
- **Pure Phaser.js**: Avoid complex integrations (no Fabric.js, SharedMap)
- **Native camera**: Use camera.zoomTo(), camera.pan() with 300-500ms tweening
- **Performance first**: Design for optimization from the ground up
- **Incremental approach**: Start basic, add complexity gradually

### Jitsi Integration
- **Auto join/leave**: When characters enter/exit interactive map areas
- **Embedded UI**: In existing video service panel component
- **Area mapping**: Interactive area IDs map to Jitsi room names (stored in PostgreSQL)

### Avatar Customization
- **antd-img-crop**: With picture-card layout, rotation sliders, preview
- **Multi-file upload**: Up to 8 images with picture-card previews

### Code Quality
- **Working > Perfect**: Prioritize UI working in browser over perfect compilation
- **Bug fixes first**: Preserve existing functionality when improving code
- **Batch TypeScript fixes**: Group related errors (10-20 at once), compile per batch
- **Documentation**: Confirm before writing large docs; only write what's approved

---

## Technology Stack

### Frontend (React 19 + TypeScript)
- **Framework**: React 19 with TypeScript strict mode
- **State Management**: Redux Toolkit (`@reduxjs/toolkit`) - single source of truth
- **UI Library**: Ant Design 5 with custom theming
- **2D Game Engine**: Phaser.js for the virtual world
- **Canvas Editor**: React Konva for map editor
- **Real-time**: Socket.IO client
- **Routing**: React Router DOM v7

### Backend (Node.js + Express)
- **Runtime**: Node.js with Express
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: Socket.IO server
- **File Storage**: Local filesystem with multer uploads
- **API**: RESTful endpoints + WebSocket events

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Video Conferencing**: Jitsi Meet integration

---

## Project Structure

```
stargety-oasis/
├── client/                     # React frontend application
│   ├── src/
│   │   ├── modules/            # Feature modules (modular architecture)
│   │   │   ├── chat/           # Chat module
│   │   │   ├── video-call/     # Jitsi video integration
│   │   │   ├── world/          # Phaser.js 2D world (GameScene)
│   │   │   ├── map-editor-konva/  # Production map editor
│   │   │   └── login/          # Authentication module
│   │   ├── redux/              # Redux store, slices, selectors
│   │   ├── stores/             # Data services (MapDataService)
│   │   ├── services/           # API client services
│   │   ├── shared/             # Shared contexts and utilities
│   │   ├── components/         # Reusable UI components
│   │   └── theme/              # Ant Design theming
│   └── public/
│
├── server/                     # Node.js backend
│   ├── src/
│   │   ├── chat/               # Chat controller (Socket.IO + DB)
│   │   ├── map/                # Map API (PostgreSQL)
│   │   ├── character/          # Avatar/character system
│   │   ├── world/              # World state management
│   │   ├── video-call/         # Video call controller
│   │   ├── settings/           # User settings & player positions
│   │   └── utils/              # Prisma, logger, uploads
│   └── prisma/                 # Database schema & migrations
│
└── docker-compose.yml          # Multi-container setup
```

---

## Architecture Patterns

### State Management (Redux)

**Store Configuration** (`client/src/redux/store.ts`):
```typescript
export const store = configureStore({
  reducer: {
    map: mapReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});
```

**Map Slice** (`client/src/redux/slices/mapSlice.ts`):
- Manages: `mapData`, `isLoading`, `error`, `lastSaved`, `isDirty`, `uploadStatus`
- Async thunks: `loadMap`, `saveMap`, `resetMap`, `importMap`, `uploadBackgroundImage`
- Sync actions: Interactive areas, collision areas, assets CRUD, world dimensions

**Typed Hooks** (`client/src/redux/hooks.ts`):
```typescript
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

**Primary Hook** (`client/src/stores/useMapStore.ts`):
```typescript
export const useMapStore = useMapStoreImpl;  // Redux-based implementation
export const useMapData = () => useAppSelector(selectMapData);
```

### Hook-Based Architecture (Map Editor)

Each feature is isolated in its own custom hook:

| Hook | Purpose |
|------|---------|
| `useKonvaZoom` | Zoom in/out, mouse wheel, zoom limits |
| `useKonvaPan` | Canvas panning, middle mouse, touch |
| `useKonvaPolygonDrawing` | Polygon drawing with click-to-add |
| `useKonvaSelection` | Shape selection, multi-select |
| `useKonvaTransform` | Drag, resize, rotate shapes |
| `useKonvaHistory` | Undo/redo system |
| `useKonvaGrid` | Grid rendering with patterns |
| `useKonvaBackground` | Background image support |
| `useKonvaLayers` | Layer management |
| `useEditorCoreState` | Central state orchestration |

**Hook Pattern**:
```typescript
export function useKonvaFeature(params: UseKonvaFeatureParams): UseKonvaFeatureReturn {
  const { enabled, viewport, onViewportChange, config = {} } = params;
  
  const handleEvent = useCallback((e: KonvaEventObject) => {
    if (!enabled) return;
    // Event logic
  }, [enabled, /* deps */]);
  
  return { state, handleEvent, /* actions */ };
}
```

### Context Providers

The app uses multiple context providers layered in `App.tsx`:

```typescript
<ThemeProvider>
  <ModalStateProvider>
    <ConfigProvider>
      <AuthProvider>
        <SettingsProvider>
          <EventBusProvider>
            <MapDataProvider>
              <ActionDispatcherProvider>
                {/* App content */}
              </ActionDispatcherProvider>
            </MapDataProvider>
          </EventBusProvider>
        </SettingsProvider>
      </AuthProvider>
    </ConfigProvider>
  </ModalStateProvider>
</ThemeProvider>
```

---

## Data Models (Prisma Schema)

### Core Models

| Model | Purpose |
|-------|---------|
| `User` | Authentication (email, username, password hash) |
| `Map` | Map data as JSONB (areas, dimensions, background) |
| `MapAsset` | Uploaded images/sprites for maps |
| `Character` | Avatar slots (up to 5 per user) with sprite sheets |
| `ActiveCharacter` | Tracks active character slot per user |
| `UserSettings` | Theme, Jitsi URL, editor preferences |
| `PlayerPosition` | Ephemeral player locations |
| `ChatRoom` | Persistent chat rooms with TTL |
| `Message` | Chat messages with 8hr TTL |

### Map Data Structure

```typescript
interface ExtendedMapData {
  version: number;
  lastModified: Date;
  metadata: { name, description, tags };
  worldDimensions: { width, height };
  backgroundImage: string;
  backgroundImageDimensions: { width, height };
  interactiveAreas: InteractiveArea[];  // Jitsi rooms, portals
  impassableAreas: ImpassableArea[];    // Collision zones
  assets: Asset[];                       // Placed sprites
}
```

---

## Key Modules

### World Module (`modules/world/WorldModule.tsx`)
- Initializes Phaser.js game with `GameScene`
- Consumes map data from Redux store via `useMapStore()`
- Handles zoom controls, camera following
- Real-time multiplayer via Socket.IO

### Map Editor (`modules/map-editor-konva/`)
- Production-ready Konva.js canvas editor
- Hook-based architecture for modularity
- Supports: rectangles, polygons, background images
- Undo/redo, grid snapping, zoom/pan
- Persists to PostgreSQL (localStorage fallback)

### Login Module (`modules/login/LoginModule.tsx`)
- Demo accounts for testing
- World room selection for multiplayer
- Session-based authentication (sessionStorage)

---

## API Endpoints

### Maps
- `GET /api/maps` - List all maps
- `GET /api/maps/:roomId` - Get map data
- `POST/PUT /api/maps/:roomId` - Save map
- `DELETE /api/maps/:roomId` - Delete map
- `POST /api/maps/:roomId/assets` - Upload asset

### Characters
- `GET /api/characters/:userId/slots` - List slots
- `PUT /api/characters/:userId/slots/:slot` - Save character
- `GET/PUT /api/characters/:userId/active` - Active character

### Settings
- `GET/PUT /api/settings/:userId` - User settings

### Chat
- `GET /api/chat/:roomId/messages` - Get messages
- `POST /api/chat/:roomId/messages` - Send message

---

## Socket.IO Events

### Chat
- `join-room`, `send-message`, `typing`
- `chat:join`, `chat:message`, `chat:typing` (DB-backed)

### World
- `player-joined-world` - Player enters world
- `player-moved` - Position updates

### Video
- `join-video-call`, `leave-video-call`

### Map (Editor)
- `join-map`, `leave-map`
- `map:update`, `map:partial:update`

---

## Development Guidelines

### Code Organization
- Files under 490 lines (split with imports)
- Use Ant Design for UI consistency
- DRY principle - avoid duplication
- TypeScript strict mode required

### Hook Rules
1. Each hook has single responsibility
2. Use `useCallback` for event handlers
3. Memoize with proper dependencies
4. Return typed objects

### State Management
1. Use Redux for global state (map data)
2. Use React state for local UI state
3. Use contexts for cross-cutting concerns
4. Avoid prop drilling

### Testing
- Jest + React Testing Library
- Test hooks independently
- Mock Redux store for components

---

## Quick Start

```bash
# Start all services with Docker
docker compose up -d --build

# Access application
open http://localhost:3000

# Demo accounts:
# admin / admin123 (Admin user)
# john.doe / user123 (Regular user)
```

---

## Important Files Reference

| File | Purpose |
|------|---------|
| `client/src/index.tsx` | App entry, Redux Provider setup |
| `client/src/App.tsx` | Root component, routing, providers |
| `client/src/redux/store.ts` | Redux store configuration |
| `client/src/redux/slices/mapSlice.ts` | Map state management |
| `client/src/stores/useMapStore.ts` | Map store hook |
| `client/src/stores/MapDataService.ts` | Map persistence service |
| `client/src/modules/world/WorldModule.tsx` | Phaser world component |
| `client/src/modules/map-editor-konva/` | Map editor module |
| `server/src/index.ts` | Server entry, all routes |
| `server/prisma/schema.prisma` | Database schema |

---

## Migration Status

- ✅ Fabric.js → React Konva (Map Editor)
- ✅ SharedMapSystem → Redux (State Management)
- ✅ localStorage → PostgreSQL (Persistence)
- ✅ RingCentral → Jitsi (Video Calls)
