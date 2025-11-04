/**
 * Konva Layers Panel Component
 * 
 * Displays a hierarchical list of all shapes/objects in the Konva editor.
 * Supports visibility toggle, selection, and auto zoom-to-fit functionality.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Layout, Button, Tooltip, Flex, Typography, Divider, theme, Tree, Space, Badge } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  EditOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import {
  Layers,
  Square,
  Shield,
  TreePine
} from 'lucide-react';
import type { Shape, Viewport } from '../types';

const { Sider } = Layout;
const { Text } = Typography;

interface LayerObject {
  id: string;
  name: string;
  type: 'background' | 'grid' | 'interactive' | 'collision' | 'terrain';
  visible: boolean;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  shape: Shape;
}

interface LayerGroup {
  key: string;
  title: string;
  icon: React.ReactNode;
  objects: LayerObject[];
  visible: boolean;
}

interface KonvaLayersPanelProps {
  shapes: Shape[];
  selectedIds: string[];
  viewport: Viewport;
  viewportWidth: number;
  viewportHeight: number;
  onShapeSelect?: (shapeId: string) => void;
  onShapeVisibilityToggle?: (shapeId: string) => void;
  onShapeDelete?: (shapeId: string) => void;
  onZoomToShape?: (shape: Shape) => void;
  onEditInteractiveArea?: (areaId: string) => void;
  onEditCollisionArea?: (areaId: string) => void;
}

export const KonvaLayersPanel: React.FC<KonvaLayersPanelProps> = ({
  shapes,
  selectedIds,
  viewport,
  viewportWidth,
  viewportHeight,
  onShapeSelect,
  onShapeVisibilityToggle,
  onShapeDelete,
  onZoomToShape,
  onEditInteractiveArea,
  onEditCollisionArea
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<string[]>(['background', 'interactive', 'collision']);
  const { token } = theme.useToken();

  // Categorize shapes into layer groups
  const layerGroups = useMemo((): LayerGroup[] => {
    const interactiveObjects: LayerObject[] = [];
    const collisionObjects: LayerObject[] = [];
    const terrainObjects: LayerObject[] = [];

    shapes.forEach((shape, index) => {
      let layerObj: LayerObject;

      if (shape.category === 'interactive') {
        layerObj = {
          id: shape.id,
          name: shape.name || `Interactive Area ${interactiveObjects.length + 1}`,
          type: 'interactive',
          visible: shape.visible !== false,
          shape
        };
        interactiveObjects.push(layerObj);
      } else if (shape.category === 'collision') {
        layerObj = {
          id: shape.id,
          name: shape.name || `Collision Area ${collisionObjects.length + 1}`,
          type: 'collision',
          visible: shape.visible !== false,
          shape
        };
        collisionObjects.push(layerObj);
      } else {
        // Default to terrain for other objects
        layerObj = {
          id: shape.id,
          name: `Object ${terrainObjects.length + 1}`,
          type: 'terrain',
          visible: shape.visible !== false,
          shape
        };
        terrainObjects.push(layerObj);
      }
    });

    return [
      {
        key: 'interactive',
        title: 'Interactive Areas',
        icon: <Square size={14} />,
        objects: interactiveObjects,
        visible: true
      },
      {
        key: 'collision',
        title: 'Collision Areas',
        icon: <Shield size={14} />,
        objects: collisionObjects,
        visible: true
      },
      {
        key: 'terrain',
        title: 'Terrain',
        icon: <TreePine size={14} />,
        objects: terrainObjects,
        visible: true
      }
    ];
  }, [shapes]);

  // Handle layer selection
  const handleLayerSelect = useCallback((layerObject: LayerObject) => {
    onShapeSelect?.(layerObject.id);
    onZoomToShape?.(layerObject.shape);
  }, [onShapeSelect, onZoomToShape]);

  // Handle visibility toggle
  const handleVisibilityToggle = useCallback((layerObject: LayerObject, e: React.MouseEvent) => {
    e.stopPropagation();
    onShapeVisibilityToggle?.(layerObject.id);
  }, [onShapeVisibilityToggle]);

  // Handle edit
  const handleEdit = useCallback((layerObject: LayerObject, e: React.MouseEvent) => {
    e.stopPropagation();
    if (layerObject.type === 'interactive') {
      onEditInteractiveArea?.(layerObject.id);
    } else if (layerObject.type === 'collision') {
      onEditCollisionArea?.(layerObject.id);
    }
  }, [onEditInteractiveArea, onEditCollisionArea]);

  // Handle delete
  const handleDelete = useCallback((layerObject: LayerObject, e: React.MouseEvent) => {
    e.stopPropagation();
    onShapeDelete?.(layerObject.id);
  }, [onShapeDelete]);

  // Build tree data for Ant Design Tree component
  const treeData = useMemo(() => {
    return layerGroups.map(group => ({
      key: group.key,
      title: (
        <Space size="small">
          {group.icon}
          <Text strong>{group.title}</Text>
          <Badge count={group.objects.length} showZero style={{ backgroundColor: token.colorPrimary }} />
        </Space>
      ),
      selectable: false,
      children: group.objects.map(obj => ({
        key: obj.id,
        title: (
          <Flex justify="space-between" align="center" style={{ width: '100%' }}>
            <Text
              ellipsis
              style={{
                flex: 1,
                fontWeight: selectedIds.includes(obj.id) ? 600 : 400,
                color: selectedIds.includes(obj.id) ? token.colorPrimary : token.colorText
              }}
            >
              {obj.name}
            </Text>
            <Space size="small">
              <Tooltip title={obj.visible ? 'Hide' : 'Show'}>
                <Button
                  type="text"
                  size="small"
                  icon={obj.visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                  onClick={(e) => handleVisibilityToggle(obj, e)}
                />
              </Tooltip>
              <Tooltip title="Edit">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={(e) => handleEdit(obj, e)}
                />
              </Tooltip>
              <Tooltip title="Delete">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={(e) => handleDelete(obj, e)}
                />
              </Tooltip>
            </Space>
          </Flex>
        ),
        selectable: true,
        isLeaf: true,
        data: obj
      }))
    }));
  }, [layerGroups, selectedIds, token, handleVisibilityToggle, handleEdit, handleDelete]);

  // Handle tree node select
  const handleTreeSelect = useCallback((selectedKeys: React.Key[], info: any) => {
    if (selectedKeys.length > 0 && info.node.data) {
      handleLayerSelect(info.node.data);
    }
  }, [handleLayerSelect]);

  return (
    <Sider
      collapsible
      collapsed={isCollapsed}
      onCollapse={setIsCollapsed}
      trigger={null}
      width={300}
      collapsedWidth={48}
      style={{
        overflow: 'hidden',
        transition: 'all 0.3s ease',
        borderRight: `1px solid ${token.colorBorder}`
      }}
    >
      {/* Header with collapse button */}
      <Flex
        justify="space-between"
        align="center"
        style={{
          padding: token.paddingSM,
          minHeight: 48,
          borderBottom: `1px solid ${token.colorBorderSecondary}`
        }}
      >
        <Flex gap="small" align="center">
          {!isCollapsed && (
            <>
              <Layers size={16} style={{ color: token.colorPrimary }} />
              <Text strong style={{ fontSize: token.fontSizeSM }}>
                Layers
              </Text>
            </>
          )}
        </Flex>
        <Tooltip title={isCollapsed ? 'Expand Layers Panel' : 'Collapse Layers Panel'}>
          <Button
            type="text"
            size="small"
            icon={isCollapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setIsCollapsed(!isCollapsed)}
          />
        </Tooltip>
      </Flex>

      <Divider style={{ margin: 0 }} />

      {/* Content */}
      {!isCollapsed && (
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: token.paddingXS
          }}
        >
          <Tree
            treeData={treeData}
            expandedKeys={expandedKeys}
            onExpand={(keys) => setExpandedKeys(keys as string[])}
            selectedKeys={selectedIds}
            onSelect={handleTreeSelect}
            showLine={false}
            showIcon={false}
            style={{ background: 'transparent' }}
          />
        </div>
      )}
    </Sider>
  );
};

