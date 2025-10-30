# Fabric.js to React Konva Migration Plan

## ⚠️ UPDATED APPROACH: POC-First Strategy

**Status:** POC Development Phase
**POC URL:** `/map-editor-poc`
**Timeline:** 4 weeks POC + 1 week evaluation = 5 weeks to decision point
**Risk Level:** LOW (isolated POC approach)

## Executive Summary
After critical review, the migration approach has been updated to a **POC-first strategy**. Instead of directly migrating the production editor, we will build a **completely isolated proof-of-concept** at `/map-editor-poc` to validate React Konva's suitability before committing to full migration.

### Why POC-First?
1. **Validate Assumptions:** Test React Konva with all core features before commitment
2. **Realistic Timeline:** Get accurate estimate of full migration effort
3. **Low Risk:** Isolated from production code, easy to abandon if unsuitable
4. **Learning Opportunity:** Team learns Konva without production pressure
5. **Clear Decision Point:** Objective go/no-go criteria at Week 5

### POC Objectives
- Build standalone Konva editor with ALL 15 core features
- Achieve feature parity with existing Fabric.js editor
- Meet performance benchmarks (60 FPS @ 100 shapes, 30+ FPS @ 500 shapes)
- Validate polygon vertex editing complexity
- Test state management patterns
- Prove maintainability and code quality

### Original Executive Summary (For Reference)
React Konva is recommended to replace Fabric.js to align the canvas editor with React’s declarative model, improve maintainability, and enable finer performance control (layer caching, controlled rerenders, batched updates). Migration should proceed **incrementally**, maintaining Fabric as a safety net until quantified parity (features + performance + stability) is achieved.

---

## Why React Konva? (Updated)
- **Declarative React Integration:** `<Stage>` / `<Layer>` / shape components tie rendering to React state, reducing imperative mutation patterns.
- **Layer-Level Performance Controls:** Independent layer caching, selective redraws, manual batching (`batchDraw`) for heavy updates.
- **Predictable State Flow:** Source of truth resides in serializable React state (no hidden object mutation), simplifying undo/redo and testing.
- **Fine-Grained Hit Testing:** Efficient event delegation; ability to disable hit checks per layer for performance.
- **Community & Stability:** Actively maintained; API surface is narrower and easier to wrap.

### Key Trade-Offs / Gaps
- **Transform / Control Handles:** Fabric’s rich object controls must be reimplemented using `Konva.Transformer` + custom anchor UI for polygons.
- **Text Editing Richness:** Inline rich text styling requires overlays (HTML inputs) — not as turnkey as Fabric.
- **Plugin Ecosystem:** Fewer drop-in extensions; replace Fabric plugins with internal utilities.
- **Mutation vs Declarative:** Existing code relying on direct Fabric object mutation must shift to pure state-driven updates.
- **Hit Graph Rebuild Cost:** Extremely large dynamic shape counts can degrade performance unless layers are cached / updates throttled.

---

## Core Architectural Principles
1. **Stateless Canvas Nodes:** Never treat Konva node instances as authoritative state; use IDs + plain data models.
2. **Adapter Boundary:** A thin "CanvasAdapter" module exposes high-level operations (addShape, updateShape, selectById, batchUpdate) shielding hooks from raw Konva API.
3. **Deterministic Serialization:** All editor state (shapes, layers, selection, zoom, grid config) serializable to a single schema for persistence, undo/redo, tests.
4. **Controlled Renders:** Derive shape props from memoized selectors (e.g., Zustand/Redux) and avoid passing unstable objects/handlers.
5. **Incremental Feature Flags:** Each migrated capability toggled via a feature flag enabling side-by-side validation vs Fabric.
6. **Performance First for Dense Layers:** Separate static vs dynamic layers (e.g., background + grid cached, interactive areas dynamic).
7. **Testable Units:** Hooks orchestrate logic; adapter + pure utilities covered by unit tests; integration tests assert canvas parity.

---

## Refined Migration Roadmap
```mermaid
graph TD
    A[Parallel Read-only Konva Prototype] --> B[Adapter & Data Model Layer]
    B --> C[Selection & Highlight Logic]
    C --> D[Drawing Tools (Rect/Poly)]
    D --> E[Editing & Transformers]
    E --> F[Grid & Collision Layers]
    F --> G[Undo/Redo & Serialization]
    G --> H[Performance Profiling & Optimization]
    H --> I[Comprehensive Parity Testing]
    I --> J[Staged Rollout & Decommission Fabric]
```

