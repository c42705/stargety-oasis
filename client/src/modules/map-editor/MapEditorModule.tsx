import React, { useState, useEffect, useCallback } from 'react';
import { Map, Eye, Square, Shield } from 'lucide-react';
import { useMapData } from '../../shared/MapDataContext';
import { useSharedMap } from '../../shared/useSharedMap';
import { FabricMapCanvas } from './FabricMapCanvas';
import { AreaFormModal } from '../../components/AreaFormModal';
import { CollisionAreaFormModal } from '../../components/CollisionAreaFormModal';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';

// Import extracted components
import { EditorToolbar } from './components/EditorToolbar';
import { EditorStatusBar } from './components/EditorStatusBar';
import { AreasTab } from './components/tabs/AreasTab';
import { TerrainTab } from './components/tabs/TerrainTab';
import { AssetsTab } from './components/tabs/AssetsTab';
import { CollisionTab } from './components/tabs/CollisionTab';
import { SettingsTab } from './components/tabs/SettingsTab';

// Import extracted hooks
import { useEditorState } from './hooks/useEditorState';
import { useGridConfig } from './hooks/useGridConfig';
import { useModalState } from './hooks/useModalState';
import { useDrawingMode } from './hooks/useDrawingMode';
import { useCollisionModalState } from './hooks/useCollisionModalState';
import { useCollisionDrawingMode } from './hooks/useCollisionDrawingMode';

// Import types and constants
import { MapEditorModuleProps, TabId, GridConfig } from './types/editor.types';
import { EDITOR_TABS, KEYBOARD_SHORTCUTS } from './constants/editorConstants';
import {
  createAreaSaveHandler,
  createAreaDeleteHandler,
  createAreaDrawnHandler,
  createCollisionAreaSaveHandler,
  createCollisionAreaDeleteHandler,
  createCollisionAreaDrawnHandler
} from './utils/editorHandlers';

import './MapEditorModule.css';

