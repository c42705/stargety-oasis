/**
 * Keyboard Shortcuts Configuration
 * 
 * Defines all keyboard shortcuts for the Konva Map Editor.
 * Separates configuration from component logic for better maintainability.
 * 
 * @version 1.0.0
 * @date 2025-11-28
 */

import type { Shape, GridConfig, EditorTool } from '../types';
import { duplicateShape, groupShapes, ungroupShapes } from '../utils/shapeFactories';
import { shapeToInteractiveArea, shapeToImpassableArea } from '../utils/mapDataAdapter';

interface KeyboardShortcut {
  key: string;
  description: string;
  handler: (e?: KeyboardEvent) => void;
}

interface ShortcutsDependencies {
  // State
  shapes: Shape[];
  selectedIds: string[];
  currentTool: EditorTool;
  // Setters
  setShapes: React.Dispatch<React.SetStateAction<Shape[]>>;
  setSelectedIds: (ids: string[]) => void;
  setGridConfig: React.Dispatch<React.SetStateAction<GridConfig>>;
  setCurrentTool: (tool: EditorTool) => void;
  setShapesToDelete: (ids: string[]) => void;
  setShowKeyboardDeleteConfirm: (show: boolean) => void;
  // Actions
  addInteractiveArea: (area: any) => void;
  addCollisionArea: (area: any) => void;
  markDirty: () => void;
  // History
  history: {
    undo: () => void;
    redo: () => void;
    pushState: (label: string) => void;
  };
}

/**
 * Create keyboard shortcuts array based on current dependencies
 */
export function createKeyboardShortcuts(deps: ShortcutsDependencies): KeyboardShortcut[] {
  const {
    shapes, selectedIds, currentTool,
    setShapes, setSelectedIds, setGridConfig, setCurrentTool,
    setShapesToDelete, setShowKeyboardDeleteConfirm,
    addInteractiveArea, addCollisionArea, markDirty,
    history,
  } = deps;

  return [
    // Undo/Redo
    { key: 'ctrl+z', description: 'Undo', handler: () => history.undo() },
    { key: 'ctrl+y', description: 'Redo', handler: () => history.redo() },

    // Delete
    {
      key: 'Delete',
      description: 'Delete selected shapes',
      handler: () => {
        if (selectedIds.length > 0) {
          setShapesToDelete(selectedIds);
          setShowKeyboardDeleteConfirm(true);
        }
      },
    },
    {
      key: 'Backspace',
      description: 'Delete selected shapes (alternative)',
      handler: () => {
        if (selectedIds.length > 0) {
          setShapesToDelete(selectedIds);
          setShowKeyboardDeleteConfirm(true);
        }
      },
    },

    // Duplicate
    {
      key: 'ctrl+d',
      description: 'Duplicate selected shapes',
      handler: () => {
        if (selectedIds.length === 0) return;

        const newShapes: Shape[] = [];
        const newIds: string[] = [];

        selectedIds.forEach((id) => {
          const shape = shapes.find((s) => s.id === id);
          if (shape) {
            const duplicated = duplicateShape(shape, { x: 20, y: 20 });
            newShapes.push(duplicated);
            newIds.push(duplicated.id);

            // Sync to map data store
            if (duplicated.category === 'interactive') {
              addInteractiveArea(shapeToInteractiveArea(duplicated));
            } else if (duplicated.category === 'collision') {
              addCollisionArea(shapeToImpassableArea(duplicated));
            }
          }
        });

        setShapes((prev) => [...prev, ...newShapes]);
        setSelectedIds(newIds);
        markDirty();
        history.pushState('Duplicate shapes');
      },
    },

    // Group/Ungroup
    {
      key: 'ctrl+g',
      description: 'Group selected shapes',
      handler: (e) => {
        e?.preventDefault();
        if (selectedIds.length < 2) return;

        const selectedShapes = shapes.filter((s) => selectedIds.includes(s.id));
        const grouped = groupShapes(selectedShapes);

        setShapes((prev) =>
          prev.map((shape) => grouped.find((g) => g.id === shape.id) || shape)
        );
        markDirty();
        history.pushState('Group shapes');
      },
    },
    {
      key: 'ctrl+shift+g',
      description: 'Ungroup selected shapes',
      handler: (e) => {
        e?.preventDefault();
        if (selectedIds.length === 0) return;

        const selectedShapes = shapes.filter((s) => selectedIds.includes(s.id));
        const ungrouped = ungroupShapes(selectedShapes);

        setShapes((prev) =>
          prev.map((shape) => ungrouped.find((u) => u.id === shape.id) || shape)
        );
        markDirty();
        history.pushState('Ungroup shapes');
      },
    },

    // Grid toggle
    {
      key: 'g',
      description: 'Toggle grid',
      handler: () => setGridConfig((prev) => ({ ...prev, visible: !prev.visible })),
    },

    // Vertex edit mode
    {
      key: 'v',
      description: 'Enter vertex edit mode (for selected polygon)',
      handler: () => {
        if (selectedIds.length === 1) {
          const shape = shapes.find((s) => s.id === selectedIds[0]);
          if (shape && shape.geometry.type === 'polygon') {
            setCurrentTool('edit-vertex');
          }
        }
      },
    },

    // Escape
    {
      key: 'Escape',
      description: 'Exit vertex edit mode / Clear selection',
      handler: () => {
        if (currentTool === 'edit-vertex') {
          setCurrentTool('select');
        } else {
          setSelectedIds([]);
        }
      },
    },
  ];
}

