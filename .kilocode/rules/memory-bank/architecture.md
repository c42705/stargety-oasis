# Stargety Oasis - Architecture Documentation

## System Overview

Stargety Oasis is a full-stack web application with a clear separation between client and server components, connected through REST APIs and WebSocket events.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (React)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ WorldModule  │  │  Map Editor  │  │    Chat      │         │
│  │  (Phaser.js) │  │  (Konva.js)  │  │  (Socket.IO) │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                  │                 │
│         └────────────┬────┴──────────────────┘                 │
│                      ▼                                         │
│              ┌──────────────┐                                  │
│              │ Redux Store  │                                  │
│              │  (mapSlice)  │                                  │
│              └──────┬───────┘                                  │
│                     │                                          │
│         ┌───────────┴───────────┐                             │
│         ▼                       ▼                             │
│  ┌──────────────┐      ┌──────────────┐                       │
│  │MapDataService│      │ MapApiService│                       │
│  │ (fallback)   │      │   (REST)     │                       │
│  └──────────────┘      └──────────────┘                       │
└─────────────────────────────────────────────────────────────────┘
                         │ HTTP/WS
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVER (Express + Socket.IO)              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ mapController│  │chatController│  │worldController│        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                 │                  │                 │
│         └────────────┬────┴──────────────────┘                 │
│                      ▼                                         │
│              ┌──────────────┐                                  │
│              │ Prisma ORM   │                                  │
│              └──────┬───────┘                                  │
│                     ▼                                          │
│              ┌──────────────┐                                  │
│              │ PostgreSQL   │                                  │
│              │  (PostGIS)   │                                  │
│              └──────────────┘                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
stargety-oasis/
├── client/                          # React frontend
│   ├── src/
│   │   ├── modules/                 # Feature modules
│   │   │   ├── world/              # Phaser.js game (WorldModule.tsx, GameScene.ts)
│   │   │   ├── map-editor-konva/   # Konva map editor (hooks, components)
│   │   │   ├── chat/               # Chat UI (ChatModule.tsx)
│   │   │   ├── video-call/         # Jitsi integration (placeholder)
│   │   │   └── login/              # Authentication (LoginModule.tsx)
│   │   ├── redux/                   # Redux Toolkit
│   │   │   ├── store.ts            # Store configuration
│   │   │   ├── slices/mapSlice.ts  # Map state management
│   │   │   ├── hooks.ts            # Typed useDispatch/useSelector
│   │   │   └── selectors/          # Memoized selectors
│   │   ├── stores/                  # Data services
│   │   │   ├── useMapStore.ts      # Primary map hook export
│   │   │   └── MapDataService.ts   # PostgreSQL + localStorage persistence
│   │   ├── services/api/            # REST API clients
│   │   │   ├── MapApiService.ts    # Map CRUD operations
│   │   │   └── CharacterApiService.ts
│   │   ├── shared/                  # Cross-cutting concerns
│   │   │   ├── AuthContext.tsx     # Authentication state
│   │   │   ├── SettingsContext.tsx # User preferences
│   │   │   ├── EventBusContext.tsx # Inter-component events
│   │   │   ├── MapDataContext.tsx  # Legacy context (migrating to Redux)
│   │   │   ├── ThemeContext.tsx    # Ant Design theming
│   │   │   └── ModalStateManager.tsx # Modal state coordination
│   │   ├── components/              # Shared UI components
│   │   │   ├── SplitLayoutComponent.tsx # Main layout splitter
│   │   │   ├── VideoCommunicationPanel.tsx
│   │   │   ├── PersistentChatPanel.tsx
│   │   │   └── avatar/             # Avatar builder components
│   │   └── theme/                   # Ant Design theme configs
│
├── server/                          # Express backend
│   ├── src/
│   │   ├── index.ts                # Main entry, all routes and Socket.IO
│   │   ├── map/mapController.ts    # Map API endpoints
│   │   ├── chat/                   # Chat system
│   │   │   ├── chatController.ts   # In-memory chat (legacy)
│   │   │   └── chatDbController.ts # PostgreSQL-backed chat
│   │   ├── character/characterController.ts
│   │   ├── settings/settingsController.ts
│   │   ├── world/worldController.ts
│   │   ├── video-call/videoCallController.ts
│   │   └── utils/
│   │       ├── prisma.ts           # Database client
│   │       ├── uploadMiddleware.ts # Multer file uploads
│   │       └── logger.ts
│   └── prisma/
│       ├── schema.prisma           # Database schema
│       └── migrations/
│
└── docker-compose.yml              # Multi-container orchestration
```

## Key Architectural Patterns

### 1. Redux State Management

**Single Source of Truth for Map Data**

```typescript
// client/src/redux/store.ts
export const store = configureStore({
  reducer: {
    map: mapReducer,  // Only slice currently
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({ serializableCheck: false }),
});
```

**Map Slice Structure** ([`client/src/redux/slices/mapSlice.ts`](client/src/redux/slices/mapSlice.ts)):
- State: `mapData`, `isLoading`, `error`, `isDirty`, `uploadStatus`
- Async thunks: `loadMap`, `saveMap`, `resetMap`, `importMap`, `uploadBackgroundImage`
- Sync reducers: CRUD for interactive areas, collision areas, assets

**Typed Hooks** ([`client/src/redux/hooks.ts`](client/src/redux/hooks.ts)):
```typescript
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

### 2. Hook-Based Map Editor

Each editor feature is encapsulated in a dedicated hook:

| Hook | File | Responsibility |
|------|------|----------------|
| `useKonvaZoom` | `hooks/useKonvaZoom.ts` | Mouse wheel zoom, zoom limits |
| `useKonvaPan` | `hooks/useKonvaPan.ts` | Canvas panning, middle-click drag |
| `useKonvaPolygonDrawing` | `hooks/useKonvaPolygonDrawing.ts` | Click-to-add polygon vertices |
| `useKonvaRectDrawing` | `hooks/useKonvaRectDrawing.ts` | Rectangle creation |
| `useKonvaSelection` | `hooks/useKonvaSelection.ts` | Shape selection, multi-select |
| `useKonvaTransform` | `hooks/useKonvaTransform.ts` | Drag, resize, rotate |
| `useKonvaHistory` | `hooks/useKonvaHistory.ts` | Undo/redo stack |
| `useKonvaGrid` | `hooks/useKonvaGrid.ts` | Grid rendering |
| `useKonvaBackground` | `hooks/useKonvaBackground.ts` | Background image management |
| `useEditorCoreState` | `hooks/useEditorCoreState.ts` | Central state orchestration |

### 3. Context Provider Stack

Providers wrap the application in [`App.tsx`](client/src/App.tsx):

```typescript
<ThemeProvider>
  <ModalStateProvider>
    <ConfigProvider>
      <AuthProvider>
        <SettingsProvider>
          <EventBusProvider>
            <MapDataProvider>
              <ActionDispatcherProvider>
                {children}
              </ActionDispatcherProvider>
            </MapDataProvider>
          </EventBusProvider>
        </SettingsProvider>
      </AuthProvider>
    </ConfigProvider>
  </ModalStateProvider>
</ThemeProvider>
```

### 4. Data Flow Architecture

**Gameplay (World Module)**:
```
PostgreSQL → loadMap thunk → Redux store → useMapStore → WorldModule → GameScene
```

**Map Editor**:
```
PostgreSQL → loadMap thunk → Redux store → useMapStore → KonvaMapEditorModule
User edits → Redux actions → store → saveMap thunk → PostgreSQL
```

## Database Schema

**Core Models** (from [`server/prisma/schema.prisma`](server/prisma/schema.prisma)):

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `User` | Authentication | `email`, `username`, `password` (hashed) |
| `Map` | Map storage | `roomId`, `data` (JSONB), `version` |
| `MapAsset` | Uploaded images | `mapId`, `filePath`, `metadata` (JSONB) |
| `Character` | Avatar slots | `userId`, `slotNumber` (1-5), `spriteSheet` (JSONB) |
| `ActiveCharacter` | Active slot tracking | `userId`, `activeSlotNumber` |
| `UserSettings` | Preferences | `theme`, `jitsiServerUrl`, `editorPrefs` (JSONB) |
| `PlayerPosition` | Ephemeral positions | `sessionId`, `roomId`, `x`, `y`, `direction` |
| `ChatRoom` | Chat rooms | `roomId`, `expiresAt` (TTL) |
| `Message` | Chat messages | `content` (JSONB), `expiresAt` (8hr TTL) |

## API Routes

### REST Endpoints ([`server/src/index.ts`](server/src/index.ts))

**Maps**:
- `GET /api/maps` - List all maps
- `GET /api/maps/:roomId` - Get map by room
- `POST /api/maps/:roomId` - Create map
- `PUT /api/maps/:roomId` - Update map
- `DELETE /api/maps/:roomId` - Delete map
- `GET /api/maps/:roomId/assets` - Get assets
- `POST /api/maps/:roomId/assets` - Upload asset

**Characters**:
- `GET /api/characters/:userId/slots` - List character slots
- `PUT /api/characters/:userId/slots/:slot` - Save character
- `GET /api/characters/:userId/active` - Get active character
- `PUT /api/characters/:userId/active` - Set active character

**Settings**:
- `GET /api/settings/:userId` - Get user settings
- `PUT /api/settings/:userId` - Update settings

### Socket.IO Events

**Chat**:
- `join-room` / `chat:join` - Join chat room
- `send-message` / `chat:message` - Send message
- `typing` / `chat:typing` - Typing indicator

**World**:
- `player-joined-world` - Player enters world
- `player-moved` - Position update broadcast

**Map Editor**:
- `join-map` / `leave-map` - Room management
- `map:update` / `map:partial:update` - Real-time sync

## Key Implementation Paths

### Adding a New Interactive Area Shape

1. Add shape type to [`client/src/shared/MapDataContext.tsx`](client/src/shared/MapDataContext.tsx) (`InteractiveArea` interface)
2. Create drawing hook in `client/src/modules/map-editor-konva/hooks/`
3. Add shape factory in [`utils/shapeFactories.ts`](client/src/modules/map-editor-konva/utils/shapeFactories.ts)
4. Update [`EditorCanvas.tsx`](client/src/modules/map-editor-konva/components/EditorCanvas.tsx) to render new shape
5. Add sync logic in [`utils/syncShapeToMapData.ts`](client/src/modules/map-editor-konva/utils/syncShapeToMapData.ts)

### Adding a New API Endpoint

1. Add route handler in [`server/src/index.ts`](server/src/index.ts)
2. Create controller method in appropriate `src/{domain}Controller.ts`
3. Update Prisma schema if new model needed
4. Run `npm run prisma:migrate:dev` for migrations
5. Add API client in [`client/src/services/api/`](client/src/services/api/)

### Modifying Map Data Structure

1. Update `ExtendedMapData` interface in [`MapDataService.ts`](client/src/stores/MapDataService.ts)
2. Update `MapData` interface in [`MapDataContext.tsx`](client/src/shared/MapDataContext.tsx)
3. Update validation in `MapDataService.validateAndSanitizeMapData()`
4. Update Redux slice if state shape changes
5. Test with `MapApiService.saveMap()` / `loadMap()`
