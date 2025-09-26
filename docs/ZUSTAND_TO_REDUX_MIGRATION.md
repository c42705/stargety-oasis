## Stargety Oasis: Migration from Zustand to Redux (RTK)

This document is a complete blueprint to migrate state management across Stargety Oasis from Zustand to Redux using Redux Toolkit (RTK) with TypeScript. It includes an assessment of current usage, the proposed Redux architecture, a step-by-step migration plan, impact analysis, cleanup opportunities, and a testing strategy.


### 1) Current State Assessment (Zustand)

Observed Zustand usage is focused on map data management, with a modern structure already using Immer and a service layer.

- Primary store
  - File: client/src/stores/useMapStore.ts
  - Implements: `create` from `zustand` + `immer` middleware
  - State:
    - `mapData: ExtendedMapData | null`
    - `isLoading: boolean`, `error: string | null`
    - `lastSaved: Date | null`, `isDirty: boolean`, `isInitializing: boolean`
    - Auto-save flags: `autoSaveEnabled: boolean`, `autoSaveDelay: number`
  - Actions (selected):
    - Async ops: `loadMap`, `saveMap`, `resetMap`, `importMap`, `exportMap`
    - Mutations: `markDirty`, `markClean`, `clearError`, `setWorldDimensions`
    - Areas: `add/update/removeInteractiveArea`, `add/update/removeCollisionArea`
    - Getter: `getMapStatistics`
  - Dependencies:
    - `MapDataService` for persistence/localStorage and transformation
    - Shared types from `../shared/MapDataContext`

- Initialization and compatibility hooks
  - client/src/stores/useMapStoreInit.ts: ensures one-time `loadMap()` and readiness guards
  - client/src/stores/useSharedMapCompat.ts: exposes an API compatible with legacy `useSharedMap`
  - client/src/stores/useMapActions.ts: convenience hooks wrapping store operations
  - client/src/stores/MapStoreTest.tsx: test harness for the store

- Consumers (non-exhaustive, current retrieval):
  - client/src/components/SaveStatusIndicator.tsx (reads `isDirty`, `lastSaved`, toggles auto-save, calls `saveMap`)
  - client/src/components/MapSyncStatus.tsx (reads status, uses `useMapStore`)
  - client/src/components/MapDataManager.tsx (calls `importMap` via compat/ops)
  - client/src/modules/map-editor/MapEditorModule.tsx (uses `useSharedMap`, can be routed via compat)

- Legacy/neighboring systems
  - `client/src/shared/SharedMapSystem.ts` (legacy event-driven system)
  - Context providers (AuthContext, SettingsContext, ThemeContext, MapDataContext, EventBus, ModalState) – largely orthogonal to Zustand and can remain as Context post-migration unless future scope expands Redux coverage.

Conclusion: Zustand is centralized around “Map” domain; migrating this first provides immediate alignment with Redux patterns while minimizing blast radius.


### 2) Current Zustand Usage Inventory

- Stores
  - `useMapStore.ts`: Single source of truth for map domain

- Hooks and wrappers
  - `useMapStoreInit.ts`: bootstrapping and readiness
  - `useSharedMapCompat.ts`: drop-in compatibility for legacy `useSharedMap`
  - `useMapActions.ts`: composable convenience hooks
  - `MapStoreTest.tsx`: developer test page

- Typical usage patterns
  - Initialize on mount, then call async loads
  - Mutate via actions; rely on `MapDataService` for persistence to localStorage
  - Expose convenience selectors (e.g., `useMapData`, `useInteractiveAreas`)
  - UI components read dirty/save state and trigger operations


### 3) Proposed Redux Architecture (RTK + TS)

- Goals
  - Preserve the existing API surface as much as possible via a compatibility layer to reduce churn
  - Adopt RTK best practices: slices, createAsyncThunk, typed hooks, DevTools, thunk middleware
  - Keep MapDataService as the persistence boundary (no Redux Persist initially)

