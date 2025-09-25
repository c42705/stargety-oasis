import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Map, Eye, Square, Shield } from 'lucide-react';
import { useMapData, InteractiveArea } from '../../shared/MapDataContext';
// import { useSharedMap } from '../../shared/useSharedMap';
import { useSharedMapCompat as useSharedMap } from '../../stores/useSharedMapCompat';
import { useWorldDimensions } from '../../shared/useWorldDimensions';
import { FabricMapCanvas } from './FabricMapCanvas';
import * as fabric from 'fabric';
import { AreaFormModal } from '../../components/AreaFormModal';
import { CollisionAreaFormModal } from '../../components/CollisionAreaFormModal';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';

// Import extracted components
import { EditorToolbar } from './components/EditorToolbar';
import { EditorStatusBar } from './components/EditorStatusBar';
import { AreasTab } from './components/tabs/AreasTab';
import { TerrainTab } from './components/tabs/TerrainTab';
import { AssetsTab } from './components/tabs/AssetsTab';
import { LayersTab } from './components/tabs/LayersTab';
import { CollisionTab } from './components/tabs/CollisionTab';
import { SettingsTab } from './components/tabs/SettingsTab';

// Import extracted hooks
import { useEditorState } from './hooks/useEditorState';
import { useGridConfig } from './hooks/useGridConfig';
import { useModalState } from './hooks/useModalState';
import { useDrawingMode } from './hooks/useDrawingMode';
import { useCollisionModalState } from './hooks/useCollisionModalState';
import { useCollisionDrawingMode } from './hooks/useCollisionDrawingMode';
import { useBackgroundInfoIntegration } from './hooks/useBackgroundInfoPanel';

// Import types and constants
import { MapEditorModuleProps, TabId, GridConfig } from './types/editor.types';
import { EDITOR_TABS, KEYBOARD_SHORTCUTS } from './constants/editorConstants';

// Import zoom utilities
import {
  calculateZoomToObject,
  getViewportDimensions,
  applyZoomAndPan,
  validateZoomOperation,
  getZoomState
} from './utils/zoomUtils';




import './MapEditorModule.css';

