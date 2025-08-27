import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as fabric from 'fabric';
import { Button, Space, Typography, Divider, Tooltip } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useMapData } from '../../shared/MapDataContext';
import { useSharedMap } from '../../shared/useSharedMap';
import { InteractiveArea } from '../../shared/MapDataContext';
import { FabricMapCanvas } from './FabricMapCanvas';
import { MapDataManager } from '../../components/MapDataManager';
import { SaveStatusIndicator } from '../../components/SaveStatusIndicator';
import { AreaFormModal } from '../../components/AreaFormModal';
import { ConfirmationDialog } from '../../components/ConfirmationDialog';
import {
  Map,
  Eye,
  Settings,
  Grid,
  Layers,
  Palette,
  MousePointer,
  Move,
  Square,
  ZoomIn,
  ZoomOut,
  Maximize,
  Undo,
  Redo,
  Grid3X3,
  Shield,
  Eraser,
  Trash2
} from 'lucide-react';
import './MapEditorModule.css';

interface MapEditorModuleProps {
  className?: string;
}

// Interfaces are now imported from shared context

interface GridConfig {
  spacing: number;
  opacity: number;
  color: string;
  visible: boolean;
  snapToGrid: boolean;
}

interface EditorState {
  tool: 'select' | 'move' | 'resize' | 'delete' | 'draw-collision' | 'erase-collision';
  zoom: number;
  mousePosition: { x: number; y: number };
  saveStatus: 'saved' | 'unsaved' | 'saving';
  canUndo: boolean;
  canRedo: boolean;
}

