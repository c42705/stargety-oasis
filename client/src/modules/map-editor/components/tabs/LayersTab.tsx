import React, { useState, useCallback, useMemo } from 'react';
import { Tree, Card, Typography, Space, Button, Tooltip, Badge, Avatar } from 'antd';
import { 
  EyeOutlined, 
  EyeInvisibleOutlined,
  ExpandOutlined,
  CompressOutlined
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

const { Title, Text } = Typography;

interface LayerObject {
  id: string;
  name: string;
  type: 'background' | 'grid' | 'interactive' | 'collision' | 'terrain';
  visible: boolean;
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
}

interface LayersTabProps {
  fabricCanvas?: fabric.Canvas | null;
  onObjectSelect?: (object: fabric.Object) => void;
  onToolChange?: (tool: 'resize') => void;
  onZoomToObject?: (object: fabric.Object) => void;
}

export const LayersTab: React.FC<LayersTabProps> = ({
  fabricCanvas,
  onObjectSelect,
  onToolChange,
  onZoomToObject
}) => {
  const [expandedKeys, setExpandedKeys] = useState<string[]>(['background', 'interactive', 'collision']);

  // Get layer data from canvas
  const layerGroups = useMemo((): LayerGroup[] => {
    if (!fabricCanvas) {
      return [];
    }

    const allObjects = fabricCanvas.getObjects();
    
    // Categorize objects by type
    const backgroundObjects: LayerObject[] = [];
    const gridObjects: LayerObject[] = [];
    const interactiveObjects: LayerObject[] = [];
    const collisionObjects: LayerObject[] = [];
    const terrainObjects: LayerObject[] = [];

    allObjects.forEach((obj, index) => {
      const objAny = obj as any;
      
      // Determine object type and create layer object
      let layerObj: LayerObject;
      
      if (objAny.isBackgroundImage || objAny.backgroundImageId === 'map-background-image') {
        layerObj = {
          id: `bg-${index}`,
          name: 'Background Image',
          type: 'background',
          visible: obj.visible !== false,
          position: { x: obj.left || 0, y: obj.top || 0 },
          size: { width: obj.width || 0, height: obj.height || 0 },
          fabricObject: obj
        };
        backgroundObjects.push(layerObj);
      } else if (objAny.isGridLine) {
        layerObj = {
          id: `grid-${index}`,
          name: `Grid Line ${gridObjects.length + 1}`,
          type: 'grid',
          visible: obj.visible !== false,
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
          position: { x: obj.left || 0, y: obj.top || 0 },
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
          position: { x: obj.left || 0, y: obj.top || 0 },
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
          position: { x: obj.left || 0, y: obj.top || 0 },
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
        visible: backgroundObjects.some(obj => obj.visible)
      },
      {
        key: 'interactive',
        title: 'Interactive Areas',
        icon: <GridIcon size={16} />,
        objects: interactiveObjects,
        visible: interactiveObjects.some(obj => obj.visible)
      },
      {
        key: 'collision',
        title: 'Collision Areas',
        icon: <Shield size={16} />,
        objects: collisionObjects,
        visible: collisionObjects.some(obj => obj.visible)
      },
      {
        key: 'terrain',
        title: 'Terrain',
        icon: <TreePine size={16} />,
        objects: terrainObjects,
        visible: terrainObjects.some(obj => obj.visible)
      },
      {
        key: 'grid',
        title: 'Grid',
        icon: <Square size={16} />,
        objects: gridObjects,
        visible: gridObjects.some(obj => obj.visible)
      }
    ].filter(group => group.objects.length > 0); // Only show groups with objects
  }, [fabricCanvas]);

  // Handle object selection
  const handleObjectSelect = useCallback((layerObject: LayerObject) => {
    if (!layerObject.fabricObject) return;

    // Select the object on canvas
    if (fabricCanvas) {
      fabricCanvas.setActiveObject(layerObject.fabricObject);
      fabricCanvas.renderAll();
    }

    // Switch to resize tool
    onToolChange?.('resize');

    // Zoom to object
    onZoomToObject?.(layerObject.fabricObject);

    // Notify parent component
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
      ),
      key: group.key,
      children: group.objects.map(obj => ({
        title: (
          <Space size="small" style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space size="small" style={{ flex: 1, minWidth: 0 }}>
              <Text 
                style={{ fontSize: '12px' }} 
                ellipsis={{ tooltip: obj.name }}
                onClick={() => handleObjectSelect(obj)}
              >
                {obj.name}
              </Text>
              {obj.position && obj.size && (
                <Text type="secondary" style={{ fontSize: '10px' }}>
                  ({Math.round(obj.position.x)}, {Math.round(obj.position.y)}) • {Math.round(obj.size.width)}×{Math.round(obj.size.height)}
                </Text>
              )}
            </Space>
            <Tooltip title={obj.visible ? 'Hide Object' : 'Show Object'}>
              <Button
                type="text"
                size="small"
                icon={obj.visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                onClick={(e) => handleObjectVisibilityToggle(obj, e)}
                style={{ padding: '2px 4px' }}
              />
            </Tooltip>
          </Space>
        ),
        key: obj.id,
        isLeaf: true
      }))
    }));
  }, [layerGroups, handleObjectSelect, handleLayerVisibilityToggle, handleObjectVisibilityToggle]);

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