export const MapEditorModule: React.FC<MapEditorModuleProps> = ({
  className = ''
}) => {
  const { mapData } = useMapData();
  // Auto-save is now controlled entirely by the Zustand store
  const sharedMap = useSharedMap({
    source: 'editor'
    // Note: autoSave parameter removed - controlled by store toggle only
  });
  const [activeTab, setActiveTab] = useState<TabId>('areas');
  const [previewMode, setPreviewMode] = useState(false);

  // Fabric canvas reference for layers tab
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);

  // Use shared map data
  const { interactiveAreas: areas, impassableAreas } = mapData;

  // Use WorldDimensionsManager for direct, non-looping dimension access
  const worldDimensions = useWorldDimensions({
    subscribeToEffective: true,
    subscribeToCanvas: true,
    enableShallowComparison: true,
    enableLogging: false // Set to true for debugging
  });

  // Get effective dimensions directly from WorldDimensionsManager (no loops)
  const effectiveDimensions = worldDimensions.effectiveDimensions;

  // Use extracted hooks
  const editorState = useEditorState();
  const gridConfig = useGridConfig(editorState.editorState.zoom / 100); // Pass current zoom as decimal
  const modalState = useModalState();
  const drawingMode = useDrawingMode();
  const collisionModalState = useCollisionModalState();
  const collisionDrawingMode = useCollisionDrawingMode();
  const backgroundInfoPanel = useBackgroundInfoIntegration();

  // SIMPLIFIED: Handle dimension changes without infinite loops
  // WorldDimensionsManager prevents circular updates automatically
  const lastDimensionsRef = useRef<{ width: number; height: number } | null>(null);

  useEffect(() => {
    // Only update if dimensions actually changed (WorldDimensionsManager handles this internally)
    const lastDimensions = lastDimensionsRef.current;
    const dimensionsChanged = !lastDimensions ||
      lastDimensions.width !== effectiveDimensions.width ||
      lastDimensions.height !== effectiveDimensions.height;

    if (dimensionsChanged && fabricCanvasRef.current) {
      lastDimensionsRef.current = { ...effectiveDimensions };

      console.log('🎯 EDIT MODE: Applying fit-to-screen for dimension change', {
        effectiveDimensions,
        previousDimensions: lastDimensions,
        source: 'WorldDimensionsManager'
      });

      // Apply fit-to-screen immediately (no setTimeout needed)
      editorState.onFitToScreen(false);
    }
  }, [effectiveDimensions, editorState]);

  // Create handlers using extracted utilities
  const handleSaveArea = useCallback(async (areaData: any) => {
    if (!modalState.editingArea) {
      // Create new area
      try {
        const newArea = {
          id: `area_${Date.now()}`,
          ...areaData
        };
        await sharedMap.addInteractiveArea(newArea);
        modalState.setShowAreaModal(false);
        drawingMode.setPendingAreaData(null);
        drawingMode.setDrawingMode(false);
      } catch (error) {
        console.error('Failed to create area:', error);
      }
    } else {
      // Update existing area
      try {
        await sharedMap.updateInteractiveArea(modalState.editingArea.id, areaData);
        modalState.setShowAreaModal(false);
        modalState.setEditingArea(null);
      } catch (error) {
        console.error('Failed to update area:', error);
      }
    }
  }, [modalState, sharedMap, drawingMode]);

  const handleConfirmDelete = useCallback(async () => {
    if (modalState.areaToDelete) {
      try {
        await sharedMap.removeInteractiveArea(modalState.areaToDelete.id);
        modalState.setAreaToDelete(null);
      } catch (error) {
        console.error('Failed to delete area:', error);
      }
    }
  }, [modalState, sharedMap]);

  const handleAreaDrawn = useCallback(async (bounds: { x: number; y: number; width: number; height: number }) => {
    if (!drawingMode.pendingAreaData) return;

    try {
      // Create new area with drawn bounds
      const newArea: InteractiveArea = {
        id: `area_${Date.now()}`,
        name: drawingMode.pendingAreaData.name || 'New Area',
        type: drawingMode.pendingAreaData.type || 'custom',
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        color: drawingMode.pendingAreaData.color || '#4A90E2',
        description: drawingMode.pendingAreaData.description || ''
      };

      await sharedMap.addInteractiveArea(newArea);

      // Exit drawing mode
      drawingMode.setDrawingMode(false);
      drawingMode.setPendingAreaData(null);

      // Force immediate re-render by triggering a state update
      console.log('Area created, triggering immediate re-render');
    } catch (error) {
      console.error('Failed to create area:', error);
    }
  }, [drawingMode, sharedMap]);

  // Collision area handlers
  const handleSaveCollisionArea = useCallback(async (areaData: any) => {
    if (!collisionModalState.editingCollisionArea) {
      // Start drawing mode for new collision area
      console.log('🎯 STARTING COLLISION DRAWING MODE:', areaData);
      collisionDrawingMode.setPendingCollisionAreaData(areaData);
      collisionDrawingMode.setCollisionDrawingMode(true);
      collisionModalState.setShowCollisionAreaModal(false);
    } else {
      // Update existing collision area
      try {
        await sharedMap.updateCollisionArea(collisionModalState.editingCollisionArea.id, areaData);
        collisionModalState.setShowCollisionAreaModal(false);
        collisionModalState.setEditingCollisionArea(null);
      } catch (error) {
        console.error('Failed to update collision area:', error);
      }
    }
  }, [collisionModalState, sharedMap, collisionDrawingMode]);

  const handleConfirmDeleteCollisionArea = useCallback(async () => {
    if (collisionModalState.collisionAreaToDelete) {
      try {
        await sharedMap.removeCollisionArea(collisionModalState.collisionAreaToDelete.id);
        collisionModalState.setCollisionAreaToDelete(null);
      } catch (error) {
        console.error('Failed to delete collision area:', error);
      }
    }
  }, [collisionModalState, sharedMap]);

  const handleCollisionAreaDrawn = useCallback(async (bounds: { x: number; y: number; width: number; height: number }) => {
    if (!collisionDrawingMode.pendingCollisionAreaData) return;

    try {
      // Create new collision area with drawn bounds
      const newArea = {
        id: `collision_${Date.now()}`,
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        ...collisionDrawingMode.pendingCollisionAreaData
      };

      await sharedMap.addCollisionArea(newArea);

      // Exit drawing mode
      collisionDrawingMode.setCollisionDrawingMode(false);
      collisionDrawingMode.setPendingCollisionAreaData(null);

      // Force immediate re-render by triggering a state update
      console.log('Collision area created, triggering immediate re-render');
    } catch (error) {
      console.error('Failed to create collision area:', error);
    }
  }, [collisionDrawingMode, sharedMap]);

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
      case 'layers':
        return (
          <LayersTab
            fabricCanvas={fabricCanvasRef.current}
            onObjectSelect={(object) => {
              // Handle object selection - ensure object is properly selected after zoom
              if (fabricCanvasRef.current && object) {
                const canvas = fabricCanvasRef.current;

                // Make sure the object is selectable (not locked)
                if (object.selectable !== false) {
                  canvas.setActiveObject(object);
                  canvas.renderAll();

                  console.log('✅ OBJECT SELECTED FROM LAYERS:', {
                    objectType: (object as any).type || 'unknown',
                    objectId: (object as any).id || 'unknown',
                    selectable: object.selectable,
                    visible: object.visible
                  });
                } else {
                  console.log('⚠️ OBJECT IS LOCKED AND CANNOT BE SELECTED:', {
                    objectType: (object as any).type || 'unknown',
                    locked: (object as any).locked
                  });
                }
              }
            }}
            onToolChange={editorState.onToolChange}
            onZoomToObject={(object) => {
              // Zoom to fit the selected object using unified zoom utilities
              if (!fabricCanvasRef.current || !object) return;

              const canvas = fabricCanvasRef.current;
              const objectBounds = object.getBoundingRect();

              try {
                // Calculate zoom to object using utility function
                const { zoom: fitZoom, centerX, centerY } = calculateZoomToObject(
                  objectBounds,
                  canvas.getWidth(),
                  canvas.getHeight(),
                  { padding: 100 } // Use default object focus max zoom (3.1x)
                );

                // Validate zoom operation
                const validation = validateZoomOperation(canvas, fitZoom, 'zoom to object');
                if (!validation.isValid) {
                  console.warn('🎯 ZOOM TO OBJECT BLOCKED:', validation.error);
                  return;
                }

                // Get viewport dimensions for centering
                const viewportDims = getViewportDimensions(canvas.getElement().parentElement || canvas.getElement());

                // Apply zoom and pan using utility function
                applyZoomAndPan(canvas, fitZoom, centerX, centerY, viewportDims);

                // Update editor state zoom
                editorState.setEditorState(prev => ({
                  ...prev,
                  zoom: Math.round(fitZoom * 100)
                }));

                const zoomState = getZoomState(fitZoom);
                console.log('🎯 ZOOMED TO OBJECT:', {
                  objectBounds,
                  fitZoom,
                  centerX,
                  centerY,
                  zoomPercentage: `${zoomState.percentage}%`,
                  isExtreme: zoomState.isExtreme,
                  objectType: (object as any).type || 'unknown'
                });
              } catch (error) {
                console.error('🎯 ZOOM TO OBJECT ERROR:', error);
              }
            }}
          />
        );
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
          onResetZoom={editorState.onResetZoom}
          onFitToScreen={editorState.onFitToScreen}
          onToggleGrid={gridConfig.toggleGrid}
          onUndo={editorState.onUndo}
          onRedo={editorState.onRedo}
          onTogglePreview={() => setPreviewMode(!previewMode)}
          onToggleBackgroundInfo={backgroundInfoPanel.togglePanel}
          backgroundInfoVisible={backgroundInfoPanel.isPanelVisible}
        />
      </header>

      <div className="editor-layout">
        <main
          className="editor-main"
          onMouseMove={editorState.onMouseMove}
          style={{ position: 'relative' }}
        >
          <FabricMapCanvas
            width={effectiveDimensions.width}
            height={effectiveDimensions.height}
            gridVisible={gridConfig.gridConfig.visible}
            gridSpacing={gridConfig.gridConfig.spacing}
            gridPattern={gridConfig.gridConfig.pattern}
            gridOpacity={gridConfig.gridConfig.opacity}
            drawingMode={drawingMode.drawingMode}
            collisionDrawingMode={collisionDrawingMode.collisionDrawingMode}
            drawingAreaData={drawingMode.pendingAreaData || undefined}
            drawingCollisionAreaData={collisionDrawingMode.pendingCollisionAreaData || undefined}
            currentTool={editorState.editorState.tool}
            onSelectionChanged={(objects) => {
              console.log('Selection changed:', objects);
            }}
            onObjectModified={(object) => {
              console.log('Object modified:', object);
            }}
            onAreaDrawn={handleAreaDrawn}
            onCollisionAreaDrawn={handleCollisionAreaDrawn}
            className="map-editor-canvas"
            onCanvasReady={(canvas) => {
              console.log('🎨 EDIT MODE: Canvas ready with centralized dimensions', {
                timestamp: new Date().toISOString(),
                canvasSize: { width: canvas.width, height: canvas.height },
                effectiveDimensions,
                worldDimensions: mapData.worldDimensions,
                backgroundImageDimensions: sharedMap.mapData?.backgroundImageDimensions,
                mode: 'edit'
              });
              editorState.setFabricCanvas(canvas);
              fabricCanvasRef.current = canvas;

              // Automatically fit map to viewport when entering edit mode (immediate, no timeout)
              editorState.onFitToScreen(true); // Force on initial canvas ready
              console.log('🎯 EDIT MODE: Auto-applied zoom to fit on canvas ready (immediate)');
            }}
            backgroundInfoPanelVisible={backgroundInfoPanel.isPanelVisible}
            onBackgroundInfoPanelClose={backgroundInfoPanel.hidePanel}
          />
        </main>

        <aside className="editor-sidebar">
          <div className="editor-panel-tabs">
            {EDITOR_TABS.map(tab => (
              <button
                key={tab.id}
                className={`editor-panel-tab ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
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
