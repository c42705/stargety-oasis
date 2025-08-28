import React from 'react';
import { Button, List, Typography, Flex, Card, Descriptions, Avatar, Tag } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, EnvironmentOutlined } from '@ant-design/icons';
import { Shield } from 'lucide-react';

const { Title, Text } = Typography;

interface CollisionTabProps {
  impassableAreas: any[];
}

export const CollisionTab: React.FC<CollisionTabProps> = ({
  impassableAreas
}) => {
  return (
    <Card
      title={
        <Flex justify="space-between" align="center">
          <Title level={4} style={{ margin: 0 }}>
            Collision Areas Management
          </Title>
          <Button type="primary" icon={<PlusOutlined />}>
            Add Collision Area
          </Button>
        </Flex>
      }
      styles={{ body: { padding: 0 } }}
    >
      <List
        dataSource={impassableAreas}
        locale={{ emptyText: 'No collision areas defined yet' }}
        renderItem={(area) => (
          <List.Item
            actions={[
              <Button
                key="edit"
                type="text"
                icon={<EditOutlined />}
                size="small"
              >
                Edit
              </Button>,
              <Button
                key="delete"
                type="text"
                danger
                icon={<DeleteOutlined />}
                size="small"
              >
                Delete
              </Button>
            ]}
          >
            <List.Item.Meta
              avatar={
                <Avatar
                  icon={<Shield size={16} />}
                  style={{ backgroundColor: '#ef4444' }}
                />
              }
              title={
                <Flex align="center" gap="small">
                  <Text strong>{area.name || `Collision Area ${area.id}`}</Text>
                  <Tag color="red">Impassable</Tag>
                </Flex>
              }
              description={
                <Descriptions size="small" column={1}>
                  <Descriptions.Item
                    label={<><EnvironmentOutlined /> Position & Size</>}
                  >
                    ({area.x}, {area.y}) • Size: {area.width}×{area.height}
                  </Descriptions.Item>
                  <Descriptions.Item label="Type">
                    <Text type="secondary">Impassable collision area</Text>
                  </Descriptions.Item>
                </Descriptions>
              }
            />
          </List.Item>
        )}
      />
    </Card>
  );
};
