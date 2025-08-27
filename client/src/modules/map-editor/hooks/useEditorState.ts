import { useState, useCallback } from 'react';
import { EditorState, EditorTool } from '../types/editor.types';
import { DEFAULT_EDITOR_STATE } from '../constants/editorConstants';
import {
  handleToolChange,
  handleZoomIn,
  handleZoomOut,
  handleFitToScreen,
  handleMouseMove,
  handleUndo,
  handleRedo
} from '../utils/editorHandlers';

export const useEditorState = () => {
  const [editorState, setEditorState] = useState<EditorState>(DEFAULT_EDITOR_STATE);

  const onToolChange = useCallback((tool: EditorTool) => {
    handleToolChange(tool, setEditorState);
  }, []);

  const onZoomIn = useCallback(() => {
    handleZoomIn(setEditorState);
  }, []);

  const onZoomOut = useCallback(() => {
    handleZoomOut(setEditorState);
  }, []);

  const onFitToScreen = useCallback(() => {
    handleFitToScreen(setEditorState);
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    handleMouseMove(e, setEditorState);
  }, []);

  const onUndo = useCallback(() => {
    handleUndo();
  }, []);

  const onRedo = useCallback(() => {
    handleRedo();
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
