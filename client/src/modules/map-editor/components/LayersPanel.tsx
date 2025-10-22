import React, { useState } from 'react';
import { Layout, Button, Tooltip, Flex, Typography, Divider, theme } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import { Layers } from 'lucide-react';
import { LayersTab } from './tabs/LayersTab';
import * as fabric from 'fabric';
import { EditorTool } from '../types/editor.types';

const { Sider } = Layout;
const { Text } = Typography;

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
  const { token } = theme.useToken();

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
    </Sider>
  );
};

