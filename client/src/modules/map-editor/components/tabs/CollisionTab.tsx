import React from 'react';
import { Button, List, Typography, Flex, Card, Avatar, Tag, Space, Modal } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { Shield } from 'lucide-react';
import { useSharedMap } from '../../../../shared/useSharedMap';

const { Title, Text } = Typography;

interface CollisionTabProps {
  impassableAreas: any[];
}

export const CollisionTab: React.FC<CollisionTabProps> = ({
  impassableAreas
}) => {
  const sharedMap = useSharedMap({ source: 'editor', autoSave: true });

  const handleDelete = async (area: any) => {
    Modal.confirm({
      title: 'Delete Collision Area',
      content: `Are you sure you want to delete "${area.name || 'Collision Area'}"? This action cannot be undone.`,
      okText: 'Delete',
      cancelText: 'Cancel',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await sharedMap.removeCollisionArea(area.id);
        } catch (e) {
          console.error('Failed to delete collision area', e);
        }
      }
    });
  };

  return (
    <Card
      title={
        <Flex justify="space-between" align="center">
          <Title level={5} style={{ margin: 0 }}>
            Collision Areas
          </Title>
          <Button type="primary" size="small" icon={<PlusOutlined />}>
            Add Area
          </Button>
        </Flex>
      }
      styles={{ body: { padding: 0 } }}
    >
      <List
        dataSource={impassableAreas}
        locale={{ emptyText: 'No collision areas defined yet' }}
        size="small"
        renderItem={(area) => (
          <List.Item style={{ padding: 16 }}>
            <div style={{ width: '100%' }}>
              {/* Header with name and actions (aligned to Areas list style) */}
              <Flex justify="space-between" align="flex-start" style={{ marginBottom: '4px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Space size={6} align="center">
                    <Avatar size={18} style={{ backgroundColor: 'var(--ant-color-error)' }} icon={<Shield size={12} />} />
                    <Text strong style={{ fontSize: '13px' }} ellipsis>
                      {area.name || `Collision Area ${area.id}`}
                    </Text>
                    <Tag color="red" style={{ marginLeft: 4, fontSize: 10, padding: '0 4px', lineHeight: '16px' }}>Impassable</Tag>
                  </Space>
                </div>
                <Space size={4}>
                  <Button type="default" icon={<EditOutlined />} size="small" style={{ padding: 4, minWidth: 'auto' }} />
                  <Button type="default" danger icon={<DeleteOutlined />} size="small" style={{ padding: 4, minWidth: 'auto' }} onClick={() => handleDelete(area)} />
                </Space>
              </Flex>

              {/* Compact info to match Areas list */}
              <Text type="secondary" style={{ fontSize: 12 }}>
                <Space size={8} split={<span>•</span>}>
                  <span>(X{area.x}, Y{area.y})</span>
                  <span>{area.width}×{area.height}</span>
                  <span>Type: Impassable</span>
                </Space>
              </Text>
            </div>
          </List.Item>
        )}
      />
    </Card>
  );
};
