import { useState, useCallback } from 'react';
import { EditorState, EditorTool } from '../types/editor.types';
import { DEFAULT_EDITOR_STATE } from '../constants/editorConstants';
import {
  handleToolChange,
  handleUndo,
  handleRedo
} from '../utils/editorHandlers';

export const useEditorState = () => {
  const [editorState, setEditorState] = useState<EditorState>(DEFAULT_EDITOR_STATE);



  const onToolChange = useCallback((tool: EditorTool) => {
    handleToolChange(tool, setEditorState);
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    // TODO: Update mouse position in world coordinates when camera controls are implemented
    setEditorState(prev => ({
      ...prev,
      mousePosition: { x: e.clientX, y: e.clientY }
    }));
  }, []);

  const onUndo = useCallback(() => {
    handleUndo();
  }, []);

  const onRedo = useCallback(() => {
    handleRedo();
  }, []);

  // TODO: Implement camera control methods
  const onZoomIn = useCallback(() => {
    // TODO: Implement zoom in
  }, []);

  const onZoomOut = useCallback(() => {
    // TODO: Implement zoom out
  }, []);

  const onFitToScreen = useCallback(() => {
    // TODO: Implement fit to screen
  }, []);

  return {
    editorState,
    setEditorState,
    onToolChange,
    onZoomIn,
    onZoomOut,
    onFitToScreen,
    onMouseMove,
    onUndo,
    onRedo
  };
};
