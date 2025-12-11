import React from 'react';
import { Button, List, Typography, Flex, Card, Space, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, VideoCameraOutlined, BellOutlined, LinkOutlined, FileTextOutlined } from '@ant-design/icons';
import { InteractiveArea, InteractiveAreaActionType } from '../../../../shared/MapDataContext';

const { Title, Text } = Typography;

/** Get icon and color for action type */
const getActionTypeDisplay = (actionType?: InteractiveAreaActionType): { icon: React.ReactNode; color: string; label: string } => {
  switch (actionType) {
    case 'jitsi': return { icon: <VideoCameraOutlined />, color: 'green', label: 'Jitsi' };
    case 'alert': return { icon: <BellOutlined />, color: 'orange', label: 'Alert' };
    case 'url': return { icon: <LinkOutlined />, color: 'cyan', label: 'URL' };
    case 'modal': return { icon: <FileTextOutlined />, color: 'purple', label: 'Modal' };
    default: return { icon: null, color: 'default', label: '' };
  }
};

interface AreasTabProps {
  areas: InteractiveArea[];
  onCreateNewArea: () => void;
  onEditArea: (area: InteractiveArea) => void;
  onDeleteArea: (area: InteractiveArea) => void;
}

export const AreasTab: React.FC<AreasTabProps> = ({
  areas,
  onCreateNewArea,
  onEditArea,
  onDeleteArea
}) => {
  return (
    <Card
      title={
        <Flex justify="space-between" align="center" wrap="wrap" gap="small">
          <Title level={5} style={{ margin: 0 }}>
            Areas
          </Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={onCreateNewArea}
            size="small"
          >
            Add Area
          </Button>
        </Flex>
      }
      styles={{ body: { padding: 0 } }}
    >
      <List
        dataSource={areas}
        locale={{ emptyText: 'No areas yet' }}
        size="small"
        renderItem={(area) => {
          const actionDisplay = getActionTypeDisplay(area.actionType);
          return (
          <List.Item style={{ padding: 16 }}>
            <div style={{ width: '100%' }}>
              {/* Header with name and actions */}
              <Flex justify="space-between" align="flex-start" style={{ marginBottom: '4px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text strong style={{ fontSize: '13px' }} ellipsis>
                    {area.name}
                  </Text>
                  {area.type && (
                    <Tag color="blue" style={{ marginLeft: '4px', fontSize: '10px', padding: '0 4px', lineHeight: '16px' }}>
                      {area.type}
                    </Tag>
                  )}
                  {actionDisplay.label && (
                    <Tag color={actionDisplay.color} icon={actionDisplay.icon} style={{ marginLeft: '4px', fontSize: '10px', padding: '0 4px', lineHeight: '16px' }}>
                      {actionDisplay.label}
                    </Tag>
                  )}
                </div>
                <Space size={4}>
                  <Button
                    type="default"
                    icon={<EditOutlined />}
                    onClick={() => onEditArea(area)}
                    size="small"
                    style={{ padding: 4, minWidth: 'auto' }}
                  />
                  <Button
                    type="default"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => { /* Removed dev console.log: AreasTab delete clicked */ onDeleteArea(area); }}
                    size="small"
                    style={{ padding: 4, minWidth: 'auto' }}
                  />
                </Space>
              </Flex>

              {/* Description */}
              {area.description && (
                <Typography.Paragraph
                  type="secondary"
                  style={{ marginBottom: 4 }}
                  ellipsis={{ rows: 2 }}
                >
                  {area.description}
                </Typography.Paragraph>
              )}

              {/* Compact info */}
              <Text type="secondary" style={{ fontSize: 12 }}>
                <Space size={8} split={<span>•</span>}>
                  <span>(X{area.x}, Y{area.y})</span>
                  <span>{area.width}×{area.height}</span>
                </Space>
              </Text>
            </div>
          </List.Item>
        );}}
      />
    </Card>
  );
};

