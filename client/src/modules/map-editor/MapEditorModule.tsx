import React, { useState, useEffect, useCallback, useRef } from 'react';
import * as fabric from 'fabric';
import { useMapData } from '../../shared/MapDataContext';
import {
  Map,
  Plus,
  Edit3,
  Trash2,
  Save,
  Upload,
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
  Eraser
} from 'lucide-react';
import './MapEditorModule.css';

interface MapEditorModuleProps {
  className?: string;
}

// Interfaces are now imported from shared context

interface GridConfig {
  spacing: 10 | 20 | 50 | 100;
  opacity: 10 | 25 | 50;
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
  const { mapData, updateInteractiveAreas, updateImpassableAreas } = useMapData();
  const [activeTab, setActiveTab] = useState<'areas' | 'terrain' | 'assets' | 'settings' | 'collision'>('areas');
  const [previewMode, setPreviewMode] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);

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
    <div className="editor-toolbar">
      <div className="toolbar-section">
        <span className="toolbar-label">Tools:</span>
        <button
          className={`toolbar-btn ${editorState.tool === 'select' ? 'active' : ''}`}
          onClick={() => handleToolChange('select')}
          title="Select Tool (S)"
        >
          <MousePointer size={16} />
        </button>
        <button
          className={`toolbar-btn ${editorState.tool === 'move' ? 'active' : ''}`}
          onClick={() => handleToolChange('move')}
          title="Move Tool (M)"
        >
          <Move size={16} />
        </button>
        <button
          className={`toolbar-btn ${editorState.tool === 'resize' ? 'active' : ''}`}
          onClick={() => handleToolChange('resize')}
          title="Resize Tool (R)"
        >
          <Square size={16} />
        </button>
        <button
          className={`toolbar-btn ${editorState.tool === 'delete' ? 'active' : ''}`}
          onClick={() => handleToolChange('delete')}
          title="Delete Tool (D)"
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <span className="toolbar-label">Collision:</span>
        <button
          className={`toolbar-btn ${editorState.tool === 'draw-collision' ? 'active' : ''}`}
          onClick={() => handleToolChange('draw-collision')}
          title="Draw Impassable Area"
        >
          <Shield size={16} />
        </button>
        <button
          className={`toolbar-btn ${editorState.tool === 'erase-collision' ? 'active' : ''}`}
          onClick={() => handleToolChange('erase-collision')}
          title="Erase Impassable Area"
        >
          <Eraser size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <span className="toolbar-label">Zoom:</span>
        <button className="toolbar-btn" onClick={handleZoomIn} title="Zoom In (+)">
          <ZoomIn size={16} />
        </button>
        <button className="toolbar-btn" onClick={handleZoomOut} title="Zoom Out (-)">
          <ZoomOut size={16} />
        </button>
        <button className="toolbar-btn" onClick={handleFitToScreen} title="Fit to Screen (0)">
          <Maximize size={16} />
        </button>
        <span className="zoom-display">{editorState.zoom}%</span>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <button
          className={`toolbar-btn ${gridConfig.visible ? 'active' : ''}`}
          onClick={toggleGrid}
          title="Toggle Grid (G)"
        >
          <Grid3X3 size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <button
          className={`toolbar-btn ${!editorState.canUndo ? 'disabled' : ''}`}
          onClick={handleUndo}
          disabled={!editorState.canUndo}
          title="Undo (Ctrl+Z)"
        >
          <Undo size={16} />
        </button>
        <button
          className={`toolbar-btn ${!editorState.canRedo ? 'disabled' : ''}`}
          onClick={handleRedo}
          disabled={!editorState.canRedo}
          title="Redo (Ctrl+Y)"
        >
          <Redo size={16} />
        </button>
      </div>

      <div className="toolbar-divider" />

      <div className="toolbar-section">
        <button className="toolbar-btn" title="Load Map">
          <Upload size={16} />
        </button>
        <button className="toolbar-btn" title="Save Map">
          <Save size={16} />
        </button>
        <button
          className={`toolbar-btn ${previewMode ? 'active' : ''}`}
          onClick={() => setPreviewMode(!previewMode)}
          title="Preview Mode"
        >
          <Eye size={16} />
        </button>
      </div>
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
      <div className="status-section">
        <span className={`save-status ${editorState.saveStatus}`}>
          {editorState.saveStatus === 'saved' && '● Saved'}
          {editorState.saveStatus === 'unsaved' && '● Unsaved changes'}
          {editorState.saveStatus === 'saving' && '● Saving...'}
        </span>
      </div>
    </div>
  );

  const renderAreasTab = () => (
    <div className="editor-tab-content">
      <div className="tab-header">
        <h3>Interactive Areas Management</h3>
        <button className="btn btn-primary">
          <Plus size={16} /> Add New Area
        </button>
      </div>
      
      <div className="areas-list">
        {areas.map(area => (
          <div key={area.id} className="area-item">
            <div className="area-info">
              <span className="area-icon">{area.icon}</span>
              <div className="area-details">
                <h4>{area.name}</h4>
                <p>Position: ({area.x}, {area.y}) | Size: {area.width}×{area.height}</p>
                <p className="area-description">{area.description}</p>
              </div>
            </div>
            <div className="area-actions">
              <button className="btn btn-secondary">
                <Edit3 size={14} /> Edit
              </button>
              <button className="btn btn-danger">
                <Trash2 size={14} /> Delete
              </button>
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
        <h3>Collision Areas Management</h3>
        <button className="btn btn-primary">
          <Plus size={16} /> Add Collision Area
        </button>
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
              <button className="btn btn-secondary">
                <Edit3 size={14} /> Edit
              </button>
              <button className="btn btn-danger">
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSettingsTab = () => (
    <div className="editor-tab-content">
      <div className="tab-header">
        <h3>Map Configuration</h3>
      </div>
      <div className="placeholder-content">
        <p>⚙️ Map settings and configuration:</p>
        <ul>
          <li>World dimensions and boundaries</li>
          <li>Player spawn points</li>
          <li>Physics and collision settings</li>
          <li>Performance optimization options</li>
        </ul>
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
          {/* Fabric.js Canvas */}
          <div className="canvas-container">
            <canvas
              ref={canvasRef}
              className="fabric-canvas"
            />
          </div>
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
    </div>
  );
};
