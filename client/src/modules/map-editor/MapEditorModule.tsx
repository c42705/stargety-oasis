import React, { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '../../shared/logger';
import { Eye, Square, Shield } from 'lucide-react';
import { useMapData, InteractiveArea } from '../../shared/MapDataContext';
import { useSharedMapCompat as useSharedMap } from '../../stores/useSharedMapCompat';
import { useWorldDimensions } from '../../shared/useWorldDimensions';
import { FabricMapCanvas } from './FabricMapCanvas';
import * as fabric from 'fabric';
import { AreaFormModal } from '../../components/AreaFormModal';
import { useMapEditorCamera } from './hooks/useMapEditorCamera';
import { CollisionAreaFormModal } from '../../components/CollisionAreaFormModal';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
import { EditorToolbar } from './components/EditorToolbar';
import { EditorStatusBar } from './components/EditorStatusBar';
import { LayersPanel } from './components/LayersPanel';
import { AreasTab } from './components/tabs/AreasTab';
import { TerrainTab } from './components/tabs/TerrainTab';
import { AssetsTab } from './components/tabs/AssetsTab';
import { CollisionTab } from './components/tabs/CollisionTab';
import { SettingsTab } from './components/tabs/SettingsTab';
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
// (Currently no zoom utilities needed in this module)




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

  // Paint functionality removed - only polygon collision areas are supported

  // Fabric canvas reference for layers tab
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);

  // Add ref and state for main editor viewport
  const mainRef = useRef<HTMLDivElement>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

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

  // Setup viewport measurement effect
  useEffect(() => {
    function updateSize() {
      if (mainRef.current) {
        setViewportWidth(mainRef.current.offsetWidth);
        setViewportHeight(mainRef.current.offsetHeight);
      }
    }
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Camera controls for pan/zoom integration (clamped to map bounds)
  const cameraControls = useMapEditorCamera({
    worldBounds: effectiveDimensions,
    viewportWidth,
    viewportHeight,
    initialZoom: 1.0
  });

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

      // Removed: Non-critical fit-to-screen dimension change log.

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
        logger.error('Failed to create area', error);
      }
    } else {
      // Update existing area
      try {
        await sharedMap.updateInteractiveArea(modalState.editingArea.id, areaData);
        modalState.setShowAreaModal(false);
        modalState.setEditingArea(null);
      } catch (error) {
        logger.error('Failed to update area', error);
      }
    }
  }, [modalState, sharedMap, drawingMode]);

  const handleConfirmDelete = useCallback(async () => {
    if (modalState.areaToDelete) {
      try {
        await sharedMap.removeInteractiveArea(modalState.areaToDelete.id);
        modalState.setAreaToDelete(null);
      } catch (error) {
        logger.error('Failed to delete area', error);
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
      // Removed: Non-critical area creation log.
    } catch (error) {
      logger.error('Failed to create area', error);
    }
  }, [drawingMode, sharedMap]);

  // Collision area handlers
  /**
   * handleSaveCollisionArea - receives areaData from modal and pushes it to drawing handler
   * Expects areaData to have: type, color, and optionally name (set in modal).
   * This is set as pendingCollisionAreaData for downstream polygon drawing.
   */
  const handleSaveCollisionArea = useCallback(async (areaData: any) => {
    if (!collisionModalState.editingCollisionArea) {
      // Start drawing mode for new collision area
      const drawingMode = areaData.drawingMode || 'polygon'; // Default to polygon

      // Remove drawingMode from areaData before storing
      const { drawingMode: _, ...areaDataWithoutMode } = areaData;

      // Step 2: Pass areaData (with type, color, name) to canvas
      collisionDrawingMode.setPendingCollisionAreaData(areaDataWithoutMode);

      if (drawingMode === 'polygon') {
        // Use polygon drawing tool
        editorState.setEditorState(prev => ({ ...prev, tool: 'draw-polygon' }));
      } else {
        // Use rectangle drawing mode
        collisionDrawingMode.setCollisionDrawingMode(true);
      }

      collisionModalState.setShowCollisionAreaModal(false);
    } else {
      // Update existing collision area
      try {
        await sharedMap.updateCollisionArea(collisionModalState.editingCollisionArea.id, areaData);
        collisionModalState.setShowCollisionAreaModal(false);
        collisionModalState.setEditingCollisionArea(null);
      } catch (error) {
        logger.error('Failed to update collision area', error);
      }
    }
  }, [collisionModalState, sharedMap, collisionDrawingMode, editorState]);

  const handleConfirmDeleteCollisionArea = useCallback(async () => {
    if (collisionModalState.collisionAreaToDelete) {
      try {
        await sharedMap.removeCollisionArea(collisionModalState.collisionAreaToDelete.id);
        collisionModalState.setCollisionAreaToDelete(null);
      } catch (error) {
        logger.error('Failed to delete collision area', error);
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
      // Removed: Non-critical collision area creation log.
    } catch (error) {
      logger.error('Failed to create collision area', error);
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
        <EditorToolbar
          editorState={editorState.editorState}
          gridConfig={gridConfig.gridConfig}
          previewMode={previewMode}
          zoom={fabricCanvasRef.current ? Math.round(fabricCanvasRef.current.getZoom() * 100) : 100}
          onToolChange={editorState.onToolChange}
          onZoomIn={() => {
            if (fabricCanvasRef.current) {
              let zoom = fabricCanvasRef.current.getZoom();
              zoom = Math.min(zoom * 1.2, 4); // Max zoom x4
              fabricCanvasRef.current.setZoom(zoom);
              editorState.setEditorState(prev => ({ ...prev, zoom: Math.round(zoom * 100) }));
            }
          }}
          onZoomOut={() => {
            if (fabricCanvasRef.current) {
              let zoom = fabricCanvasRef.current.getZoom();
              zoom = Math.max(zoom / 1.2, 0.1); // Min zoom x0.1
              fabricCanvasRef.current.setZoom(zoom);
              editorState.setEditorState(prev => ({ ...prev, zoom: Math.round(zoom * 100) }));
            }
          }}
          onResetZoom={() => {
            if (fabricCanvasRef.current) {
              const canvas = fabricCanvasRef.current;
              // Set zoom to 1.0 (100%)
              canvas.setZoom(1.0);
              // Center the background horizontally and vertically if present
              const viewportWidth = mainRef.current?.offsetWidth || canvas.getWidth() || 1;
              const viewportHeight = mainRef.current?.offsetHeight || canvas.getHeight() || 1;
              const bgObj = canvas.getObjects().find(obj =>
                (obj as any).isBackgroundImage ||
                (obj as any).backgroundImageId === "map-background-image"
              );
              const bgWidth = bgObj ? (bgObj.width || 1) * (bgObj.scaleX || 1) : canvas.getWidth() || 1;
              const bgHeight = bgObj ? (bgObj.height || 1) * (bgObj.scaleY || 1) : canvas.getHeight() || 1;
              const vpt = canvas.viewportTransform ?? [1,0,0,1,0,0];
              vpt[4] = Math.max(0, (viewportWidth - bgWidth) / 2);
              vpt[5] = Math.max(0, (viewportHeight - bgHeight) / 2);
              canvas.setViewportTransform(vpt);
              editorState.setEditorState(prev => ({ ...prev, zoom: 100 }));
            }
          }}
          onFitToScreen={() => {
            if (fabricCanvasRef.current) {
              const canvas = fabricCanvasRef.current;
              const viewportWidth = mainRef.current?.offsetWidth || canvas.getWidth() || 1;
              // Find background image object
              const bgObj = canvas.getObjects().find(obj =>
                (obj as any).isBackgroundImage ||
                (obj as any).backgroundImageId === "map-background-image"
              );
              const bgWidth = bgObj ? (bgObj.width || 1) * (bgObj.scaleX || 1) : canvas.getWidth() || 1;
              const zoom = viewportWidth / bgWidth;
              canvas.setZoom(zoom);
              
              // Center vertically
              const viewportHeight = mainRef.current?.offsetHeight || canvas.getHeight() || 1;
              const bgHeight = bgObj ? (bgObj.height || 1) * (bgObj.scaleY || 1) : canvas.getHeight() || 1;
              const vpt = canvas.viewportTransform ?? [1,0,0,1,0,0];
              vpt[4] = 0; // align left
              vpt[5] = Math.max(0, (viewportHeight - bgHeight * zoom) / 2); // center vertically if possible
              canvas.setViewportTransform(vpt);
              
              editorState.setEditorState(prev => ({
                ...prev,
                zoom: Math.round(zoom * 100)
              }));
            }
          }}
          onToggleGrid={gridConfig.toggleGrid}
          onUndo={editorState.onUndo}
          onRedo={editorState.onRedo}
          onTogglePreview={() => setPreviewMode(!previewMode)}
          onToggleBackgroundInfo={backgroundInfoPanel.togglePanel}
          backgroundInfoVisible={backgroundInfoPanel.isPanelVisible}
        />
      </header>

      <div className="editor-layout">
        <LayersPanel
          fabricCanvas={fabricCanvasRef.current}
          onObjectSelect={(object) => {
            // Handle object selection - ensure object is properly selected after zoom
            if (fabricCanvasRef.current && object) {
              const canvas = fabricCanvasRef.current;

              // Make sure the object is selectable (not locked)
              if (object.selectable !== false) {
                canvas.setActiveObject(object);
                canvas.renderAll();
              }
            }
          }}
          onToolChange={editorState.onToolChange}
          onZoomToObject={(object) => {
            // Zoom and pan to fit the selected object in the viewport
            if (!fabricCanvasRef.current || !object) return;

            const canvas = fabricCanvasRef.current;
            const bounds = object.getBoundingRect();
            const objLeft = bounds.left;
            const objTop = bounds.top;
            const objWidth = bounds.width;
            const objHeight = bounds.height;

            try {
              const viewportWidth = mainRef.current?.offsetWidth || canvas.getWidth() || 1;
              const viewportHeight = mainRef.current?.offsetHeight || canvas.getHeight() || 1;
              const margin = viewportWidth * 0.10;
              const verticalMargin = viewportHeight * 0.10;
              const zoomX = (viewportWidth - margin * 2) / objWidth;
              const zoomY = (viewportHeight - verticalMargin * 2) / objHeight;
              let fitZoom = Math.min(zoomX, zoomY);
              fitZoom = Math.max(0.1, Math.min(fitZoom, 3));

              canvas.setZoom(fitZoom);
              const vpt = canvas.viewportTransform ?? [1,0,0,1,0,0];
              vpt[4] = viewportWidth / 2 - (objLeft + objWidth / 2) * fitZoom;
              vpt[5] = viewportHeight / 2 - (objTop + objHeight / 2) * fitZoom;
              canvas.setViewportTransform(vpt);

              editorState.setEditorState(prev => ({
                ...prev,
                zoom: Math.round(fitZoom * 100)
              }));
            } catch (error) {
              logger.error('ZOOM TO OBJECT ERROR', error);
            }
          }}
          onEditInteractiveArea={(areaId) => {
            const area = areas.find(a => a.id === areaId);
            if (area) {
              modalState.handleEditArea(area);
            }
          }}
          onEditCollisionArea={(areaId) => {
            const area = impassableAreas.find(a => a.id === areaId);
            if (area) {
              collisionModalState.handleEditCollisionArea(area);
            }
          }}
        />

        <main
          ref={mainRef}
          className="editor-main"
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
            onZoomChange={(zoom) => {
              editorState.setEditorState(prev => ({
                ...prev,
                zoom: Math.round(zoom * 100)
              }));
            }}
            onSelectionChanged={() => {
              // Removed: Non-critical selection changed log.
            }}
            onObjectModified={() => {
              // Removed: Non-critical object modified log.
            }}
            onAreaDrawn={handleAreaDrawn}
            onCollisionAreaDrawn={handleCollisionAreaDrawn}
            className="map-editor-canvas"
            onCanvasReady={(canvas) => {
              // Removed: Non-critical canvas ready debug log.
              editorState.setFabricCanvas(canvas);
              fabricCanvasRef.current = canvas;
              
              // Automatically fit map to viewport when entering edit mode (immediate, no timeout)
              cameraControls.fitToScreen(viewportWidth, viewportHeight); // Use camera controls for fit
              // Removed: Non-critical auto-applied zoom to fit log.
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
        onConfirm={() => { handleConfirmDelete(); }}
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
        onConfirm={() => { handleConfirmDeleteCollisionArea(); }}
        title="Delete Collision Area"
        message={`Are you sure you want to delete "${collisionModalState.collisionAreaToDelete?.name || 'Collision Area'}"?`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};
