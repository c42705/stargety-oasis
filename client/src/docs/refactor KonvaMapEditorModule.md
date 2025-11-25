Here’s a fully updated **Markdown refactoring plan** for your developer, reflecting your current tech stack (Konva + Redux) and removing all Fabric.js dependencies.

---

```markdown
# Konva Map Editor Refactoring Plan (Redux + Konva)

## 🎯 Objectives
1. **Remove Fabric.js Legacy Code**: Ensure no remnants of Fabric.js or Zustand remain.
2. **Optimize Redux Integration**: Streamline state management with Redux.
3. **Improve Performance**: Minimize re-renders and optimize hooks.
4. **Enhance Maintainability**: Simplify logic, improve type safety, and document the architecture.
5. **Ensure Consistency**: Standardize naming conventions and code patterns.

---

## 📋 Tasks Breakdown

---

### 1. **Remove Fabric.js Legacy Code**
- **Goal**: Eliminate all Fabric.js-related code, types, and utilities.
- **Files to Update**:
  - Remove `useRenderPreparation` hook (if it was only for Fabric.js compatibility).
  - Remove `convertFabricToKonvaGridConfig` and `mapKonvaToFabricTool` utilities.
  - Update `KonvaMapEditorModule.tsx` to use pure Konva types and Redux.
- **Key Changes**:
  - Replace `fabricEditorState` and `fabricGridConfig` with pure Konva/Redux equivalents.
  - Remove any Fabric.js type imports or conversions.
- **Expected Outcome**: A fully Konva-native codebase.

---

### 2. **Refactor Redux Integration**
- **Goal**: Ensure all state management is handled via Redux.
- **Files to Create/Update**:
  - `stores/editorSlice.ts`: Define Redux slice for editor state (viewport, shapes, tools, etc.).
  - `hooks/useReduxEditorState.ts`: Create a custom hook to interact with Redux.
- **Example**:
  ```typescript
  // stores/editorSlice.ts
  interface EditorState {
    viewport: Viewport;
    shapes: Shape[];
    selectedIds: string[];
    currentTool: KonvaEditorTool;
    gridConfig: GridConfig;
    // ...other state properties
  }

  const editorSlice = createSlice({
    name: 'editor',
    initialState: {
      viewport: { pan: { x: 0, y: 0 }, zoom: 1 },
      shapes: [],
      selectedIds: [],
      currentTool: 'select',
      gridConfig: { visible: true, spacing: 20, color: '#ccc', opacity: 0.5 },
    },
    reducers: {
      setViewport: (state, action: PayloadAction<Viewport>) => {
        state.viewport = action.payload;
      },
      setShapes: (state, action: PayloadAction<Shape[]>) => {
        state.shapes = action.payload;
      },
      // ...other reducers
    },
  });

  export const { setViewport, setShapes } = editorSlice.actions;
  export default editorSlice.reducer;
  ```
- **Expected Outcome**: Centralized state management with Redux.

---

### 3. **Update Custom Hooks for Redux**
- **Goal**: Replace `useEditorState` with a Redux-based hook.
- **Files to Create/Update**:
  - `hooks/useReduxEditorState.ts`: Hook to interact with Redux store.
- **Example**:
  ```typescript
  // hooks/useReduxEditorState.ts
  export const useReduxEditorState = () => {
    const dispatch = useDispatch();
    const {
      viewport,
      shapes,
      selectedIds,
      currentTool,
      gridConfig,
      // ...other state
    } = useSelector((state: RootState) => state.editor);

    const setViewport = useCallback((viewport: Viewport) => {
      dispatch(setViewport(viewport));
    }, [dispatch]);

    const setShapes = useCallback((shapes: Shape[]) => {
      dispatch(setShapes(shapes));
    }, [dispatch]);

    return {
      viewport,
      setViewport,
      shapes,
      setShapes,
      selectedIds,
      currentTool,
      gridConfig,
      // ...other state and setters
    };
  };
  ```
- **Expected Outcome**: Clean separation of state management logic.

---

### 4. **Optimize Event Handlers**
- **Goal**: Ensure all event handlers use Redux and are wrapped in `useCallback`.
- **Files to Update**:
  - `KonvaMapEditorModule.tsx`: Update handlers to dispatch Redux actions.
- **Example**:
  ```typescript
  const handlePlaceAsset = useCallback(
    (fileData: string, fileName: string, width: number, height: number) => {
      const screenCenter = { x: viewportWidth / 2, y: viewportHeight / 2 };
      const worldCenter = screenToWorld(screenCenter.x, screenCenter.y, viewport);
      const imageShape = createImageShape({
        x: worldCenter.x - width / 2,
        y: worldCenter.y - height / 2,
        width,
        height,
        imageData: fileData,
        fileName,
      });
      dispatch(addShape(imageShape)); // Redux action
      dispatch(setSelectedIds([imageShape.id])); // Redux action
      handleZoomToShape(imageShape);
      dispatch(markDirty()); // Redux action
    },
    [viewport, viewportWidth, viewportHeight, dispatch, handleZoomToShape]
  );
  ```
- **Expected Outcome**: Efficient, Redux-integrated event handling.

---

### 5. **Centralize Utility Functions**
- **Goal**: Move reusable logic (e.g., shape creation, asset placement) to utilities.
- **Files to Create/Update**:
  - `utils/editorHelpers.ts`: Consolidate helper functions.
- **Example**:
  ```typescript
  // utils/editorHelpers.ts
  export const placeAsset = ({
    fileData,
    fileName,
    width,
    height,
    viewport,
    viewportWidth,
    viewportHeight,
    dispatch,
    handleZoomToShape,
  }) => {
    const screenCenter = { x: viewportWidth / 2, y: viewportHeight / 2 };
    const worldCenter = screenToWorld(screenCenter.x, screenCenter.y, viewport);
    const imageShape = createImageShape({
      x: worldCenter.x - width / 2,
      y: worldCenter.y - height / 2,
      width,
      height,
      imageData: fileData,
      fileName,
    });
    dispatch(addShape(imageShape));
    dispatch(setSelectedIds([imageShape.id]));
    handleZoomToShape(imageShape);
    dispatch(markDirty());
  };
  ```
- **Expected Outcome**: Reusable, testable utility functions.

---

### 6. **Improve Type Safety**
- **Goal**: Explicitly type all props, hooks, and Redux actions.
- **Files to Update**:
  - All TypeScript files (e.g., `KonvaMapEditorModule.tsx`, `hooks/*.ts`, `utils/*.ts`).
- **Example**:
  ```typescript
  // types/editor.types.ts
  export interface Viewport {
    pan: { x: number; y: number };
    zoom: number;
  }

  export interface Shape {
    id: string;
    geometry: RectangleGeometry | PolygonGeometry | ImageGeometry;
    style: ShapeStyle;
    category: 'interactive' | 'collision';
  }
  ```
- **Expected Outcome**: Better type safety and IDE support.

---

### 7. **Refactor Custom Hooks**
- **Goal**: Ensure all custom hooks are optimized and use Redux.
- **Files to Review/Update**:
  - `hooks/useToolbarHandlers.ts`, `hooks/useAreaHandlers.ts`, `hooks/useLayersHandlers.ts`, `hooks/useStageEventHandlers.ts`.
- **Key Changes**:
  - Replace local state setters with Redux `dispatch` calls.
  - Memoize hook returns to prevent unnecessary re-renders.
- **Example**:
  ```typescript
  // hooks/useToolbarHandlers.ts
  export const useToolbarHandlers = () => {
    const dispatch = useDispatch();
    const viewport = useSelector((state: RootState) => state.editor.viewport);

    const handleZoomIn = useCallback(() => {
      const newZoom = viewport.zoom * 1.2;
      dispatch(setViewport({ ...viewport, zoom: newZoom }));
    }, [viewport, dispatch]);

    return { handleZoomIn };
  };
  ```
- **Expected Outcome**: Consistent, performant hooks.

---

### 8. **Test Critical Paths**
- **Goal**: Write unit tests for Redux actions, utilities, and hooks.
- **Files to Create**:
  - `stores/editorSlice.test.ts`: Test Redux reducers and actions.
  - `utils/editorHelpers.test.ts`: Test utility functions.
- **Example**:
  ```typescript
  // stores/editorSlice.test.ts
  test('setViewport updates the viewport', () => {
    const initialState = { viewport: { pan: { x: 0, y: 0 }, zoom: 1 } };
    const newViewport = { pan: { x: 10, y: 10 }, zoom: 1.5 };
    const action = { type: setViewport.type, payload: newViewport };
    const result = editorSlice.reducer(initialState, action);
    expect(result.viewport).toEqual(newViewport);
  });
  ```
- **Expected Outcome**: Confidence in the refactored code.

---

### 9. **Document the Architecture**
- **Goal**: Update documentation to reflect the Redux + Konva architecture.
- **Files to Create/Update**:
  - `README.md`: Add an overview of the Redux store structure and component hierarchy.
- **Example**:
  ```markdown
  ## Architecture Overview
  - **State Management**: Redux (single source of truth for editor state).
  - **Components**: `EditorCanvas`, `EditorToolbar`, `EditorSidebar`, etc.
  - **Hooks**: `useReduxEditorState`, `useToolbarHandlers`, etc.
  - **Utilities**: `editorHelpers.ts`, `mapDataAdapter.ts`, etc.
  ```
- **Expected Outcome**: Clear documentation for future maintenance.

---

### 10. **Final Review and Cleanup**
- **Goal**: Remove dead code, ensure consistency, and address any issues.
- **Files to Review**:
  - All files in `hooks`, `utils`, `components`, and `stores` directories.
- **Key Changes**:
  - Remove unused imports or variables.
  - Ensure all logging is appropriate (e.g., `logger.info` instead of `console.log`).
- **Expected Outcome**: A clean, maintainable codebase.

---

## ⏳ Timeline Estimate

| Task                                      | Estimated Time |
|-------------------------------------------|----------------|
| Remove Fabric.js legacy code              | 2 hours        |
| Refactor Redux integration                | 5 hours        |
| Update custom hooks for Redux             | 4 hours        |
| Optimize event handlers                   | 3 hours        |
| Centralize utility functions              | 3 hours        |
| Improve type safety                       | 3 hours        |
| Refactor custom hooks                     | 4 hours        |
| Test critical paths                       | 4 hours        |
| Document the architecture                 | 2 hours        |
| Final review and cleanup                  | 2 hours        |
| **Total**                                 | **32 hours**   |

---

## 🚀 Next Steps
1. **Start with Redux Integration**: Define the `editorSlice` and create `useReduxEditorState`.
2. **Update Hooks**: Refactor custom hooks to use Redux.
3. **Test Incrementally**: Write tests for Redux and utilities as you go.
4. **Document Changes**: Update the `README.md` and add inline comments.
5. **Code Review**: Schedule a review after completing each major task.

---

## 📌 Notes
- **Redux Best Practices**: Use Redux Toolkit for simpler syntax and better performance.
- **Performance**: Use React DevTools and Redux DevTools to profile and optimize.
- **Collaboration**: Reach out if any task is unclear or blocked.
```

---

### How to Use This Plan
1. **Share with Your Developer**: Paste this into your project management tool (e.g., GitHub, Jira, Notion).
2. **Prioritize Tasks**: Start with Redux integration and removing Fabric.js remnants.
3. **Track Progress**: Update the timeline as tasks are completed.
4. **Review Together**: Schedule a code review after each major task to ensure quality.