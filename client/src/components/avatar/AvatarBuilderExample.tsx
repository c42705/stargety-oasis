import React from 'react';
import { Row, Col, Space, Typography, Divider, Card, Alert } from 'antd';
import { 
  AvatarBuilderLauncher, 
  QuickAvatarBuilder, 
  AvatarBuilderCard, 
  AvatarBuilderMenuItem 
} from './AvatarBuilderLauncher';
import { InfoCircleOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

/**
 * Example page showing different ways to access the Avatar Builder
 * This demonstrates all the integration options available
 */
export const AvatarBuilderExample: React.FC = () => {
  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <div style={{ textAlign: 'center' }}>
          <Title level={2}>Avatar Builder Integration Examples</Title>
          <Paragraph>
            Here are different ways to integrate and access the new Avatar Builder Module in your application.
          </Paragraph>
        </div>

        {/* Info Alert */}
        <Alert
          message="Avatar Builder Module"
          description="The Avatar Builder allows users to upload sprite sheets, define frames, create animations, and generate custom characters with professional tools."
          type="info"
          icon={<InfoCircleOutlined />}
          showIcon
        />

        {/* Integration Examples */}
        <Row gutter={[24, 24]}>
          {/* Button Integration */}
          <Col xs={24} md={12} lg={8}>
            <Card title="Button Integration" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text>Add to toolbars, menus, or action areas:</Text>
                
                <div style={{ textAlign: 'center', padding: '20px' }}>
                  <QuickAvatarBuilder username="demo-user" />
                </div>

                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Usage: Import QuickAvatarBuilder and place anywhere
                </Text>
              </Space>
            </Card>
          </Col>

          {/* Card Integration */}
          <Col xs={24} md={12} lg={8}>
            <Card title="Card Integration" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text>Perfect for dashboards or main menus:</Text>
                
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <AvatarBuilderCard username="demo-user" />
                </div>

                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Usage: Import AvatarBuilderCard for feature showcases
                </Text>
              </Space>
            </Card>
          </Col>

          {/* Menu Integration */}
          <Col xs={24} md={12} lg={8}>
            <Card title="Menu Integration" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Text>Add to navigation menus or dropdowns:</Text>
                
                <div style={{ border: '1px solid #d9d9d9', borderRadius: '6px' }}>
                  <AvatarBuilderMenuItem 
                    username="demo-user"
                    onClick={() => {/* Removed dev console.log: menu item clicked */}}
                  />
                </div>

                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Usage: Import AvatarBuilderMenuItem for navigation
                </Text>
              </Space>
            </Card>
          </Col>
        </Row>

        <Divider />

        {/* Code Examples */}
        <div>
          <Title level={3}>Integration Code Examples</Title>
          
          <Row gutter={[24, 24]}>
            <Col xs={24} lg={12}>
              <Card title="Basic Button Usage" size="small">
                <pre style={{ 
                  backgroundColor: '#f6f8fa', 
                  padding: '12px', 
                  borderRadius: '4px',
                  fontSize: '12px',
                  overflow: 'auto'
                }}>
{`import { QuickAvatarBuilder } from './AvatarBuilderLauncher';

// In your component:
<QuickAvatarBuilder 
  username="player123"
  onAvatarCreated={(definition) => {
    // Handle the created avatar
  }}
/>`}
                </pre>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card title="Custom Integration" size="small">
                <pre style={{ 
                  backgroundColor: '#f6f8fa', 
                  padding: '12px', 
                  borderRadius: '4px',
                  fontSize: '12px',
                  overflow: 'auto'
                }}>
{`import { AvatarBuilderLauncher } from './AvatarBuilderLauncher';

// Custom integration:
<AvatarBuilderLauncher
  username="player123"
  size="large"
  type="button"
  style={{ width: '200px' }}
  onAvatarCreated={(definition) => {
    // Save to your backend
    saveToDatabase(definition);
  }}
/>`}
                </pre>
              </Card>
            </Col>
          </Row>
        </div>

        <Divider />

        {/* Integration with Existing Avatar System */}
        <div>
          <Title level={3}>Integration with Existing Avatar System</Title>
          
          <Alert
            message="Updated AvatarCustomizerModal"
            description={
              <div>
                <Paragraph>
                  The existing <code>AvatarCustomizerModal</code> has been updated to include a new "Avatar Builder" tab. 
                  Users can now access the Avatar Builder directly from the character customization interface.
                </Paragraph>
                <Paragraph>
                  <Text strong>Location:</Text> <code>client/src/components/avatar/AvatarCustomizerModal.tsx</code>
                </Paragraph>
                <Paragraph>
                  <Text strong>New Tab:</Text> "Avatar Builder" tab with professional sprite sheet creation tools
                </Paragraph>
              </div>
            }
            type="success"
          />
        </div>

        <Divider />

        {/* Features Overview */}
        <div>
          <Title level={3}>Avatar Builder Features</Title>
          
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card size="small" title="Upload & Processing">
                <ul>
                  <li>Drag-and-drop sprite sheet upload</li>
                  <li>Support for PNG, GIF, WebP formats</li>
                  <li>Smart frame detection algorithms</li>
                  <li>File validation and optimization</li>
                </ul>
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card size="small" title="Professional Editing">
                <ul>
                  <li>Interactive grid overlay system</li>
                  <li>Precision frame selection tools</li>
                  <li>Crop, resize, rotate operations</li>
                  <li>Undo/redo functionality</li>
                </ul>
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card size="small" title="Animation System">
                <ul>
                  <li>17 predefined animation categories</li>
                  <li>Custom animation creation</li>
                  <li>Real-time preview player</li>
                  <li>Frame rate and loop controls</li>
                </ul>
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Card size="small" title="Integration & Export">
                <ul>
                  <li>Seamless Phaser.js compatibility</li>
                  <li>localStorage persistence</li>
                  <li>JSON export/import</li>
                  <li>Cross-browser support</li>
                </ul>
              </Card>
            </Col>
          </Row>
        </div>

        {/* Getting Started */}
        <div>
          <Title level={3}>Getting Started</Title>
          
          <Card>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text strong>1. Import the component you need:</Text>
                <pre style={{ backgroundColor: '#f6f8fa', padding: '8px', margin: '8px 0' }}>
                  {`import { QuickAvatarBuilder } from './components/avatar/AvatarBuilderLauncher';`}
                </pre>
              </div>

              <div>
                <Text strong>2. Add it to your component:</Text>
                <pre style={{ backgroundColor: '#f6f8fa', padding: '8px', margin: '8px 0' }}>
                  {`<QuickAvatarBuilder username="your-username" />`}
                </pre>
              </div>

              <div>
                <Text strong>3. Handle avatar creation:</Text>
                <pre style={{ backgroundColor: '#f6f8fa', padding: '8px', margin: '8px 0' }}>
{`<QuickAvatarBuilder 
  username="player"
  onAvatarCreated={(definition) => {
    // Your custom logic here
  }}
/>`}
                </pre>
              </div>
            </Space>
          </Card>
        </div>
      </Space>
    </div>
  );
};

export default AvatarBuilderExample;