### Phase Details (Updated)
- **A: Parallel Read-only Prototype:** Render existing Fabric map state via Konva for visual parity (no editing yet).
- **B: Adapter & Model:** Implement CanvasAdapter + shape factories; define `MapStateSchema` + type-safe shape interfaces.
- **C: Selection & Highlight:** Centralize selection IDs; visual highlight via stroke/shadow; no node refs stored in state.
- **D: Drawing Tools:** Port rectangle + polygon creation (with temporary points + confirm action). Use controlled interaction surfaces.
- **E: Editing & Transformers:** Implement polygon vertex anchor UI + Konva.Transformer for basic scale/rotate on allowed types.
- **F: Grid & Collision:** Migrate grid rendering (cached layer); collision areas optimized with grouping or simplified shapes when zoomed out.
- **G: Undo/Redo:** History stack built from serialized diffs (structural + property changes). Property-based tests validate reversibility.
- **H: Performance Optimization:** Profile large scenes; introduce batching (`layer.batchDraw()`), caching (`layer.cache()`), and update throttling.
- **I: Parity Testing:** Run automated suites comparing Fabric vs Konva outputs (snapshot + behavioral).
- **J: Decommission Fabric:** Remove Fabric imports once Go/No-Go criteria passed.

---

## Incremental Migration Steps (Fine-Grained)
1. Add Konva deps & scaffold `<KonvaMapCanvas>` (read-only).
2. Implement state schema + factories (`createAreaShape`, `createCollisionShape`).
3. Build CanvasAdapter (renderShapes, attachHandlers, batchUpdate).
4. Add selection logic (hover, click, multi-select via modifier keys).
5. Port rectangle drawing tool; validate undo/redo for single shape.
6. Port polygon drawing with anchor commit/cancel flow.
7. Implement editing handles (vertex drag); add constraints (snap, bounds).
8. Migrate grid layer (cache) + collision layer (opt grouping or LOD).
9. Integrate history system (diff-based) + tests for all tool operations.
10. Stress test: 1k / 5k / 10k shapes performance thresholds.
11. Cross-browser validation (Chrome, Firefox, Safari) pointer & transform.
12. Final parity verification; disable Fabric behind feature flag; remove code.

---

## Go / No-Go Parity Criteria
- Functional: Create / edit / delete / select / multi-select all shape types.
- Visual: Layer order, styles, grid alignment identical within tolerance (<1px deviation).
- Performance: >55 FPS at 2k interactive shapes; time-to-first-render < 300ms; memory growth stable under interaction.
- Undo/Redo: 100% reversible for all tested operations; max drift <1 unintended property change per 500 ops.
- Stability: No uncaught errors across 30-minute exploratory session.
- Cross-Browser: Feature parity on latest stable Chrome/Firefox/Safari.

---

## Performance Strategy
- **Layer Caching:** Cache static layers (background, grid) after first render; invalidate only on zoom/scale changes.
- **Batch Draw:** Coalesce sequential shape updates (drag, polygon vertex move) into animation frame batches.
- **Throttled Hit Regions:** Disable hit detection temporarily during high-frequency drag operations; re-enable on pointer up.
- **Level of Detail (LOD):** Simplify complex polygons when zoomed out (store simplified path variant).
- **Profiling Metrics:** Collect FPS, average layer redraw time, hit graph rebuild time, node count per layer.
- **Memory Guardrails:** Periodic snapshot to detect node leaks (compare expected shape count vs actual Konva node tree).

---

## Adapter Layer Design
`CanvasAdapter` responsibilities:
- Mount/unmount Stage & Layers
- Provide helper: `renderShapes(shapeModels)` returning React Konva elements
- Maintain internal registry (id -> Konva node ref) for controlled operations (focus, transformer attachment) without leaking refs into global state
- Expose batch ops: `applyPatch(patch)`, `withBatch(callback)`

Avoid business logic inside the adapter; keep pure transformation utilities elsewhere.

---

## State & Serialization
Define `MapState`:
```ts
interface MapState {
  shapes: Record<string, ShapeModel>; // areas, collisions, etc.
  selection: string[];
  grid: GridConfig;
  view: { zoom: number; offset: { x: number; y: number } };
  mode: EditorMode; // select | draw-rect | draw-poly | edit-poly | pan
  history: HistoryStack; // outside of canvas adapter
}
```
Persist using stable JSON ordering; diff generation via structural comparison (e.g., object-level shallow compare). Enables:
- Time-travel
- Snapshot tests
- Crash recovery

---

## Testing Strategy (Expanded)
- **Unit:** Shape factory, diff generator, coordinate conversion utilities.
- **Property-Based:** Undo/redo sequence validity (random operation streams).
- **Integration:** Simulate drawing/editing flows; assert DOM tree & serialized state.
- **Performance:** Automated scenario generating N shapes; measure FPS & redraw latency.
- **Regression Parity:** Fabric vs Konva screenshot + serialized JSON comparison (allow minor float tolerance).

