import React from 'react';
import { Flex, Typography, Tag, Space, Divider } from 'antd';
import {
  ToolOutlined,
  EnvironmentOutlined,
  ZoomInOutlined,
  AppstoreOutlined,
  StopOutlined
} from '@ant-design/icons';
import { EditorState } from '../types/editor.types';
import { SaveStatusIndicator } from '../../../components/SaveStatusIndicator';

const { Text } = Typography;

interface EditorStatusBarProps {
  editorState: EditorState;
  areasCount: number;
  collisionAreasCount: number;
}

export const EditorStatusBar: React.FC<EditorStatusBarProps> = ({
  editorState,
  areasCount,
  collisionAreasCount
}) => {
  const getToolColor = (tool: string) => {
    switch (tool) {
      case 'select': return 'blue';
      case 'pan': return 'cyan';
      case 'move': return 'green';
      case 'resize': return 'orange';
      case 'delete': return 'red';
      case 'draw-collision': return 'purple';
      case 'erase-collision': return 'magenta';
      default: return 'default';
    }
  };

  return (
    <Flex
      justify="space-between"
      align="center"
      style={{
        padding: '8px 16px',
        backgroundColor: 'var(--color-bg-secondary)',
        borderTop: '1px solid var(--color-border-light)',
        minHeight: '40px'
      }}
    >
      <Space split={<Divider type="vertical" />} size="middle">
        <Space size="small">
          <ToolOutlined />
          <Text type="secondary">Tool:</Text>
          <Tag color={getToolColor(editorState.tool)}>
            {editorState.tool.replace('-', ' ').toUpperCase()}
          </Tag>
        </Space>

        <Space size="small">
          <EnvironmentOutlined />
          <Text type="secondary">Position:</Text>
          <Text code>
            ({editorState.mousePosition.x}, {editorState.mousePosition.y})
          </Text>
        </Space>

        <Space size="small">
          <ZoomInOutlined />
          <Text type="secondary">Zoom:</Text>
          <Text strong>{editorState.zoom}%</Text>
        </Space>
      </Space>

      <Space split={<Divider type="vertical" />} size="middle">
        <Space size="small">
          <AppstoreOutlined />
          <Text type="secondary">Areas:</Text>
          <Text strong>{areasCount}</Text>
        </Space>

        <Space size="small">
          <StopOutlined />
          <Text type="secondary">Collision:</Text>
          <Text strong>{collisionAreasCount}</Text>
        </Space>

        <SaveStatusIndicator
          className="compact"
          showManualSave={false}
          showAutoSaveToggle={true}
        />
      </Space>
    </Flex>
  );
};
