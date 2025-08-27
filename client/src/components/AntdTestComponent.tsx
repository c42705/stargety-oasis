import React from 'react';
import { Button, Card, Space, Typography, Alert, Tag } from 'antd';
import { CheckCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

/**
 * Test component to verify Ant Design integration
 * This component demonstrates basic Ant Design components working correctly
 */
export const AntdTestComponent: React.FC = () => {
  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
      <Card title="Ant Design Integration Test" bordered={false}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Alert
            message="Ant Design Successfully Integrated"
            description="This component confirms that Ant Design is properly installed and configured."
            type="success"
            icon={<CheckCircleOutlined />}
            showIcon
          />
          
          <div>
            <Title level={4}>Component Examples</Title>
            <Space wrap>
              <Button type="primary">Primary Button</Button>
              <Button type="default">Default Button</Button>
              <Button type="dashed">Dashed Button</Button>
              <Button type="link">Link Button</Button>
            </Space>
          </div>
          
          <div>
            <Title level={4}>Icons & Tags</Title>
            <Space wrap>
              <Tag icon={<CheckCircleOutlined />} color="success">
                Success Tag
              </Tag>
              <Tag icon={<InfoCircleOutlined />} color="processing">
                Info Tag
              </Tag>
            </Space>
          </div>
          
          <div>
            <Text type="secondary">
              This test component can be removed once Ant Design migration begins.
            </Text>
          </div>
        </Space>
      </Card>
    </div>
  );
};

export default AntdTestComponent;