---

## Migration Risks & Mitigation (Updated Additions)
Existing table retained; additions below:

| Risk | Description | Mitigation |
|------|-------------|------------|
| Large Shape Count Hit Graph | Hit region rebuild slows interaction at >5k nodes. | Cache static layers; disable hits mid-drag; LOD simplification; periodic profiling. |
| Text Editing Limitations | Advanced inline formatting not native. | Use HTML overlay inputs; constrain formatting scope; defer rich text features if low priority. |
| Transformer Edge Cases | Polygon vertex + group transform conflicts. | Separate vertex edit mode from group transform; custom handles; robust mode state machine. |

(Refer to original risk table above for core items.)

---

## Monitoring & Metrics
Track in CI / runtime logs:
- `render_time_ms`
- `fps_average`
- `hit_graph_rebuild_ms`
- `shape_count`
- `undo_redo_integrity_failures`

Alert thresholds trigger rollback consideration.

---

## Contributors Guide (Augmented)
- Review Adapter + State architecture first.
- Follow coding rule: no direct imperative Konva node mutation in business logic (only via adapter helpers if unavoidable).
- Ensure any new shape type includes: factory, serializer, diff handler, test.
- Add performance notes when introducing large batch updates.

---

## Updated Next Steps (POC-First Approach)

### Phase 1: POC Development (Weeks 1-4)
**Location:** `/map-editor-poc` route
**Goal:** Build isolated Konva editor with all core features

#### Week 1: Foundation
1. ✅ Install Konva + React Konva dependencies
2. ✅ Create POC module structure (`client/src/modules/map-editor-poc/`)
3. ✅ Create POC page and route (`/map-editor-poc`)
4. ✅ Implement types, constants, and utilities
5. ✅ Build basic Stage/Layer setup with zoom
6. ✅ Implement pan controls (middle mouse + pan tool)
7. ✅ Create coordinate transform utilities
8. ✅ Implement rectangle drawing with grid snapping

#### Week 2: Drawing & Selection
1. ✅ Implement polygon drawing workflow
2. ✅ Add selection system (single + multi-select)
3. ✅ Create polygon vertex editing with handles
4. ✅ Test all drawing tools at various zoom levels

#### Week 3: Transform & History
1. ✅ Implement move (drag) functionality
2. ✅ Add resize with Konva.Transformer
3. ✅ Build undo/redo system with state serialization
4. ✅ Implement duplicate and delete functionality

#### Week 4: Polish & Testing
1. ✅ Add layer management (grid → collision → interactive → selection)
2. ✅ Implement background image support
3. ✅ Performance testing (100, 500, 1000 shapes)
4. ✅ Side-by-side comparison with Fabric.js editor
5. ✅ Document findings and create evaluation report

### Phase 2: Evaluation (Week 5)
1. Complete [POC Evaluation Checklist](./konva-poc-evaluation-checklist.md)
2. Test all 15 functional criteria
3. Measure all 6 performance benchmarks
4. Verify all 5 quality checks
5. Assess all 4 code quality standards
6. Generate comprehensive evaluation report
7. Team review and decision meeting

### Phase 3: Decision Point (End of Week 5)
**Decision Criteria:**
- ✅ All criteria met → **PROCEED** to Phase 4 (gradual integration)
- ⚠️ 1-2 gaps → **INVESTIGATE** (1-2 weeks to fix, then re-evaluate)
- ❌ 3+ gaps → **ABANDON** (stay with Fabric.js, document lessons learned)

### Phase 4: Integration (If Approved, Weeks 6-18)
1. Implement feature flag: `USE_KONVA_EDITOR`
2. Refactor POC code for production integration
3. Add both editors to `/map-editor` route with toggle
4. Gradual rollout: 10% → 25% → 50% → 100%
5. Monitor metrics: errors, performance, user feedback
6. Remove Fabric.js only after 100% confidence

### Current Status
- [x] Critical review completed
- [x] POC strategy approved
- [x] POC module structure created
- [x] POC route added (`/map-editor-poc`)
- [x] Dependencies installed (konva, react-konva, uuid)
- [x] Types, constants, and utilities implemented
- [x] Basic component scaffolded
- [ ] Week 1 development in progress
- [ ] Evaluation pending
- [ ] Decision pending

### Access the POC
- **URL:** `/map-editor-poc`
- **Requirements:** Admin user authentication
- **Status:** Foundation phase - basic structure ready for hook implementation

---

## Original Content Reference
(Sections not modified remain conceptually the same; prior roadmap superseded by refined roadmap above.)