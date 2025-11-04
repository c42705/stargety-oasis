import React from 'react';
import { Card, Typography, Space } from 'antd';
import { JitsiRoomMappingEditor } from '../../../../components/JitsiRoomMappingEditor';

const { Title, Text } = Typography;

export const JitsiTab: React.FC = () => {
  return (
    <Card
      title={
        <Space direction="vertical" size={0}>
          <Title level={5} style={{ margin: 0 }}>
            Jitsi Video Conferencing
          </Title>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            Configure Jitsi room mappings for interactive areas
          </Text>
        </Space>
      }
      styles={{ body: { padding: 0 } }}
    >
      <div style={{ padding: '16px' }}>
        <JitsiRoomMappingEditor />
      </div>
    </Card>
  );
};

export default JitsiTab;

