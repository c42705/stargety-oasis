import React, { useState } from 'react';
import { Modal, Card, Typography, Space, Select, Button, Divider, message, Input } from 'antd';
import { SettingOutlined, SaveOutlined, VideoCameraOutlined, UserOutlined, SecurityScanOutlined, LinkOutlined } from '@ant-design/icons';
import { useAuth } from '../../shared/AuthContext';
import { useSettings, VideoServiceType } from '../../shared/SettingsContext';
import { useTheme } from '../../shared/ThemeContext';
import { ThemeType, getThemeNames } from '../../theme/theme-system';

const { Title, Text } = Typography;

interface ConsolidatedSettingsProps {
  open: boolean;
  onClose: () => void;
}

export const ConsolidatedSettings: React.FC<ConsolidatedSettingsProps> = ({
  open,
  onClose
}) => {
  const { user } = useAuth();
  const { settings, updateVideoService, updateJitsiServerUrl, updateTheme, saveSettings } = useSettings();
  const { themeType, setTheme } = useTheme();
  const [hasChanges, setHasChanges] = useState(false);
  const [jitsiUrl, setJitsiUrl] = useState(settings.jitsiServerUrl || 'meet.stargety.com');

  const handleVideoServiceChange = (service: VideoServiceType) => {
    updateVideoService(service);
    setHasChanges(true);
  };

  const handleThemeChange = (newTheme: ThemeType) => {
    setTheme(newTheme);
    updateTheme(newTheme);
    setHasChanges(true);
  };

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

  const videoServiceOptions = [
    {
      value: 'ringcentral' as VideoServiceType,
      label: 'RingCentral',
      description: 'Professional video conferencing with advanced features',
      features: ['HD Video & Audio', 'Screen Sharing', 'Recording', 'Large Meetings', 'Enterprise Security']
    },
    {
      value: 'jitsi' as VideoServiceType,
      label: 'Jitsi Meet',
      description: 'Open-source video conferencing solution',
      features: ['Free & Open Source', 'No Account Required', 'Browser-based', 'Basic Recording', 'Privacy Focused']
    }
  ];



  return (
    <Modal
      title={
        <Space>
          <SettingOutlined />
          Settings
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
        {/* User Settings */}
        <Card
          title={
            <Space>
              <UserOutlined />
              User Preferences
            </Space>
          }
          size="small"
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text>Theme</Text>
              <Select
                value={themeType}
                onChange={handleThemeChange}
                style={{ width: 150 }}
                options={getThemeNames()}
              />
            </div>
          </Space>
        </Card>

        {/* Admin Settings - Only visible to admin users */}
        {user?.isAdmin && (
          <>
            <Divider />
            <Card
              title={
                <Space>
                  <SecurityScanOutlined />
                  Admin Settings
                </Space>
              }
              size="small"
            >
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {/* Video Service Configuration */}
                <div>
                  <Title level={5}>
                    <VideoCameraOutlined /> Video Calling Service
                  </Title>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                    Choose the video conferencing platform for your organization
                  </Text>

                  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                    {videoServiceOptions.map((option) => (
                      <Card
                        key={option.value}
                        size="small"
                        style={{
                          cursor: 'pointer',
                          border: settings.videoService === option.value 
                            ? '2px solid var(--color-accent)' 
                            : '1px solid var(--color-border)',
                          backgroundColor: settings.videoService === option.value 
                            ? 'var(--color-bg-tertiary)' 
                            : 'var(--color-bg-secondary)'
                        }}
                        onClick={() => handleVideoServiceChange(option.value)}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                              <input
                                type="radio"
                                checked={settings.videoService === option.value}
                                onChange={() => handleVideoServiceChange(option.value)}
                                style={{ marginRight: 8 }}
                              />
                              <Text strong>{option.label}</Text>
                              {settings.videoService === option.value && (
                                <span style={{
                                  marginLeft: 8,
                                  padding: '2px 8px',
                                  backgroundColor: 'var(--color-accent)',
                                  color: 'white',
                                  borderRadius: 4,
                                  fontSize: '12px'
                                }}>
                                  Current
                                </span>
                              )}
                            </div>
                            <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                              {option.description}
                            </Text>
                            <div>
                              <Text strong style={{ fontSize: '12px' }}>Key Features:</Text>
                              <ul style={{ margin: '4px 0 0 16px', fontSize: '12px' }}>
                                {option.features.map((feature, index) => (
                                  <li key={index} style={{ color: 'var(--color-text-secondary)' }}>
                                    {feature}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </Space>
                </div>

                {/* Jitsi Server Configuration - Only shown when Jitsi is selected */}
                {settings.videoService === 'jitsi' && (
                  <div>
                    <Title level={5}>
                      <LinkOutlined /> Jitsi Server Configuration
                    </Title>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
                      Configure the Jitsi Meet server URL for video conferencing
                    </Text>

                    <Space direction="vertical" style={{ width: '100%' }}>
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
                  </div>
                )}
              </Space>
            </Card>
          </>
        )}
      </Space>
    </Modal>
  );
};

export default ConsolidatedSettings;
