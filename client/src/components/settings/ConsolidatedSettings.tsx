import React, { useState } from 'react';
import { Modal, Card, Typography, Space, Button, message, Input } from 'antd';
import { SaveOutlined, SecurityScanOutlined, LinkOutlined } from '@ant-design/icons';
import { useAuth } from '../../shared/AuthContext';
import { useSettings } from '../../shared/SettingsContext';

const { Text } = Typography;

interface ConsolidatedSettingsProps {
  open: boolean;
  onClose: () => void;
}

export const ConsolidatedSettings: React.FC<ConsolidatedSettingsProps> = ({
  open,
  onClose
}) => {
  const { user } = useAuth();
  const { settings, updateJitsiServerUrl, saveSettings } = useSettings();
  const [hasChanges, setHasChanges] = useState(false);
  const [jitsiUrl, setJitsiUrl] = useState(settings.jitsiServerUrl || 'meet.stargety.com');

  const handleJitsiUrlChange = (url: string) => {
    setJitsiUrl(url);
    updateJitsiServerUrl(url);
    setHasChanges(true);
  };

  const handleSave = () => {
    saveSettings();
    setHasChanges(false);
    message.success('Settings saved successfully');
  };



  return (
    <Modal
      title={
        <Space>
          <SecurityScanOutlined />
          Admin Settings
        </Space>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="save"
          type="primary"
          icon={<SaveOutlined />}
          onClick={handleSave}
          disabled={!hasChanges}
        >
          Save Changes
        </Button>
      ]}
      width={700}
      style={{ top: 20 }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Admin Settings - Only visible to admin users */}
        {user?.isAdmin ? (
          
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                Configure the Jitsi Meet server URL for video conferencing
              </Text>

              <div>
                <Text strong>Server URL</Text>
                <Input
                  placeholder="meet.stargety.com"
                  value={jitsiUrl}
                  onChange={(e) => handleJitsiUrlChange(e.target.value)}
                  prefix={<LinkOutlined />}
                  style={{ marginTop: 8 }}
                />
                <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: 4 }}>
                  Enter the domain of your Jitsi Meet server (without https://)
                </Text>
              </div>

              <Card size="small" style={{ backgroundColor: 'var(--color-bg-tertiary)' }}>
                <Space direction="vertical" size="small">
                  <Text strong style={{ fontSize: '12px' }}>💡 Server Configuration Tips:</Text>
                  <ul style={{ margin: '4px 0 0 16px', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                    <li>Use your custom Jitsi server domain (e.g., meet.stargety.com)</li>
                    <li>Do not include "https://" or trailing slashes</li>
                    <li>Default: meet.stargety.com</li>
                    <li>Public option: meet.jit.si (free, no setup required)</li>
                  </ul>
                </Space>
              </Card>
            </Space>
          
        ) : (
          <Card size="small">
            <Typography.Text type="secondary">
              Admin settings are only available to administrators.
            </Typography.Text>
          </Card>
        )}
      </Space>
    </Modal>
  );
};

export default ConsolidatedSettings;