- Packages
  - @reduxjs/toolkit, react-redux
  - Optional dev-only: redux-logger

- Folder structure
  - client/src/redux/
    - store.ts (configureStore + middleware + DevTools)
    - hooks.ts (typed `useAppDispatch`, `useAppSelector`)
    - slices/
      - mapSlice.ts (state, reducers, thunks)
    - selectors/
      - mapSelectors.ts (memoized selectors)
  - client/src/redux-compat/
    - useMapStoreCompat.ts (API-compatible facade for current components)
    - useMapInit.ts (Redux equivalent of `useMapStoreInit`)

- State and types
  - MapState mirrors Zustand shape for minimal risk:
    - `mapData: ExtendedMapData | null`
    - `isLoading: boolean`, `error: string | null`
    - `lastSaved: Date | null`, `isDirty: boolean`, `isInitializing: boolean`
    - `autoSaveEnabled: boolean`, `autoSaveDelay: number`

- Slice design (mapSlice)
  - Thunks (createAsyncThunk): `loadMap`, `saveMap`, `resetMap`, `importMap`, `exportMap`
  - Reducers: `markDirty`, `markClean`, `clearError`, `setWorldDimensions`, `add/update/removeInteractiveArea`, `add/update/removeCollisionArea`
  - ExtraReducers: handle pending/fulfilled/rejected of thunks
  - Middleware choice: default thunk; add RTK `listenerMiddleware` for debounced auto-save (optional, phase 2)

- Typed hooks and selectors
  - `useAppDispatch`, `useAppSelector`
  - `mapSelectors` (e.g., `selectMapData`, `selectIsDirty`, `selectLoading`, etc.)

- DevTools
  - RTK’s `configureStore` enables Redux DevTools by default in development


### 4) Step-by-Step Migration Process

Phase 0 – Preparation
1) Add dependencies (ask before executing):
   - npm: `npm install @reduxjs/toolkit react-redux`
   - yarn: `yarn add @reduxjs/toolkit react-redux`
2) Create Redux scaffolding (client/src/redux): store.ts, hooks.ts, slices/mapSlice.ts, selectors/mapSelectors.ts
3) Wrap application with Provider (client/src/index.tsx or App.tsx root):
   - `<Provider store={store}> ... </Provider>`

Phase 1 – Implement Redux map slice
4) Implement `mapSlice.ts` with initial state mirroring Zustand; port logic from `useMapStore.ts` actions to thunks and reducers, invoking `MapDataService` for IO.
5) Implement `mapSelectors.ts` for common reads.
6) Implement `hooks.ts` typed hooks.

Phase 2 – Compatibility layer and incremental component migration
7) Create `redux-compat/useMapStoreCompat.ts` that exposes an object with the same keys as Zustand’s `useMapStore()` returned shape. Internally, use selectors + dispatch to map Redux to the same API. Keep method names consistent.
8) Create `redux-compat/useMapInit.ts` to dispatch `loadMap()` once and expose readiness flags (Redux equivalent of `useMapStoreInit`).
9) Update selected consumers to use the compatibility layer (lowest risk path):
   - client/src/components/SaveStatusIndicator.tsx
   - client/src/components/MapSyncStatus.tsx
   - client/src/components/MapDataManager.tsx
   - client/src/modules/map-editor/MapEditorModule.tsx (ensure it uses compat instead of legacy)
   - client/src/stores/MapStoreTest.tsx (or add a Redux test page variant)

Phase 3 – Flip the main hook export (optional, single-touch migration)
10) Replace `client/src/stores/useMapStore.ts` export with a thin facade that re-exports from Redux compatibility (or redirects to Redux selectors + dispatch). This change allows existing import sites (`useMapStore`) to work without touching every file.
11) Update `useMapStoreInit.ts` to use Redux init hook.
12) Update `useMapActions.ts` to dispatch Redux actions/selectors (or re-export from compat).

