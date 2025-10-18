import React, { useState } from 'react';
import { Button, Tooltip } from 'antd';
import { ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { LayersTab } from './tabs/LayersTab';
import * as fabric from 'fabric';
import { EditorTool } from '../types/editor.types';
import './LayersPanel.css';

interface LayersPanelProps {
  fabricCanvas?: fabric.Canvas | null;
  onObjectSelect?: (object: fabric.Object) => void;
  onToolChange?: (tool: EditorTool) => void;
  onZoomToObject?: (object: fabric.Object) => void;
  onEditInteractiveArea?: (areaId: string) => void;
  onEditCollisionArea?: (areaId: string) => void;
}

export const LayersPanel: React.FC<LayersPanelProps> = ({
  fabricCanvas,
  onObjectSelect,
  onToolChange,
  onZoomToObject,
  onEditInteractiveArea,
  onEditCollisionArea
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={`layers-panel ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="layers-panel-header">
        <div className="layers-panel-title">
          <Layers size={16} />
          {!isCollapsed && <span>Layers</span>}
        </div>
        <Tooltip title={isCollapsed ? 'Expand Layers Panel' : 'Collapse Layers Panel'}>
          <Button
            type="text"
            size="small"
            icon={isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            onClick={toggleCollapse}
            className="collapse-button"
          />
        </Tooltip>
      </div>

      {!isCollapsed && (
        <div className="layers-panel-content">
          <LayersTab
            fabricCanvas={fabricCanvas}
            onObjectSelect={onObjectSelect}
            onToolChange={onToolChange}
            onZoomToObject={onZoomToObject}
            onEditInteractiveArea={onEditInteractiveArea}
            onEditCollisionArea={onEditCollisionArea}
          />
        </div>
      )}
    </div>
  );
};

