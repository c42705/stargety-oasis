# Konva Map Editor - Known Issues & Workarounds

**Last Updated**: 2025-11-04
**Version**: 1.0.0 (Production Ready)

---

## Critical Issues

### None ✅

All critical issues have been resolved. The editor compiles, runs, and all core features are working correctly.

---

## High Priority Issues

### 1. Layers Panel Not Implemented

**Status**: ❌ Not Implemented
**Severity**: Medium
**Impact**: No layer management UI in Konva editor (left sidebar showing canvas objects)

#### Description
The LayersPanel component is Fabric.js-specific and cannot be used with the Konva editor. A Konva-compatible version needs to be created.

#### Root Cause
The existing LayersPanel component directly accesses Fabric.js canvas objects and uses Fabric.js-specific APIs.

#### Workaround
Use the sidebar tabs (Areas, Collision, Settings) for managing shapes. Layer management is not available.

#### Resolution Plan
1. Create new `KonvaLayersPanel` component
2. Design layer management UI (visibility, locking, reordering)
3. Integrate with Konva shapes
4. Add layer grouping functionality
5. Add layer filtering and search

#### Code Location
- Fabric.js LayersPanel: `client/src/modules/map-editor/components/LayersPanel.tsx`
- Integration point: `client/src/modules/map-editor-konva/KonvaMapEditorModule.tsx` (commented out)

---

### 2. Multi-Select Not Implemented

**Status**: ❌ Not Implemented
**Severity**: Medium
**Impact**: Cannot select multiple shapes by dragging a selection rectangle

#### Description
The Fabric.js editor allows selecting multiple shapes by dragging a selection rectangle. This feature is not implemented in the Konva editor.

#### Root Cause
Feature not yet implemented.

#### Workaround
Select shapes individually by clicking on them.

#### Resolution Plan
1. Add drag-to-select functionality to selection hook
2. Implement selection rectangle rendering
3. Add multi-select transformation support
4. Test multi-select behavior

---

## Medium Priority Issues

### 3. ESLint Warnings - Unused Variables

**Status**: ⚠️ Code Quality Issue
**Severity**: Low
**Impact**: None - non-blocking warnings

#### Description
There are several ESLint warnings about unused variables in `KonvaMapEditorModule.tsx`:
- `shapesToMapData`
- `refreshAllLayers`
- `shortcuts`
- `handleSave`
- `handleLoad`

#### Root Cause
These variables are initialized but not actively used in the current implementation.

#### Workaround
None needed - these are warnings, not errors.

#### Resolution Plan
1. Remove truly unused variables (`shapesToMapData`)
2. Use `refreshAllLayers` for performance optimization
3. Add `// eslint-disable-next-line` comments for intentionally unused variables

#### Code Location
- File: `client/src/modules/map-editor-konva/KonvaMapEditorModule.tsx`

---

## Low Priority Issues

### 4. Snap-to-Grid Not Implemented

**Status**: ❌ Not Implemented
**Severity**: Low
**Impact**: Shapes cannot snap to grid

#### Description
The grid config has a `snapToGrid` property in Fabric.js, but this functionality is not implemented in Konva.

#### Workaround
None - manual positioning required.

---

### 5. Vertex Editing Not Implemented

**Status**: ❌ Not Implemented
**Severity**: Low
**Impact**: Cannot edit polygon vertices after creation

#### Description
The Konva editor has an 'edit-vertex' tool type, but the functionality is not implemented.

#### Workaround
Delete and redraw polygon if vertices need to be changed.

---

### 6. Shape Duplication Not Implemented

**Status**: ❌ Not Implemented
**Severity**: Low
**Impact**: Cannot duplicate shapes

#### Description
There is no way to duplicate existing shapes.

#### Workaround
Create new shape manually.

---

### 7. Shape Grouping Not Implemented

**Status**: ❌ Not Implemented
**Severity**: Low
**Impact**: Cannot group multiple shapes

#### Description
There is no way to group multiple shapes together.

#### Workaround
Select and transform shapes individually.

---

## Resolved Issues

### ✅ Canvas Zero-Dimension Error (FIXED)

**Date Fixed**: 2025-11-03

Added conditional rendering to only render the Stage when dimensions are valid.

---

### ✅ TypeScript Compilation Errors (FIXED)

**Date Fixed**: 2025-11-03

Fixed ~25+ TypeScript compilation errors by creating type adapter functions and fixing hook/component interfaces.

---

### ✅ Grid Rendering (FIXED)

**Date Fixed**: 2025-11-04

Implemented grid rendering using Konva Line components. Grid visibility toggle is working correctly.

---

### ✅ Background Image Rendering (FIXED)

**Date Fixed**: 2025-11-04

Implemented background image rendering using Konva Image component. Background images load and display correctly.

---

### ✅ Shape Selection (FIXED)

**Date Fixed**: 2025-11-04

Implemented shape selection with visual feedback (blue border with transformation handles).

---

### ✅ Shape Transformation (FIXED)

**Date Fixed**: 2025-11-04

Implemented shape transformation (drag, resize, rotate) using Konva Transformer component.

---

### ✅ Modal Interactions (FIXED)

**Date Fixed**: 2025-11-04

Fixed modal workflow to open modal first, then enter drawing mode with pending data.

---

### ✅ Shape Creation from Drawing Tools (FIXED)

**Date Fixed**: 2025-11-04

Fixed race condition where shapes were being added to both local state and map store. Now shapes are only added to map store and synced via useEffect.

---

### ✅ Mouse Wheel Zoom (FIXED)

**Date Fixed**: 2025-11-04

Added onWheel handler to Stage component, connecting it to zoom.handleWheel.

---

## Issue Tracking

### Summary by Severity

| Severity | Count | Status |
|----------|-------|--------|
| Critical | 0 | ✅ All Resolved |
| High | 2 | ❌ Not Implemented |
| Medium | 1 | ⚠️ Code Quality |
| Low | 4 | ❌ Not Implemented |

### Summary by Status

| Status | Count |
|--------|-------|
| ✅ Resolved | 9 |
| ❌ Not Implemented | 6 |
| ⚠️ Code Quality Issue | 1 |

---

## Reporting New Issues

If you encounter a new issue, please document it with the following information:

1. **Title**: Brief description
2. **Severity**: Critical / High / Medium / Low
3. **Impact**: How it affects functionality
4. **Description**: Detailed description of the issue
5. **Workaround**: Temporary solution (if available)
6. **Code Location**: Relevant files and line numbers

