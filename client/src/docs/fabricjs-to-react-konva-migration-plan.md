# Fabric.js to React Konva Migration Plan

## Executive Summary
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

## Updated Next Steps
1. Install Konva + React Konva; scaffold read-only `<KonvaMapCanvas>`.
2. Define `ShapeModel` interfaces + factories; implement serialization & diff utilities.
3. Implement CanvasAdapter (minimal render + registry).
4. Render existing map state in Konva side-by-side for visual parity check.
5. Add selection logic + highlight layer.
6. Port rectangle tool + basic undo/redo.
7. Port polygon tool with vertex anchors.
8. Migrate grid (cached) + collision areas (performance tested).
9. Add parity test suite (Fabric vs Konva).
10. Establish performance benchmarks & optimize.
11. Execute Go/No-Go evaluation; if passed, remove Fabric code.

---

## Original Content Reference
(Sections not modified remain conceptually the same; prior roadmap superseded by refined roadmap above.)