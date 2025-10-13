import { useState, useCallback } from 'react';
import * as fabric from 'fabric';

export interface PolygonEditState {
  isEditing: boolean;
  editingPolygonId: string | null;
  vertexHandles: fabric.Circle[];
  edgeHandles: fabric.Circle[];
}

export const usePolygonEditMode = () => {
  const [editState, setEditState] = useState<PolygonEditState>({
    isEditing: false,
    editingPolygonId: null,
    vertexHandles: [],
    edgeHandles: []
  });

  const startEditing = useCallback((polygonId: string) => {
    setEditState({
      isEditing: true,
      editingPolygonId: polygonId,
      vertexHandles: [],
      edgeHandles: []
    });
  }, []);

  const stopEditing = useCallback(() => {
    setEditState({
      isEditing: false,
      editingPolygonId: null,
      vertexHandles: [],
      edgeHandles: []
    });
  }, []);

  const setVertexHandles = useCallback((handles: fabric.Circle[]) => {
    setEditState(prev => ({
      ...prev,
      vertexHandles: handles
    }));
  }, []);

  const setEdgeHandles = useCallback((handles: fabric.Circle[]) => {
    setEditState(prev => ({
      ...prev,
      edgeHandles: handles
    }));
  }, []);

  return {
    editState,
    startEditing,
    stopEditing,
    setVertexHandles,
    setEdgeHandles,
    setEditState
  };
};

