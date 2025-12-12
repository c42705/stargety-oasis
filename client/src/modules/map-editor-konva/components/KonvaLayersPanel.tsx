/**
 * Konva Layers Panel Component
 * 
 * Displays a hierarchical list of all shapes/objects in the Konva editor.
 * Supports visibility toggle, selection, and auto zoom-to-fit functionality.
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Button, Tooltip, Flex, Typography, Divider, theme, Tree, Space, Badge } from 'antd';
import {
  EyeOutlined,
  EyeInvisibleOutlined,
  EditOutlined,
  DeleteOutlined,
  GroupOutlined,
  UngroupOutlined,
} from '@ant-design/icons';
import {
  Layers,
  Square,
  Shield,
  TreePine,
  Image as ImageIcon,
  Pentagon
} from 'lucide-react';
import type { Shape, Viewport } from '../types';
import type { ImpassableArea, InteractiveAreaActionType } from '../../../shared/MapDataContext';
import { getColorForActionType } from '../../../shared/MapDataContext';

const { Text } = Typography;

interface LayerObject {
  id: string;
  name: string;
  type: 'background' | 'grid' | 'interactive' | 'collision' | 'terrain' | 'asset';
  visible: boolean;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  shape: Shape;
  thumbnail?: string; // For image assets
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
  impassableAreas: ImpassableArea[];
  onShapeSelect?: (shapeId: string) => void;
  onShapeVisibilityToggle?: (shapeId: string) => void;
  onShapeDelete?: (shapeId: string) => void;
  onZoomToShape?: (shape: Shape) => void;
  onEditInteractiveArea?: (areaId: string) => void;
  onEditCollisionArea?: (areaId: string) => void;
  onGroupShapes?: (shapeIds: string[]) => void;
  onUngroupShapes?: (shapeIds: string[]) => void;
  onMultiSelect?: (shapeIds: string[]) => void;
}

export const KonvaLayersPanel: React.FC<KonvaLayersPanelProps> = ({
  shapes,
  selectedIds,
  viewport,
  viewportWidth,
  viewportHeight,
  impassableAreas,
  onShapeSelect,
  onShapeVisibilityToggle,
  onShapeDelete,
  onZoomToShape,
  onEditInteractiveArea,
  onEditCollisionArea,
  onGroupShapes,
  onUngroupShapes,
  onMultiSelect
}) => {
  const [expandedKeys, setExpandedKeys] = useState<string[]>(['background', 'interactive', 'collision', 'asset']);
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const { token } = theme.useToken();

  // Categorize shapes into layer groups
  const layerGroups = useMemo((): LayerGroup[] => {
    const interactiveObjects: LayerObject[] = [];
    const collisionObjects: LayerObject[] = [];
    const terrainObjects: LayerObject[] = [];
    const assetObjects: LayerObject[] = [];

    shapes.forEach((shape) => {
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
        // Look up the collision area by shape ID to get the correct name
        const collisionArea = impassableAreas.find(area => area.id === shape.id);
        const collisionName = collisionArea?.name || shape.metadata?.name || `Collision Layer ${collisionObjects.length + 1}`;

        // For collision layers, visibility is based on opacity (> 0.3 means visible)
        const currentOpacity = shape.style.opacity ?? 0.7;
        const isVisible = currentOpacity > 0.3;

        layerObj = {
          id: shape.id,
          name: collisionName,
          type: 'collision',
          visible: isVisible,
          shape
        };
        collisionObjects.push(layerObj);
      } else if (shape.category === 'asset') {
        // Asset objects (images)
        const thumbnail = shape.geometry.type === 'image' ? shape.geometry.imageData : undefined;
        const defaultName = shape.geometry.type === 'image' && shape.geometry.fileName
          ? shape.geometry.fileName
          : `Asset ${assetObjects.length + 1}`;

        layerObj = {
          id: shape.id,
          name: shape.name || defaultName,
          type: 'asset',
          visible: shape.visible !== false,
          shape,
          thumbnail
        };
        assetObjects.push(layerObj);
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
        key: 'assets',
        title: 'Assets',
        icon: <ImageIcon size={14} />,
        objects: assetObjects,
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
  }, [shapes, impassableAreas]);

  // Check if shapes can be grouped (same type)
  const canGroupShapes = useCallback((ids: string[]): boolean => {
    if (ids.length < 2) return false;
    const types = ids.map(id => shapes.find(s => s.id === id)?.category).filter(Boolean);
    return types.length === ids.length && new Set(types).size === 1;
  }, [shapes]);

  // Check if all selected shapes are in the same group
  const areAllInSameGroup = useCallback((ids: string[]): boolean => {
    if (ids.length === 0) return false;
    const groupIds = ids.map(id => shapes.find(s => s.id === id)?.metadata.groupId).filter(Boolean);
    return groupIds.length === ids.length && new Set(groupIds).size === 1;
  }, [shapes]);

  // Get all items in the same category as a given item
  const getItemsInCategory = useCallback((itemId: string): LayerObject[] => {
    for (const group of layerGroups) {
      const item = group.objects.find(obj => obj.id === itemId);
      if (item) {
        return group.objects;
      }
    }
    return [];
  }, [layerGroups]);

  // Expand selection to include all group members
  const expandSelectionWithGroups = useCallback((ids: string[]): string[] => {
    const expanded = new Set<string>();

    ids.forEach(id => {
      const shape = shapes.find(s => s.id === id);
      if (shape?.metadata.groupId) {
        // Add all shapes in this group
        shapes
          .filter(s => s.metadata.groupId === shape.metadata.groupId)
          .forEach(s => expanded.add(s.id));
      } else {
        // Add the shape itself
        expanded.add(id);
      }
    });

    return Array.from(expanded);
  }, [shapes]);

  // Handle layer selection with multi-select and range selection support
  const handleLayerSelect = useCallback((layerObject: LayerObject, ctrlKey: boolean = false, shiftKey: boolean = false) => {
    if (shiftKey && lastSelectedId) {
      // Range selection - select all items between last selected and current
      const categoryItems = getItemsInCategory(layerObject.id);
      const lastIndex = categoryItems.findIndex(item => item.id === lastSelectedId);
      const currentIndex = categoryItems.findIndex(item => item.id === layerObject.id);

      if (lastIndex !== -1 && currentIndex !== -1) {
        const start = Math.min(lastIndex, currentIndex);
        const end = Math.max(lastIndex, currentIndex);
        const rangeIds = categoryItems.slice(start, end + 1).map(item => item.id);

        // If Ctrl is also pressed, add to existing selection; otherwise replace
        const baseSelection = ctrlKey
          ? Array.from(new Set([...selectedIds, ...rangeIds]))
          : rangeIds;

        // Expand to include all group members
        const newSelection = expandSelectionWithGroups(baseSelection);
        onMultiSelect?.(newSelection);
      }
    } else if (ctrlKey) {
      // Multi-select mode (toggle)
      const baseSelection = selectedIds.includes(layerObject.id)
        ? selectedIds.filter(id => id !== layerObject.id)
        : [...selectedIds, layerObject.id];

      // Expand to include all group members
      const newSelection = expandSelectionWithGroups(baseSelection);
      onMultiSelect?.(newSelection);
      setLastSelectedId(layerObject.id);
    } else {
      // Single select
      onShapeSelect?.(layerObject.id);
      setLastSelectedId(layerObject.id);
    }
    onZoomToShape?.(layerObject.shape);
  }, [selectedIds, onShapeSelect, onZoomToShape, onMultiSelect, lastSelectedId, getItemsInCategory, expandSelectionWithGroups]);

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

  // Handle group creation
  const handleCreateGroup = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (canGroupShapes(selectedIds)) {
      onGroupShapes?.(selectedIds);
    }
  }, [selectedIds, canGroupShapes, onGroupShapes]);

  // Handle ungroup
  const handleUngroup = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (areAllInSameGroup(selectedIds)) {
      onUngroupShapes?.(selectedIds);
    }
  }, [selectedIds, areAllInSameGroup, onUngroupShapes]);

  // Handle group expand/collapse - using functional update to avoid dependency on expandedKeys
  const handleGroupToggle = useCallback((groupKey: string) => {
    setExpandedKeys(prev =>
      prev.includes(groupKey)
        ? prev.filter(k => k !== groupKey)
        : [...prev, groupKey]
    );
  }, []);

  // Build tree data with minimal data - render via titleRender to avoid reference issues
  const treeData = useMemo(() => {
    return layerGroups.map(group => ({
      key: group.key,
      title: group.title,
      selectable: false,
      isGroup: true,
      groupIcon: group.icon,
      objectCount: group.objects.length,
      children: group.objects.map(obj => ({
        key: obj.id,
        title: obj.name,
        selectable: true,
        isLeaf: true,
        data: obj,
        isGroup: false,
      }))
    }));
  }, [layerGroups]);

  // Render tree node titles - this is called by Tree component
  const renderTreeTitle = useCallback((node: any) => {
    // Group node
    if (node.isGroup) {
      return (
        <div
          onClick={() => handleGroupToggle(node.key)}
          style={{ cursor: 'pointer', flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Space size="small" style={{ flex: 1 }}>
            {node.groupIcon}
            <Text strong>{node.title}</Text>
            <Badge count={node.objectCount} showZero style={{ backgroundColor: token.colorPrimary }} />
          </Space>
        </div>
      );
    }

    // Leaf node (layer object)
    const obj = node.data as LayerObject;
    if (!obj) return node.title;

    const isGrouped = !!obj.shape.metadata.groupId;
    const isSelected = selectedIds.includes(obj.id);

    return (
      <Flex
        justify="space-between"
        align="center"
        style={{ width: '100%' }}
        onMouseDown={(e) => {
          if (e.shiftKey) {
            e.preventDefault();
            handleLayerSelect(obj, e.ctrlKey || e.metaKey, true);
          }
        }}
      >
        <Flex align="center" gap={8} style={{ flex: 1, minWidth: 0 }}>
          {obj.thumbnail && (
            <img
              src={obj.thumbnail}
              alt={obj.name}
              style={{
                width: 24,
                height: 24,
                objectFit: 'cover',
                borderRadius: 4,
                border: `1px solid ${token.colorBorder}`
              }}
            />
          )}
          {obj.type === 'collision' && (
            obj.shape.geometry.type === 'rectangle'
              ? <Square size={14} style={{ color: token.colorError }} />
              : <Pentagon size={14} style={{ color: token.colorError }} />
          )}
          {obj.type === 'interactive' && (
            <div
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: getColorForActionType(
                  (obj.shape.metadata?.actionType as InteractiveAreaActionType) || 'none'
                ),
                border: `1px solid ${token.colorBorder}`,
                flexShrink: 0,
              }}
              title={`Action: ${obj.shape.metadata?.actionType || 'none'}`}
            />
          )}
          {isGrouped && (
            <Tooltip title="Part of a group">
              <GroupOutlined style={{ color: token.colorWarning, fontSize: 12 }} />
            </Tooltip>
          )}
          <Text
            ellipsis
            style={{
              flex: 1,
              fontWeight: isSelected ? 600 : 400,
              color: isSelected ? token.colorPrimary : token.colorText
            }}
          >
            {obj.name}
          </Text>
        </Flex>
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
    );
  }, [selectedIds, token, handleGroupToggle, handleVisibilityToggle, handleEdit, handleDelete, handleLayerSelect]);

  // Handle tree node select with multi-select and range selection support
  const handleTreeSelect = useCallback((selectedKeys: React.Key[], info: any) => {
    if (selectedKeys.length > 0 && info.node.data) {
      const ctrlKey = info.event?.ctrlKey || info.event?.metaKey || false;
      const shiftKey = info.event?.shiftKey || false;
      handleLayerSelect(info.node.data, ctrlKey, shiftKey);
    }
  }, [handleLayerSelect]);

  return (
    <div
      className="editor-left-sidebar"
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        background: token.colorBgContainer,
      }}
    >
      {/* Header with group actions */}
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
          <Layers size={16} style={{ color: token.colorPrimary }} />
          <Text strong style={{ fontSize: token.fontSizeSM }}>
            Layers
          </Text>
        </Flex>
        <Flex gap="small" align="center">
          {selectedIds.length > 0 && (
            <>
              <Tooltip title={canGroupShapes(selectedIds) ? 'Group selected' : 'Select 2+ items of same type'}>
                <Button
                  type="text"
                  size="small"
                  icon={<GroupOutlined />}
                  disabled={!canGroupShapes(selectedIds)}
                  onClick={handleCreateGroup}
                />
              </Tooltip>
              <Tooltip title={areAllInSameGroup(selectedIds) ? 'Ungroup' : 'Select grouped items'}>
                <Button
                  type="text"
                  size="small"
                  icon={<UngroupOutlined />}
                  disabled={!areAllInSameGroup(selectedIds)}
                  onClick={handleUngroup}
                />
              </Tooltip>
            </>
          )}
        </Flex>
      </Flex>

      <Divider style={{ margin: 0 }} />

      {/* Content */}
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
          titleRender={renderTreeTitle}
          showLine={false}
          showIcon={false}
          style={{ background: 'transparent' }}
        />
      </div>
    </div>
  );
};