export const MapEditorModule: React.FC<MapEditorModuleProps> = ({
  className = ''
}) => {
  const { mapData } = useMapData();
  const sharedMap = useSharedMap({ source: 'editor', autoSave: true });
  const [activeTab, setActiveTab] = useState<'areas' | 'terrain' | 'assets' | 'settings' | 'collision'>('areas');
  const [previewMode, setPreviewMode] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);

  // Modal states
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [editingArea, setEditingArea] = useState<InteractiveArea | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [areaToDelete, setAreaToDelete] = useState<InteractiveArea | null>(null);

  // Drawing mode states
  const [drawingMode, setDrawingMode] = useState(false);
  const [pendingAreaData, setPendingAreaData] = useState<Partial<InteractiveArea> | null>(null);

  // Enhanced editor state
  const [editorState, setEditorState] = useState<EditorState>({
    tool: 'select',
    zoom: 100,
    mousePosition: { x: 0, y: 0 },
    saveStatus: 'saved',
    canUndo: false,
    canRedo: false
  });

  // Grid configuration
  const [gridConfig, setGridConfig] = useState<GridConfig>({
    spacing: 20,
    opacity: 25,
    color: '#4a5568',
    visible: true,
    snapToGrid: false
  });
  // Use shared map data
  const { interactiveAreas: areas, impassableAreas } = mapData;

  const tabs = [
    { id: 'areas' as const, label: 'Interactive Areas', icon: <Grid size={16} /> },
    { id: 'terrain' as const, label: 'Terrain', icon: <Layers size={16} /> },
    { id: 'assets' as const, label: 'Assets', icon: <Palette size={16} /> },
    { id: 'collision' as const, label: 'Collision', icon: <Shield size={16} /> },
    { id: 'settings' as const, label: 'Settings', icon: <Settings size={16} /> }
  ];

  // Toolbar handlers
  const handleToolChange = useCallback((tool: EditorState['tool']) => {
    setEditorState(prev => ({ ...prev, tool }));
  }, []);

  const handleZoomIn = useCallback(() => {
    setEditorState(prev => ({
      ...prev,
      zoom: Math.min(prev.zoom + 25, 400)
    }));
  }, []);

  const handleZoomOut = useCallback(() => {
    setEditorState(prev => ({
      ...prev,
      zoom: Math.max(prev.zoom - 25, 25)
    }));
  }, []);

  const handleFitToScreen = useCallback(() => {
    setEditorState(prev => ({ ...prev, zoom: 100 }));
  }, []);

  const toggleGrid = useCallback(() => {
    setGridConfig(prev => ({ ...prev, visible: !prev.visible }));
  }, []);

  const handleUndo = useCallback(() => {
    // TODO: Implement undo functionality
    console.log('Undo action');
  }, []);

  const handleRedo = useCallback(() => {
    // TODO: Implement redo functionality
    console.log('Redo action');
  }, []);

  // Mouse tracking for status bar
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    setEditorState(prev => ({ ...prev, mousePosition: { x, y } }));
  }, []);

  // Area management handlers
  const handleCreateNewArea = useCallback(() => {
    setEditingArea(null);
    setShowAreaModal(true);
  }, []);

  const handleEditArea = useCallback((area: InteractiveArea) => {
    setEditingArea(area);
    setShowAreaModal(true);
  }, []);

  const handleDeleteArea = useCallback((area: InteractiveArea) => {
    setAreaToDelete(area);
    setShowDeleteConfirm(true);
  }, []);

  const handleSaveArea = useCallback(async (areaData: Partial<InteractiveArea>) => {
    try {
      if (editingArea) {
        // Update existing area
        await sharedMap.updateInteractiveArea(editingArea.id, areaData);
        setShowAreaModal(false);
        setEditingArea(null);
      } else {
        // For new areas, enter drawing mode
        setPendingAreaData(areaData);
        setDrawingMode(true);
        setShowAreaModal(false);
      }
    } catch (error) {
      console.error('Failed to save area:', error);
      // TODO: Show error message to user
    }
  }, [editingArea, sharedMap]);

  const handleConfirmDelete = useCallback(async () => {
    if (areaToDelete) {
      try {
        await sharedMap.removeInteractiveArea(areaToDelete.id);
        setAreaToDelete(null);
      } catch (error) {
        console.error('Failed to delete area:', error);
        // TODO: Show error message to user
      }
    }
  }, [areaToDelete, sharedMap]);

  const handleCloseModals = useCallback(() => {
    setShowAreaModal(false);
    setShowDeleteConfirm(false);
    setEditingArea(null);
    setAreaToDelete(null);

    // Exit drawing mode if active
    if (drawingMode) {
      setDrawingMode(false);
      setPendingAreaData(null);
    }
  }, [drawingMode]);

  const handleAreaDrawn = useCallback(async (bounds: { x: number; y: number; width: number; height: number }) => {
    if (!pendingAreaData) return;

    try {
      // Create new area with drawn bounds
      const newArea: InteractiveArea = {
        id: `area_${Date.now()}`,
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        ...pendingAreaData
      } as InteractiveArea;

      await sharedMap.addInteractiveArea(newArea);

      // Exit drawing mode
      setDrawingMode(false);
      setPendingAreaData(null);
    } catch (error) {
      console.error('Failed to create area:', error);
      // TODO: Show error message to user
    }
  }, [pendingAreaData, sharedMap]);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (canvasRef.current && !fabricCanvasRef.current) {
      const canvas = new fabric.Canvas(canvasRef.current, {
        width: mapData.worldDimensions.width,
        height: mapData.worldDimensions.height,
        backgroundColor: 'transparent'
      });

      fabricCanvasRef.current = canvas;

      // Initialize canvas with current map data
      initializeCanvasObjects();

      return () => {
        canvas.dispose();
        fabricCanvasRef.current = null;
      };
    }
  }, []);

  // Update canvas when map data changes
  useEffect(() => {
    if (fabricCanvasRef.current) {
      updateCanvasObjects();
    }
  }, [mapData]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        toggleGrid();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleGrid]);

  // Initialize canvas objects
  const initializeCanvasObjects = () => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    canvas.clear();

    // Add grid pattern if visible
    if (gridConfig.visible) {
      addGridToCanvas();
    }

    // Add interactive areas
    areas.forEach(area => {
      addInteractiveAreaToCanvas(area);
    });

    // Add impassable areas
    impassableAreas.forEach(area => {
      addImpassableAreaToCanvas(area);
    });

    canvas.renderAll();
  };

  // Update canvas objects when data changes
  const updateCanvasObjects = () => {
    initializeCanvasObjects();
  };

  // Add grid to canvas
  const addGridToCanvas = () => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    const { width, height } = mapData.worldDimensions;
    const spacing = gridConfig.spacing;

    // Create vertical lines
    for (let x = 0; x <= width; x += spacing) {
      const line = new fabric.Line([x, 0, x, height], {
        stroke: gridConfig.color,
        strokeWidth: 1,
        opacity: gridConfig.opacity / 100,
        selectable: false,
        evented: false
      });
      canvas.add(line);
    }

    // Create horizontal lines
    for (let y = 0; y <= height; y += spacing) {
      const line = new fabric.Line([0, y, width, y], {
        stroke: gridConfig.color,
        strokeWidth: 1,
        opacity: gridConfig.opacity / 100,
        selectable: false,
        evented: false
      });
      canvas.add(line);
    }
  };

  // Add interactive area to canvas
  const addInteractiveAreaToCanvas = (area: any) => {
    if (!fabricCanvasRef.current) return;

    const rect = new fabric.Rect({
      left: area.x,
      top: area.y,
      width: area.width,
      height: area.height,
      fill: area.color,
      opacity: 0.7,
      stroke: area.color,
      strokeWidth: 2,
      selectable: true,
      hasControls: true,
      hasBorders: true
    });

    // Add text label
    const text = new fabric.Text(area.name, {
      left: area.x + area.width / 2,
      top: area.y + area.height / 2,
      fontSize: 12,
      fill: 'white',
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false
    });

    const group = new fabric.Group([rect, text], {
      selectable: true,
      hasControls: true,
      hasBorders: true
    });

    group.set('areaData', area);
    fabricCanvasRef.current.add(group);
  };

  // Add impassable area to canvas
  const addImpassableAreaToCanvas = (area: any) => {
    if (!fabricCanvasRef.current) return;

    const rect = new fabric.Rect({
      left: area.x,
      top: area.y,
      width: area.width,
      height: area.height,
      fill: 'rgba(239, 68, 68, 0.3)',
      stroke: '#ef4444',
      strokeWidth: 2,
      selectable: true,
      hasControls: true,
      hasBorders: true
    });

    rect.set('collisionData', area);
    fabricCanvasRef.current.add(rect);
  };

  // Fabric.js canvas replaces the SVG grid pattern

  // Toolbar Component
  const renderToolbar = () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '8px 16px',
      backgroundColor: 'var(--color-bg-secondary)',
      borderBottom: '1px solid var(--color-border-light)',
      gap: '8px'
    }}>
      <Space size="small">
        <Typography.Text style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
          Tools:
        </Typography.Text>
        <Space.Compact>
          <Tooltip title="Select Tool (S)">
            <Button
              type={editorState.tool === 'select' ? 'primary' : 'default'}
              icon={<MousePointer size={16} />}
              onClick={() => handleToolChange('select')}
              style={{
                backgroundColor: editorState.tool === 'select' ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: editorState.tool === 'select' ? 'white' : 'var(--color-text-primary)'
              }}
            />
          </Tooltip>
          <Tooltip title="Move Tool (M)">
            <Button
              type={editorState.tool === 'move' ? 'primary' : 'default'}
              icon={<Move size={16} />}
              onClick={() => handleToolChange('move')}
              style={{
                backgroundColor: editorState.tool === 'move' ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: editorState.tool === 'move' ? 'white' : 'var(--color-text-primary)'
              }}
            />
          </Tooltip>
          <Tooltip title="Resize Tool (R)">
            <Button
              type={editorState.tool === 'resize' ? 'primary' : 'default'}
              icon={<Square size={16} />}
              onClick={() => handleToolChange('resize')}
              style={{
                backgroundColor: editorState.tool === 'resize' ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: editorState.tool === 'resize' ? 'white' : 'var(--color-text-primary)'
              }}
            />
          </Tooltip>
          <Tooltip title="Delete Tool (D)">
            <Button
              type={editorState.tool === 'delete' ? 'primary' : 'default'}
              icon={<Trash2 size={16} />}
              onClick={() => handleToolChange('delete')}
              style={{
                backgroundColor: editorState.tool === 'delete' ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: editorState.tool === 'delete' ? 'white' : 'var(--color-text-primary)'
              }}
            />
          </Tooltip>
        </Space.Compact>
      </Space>

      <Divider type="vertical" style={{ height: '24px', borderColor: 'var(--color-border)' }} />

      <Space size="small">
        <Typography.Text style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
          Collision:
        </Typography.Text>
        <Space.Compact>
          <Tooltip title="Draw Impassable Area">
            <Button
              type={editorState.tool === 'draw-collision' ? 'primary' : 'default'}
              icon={<Shield size={16} />}
              onClick={() => handleToolChange('draw-collision')}
              style={{
                backgroundColor: editorState.tool === 'draw-collision' ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: editorState.tool === 'draw-collision' ? 'white' : 'var(--color-text-primary)'
              }}
            />
          </Tooltip>
          <Tooltip title="Erase Impassable Area">
            <Button
              type={editorState.tool === 'erase-collision' ? 'primary' : 'default'}
              icon={<Eraser size={16} />}
              onClick={() => handleToolChange('erase-collision')}
              style={{
                backgroundColor: editorState.tool === 'erase-collision' ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: editorState.tool === 'erase-collision' ? 'white' : 'var(--color-text-primary)'
              }}
            />
          </Tooltip>
        </Space.Compact>
      </Space>

      <Divider type="vertical" style={{ height: '24px', borderColor: 'var(--color-border)' }} />

      <Space size="small">
        <Typography.Text style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
          Zoom:
        </Typography.Text>
        <Space.Compact>
          <Tooltip title="Zoom In (+)">
            <Button
              icon={<ZoomIn size={16} />}
              onClick={handleZoomIn}
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)'
              }}
            />
          </Tooltip>
          <Tooltip title="Zoom Out (-)">
            <Button
              icon={<ZoomOut size={16} />}
              onClick={handleZoomOut}
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)'
              }}
            />
          </Tooltip>
          <Tooltip title="Fit to Screen (0)">
            <Button
              icon={<Maximize size={16} />}
              onClick={handleFitToScreen}
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)'
              }}
            />
          </Tooltip>
        </Space.Compact>
        <Typography.Text style={{
          color: 'var(--color-text-primary)',
          fontSize: '12px',
          marginLeft: '8px',
          minWidth: '40px',
          textAlign: 'center'
        }}>
          {editorState.zoom}%
        </Typography.Text>
      </Space>

      <Divider type="vertical" style={{ height: '24px', borderColor: 'var(--color-border)' }} />

      <Space size="small">
        <Tooltip title="Toggle Grid (G)">
          <Button
            type={gridConfig.visible ? 'primary' : 'default'}
            icon={<Grid3X3 size={16} />}
            onClick={toggleGrid}
            style={{
              backgroundColor: gridConfig.visible ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
              borderColor: 'var(--color-border)',
              color: gridConfig.visible ? 'white' : 'var(--color-text-primary)'
            }}
          />
        </Tooltip>
      </Space>

      <Divider type="vertical" style={{ height: '24px', borderColor: 'var(--color-border)' }} />

      <Space size="small">
        <Space.Compact>
          <Tooltip title="Undo (Ctrl+Z)">
            <Button
              icon={<Undo size={16} />}
              onClick={handleUndo}
              disabled={!editorState.canUndo}
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)'
              }}
            />
          </Tooltip>
          <Tooltip title="Redo (Ctrl+Y)">
            <Button
              icon={<Redo size={16} />}
              onClick={handleRedo}
              disabled={!editorState.canRedo}
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)'
              }}
            />
          </Tooltip>
        </Space.Compact>
      </Space>

      <Divider type="vertical" style={{ height: '24px', borderColor: 'var(--color-border)' }} />

      <Space size="small">
        <SaveStatusIndicator
          className="compact"
          showManualSave={true}
          showAutoSaveToggle={false}
          onSaveSuccess={() => {
            console.log('Map saved successfully');
          }}
          onSaveError={(error) => {
            console.error('Save error:', error);
          }}
        />
        <Tooltip title="Preview Mode">
          <Button
            type={previewMode ? 'primary' : 'default'}
            icon={<Eye size={16} />}
            onClick={() => setPreviewMode(!previewMode)}
            style={{
              backgroundColor: previewMode ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
              borderColor: 'var(--color-border)',
              color: previewMode ? 'white' : 'var(--color-text-primary)'
            }}
          />
        </Tooltip>
      </Space>
    </div>
  );

  // Status Bar Component
  const renderStatusBar = () => (
    <div className="editor-status-bar">
      <div className="status-section">
        <span>Tool: {editorState.tool}</span>
      </div>
      <div className="status-section">
        <span>Position: ({editorState.mousePosition.x}, {editorState.mousePosition.y})</span>
      </div>
      <div className="status-section">
        <span>Zoom: {editorState.zoom}%</span>
      </div>
      <div className="status-section">
        <span>Areas: {areas.length}</span>
      </div>
      <div className="status-section">
        <span>Collision: {impassableAreas.length}</span>
      </div>
      <div className="status-section save-status-section">
        <SaveStatusIndicator
          className="compact"
          showManualSave={false}
          showAutoSaveToggle={true}
        />
      </div>
    </div>
  );

  const renderAreasTab = () => (
    <div className="editor-tab-content">
      <div className="tab-header">
        <Typography.Title level={4} style={{ margin: 0, color: 'var(--color-text-primary)' }}>
          Interactive Areas Management
        </Typography.Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreateNewArea}
        >
          Add New Area
        </Button>
      </div>
      
      <div className="areas-list">
        {areas.map(area => (
          <div key={area.id} className="area-item">
            <div className="area-info">
              <div className="area-details">
                <h4>{area.name}</h4>
                <p>Position: ({area.x}, {area.y}) | Size: {area.width}×{area.height}</p>
                <p className="area-description">{area.description}</p>
                {area.maxParticipants && (
                  <p className="area-participants">Max participants: {area.maxParticipants}</p>
                )}
              </div>
            </div>
            <div className="area-actions">
              <Space>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => handleEditArea(area)}
                  size="small"
                >
                  Edit
                </Button>
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => handleDeleteArea(area)}
                  size="small"
                >
                  Delete
                </Button>
              </Space>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTerrainTab = () => (
    <div className="editor-tab-content">
      <div className="tab-header">
        <h3>Terrain Editing Tools</h3>
      </div>
      <div className="placeholder-content">
        <p>🏞️ Terrain editing tools will be implemented here:</p>
        <ul>
          <li>Background texture selection</li>
          <li>Ground pattern editing</li>
          <li>Elevation and depth effects</li>
          <li>Environmental elements placement</li>
        </ul>
      </div>
    </div>
  );

  const renderAssetsTab = () => (
    <div className="editor-tab-content">
      <div className="tab-header">
        <h3>Asset Placement Controls</h3>
      </div>
      <div className="placeholder-content">
        <p>🎨 Asset management features coming soon:</p>
        <ul>
          <li>Furniture and decoration placement</li>
          <li>Custom sprite uploads</li>
          <li>Asset library management</li>
          <li>Collision boundary setup</li>
        </ul>
      </div>
    </div>
  );

  const renderCollisionTab = () => (
    <div className="editor-tab-content">
      <div className="tab-header">
        <Typography.Title level={4} style={{ margin: 0, color: 'var(--color-text-primary)' }}>
          Collision Areas Management
        </Typography.Title>
        <Button type="primary" icon={<PlusOutlined />}>
          Add Collision Area
        </Button>
      </div>

      <div className="areas-list">
        {impassableAreas.map(area => (
          <div key={area.id} className="area-item collision-area">
            <div className="area-info">
              <span className="area-icon collision-icon">
                <Shield size={20} />
              </span>
              <div className="area-details">
                <h4>{area.name || `Collision Area ${area.id}`}</h4>
                <p>Position: ({area.x}, {area.y}) | Size: {area.width}×{area.height}</p>
                <p className="area-description">Impassable collision area</p>
              </div>
            </div>
            <div className="area-actions">
              <Space>
                <Button icon={<EditOutlined />} size="small">
                  Edit
                </Button>
                <Button danger icon={<DeleteOutlined />} size="small">
                  Delete
                </Button>
              </Space>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="editor-tab-content">
      <div className="tab-header">
        <h3>Settings & Data Management</h3>
      </div>

      <div className="settings-grid">
        {/* Map Data Management */}
        <div className="setting-group">
          <MapDataManager
            onMapLoaded={() => {
              console.log('Map loaded successfully');
            }}
            onMapSaved={() => {
              console.log('Map saved successfully');
            }}
            onError={(error) => {
              console.error('Map operation error:', error);
            }}
          />
        </div>

        {/* Grid Settings */}
        <div className="setting-group">
          <h4>Grid Settings</h4>
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={gridConfig.visible}
                onChange={(e) => setGridConfig(prev => ({ ...prev, visible: e.target.checked }))}
              />
              Show Grid
            </label>
          </div>
          <div className="setting-item">
            <label>
              Grid Spacing
              <input
                type="range"
                min="10"
                max="100"
                value={gridConfig.spacing}
                onChange={(e) => setGridConfig(prev => ({ ...prev, spacing: parseInt(e.target.value) }))}
              />
              <span>{gridConfig.spacing}px</span>
            </label>
          </div>
          <div className="setting-item">
            <label>
              Grid Opacity
              <input
                type="range"
                min="10"
                max="100"
                value={gridConfig.opacity}
                onChange={(e) => setGridConfig(prev => ({ ...prev, opacity: parseInt(e.target.value) }))}
              />
              <span>{gridConfig.opacity}%</span>
            </label>
          </div>
          <div className="setting-item">
            <label>
              Grid Color
              <input
                type="color"
                value={gridConfig.color}
                onChange={(e) => setGridConfig(prev => ({ ...prev, color: e.target.value }))}
              />
            </label>
          </div>
        </div>

        {/* Editor Settings */}
        <div className="setting-group">
          <h4>Editor Settings</h4>
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={previewMode}
                onChange={(e) => setPreviewMode(e.target.checked)}
              />
              Preview Mode
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`map-editor-module ${className}`}>
      <header className="editor-header">
        <div className="editor-title">
          <Map size={24} className="editor-icon" />
          <h1>Map Editor</h1>
          <span className="editor-subtitle">Stargety Oasis World Designer</span>
          {/* Toolbar Section */}
        </div>
        {renderToolbar()}
      </header>

      <div className="editor-layout">
        <main
          className="editor-main"
          onMouseMove={handleMouseMove}
          style={{ position: 'relative' }}
        >
          {/* Enhanced Fabric.js Canvas */}
          <FabricMapCanvas
            width={mapData.worldDimensions.width}
            height={mapData.worldDimensions.height}
            gridVisible={gridConfig.visible}
            gridSpacing={gridConfig.spacing}
            gridColor={gridConfig.color}
            gridOpacity={gridConfig.opacity}
            drawingMode={drawingMode}
            drawingAreaData={pendingAreaData || undefined}
            onSelectionChanged={(objects) => {
              console.log('Selection changed:', objects);
            }}
            onObjectModified={(object) => {
              console.log('Object modified:', object);
            }}
            onAreaDrawn={handleAreaDrawn}
            className="map-editor-canvas"
          />
        </main>

        {/* Integrated Sidebar with Toolbar and Content */}
        <aside className="editor-sidebar">
          {/* Navigation Tabs - Panel Tab Style */}
          <div className="editor-panel-tabs">
            {tabs.map(tab => (
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

          {/* Tab Content Area */}
          <div className="sidebar-content">
            <div className="tab-content-container">
              {activeTab === 'areas' && renderAreasTab()}
              {activeTab === 'terrain' && renderTerrainTab()}
              {activeTab === 'assets' && renderAssetsTab()}
              {activeTab === 'collision' && renderCollisionTab()}
              {activeTab === 'settings' && renderSettingsTab()}
            </div>
          </div>
        </aside>
      </div>

      {/* Enhanced Status Bar */}
      {renderStatusBar()}

      {previewMode && (
        <div className="preview-overlay">
          <div className="preview-notice">
            <Eye size={20} />
            <span>Preview Mode Active - Use toolbar to exit preview</span>
          </div>
        </div>
      )}

      {drawingMode && (
        <div className="drawing-overlay">
          <div className="drawing-notice">
            <Square size={20} />
            <span>Drawing Mode: Click and drag to create area</span>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setDrawingMode(false);
                setPendingAreaData(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Area Form Modal */}
      <AreaFormModal
        isOpen={showAreaModal}
        onClose={handleCloseModals}
        onSave={handleSaveArea}
        editingArea={editingArea}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        onClose={handleCloseModals}
        onConfirm={handleConfirmDelete}
        title="Delete Interactive Area"
        message={`Are you sure you want to delete "${areaToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </div>
  );
};
