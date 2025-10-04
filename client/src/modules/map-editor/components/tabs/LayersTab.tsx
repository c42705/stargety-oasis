import React, { useState, useCallback, useMemo } from 'react';
import { Tree, Card, Typography, Space, Button, Tooltip, Badge } from 'antd';
import {
  EyeOutlined,
  EyeInvisibleOutlined,
  LockOutlined,
  UnlockOutlined,
  EditOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import {
  Image,
  Grid as GridIcon,
  Square,
  Shield,
  TreePine,
  Layers as LayersIcon
} from 'lucide-react';
import * as fabric from 'fabric';
import { EditorTool } from '../../types/editor.types';

const { Title, Text } = Typography;

interface LayerObject {
  id: string;
  name: string;
  type: 'background' | 'grid' | 'interactive' | 'collision' | 'terrain';
  visible: boolean;
  locked: boolean;
  position?: { x: number; y: number };
  size?: { width: number; height: number };
  fabricObject?: fabric.Object;
}

interface LayerGroup {
  key: string;
  title: string;
  icon: React.ReactNode;
  objects: LayerObject[];
  visible: boolean;
  locked: boolean;
}

interface LayersTabProps {
  fabricCanvas?: fabric.Canvas | null;
  onObjectSelect?: (object: fabric.Object) => void;
  onToolChange?: (tool: EditorTool) => void;
  onZoomToObject?: (object: fabric.Object) => void;
  onEditInteractiveArea?: (areaId: string) => void;
  onEditCollisionArea?: (areaId: string) => void;
  onDeleteObject?: (object: fabric.Object) => void;
}

export const LayersTab: React.FC<LayersTabProps> = ({
  fabricCanvas,
  onObjectSelect,
  onToolChange,
  onZoomToObject,
  onEditInteractiveArea,
  onEditCollisionArea,
  onDeleteObject
}) => {
  const [expandedKeys, setExpandedKeys] = useState<string[]>(['background', 'interactive', 'collision']);

  // Get layer data from canvas
  const layerGroups = useMemo((): LayerGroup[] => {
    if (!fabricCanvas) {
      return [];
    }

    const allObjects = fabricCanvas.getObjects();
    // Filter out grid objects entirely—never show grid in the layer list
    const filteredObjects = allObjects.filter(obj => {
      const objAny = obj as any;
      return !(objAny.mapElementType === 'grid' || objAny.isGridPattern || objAny.id === 'grid');
    });
    
    // Categorize objects by type
    const backgroundObjects: LayerObject[] = [];
    const gridObjects: LayerObject[] = [];
    const interactiveObjects: LayerObject[] = [];
    const collisionObjects: LayerObject[] = [];
    const terrainObjects: LayerObject[] = [];

    filteredObjects.forEach((obj, index) => {
      const objAny = obj as any;
      
      // Determine object type and create layer object
      let layerObj: LayerObject;
      
      if (objAny.isBackgroundImage || objAny.backgroundImageId === 'map-background-image') {
        layerObj = {
          id: `bg-${index}`,
          name: 'Background Image',
          type: 'background',
          visible: obj.visible !== false,
          locked: objAny.locked || false,
          position: { x: obj.left || 0, y: obj.top || 0 },
          size: { width: obj.width || 0, height: obj.height || 0 },
          fabricObject: obj
        };
        backgroundObjects.push(layerObj);
      } else if (objAny.isGridLine || objAny.isGridPattern) {
        layerObj = {
          id: `grid-${index}`,
          name: objAny.isGridPattern ? 'Grid Pattern' : `Grid Line ${gridObjects.length + 1}`,
          type: 'grid',
          visible: obj.visible !== false,
          locked: objAny.locked || false,
          fabricObject: obj
        };
        gridObjects.push(layerObj);
      } else if (objAny.mapElementType === 'interactive') {
        const areaData = objAny.mapElementData;
        layerObj = {
          id: objAny.mapElementId || `interactive-${index}`,
          name: areaData?.name || `Interactive Area ${interactiveObjects.length + 1}`,
          type: 'interactive',
          visible: obj.visible !== false,
          locked: objAny.locked || false,
          size: { width: obj.width || 0, height: obj.height || 0 },
          fabricObject: obj
        };
        interactiveObjects.push(layerObj);
      } else if (objAny.mapElementType === 'collision') {
        const areaData = objAny.mapElementData;
        layerObj = {
          id: objAny.mapElementId || `collision-${index}`,
          name: areaData?.name || `Collision Area ${collisionObjects.length + 1}`,
          type: 'collision',
          visible: obj.visible !== false,
          locked: objAny.locked || false,
          size: { width: obj.width || 0, height: obj.height || 0 },
          fabricObject: obj
        };
        collisionObjects.push(layerObj);
      } else {
        // Default to terrain for other objects
        layerObj = {
          id: `terrain-${index}`,
          name: `Terrain Object ${terrainObjects.length + 1}`,
          type: 'terrain',
          visible: obj.visible !== false,
          locked: objAny.locked || false,
          size: { width: obj.width || 0, height: obj.height || 0 },
          fabricObject: obj
        };
        terrainObjects.push(layerObj);
      }
    });

    return [
      {
        key: 'background',
        title: 'Background',
        icon: <Image size={16} />,
        objects: backgroundObjects,
        visible: backgroundObjects.some(obj => obj.visible),
        locked: backgroundObjects.every(obj => obj.locked)
      },
      {
        key: 'interactive',
        title: 'Interactive Areas',
        icon: <GridIcon size={16} />,
        objects: interactiveObjects,
        visible: interactiveObjects.some(obj => obj.visible),
        locked: interactiveObjects.every(obj => obj.locked)
      },
      {
        key: 'collision',
        title: 'Collision Areas',
        icon: <Shield size={16} />,
        objects: collisionObjects,
        visible: collisionObjects.some(obj => obj.visible),
        locked: collisionObjects.every(obj => obj.locked)
      },
      {
        key: 'terrain',
        title: 'Terrain',
        icon: <TreePine size={16} />,
        objects: terrainObjects,
        visible: terrainObjects.some(obj => obj.visible),
        locked: terrainObjects.every(obj => obj.locked)
      },
      {
        key: 'grid',
        title: 'Grid',
        icon: <Square size={16} />,
        objects: gridObjects,
        visible: gridObjects.some(obj => obj.visible),
        locked: gridObjects.every(obj => obj.locked)
      }
    ].filter(group => group.objects.length > 0); // Only show groups with objects
  }, [fabricCanvas]);

  // Handle object selection
  const handleObjectSelect = useCallback((layerObject: LayerObject) => {
    // Removed: Non-critical object selection initiated log.

    if (!layerObject.fabricObject) {
      // Removed: Non-critical cannot select object warning.
      return;
    }

    // Switch to select tool first to enable interaction
    // Removed: Non-critical switching to select tool for object interaction log.
    onToolChange?.('select');

    // Select the object on canvas
    if (fabricCanvas) {
      // Removed: Non-critical setting active object on canvas log.
      fabricCanvas.setActiveObject(layerObject.fabricObject);
      fabricCanvas.renderAll();
    } else {
      // Removed: Non-critical cannot set active object warning.
    }

    // Zoom to object
    // Removed: Non-critical triggering zoom to object log.
    onZoomToObject?.(layerObject.fabricObject);

    // Notify parent component
    // Removed: Non-critical notifying parent component of object selection log.
    onObjectSelect?.(layerObject.fabricObject);
  }, [fabricCanvas, onToolChange, onZoomToObject, onObjectSelect]);

  // Toggle layer visibility
  const handleLayerVisibilityToggle = useCallback((layerGroup: LayerGroup) => {
    if (!fabricCanvas) return;

    const newVisibility = !layerGroup.visible;
    layerGroup.objects.forEach(obj => {
      if (obj.fabricObject) {
        obj.fabricObject.visible = newVisibility;
      }
    });

    fabricCanvas.renderAll();
  }, [fabricCanvas]);

  // Toggle object visibility
  const handleObjectVisibilityToggle = useCallback((layerObject: LayerObject, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!layerObject.fabricObject || !fabricCanvas) return;

    layerObject.fabricObject.visible = !layerObject.visible;
    fabricCanvas.renderAll();
  }, [fabricCanvas]);

  // Toggle layer lock state
  const handleLayerLockToggle = useCallback((layerGroup: LayerGroup) => {
    if (!fabricCanvas) return;

    const newLockState = !layerGroup.locked;
    layerGroup.objects.forEach(obj => {
      if (obj.fabricObject) {
        (obj.fabricObject as any).locked = newLockState;
        obj.fabricObject.selectable = !newLockState;
        obj.fabricObject.evented = !newLockState;
      }
    });

    fabricCanvas.renderAll();
  }, [fabricCanvas]);

  // Toggle object lock state
  const handleObjectLockToggle = useCallback((layerObject: LayerObject, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!layerObject.fabricObject || !fabricCanvas) return;

    const newLockState = !layerObject.locked;
    (layerObject.fabricObject as any).locked = newLockState;
    layerObject.fabricObject.selectable = !newLockState;
    layerObject.fabricObject.evented = !newLockState;

    fabricCanvas.renderAll();
  }, [fabricCanvas]);

  // Handle edit object
  const handleEditObject = useCallback((layerObject: LayerObject, e: React.MouseEvent) => {
    e.stopPropagation();

    if (layerObject.type === 'interactive' && onEditInteractiveArea) {
      onEditInteractiveArea(layerObject.id);
    } else if (layerObject.type === 'collision' && onEditCollisionArea) {
      onEditCollisionArea(layerObject.id);
    }
  }, [onEditInteractiveArea, onEditCollisionArea]);

  // Handle delete object
  const handleDeleteObject = useCallback((layerObject: LayerObject, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!layerObject.fabricObject || !onDeleteObject) return;

    onDeleteObject(layerObject.fabricObject);
  }, [onDeleteObject]);

  // Create tree data structure
  const treeData = useMemo(() => {
    return layerGroups.map(group => ({
      title: (
        <Space size="small" style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space size="small">
            {group.icon}
            <Text strong style={{ fontSize: '13px' }}>
              {group.title}
            </Text>
            <Badge count={group.objects.length} size="small" />
          </Space>
          <Space size={0}>
            <Tooltip title={group.locked ? 'Unlock Layer' : 'Lock Layer'}>
              <Button
                type="text"
                size="small"
                icon={group.locked ? <LockOutlined /> : <UnlockOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleLayerLockToggle(group);
                }}
                style={{ padding: '2px 4px' }}
              />
            </Tooltip>
            <Tooltip title={group.visible ? 'Hide Layer' : 'Show Layer'}>
              <Button
                type="text"
                size="small"
                icon={group.visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                onClick={(e) => {
                  e.stopPropagation();
                  handleLayerVisibilityToggle(group);
                }}
                style={{ padding: '2px 4px' }}
              />
            </Tooltip>
          </Space>
        </Space>
      ),
      key: group.key,
      children: group.objects.map(obj => ({
        title: (
          <Space size="small" style={{ width: '100%', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Space size="small" style={{ flex: 1, minWidth: 0, gap: 0, flexDirection: 'column', alignItems: 'flex-start' }}>
              <Text
                style={{ fontSize: '12px', cursor: 'pointer' }}
                ellipsis={{ tooltip: obj.name }}
                onClick={() => handleObjectSelect(obj)}
              >
                {obj.name}
              </Text>
              {obj.size && (
                <Text type="secondary" style={{ fontSize: '10px' }}>
                  {Math.round(obj.size.width)}×{Math.round(obj.size.height)}
                </Text>
              )}
            </Space>
            <Space size={0}>
              <Tooltip title={obj.locked ? 'Unlock Object' : 'Lock Object'}>
                <Button
                  type="text"
                  size="small"
                  icon={obj.locked ? <LockOutlined /> : <UnlockOutlined />}
                  onClick={(e) => handleObjectLockToggle(obj, e)}
                  style={{ padding: '2px 4px' }}
                />
              </Tooltip>
              {(obj.type === 'interactive' || obj.type === 'collision') && (
                <Tooltip title="Edit Object">
                  <Button
                    type="text"
                    size="small"
                    icon={<EditOutlined />}
                    onClick={(e) => handleEditObject(obj, e)}
                    style={{ padding: '2px 4px' }}
                  />
                </Tooltip>
              )}
              <Tooltip title={obj.visible ? 'Hide Object' : 'Show Object'}>
                <Button
                  type="text"
                  size="small"
                  icon={obj.visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                  onClick={(e) => handleObjectVisibilityToggle(obj, e)}
                  style={{ padding: '2px 4px' }}
                />
              </Tooltip>
              {obj.type !== 'background' && obj.type !== 'grid' && (
                <Tooltip title="Delete Object">
                  <Button
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    onClick={(e) => handleDeleteObject(obj, e)}
                    style={{ padding: '2px 4px', color: '#ff4d4f' }}
                    danger
                  />
                </Tooltip>
              )}
            </Space>
          </Space>
        ),
        key: obj.id,
        isLeaf: true
      }))
    }));
  }, [
    layerGroups,
    handleObjectSelect,
    handleLayerVisibilityToggle,
    handleObjectVisibilityToggle,
    handleLayerLockToggle,
    handleObjectLockToggle,
    handleEditObject,
    handleDeleteObject
  ]);

  return (
    <Card
      title={
        <Space size="small">
          <LayersIcon size={16} />
          <Title level={5} style={{ margin: 0 }}>
            Layer Explorer
          </Title>
        </Space>
      }
      styles={{ body: { padding: '12px' } }}
    >
      {treeData.length > 0 ? (
        <Tree
          treeData={treeData}
          expandedKeys={expandedKeys}
          onExpand={(keys) => setExpandedKeys(keys as string[])}
          showLine={{ showLeafIcon: false }}
          showIcon={false}
          selectable={false}
          style={{ fontSize: '12px' }}
        />
      ) : (
        <Text type="secondary" style={{ fontSize: '12px' }}>
          No objects found on canvas
        </Text>
      )}
    </Card>
  );
};