export const MapEditorModule: React.FC<MapEditorModuleProps> = ({
  className = ''
}) => {
  const { mapData } = useMapData();
  const sharedMap = useSharedMap({ source: 'editor', autoSave: true });
  const [activeTab, setActiveTab] = useState<TabId>('areas');
  const [previewMode, setPreviewMode] = useState(false);

  // Use shared map data
  const { interactiveAreas: areas, impassableAreas } = mapData;

  // Use extracted hooks
  const editorState = useEditorState();
  const gridConfig = useGridConfig();
  const modalState = useModalState();
  const drawingMode = useDrawingMode();
  const collisionModalState = useCollisionModalState();
  const collisionDrawingMode = useCollisionDrawingMode();

  // Create handlers using extracted utilities
  const handleSaveArea = useCallback(
    createAreaSaveHandler(
      modalState.editingArea,
      sharedMap,
      modalState.setShowAreaModal,
      modalState.setEditingArea,
      drawingMode.setPendingAreaData,
      drawingMode.setDrawingMode
    ),
    [modalState.editingArea, sharedMap, modalState, drawingMode]
  );

  const handleConfirmDelete = useCallback(
    createAreaDeleteHandler(
      modalState.areaToDelete,
      sharedMap,
      modalState.setAreaToDelete
    ),
    [modalState.areaToDelete, sharedMap, modalState]
  );

  const handleAreaDrawn = useCallback(
    createAreaDrawnHandler(
      drawingMode.pendingAreaData,
      sharedMap,
      drawingMode.setDrawingMode,
      drawingMode.setPendingAreaData,
      () => {
        // Force immediate re-render by triggering a state update
        console.log('Area created, triggering immediate re-render');
      }
    ),
    [drawingMode.pendingAreaData, sharedMap, drawingMode]
  );

  // Collision area handlers
  const handleSaveCollisionArea = useCallback(
    createCollisionAreaSaveHandler(
      collisionModalState.editingCollisionArea,
      sharedMap,
      collisionModalState.setShowCollisionAreaModal,
      collisionModalState.setEditingCollisionArea,
      collisionDrawingMode.setPendingCollisionAreaData,
      collisionDrawingMode.setCollisionDrawingMode
    ),
    [collisionModalState.editingCollisionArea, sharedMap, collisionModalState, collisionDrawingMode]
  );

  const handleConfirmDeleteCollisionArea = useCallback(
    createCollisionAreaDeleteHandler(
      collisionModalState.collisionAreaToDelete,
      sharedMap,
      collisionModalState.setCollisionAreaToDelete
    ),
    [collisionModalState.collisionAreaToDelete, sharedMap, collisionModalState]
  );

  const handleCollisionAreaDrawn = useCallback(
    createCollisionAreaDrawnHandler(
      collisionDrawingMode.pendingCollisionAreaData,
      sharedMap,
      collisionDrawingMode.setCollisionDrawingMode,
      collisionDrawingMode.setPendingCollisionAreaData,
      () => {
        // Force immediate re-render by triggering a state update
        console.log('Collision area created, triggering immediate re-render');
      }
    ),
    [collisionDrawingMode.pendingCollisionAreaData, sharedMap, collisionDrawingMode]
  );

  // Modal close handler that combines drawing mode exit
  const handleCloseModals = useCallback(() => {
    modalState.handleCloseModals();
    collisionModalState.handleCloseModals();

    // Exit drawing mode if active
    if (drawingMode.drawingMode) {
      drawingMode.exitDrawingMode();
    }
    if (collisionDrawingMode.collisionDrawingMode) {
      collisionDrawingMode.exitCollisionDrawingMode();
    }
  }, [modalState, drawingMode, collisionModalState, collisionDrawingMode]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (KEYBOARD_SHORTCUTS.TOGGLE_GRID.includes(e.key as any)) {
        e.preventDefault();
        gridConfig.toggleGrid();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gridConfig]);

  // Grid configuration change handler
  const handleGridConfigChange = useCallback((config: Partial<GridConfig>) => {
    gridConfig.setGridConfig(prev => ({ ...prev, ...config }));
  }, [gridConfig]);

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'areas':
        return (
          <AreasTab
            areas={areas}
            onCreateNewArea={modalState.handleCreateNewArea}
            onEditArea={modalState.handleEditArea}
            onDeleteArea={modalState.handleDeleteArea}
          />
        );
      case 'terrain':
        return <TerrainTab />;
      case 'assets':
        return <AssetsTab />;
      case 'collision':
        return (
          <CollisionTab
            impassableAreas={impassableAreas}
            onCreateNewCollisionArea={collisionModalState.handleCreateNewCollisionArea}
            onEditCollisionArea={collisionModalState.handleEditCollisionArea}
            onDeleteCollisionArea={collisionModalState.handleDeleteCollisionArea}
          />
        );
      case 'settings':
        return (
          <SettingsTab
            gridConfig={gridConfig.gridConfig}
            previewMode={previewMode}
            onGridConfigChange={handleGridConfigChange}
            onPreviewModeChange={setPreviewMode}
          />
        );
      default:
        return null;
    }
  };



  return (
    <div className={`map-editor-module ${className}`}>
      <header className="editor-header">
        <div className="editor-title">
          <Map size={24} className="editor-icon" />
          <h1>Map Editor</h1>
          <span className="editor-subtitle">Stargety Oasis World Designer</span>
        </div>
        <EditorToolbar
          editorState={editorState.editorState}
          gridConfig={gridConfig.gridConfig}
          previewMode={previewMode}
          onToolChange={editorState.onToolChange}
          onZoomIn={editorState.onZoomIn}
          onZoomOut={editorState.onZoomOut}
          onFitToScreen={editorState.onFitToScreen}
          onToggleGrid={gridConfig.toggleGrid}
          onUndo={editorState.onUndo}
          onRedo={editorState.onRedo}
          onTogglePreview={() => setPreviewMode(!previewMode)}
        />
      </header>

      <div className="editor-layout">
        <main
          className="editor-main"
          onMouseMove={editorState.onMouseMove}
          style={{ position: 'relative' }}
        >
          <FabricMapCanvas
            width={mapData.worldDimensions.width}
            height={mapData.worldDimensions.height}
            gridVisible={gridConfig.gridConfig.visible}
            gridSpacing={gridConfig.gridConfig.spacing}
            gridColor={gridConfig.gridConfig.color}
            gridOpacity={gridConfig.gridConfig.opacity}
            drawingMode={drawingMode.drawingMode}
            collisionDrawingMode={collisionDrawingMode.collisionDrawingMode}
            drawingAreaData={drawingMode.pendingAreaData || undefined}
            drawingCollisionAreaData={collisionDrawingMode.pendingCollisionAreaData || undefined}
            onSelectionChanged={(objects) => {
              console.log('Selection changed:', objects);
            }}
            onObjectModified={(object) => {
              console.log('Object modified:', object);
            }}
            onAreaDrawn={handleAreaDrawn}
            onCollisionAreaDrawn={handleCollisionAreaDrawn}
            className="map-editor-canvas"
          />
        </main>

        <aside className="editor-sidebar">
          <div className="editor-panel-tabs">
            {EDITOR_TABS.map(tab => (
              <button
                key={tab.id}
                className={`editor-panel-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                aria-selected={activeTab === tab.id}
              >
                <span className="tab-icon">{tab.icon}</span>
                <span className="tab-label">{tab.label}</span>
              </button>
            ))}
          </div>

          <div className="sidebar-content">
            <div className="tab-content-container">
              {renderTabContent()}
            </div>
          </div>
        </aside>
      </div>

      <EditorStatusBar
        editorState={editorState.editorState}
        areasCount={areas.length}
        collisionAreasCount={impassableAreas.length}
      />

      {previewMode && (
        <div className="preview-overlay">
          <div className="preview-notice">
            <Eye size={20} />
            <span>Preview Mode Active - Use toolbar to exit preview</span>
          </div>
        </div>
      )}

      {drawingMode.drawingMode && (
        <div className="drawing-overlay">
          <div className="drawing-notice">
            <Square size={20} />
            <span>Drawing Mode: Click and drag to create area</span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={drawingMode.cancelDrawingMode}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {collisionDrawingMode.collisionDrawingMode && (
        <div className="drawing-overlay">
          <div className="drawing-notice">
            <Shield size={20} />
            <span>Collision Drawing Mode: Click and drag to create collision area</span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={collisionDrawingMode.cancelCollisionDrawingMode}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <AreaFormModal
        isOpen={modalState.showAreaModal}
        onClose={handleCloseModals}
        onSave={handleSaveArea}
        editingArea={modalState.editingArea}
      />

      <ConfirmationDialog
        isOpen={modalState.showDeleteConfirm}
        onClose={handleCloseModals}
        onConfirm={() => { console.log('[MapEditorModule] Confirm delete'); handleConfirmDelete(); }}
        title="Delete Interactive Area"
        message={`Are you sure you want to delete "${modalState.areaToDelete?.name}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />

      <CollisionAreaFormModal
        isOpen={collisionModalState.showCollisionAreaModal}
        onClose={handleCloseModals}
        onSave={handleSaveCollisionArea}
        editingArea={collisionModalState.editingCollisionArea}
      />

      <ConfirmationDialog
        isOpen={collisionModalState.showDeleteConfirm}
        onClose={handleCloseModals}
        onConfirm={() => { console.log('[MapEditorModule] Confirm delete collision area'); handleConfirmDeleteCollisionArea(); }}
        title="Delete Collision Area"
        message={`Are you sure you want to delete "${collisionModalState.collisionAreaToDelete?.name || 'Collision Area'}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};
