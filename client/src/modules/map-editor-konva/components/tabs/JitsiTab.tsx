import React from 'react';
import { Card, Typography, Space, List, Tag, Empty, Alert } from 'antd';
import { VideoCameraOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { InteractiveArea, getJitsiRoomNameForArea, JitsiActionConfig } from '../../../../shared/MapDataContext';

const { Title, Text } = Typography;

interface JitsiTabProps {
  areas: InteractiveArea[];
  onEditArea?: (area: InteractiveArea) => void;
}

export const JitsiTab: React.FC<JitsiTabProps> = ({ areas, onEditArea }) => {
  // Filter areas with Jitsi action type
  const jitsiAreas = areas.filter(area => area.actionType === 'jitsi');

  return (
    <Card
      title={
        <Space direction="vertical" size={0}>
          <Title level={5} style={{ margin: 0 }}>
            <VideoCameraOutlined style={{ marginRight: 8 }} />
            Jitsi Video Areas
          </Title>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Areas configured for video conferencing
          </Text>
        </Space>
      }
      styles={{ body: { padding: 0 } }}
    >
      {jitsiAreas.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space direction="vertical" size={4}>
              <Text>No Jitsi areas configured</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Create an area and set its action type to "Video Conference (Jitsi)"
              </Text>
            </Space>
          }
          style={{ padding: 24 }}
        />
      ) : (
        <List
          dataSource={jitsiAreas}
          size="small"
          renderItem={(area) => {
            const config = area.actionConfig as JitsiActionConfig | null;
            const roomName = getJitsiRoomNameForArea(area);
            return (
              <List.Item
                style={{ padding: 12, cursor: onEditArea ? 'pointer' : 'default' }}
                onClick={() => onEditArea?.(area)}
              >
                <div style={{ width: '100%' }}>
                  <Space style={{ marginBottom: 4 }}>
                    <Text strong>{area.name}</Text>
                    <Tag color="green" icon={<VideoCameraOutlined />}>Jitsi</Tag>
                  </Space>
                  <div>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Room: <Text code style={{ fontSize: 11 }}>{roomName}</Text>
                    </Text>
                  </div>
                  <Space size={8} style={{ marginTop: 4 }}>
                    {config?.autoJoinOnEntry !== false && (
                      <Tag icon={<CheckCircleOutlined />} color="blue" style={{ fontSize: 10 }}>Auto-join</Tag>
                    )}
                    {config?.autoLeaveOnExit !== false && (
                      <Tag icon={<CheckCircleOutlined />} color="blue" style={{ fontSize: 10 }}>Auto-leave</Tag>
                    )}
                  </Space>
                </div>
              </List.Item>
            );
          }}
        />
      )}
      <Alert
        type="info"
        showIcon
        message="Jitsi room names are auto-generated from area names"
        style={{ margin: 12, marginTop: 0 }}
      />
    </Card>
  );
};

export default JitsiTab;

