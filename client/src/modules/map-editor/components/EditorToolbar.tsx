import React from 'react';
import { Button, Space, Typography, Divider, Tooltip, Flex, Segmented } from 'antd';
import {
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
  Trash2,
  Eye,
  Hand,
  RotateCcw,
  Info
} from 'lucide-react';
import { EditorState, GridConfig } from '../types/editor.types';
import { SaveStatusIndicator } from '../../../components/SaveStatusIndicator';

const { Text } = Typography;

interface EditorToolbarProps {
  editorState: EditorState;
  gridConfig: GridConfig;
  previewMode: boolean;
  zoom?: number;
  onToolChange: (tool: EditorState['tool']) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitToScreen: () => void;
  onResetZoom: () => void;
  onToggleGrid: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onTogglePreview: () => void;
  onToggleBackgroundInfo?: () => void;
  backgroundInfoVisible?: boolean;
}

export const EditorToolbar: React.FC<EditorToolbarProps & {
  brushShape?: 'circle' | 'square';
  onBrushShapeChange?: (shape: 'circle' | 'square') => void;
}> = ({
  editorState,
  gridConfig,
  previewMode,
  zoom,
  onToolChange,
  onZoomIn,
  onZoomOut,
  onFitToScreen,
  onResetZoom,
  onToggleGrid,
  onUndo,
  onRedo,
  onTogglePreview,
  onToggleBackgroundInfo,
  backgroundInfoVisible = false,
  brushShape = 'circle',
  onBrushShapeChange,
}) => {
  const toolOptions = [
    {
      label: <Tooltip title="Select Tool (S)"><MousePointer size={16} /></Tooltip>,
      value: 'select'
    },
    {
      label: <Tooltip title="Pan Tool (P)"><Hand size={16} /></Tooltip>,
      value: 'pan'
    }
  ];

  const collisionToolOptions = [
    {
      label: <Tooltip title="Draw Impassable Area"><Shield size={16} /></Tooltip>,
      value: 'draw-collision'
    },
    {
      label: <Tooltip title="Erase Impassable Area"><Eraser size={16} /></Tooltip>,
      value: 'erase-collision'
    }
  ];

  return (
    <Flex
      justify="space-between"
      align="center"
      style={{
        padding: '8px 16px',
        backgroundColor: 'var(--color-bg-secondary)',
        borderBottom: '1px solid var(--color-border-light)',
        gap: '16px'
      }}
    >
      <Flex align="center" gap="middle">
        <Space size="small">
          <Text type="secondary" style={{ fontSize: '12px' }}>Tools:</Text>
          <Segmented
            options={toolOptions}
            value={editorState.tool}
            onChange={(value) => {
              console.log('🔧 TOOL: User clicked tool in toolbar', {
                timestamp: new Date().toISOString(),
                clickedTool: value,
                currentTool: editorState.tool,
                source: 'EditorToolbar.mainTools'
              });
              onToolChange(value as EditorState['tool']);
            }}
            size="small"
          />
        </Space>

        <Divider type="vertical" style={{ height: '24px' }} />

        <Space size="small">
          <Text type="secondary" style={{ fontSize: '12px' }}>Collision:</Text>
          <Segmented
            options={collisionToolOptions}
            value={['draw-collision', 'erase-collision'].includes(editorState.tool) ? editorState.tool : undefined}
            onChange={(value) => {
              console.log('🔧 TOOL: User clicked collision tool in toolbar', {
                timestamp: new Date().toISOString(),
                clickedTool: value,
                currentTool: editorState.tool,
                isCollisionTool: ['draw-collision', 'erase-collision'].includes(value as string),
                source: 'EditorToolbar.collisionTools'
              });
              onToolChange(value as EditorState['tool']);
            }}
            size="small"
          />
        </Space>
      </Flex>

      <Flex align="center" gap="middle">
        <Space size="small">
          <Text type="secondary" style={{ fontSize: '12px' }}>Zoom:</Text>
          <Space.Compact>
            <Tooltip title="Zoom Out (-)">
              <Button icon={<ZoomOut size={16} />} onClick={onZoomOut} />
            </Tooltip>
            <Tooltip title="Zoom In (+)">
              <Button icon={<ZoomIn size={16} />} onClick={onZoomIn} />
            </Tooltip>
            <Tooltip title="Reset Zoom (100%)">
              <Button icon={<RotateCcw size={16} />} onClick={onResetZoom} />
            </Tooltip>
            <Tooltip title="Fit to Screen (0)">
              <Button icon={<Maximize size={16} />} onClick={onFitToScreen} />
            </Tooltip>
          </Space.Compact>
          <Text strong style={{ minWidth: '50px', textAlign: 'center' }}>
            {typeof zoom === 'number' ? zoom : editorState.zoom}%
          </Text>
        </Space>

        <Divider type="vertical" style={{ height: '24px' }} />

        <Tooltip title="Toggle Grid (G)">
          <Button
            type={gridConfig.visible ? 'primary' : 'default'}
            icon={<Grid3X3 size={16} />}
            onClick={onToggleGrid}
          />
        </Tooltip>

        <Divider type="vertical" style={{ height: '24px' }} />

        <Space.Compact>
          <Tooltip title="Undo (Ctrl+Z)">
            <Button
              icon={<Undo size={16} />}
              onClick={onUndo}
              disabled={!editorState.canUndo}
            />
          </Tooltip>
          <Tooltip title="Redo (Ctrl+Y)">
            <Button
              icon={<Redo size={16} />}
              onClick={onRedo}
              disabled={!editorState.canRedo}
            />
          </Tooltip>
        </Space.Compact>

        <Divider type="vertical" style={{ height: '24px' }} />

        <Space size="small">
          <SaveStatusIndicator
            className="compact"
            showManualSave={true}
            showAutoSaveToggle={true}
            onSaveError={(error) => {
              console.error('Save error:', error);
            }}
          />
          <Tooltip title="Preview Mode">
            <Button
              type={previewMode ? 'primary' : 'default'}
              icon={<Eye size={16} />}
              onClick={onTogglePreview}
            />
          </Tooltip>
          {onToggleBackgroundInfo && (
            <Tooltip title="Background Info Panel">
              <Button
                type={backgroundInfoVisible ? 'primary' : 'default'}
                icon={<Info size={16} />}
                onClick={onToggleBackgroundInfo}
              />
            </Tooltip>
          )}
        </Space>
      </Flex>
    </Flex>
  );
};