Phase 4 – Cleanup and removal
13) Verify all imports referencing Zustand (`create`/`zustand/middleware`) are gone.
14) Remove Zustand from dependencies (ask before executing): `npm uninstall zustand`.
15) Remove or archive legacy files superseded by Redux (see Cleanup section).


### 5) Migration Impact Analysis (files and breaking changes)

Files to add
- client/src/redux/store.ts
- client/src/redux/hooks.ts
- client/src/redux/slices/mapSlice.ts
- client/src/redux/selectors/mapSelectors.ts
- client/src/redux-compat/useMapStoreCompat.ts
- client/src/redux-compat/useMapInit.ts

Files to modify
- client/src/App.tsx or client/src/index.tsx: add Redux Provider
- client/src/stores/useMapStore.ts: redirect to Redux facade (phase 3)
- client/src/stores/useMapStoreInit.ts: point to Redux init (or deprecate)
- client/src/stores/useMapActions.ts: re-implement with Redux
- Consumers using `useMapStore` or `useSharedMapCompat`: switch to Redux compat or leave as-is if facade is flipped
- client/src/components/{SaveStatusIndicator,MapSyncStatus,MapDataManager}.tsx
- client/src/modules/map-editor/MapEditorModule.tsx

Potential breaking changes and mitigations
- Hook signature differences: Avoid by providing API-compatible facade returning the same fields and method names.
- Async behavior timing: RTK thunks return promises; ensure UI awaits where needed (existing code already awaits `saveMap`, `resetMap`).
- Date handling: Ensure `lastSaved` remains a Date object when read from service (MapDataService already converts; keep this contract in thunks).
- Immer semantics: RTK reducers are Immer-powered; logic parity is retained.
- Dev-only logs and console noise: maintain/curate logs consistent with current code style guidelines.


### 6) Code Cleanup Opportunities

- Remove deprecated/duplicate compatibility layers once Redux is fully adopted:
  - `client/src/stores/useSharedMapCompat.ts` (if replaced by redux-compat)
  - Consolidate `useMapActions.ts` into Redux selectors + action creators
- Reduce outdated console logs in MapDataService after validating flows.
- Archive or deprecate `SharedMapSystem` where not referenced by production paths.
- Keep files under 490 LOC by splitting slices/selectors and keeping utilities separate.


### 7) Testing Strategy (Unit, Integration, Playwright MCP)

- Unit tests
  - Reducers: assert transitions for `markDirty/markClean`, area add/update/remove, `clearError`
  - Thunks: mock `MapDataService` to validate side effects of `loadMap/saveMap/reset/import/export`

- Integration tests (React Testing Library)
  - Components: `SaveStatusIndicator`, `MapSyncStatus`, `MapDataManager`
  - Verify: shows dirty state, toggles auto-save, triggers dispatches; import/export flows

- End-to-end checks with Playwright (MCP-driven smoke)
  - When: After Phase 2 (compat in place) and after Phase 3 (facade flip)
  - Scenarios:
    1) Load app, verify map loads (no error), background shows
    2) Create an interactive area via UI, check dirty flag then save, verify no error
    3) Import a valid JSON, verify counts and dimensions update
  - Automate via a minimal Playwright script; for local MCP-based verification, use existing helper console endpoints already exposed in the app (e.g., `window.runAutomatedTestSuite()` if available) to assert zoom/map integrity after state changes.

- CI suggestions
  - Run unit and component tests on PR; run a lightweight Playwright smoke on merge to main.


### 8) TypeScript Examples (RTK Skeletons)

