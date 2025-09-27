# Impassable Area Painting Feature: Updated Architecture & Implementation Notes

## Feature Overview

The map editor now supports painting impassable areas (“collision paint”) by dragging the mouse across grid-aligned cells, with these capabilities:

- Multiple distinct impassable areas, automatically created if none is active when painting begins
- Real-time visual feedback (custom color, border, brush shape per area)
- Painting via mouse drag (mouse down + move)
- Flexible, explicit save (areas only persisted to sharedMap when save is triggered)
- Cell deduplication (each cell only painted once per area)
- Internal undo/redo design in state (not yet exposed in UI)
- Debug logging for all paint events and area state

---

## Key Components & Data Flow

### Data Structures

```typescript
interface ImpassableArea {
    id: string;
    name: string;
    type: 'impassable-paint'; // String literal for TS
    cells: string[]; // ["3_7", "4_7", ...]
    color?: string;
    border?: string;
    brushShape?: 'square' | 'circle';
}
```

- **Local Drawing State:**
  - Array of active impassable areas
  - Current activeAreaId (auto-created on first paint if not set)
  - Undo/redo stacks (per area, planned for UI)
  - Brush metadata (color, border, shape)

---

### User Interaction Flow

```mermaid
sequenceDiagram
User->>Canvas: Mouse down (starts painting; area auto-created if needed)
Canvas->>DrawingState: Set (or create/select) active area
User->>Canvas: Mouse move (drag)
Canvas->>DrawingState: Add deduped cells to active area
Canvas->>Canvas: Show live preview (per-area style)
User->>Canvas: Mouse up (finish stroke)
User->>Toolbar: Trigger save (button etc.)
Canvas->>PersistentState: Save all areas to sharedMap
```

---

### Visual Feedback

- Preview of all painted cells for the active area as you draw
- Custom color/border/shape per area (as set in brush state)
- Deduplication: cells are only previewed/painted once per area
- Debug logs in console:
  - Paint events (down/move), area/cell info, deduplication
  - Preview render state
  - Persistence trigger

---

### Undo/Redo System (Planned)

- **Undo stack:** Actions (add/remove cell, area creation/deletion) are recorded in state
- **Redo stack:** For redo after undo
- Not yet exposed in UI, but data model supports future implementation

---

### Multiple Areas Management

- Painting auto-creates a new area if no area is active, with default naming and brush settings
- Areas are internally tracked as an array, each with unique ID and cell set
- (Planned: UI for selecting/editing areas)

---

### Brush Shapes

- **Square:** Supported and default
- **Circle:** Type exists in data model, not yet implemented in paint logic(not needed anymore)
- Extensible for future shapes

---

### Save Trigger

- Explicit save: all areas are persisted to sharedMap only when save is triggered
- Debug log shows area and cell counts at save

---

### Integration Points

- **Toolbar** (planned): Brush shape/color/border, area selection, save, undo/redo
- **Sidebar/Layer List** (planned): Display/manage multiple impassable areas

---

## Implementation Notes

- Mouse painting should works by tracking drag state (down + move)
- Paint only adds a cell if not already present in area (deduped)
- If mouse down occurs and no area is active, a new one is auto-created and selected
- All painting logic is isolated to local state until save
- Debug logs are present throughout for rapid dev/testing

---

## Updated Mermaid Diagram: Feature Architecture

```mermaid
graph TD
    Toolbar[Toolbar: Brush, Color, Shape, Save, Undo, Redo (planned)]
    Canvas[Canvas: Fabric.js]
    LocalState[Local: Areas, Active Area, Undo/Redo]
    SharedMap[SharedMap: Persisted Areas]

    Toolbar -- Set Brush/Color/Shape --> LocalState
    Toolbar -- Save --> SharedMap
    Toolbar -- Undo/Redo (planned) --> LocalState
    Canvas -- Mouse Events --> LocalState
    LocalState -- Live Preview --> Canvas
    LocalState -- Persist Areas --> SharedMap
    SharedMap -- Render Persisted --> Canvas
```

---

## Implementation Steps (Current Status)

1. **Area Data Model** (done)
   - Multiple areas, per-area metadata, deduped cell list
2. **Local Drawing State** (done)
   - activeAreaId, brush, undo/redo in state
3. **Interaction Handlers** (done)
   - Mouse down: auto-create/select area if none
   - Mouse move: paint deduped cells
   - Mouse up: finalize stroke
4. **Preview Rendering** (done)
   - Always up-to-date per active area
5. **Undo/Redo** (model in state, UI/plumbing planned)
6. **Save Logic** (done)
   - Only saves on explicit trigger, not during painting
7. **Debug Logging** (done, throughout)
8. **UI Enhancements** (planned)
   - Toolbar/Sidebar for area/brush/undo/redo/save

---