Slices and thunks (excerpt)
```ts
// client/src/redux/slices/mapSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { MapDataService, ExtendedMapData } from '../../stores/MapDataService';

export interface MapState { mapData: ExtendedMapData|null; isLoading: boolean; error: string|null; lastSaved: Date|null; isDirty: boolean; isInitializing: boolean; autoSaveEnabled: boolean; autoSaveDelay: number; }

const initialState: MapState = { mapData: null, isLoading: false, error: null, lastSaved: null, isDirty: false, isInitializing: true, autoSaveEnabled: false, autoSaveDelay: 2000 };

export const loadMap = createAsyncThunk('map/load', async () => await MapDataService.loadMapData() ?? await MapDataService.createDefaultMap());

const slice = createSlice({ name: 'map', initialState, reducers: { markDirty(s){s.isDirty=true;}, markClean(s){s.isDirty=false;}, clearError(s){s.error=null;} }, extraReducers: b => { b.addCase(loadMap.pending, s=>{s.isLoading=true;s.error=null;}).addCase(loadMap.fulfilled,(s,a)=>{s.mapData=a.payload;s.lastSaved=a.payload?.lastModified??new Date();s.isDirty=false;s.isLoading=false;s.isInitializing=false;}).addCase(loadMap.rejected,(s,a)=>{s.isLoading=false;s.error=a.error.message||'Failed to load map';}); }});
export const { markDirty, markClean, clearError } = slice.actions;
export default slice.reducer;
```

Store and hooks (excerpt)
```ts
// client/src/redux/store.ts
import { configureStore } from '@reduxjs/toolkit';
import mapReducer from './slices/mapSlice';
export const store = configureStore({ reducer: { map: mapReducer } });
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

```ts
// client/src/redux/hooks.ts
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
```

Selectors (excerpt)
```ts
// client/src/redux/selectors/mapSelectors.ts
import { RootState } from '../store';
export const selectMapData = (s: RootState) => s.map.mapData;
export const selectIsDirty = (s: RootState) => s.map.isDirty;
export const selectLoading = (s: RootState) => s.map.isLoading;
```

Compat facade (excerpt)
```ts
// client/src/redux-compat/useMapStoreCompat.ts
import { useAppDispatch, useAppSelector } from '../redux/hooks';
import { selectMapData, selectIsDirty, selectLoading } from '../redux/selectors/mapSelectors';
import { loadMap, markDirty, markClean } from '../redux/slices/mapSlice';
export const useMapStoreCompat = () => { const dispatch = useAppDispatch(); return { mapData: useAppSelector(selectMapData), isDirty: useAppSelector(selectIsDirty), isLoading: useAppSelector(selectLoading), markDirty: ()=>dispatch(markDirty()), markClean: ()=>dispatch(markClean()), loadMap: ()=>dispatch(loadMap()) }; };
```

Provider integration (excerpt)
```tsx
// client/src/index.tsx (or App.tsx root)
import { Provider } from 'react-redux';
import { store } from './redux/store';
root.render(<Provider store={store}><App /></Provider>);
```


### 9) Execution Plan & Timeline

- Day 0: Add RTK + react-redux; create store and slice skeletons; wrap in Provider
- Day 1: Port actions and async ops from Zustand to RTK thunks; implement selectors
- Day 2: Build Redux compatibility facade; migrate SaveStatusIndicator, MapSyncStatus, MapDataManager; verify manually
- Day 3: Migrate MapEditorModule via compat; run Playwright MCP smoke; fix regressions
- Day 4: Flip `useMapStore.ts` to Redux facade; update residual hooks; remove Zustand
- Day 5: Cleanup deprecated files; finalize tests and CI


### 10) Dependency Management (ask before running)

- Install: `npm install @reduxjs/toolkit react-redux`
- Remove (post-migration): `npm uninstall zustand`


### 11) Rollback Strategy

- Keep Zustand files intact until Phase 3 flip
- Feature flag export flip behind a branch; revert by restoring Zustand exports
- No data migration required (still using MapDataService/localStorage)


### 12) Notes & Conventions

- Keep file sizes < 490 LOC by splitting slices and selectors
- Meaningful naming for actions (e.g., `updateWorldDimensions`)
- Avoid drastic removal of legacy systems until verified unused in production paths
- Use Redux DevTools during development; disable noisy logs in production

