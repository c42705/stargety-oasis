import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Switch, Select, Button, Space, Typography, Badge, Avatar, message } from 'antd';
import { SaveOutlined, EditOutlined, UserOutlined, LogoutOutlined, EditFilled } from '@ant-design/icons';
import { Lock, Mail } from 'lucide-react';
import { useAuth } from '../../shared/AuthContext';
import { useSettings } from '../../shared/SettingsContext';
import { useTheme } from '../../shared/ThemeContext';
import { ThemeType } from '../../theme/theme-system';
import AvatarCustomizerModal from '../avatar/AvatarCustomizerModal';
import { AvatarConfig, DEFAULT_AVATAR_CONFIG } from '../avatar/avatarTypes';
import { loadAvatarConfig, saveAvatarConfig } from '../avatar/avatarStorage';
import { composeAvatarDataUrl } from '../avatar/composeAvatar';

interface UserPreferences {
  notifications: boolean;
  soundEnabled: boolean;
  language: string;
  timezone: string;
  status: 'online' | 'busy' | 'away' | 'offline';
  statusMessage: string;
}

export const MyProfileTab: React.FC = () => {
  const { user, logout } = useAuth();
  const { settings, updateVideoService, updateTheme, saveSettings } = useSettings();
  const { currentTheme, setTheme, availableThemes } = useTheme();

  const [preferences, setPreferences] = useState<UserPreferences>({
    notifications: true,
    soundEnabled: true,
    language: 'en',
    timezone: 'UTC',
    status: 'online',
    statusMessage: 'Working on exciting projects!'
  });

  // Sync theme with settings
  useEffect(() => {
    if (settings.theme !== currentTheme.id) {
      setTheme(settings.theme);
    }
  }, [settings.theme, currentTheme.id, setTheme]);

  const [isEditing, setIsEditing] = useState(false);

  const handlePreferenceChange = (key: keyof UserPreferences, value: any) => {
    setPreferences(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSavePreferences = () => {
    // Here you would typically save to backend
    setIsEditing(false);
  };

  const handleThemeChange = (themeType: ThemeType) => {
    setTheme(themeType);
    updateTheme(themeType);
    // Save settings to persist theme change to SettingsContext's localStorage
    // Use setTimeout to ensure state update completes before saving
    setTimeout(() => saveSettings(), 0);
  };

  // Get theme options for the select
  const themeOptions = availableThemes.map(theme => ({
    value: theme.id,
    label: (
      <Space>
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            backgroundColor: theme.preview.primary,
            border: '1px solid var(--color-border)',
          }}
        />
        {theme.name}
      </Space>
    ),
  }));
  // Avatar customization state
  const [isCustomizerOpen, setCustomizerOpen] = useState(false);
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig>(DEFAULT_AVATAR_CONFIG);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Load saved avatar config for this user
  useEffect(() => {
    if (!user) return;
    const cfg = loadAvatarConfig(user.username);
    setAvatarConfig(cfg);
  }, [user]);

  // Compose preview whenever config changes
  useEffect(() => {
    (async () => {
      const url = await composeAvatarDataUrl(avatarConfig);
      setAvatarUrl(url);
    })();
  }, [avatarConfig]);

  const handleCustomizerSave = async (config: AvatarConfig) => {
    setAvatarConfig(config);
    if (user) {
      saveAvatarConfig(user.username, config);
    }
    setCustomizerOpen(false);
    message.success('Character updated');

    // Trigger avatar update event for game canvas
    if (user) {
      window.dispatchEvent(new CustomEvent('avatarConfigUpdated', {
        detail: { username: user.username, config }
      }));
    }
  };
  const handleCustomizerCancel = () => setCustomizerOpen(false);




  if (!user) return null;

  return (
    <div style={{ height: '100%', padding: '16px', backgroundColor: 'var(--color-bg-primary)' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* User Profile Header */}
        <Card style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-light)' }}>
          <Space direction="vertical" size="middle" style={{ width: '100%', textAlign: 'center' }}>
            <Badge
              dot
              status={preferences.status === 'online' ? 'success' :
                     preferences.status === 'busy' ? 'error' :
                     preferences.status === 'away' ? 'warning' : 'default'}
              offset={[-8, 8]}
            >
              <Avatar
                size={64}
                src={avatarUrl || undefined}
                icon={<UserOutlined />}
                style={{
                  backgroundColor: 'var(--color-accent)',
                  fontSize: '24px'
                }}
              >
                {user.displayName.split(' ').map(n => n[0]).join('')}
              </Avatar>
            </Badge>

            <Space direction="vertical" size="small">
              <Typography.Title level={4} style={{ margin: 0, color: 'var(--color-text-primary)' }}>
                {user.displayName}
              </Typography.Title>
              <Typography.Text type="secondary">@{user.username}</Typography.Text>
              {user.isAdmin && (
                <Badge
                  count="Administrator"
                  style={{
                    backgroundColor: 'var(--color-accent)',
                    color: 'var(--color-text-primary)'
                  }}
                />
              )}
              <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                Room: {user.roomId}
              </Typography.Text>

              {/* Customize Character Button */}
              <Button
                size="small"
                icon={<EditFilled />}
                onClick={() => setCustomizerOpen(true)}
                style={{
                  backgroundColor: 'var(--color-accent)',
                  borderColor: 'var(--color-accent)',
                  color: 'white',
                  marginTop: '8px'
                }}
              >
                Customize Character
              </Button>
            </Space>
          </Space>
        </Card>

        {/* Status Section */}
        <Card
          title="Status"
          size="small"
          style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-light)' }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Select
              value={preferences.status}
              onChange={(value) => handlePreferenceChange('status', value)}
              style={{ width: '100%' }}
              options={[
                { value: 'online', label: '● Online' },
                { value: 'busy', label: '● Busy' },
                { value: 'away', label: '● Away' },
                { value: 'offline', label: '● Offline' }
              ]}
            />

            <Input
              placeholder="Set a status message..."
              value={preferences.statusMessage}
              onChange={(e) => handlePreferenceChange('statusMessage', e.target.value)}
              style={{
                backgroundColor: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)'
              }}
            />
          </Space>
        </Card>

        {/* Preferences Section */}
        <Card
          title="Preferences"
          size="small"
          style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-light)' }}
          extra={
            <Button
              size="small"
              icon={isEditing ? <SaveOutlined /> : <EditOutlined />}
              onClick={() => isEditing ? handleSavePreferences() : setIsEditing(!isEditing)}
              style={{
                backgroundColor: isEditing ? 'var(--color-accent)' : 'var(--color-bg-tertiary)',
                borderColor: isEditing ? 'var(--color-accent)' : 'var(--color-border)',
                color: isEditing ? 'white' : 'var(--color-text-primary)'
              }}
            >
              {isEditing ? 'Save' : 'Edit'}
            </Button>
          }
        >
          <Form layout="vertical" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography.Text>Enable Notifications</Typography.Text>
                <Switch
                  checked={preferences.notifications}
                  onChange={(checked) => handlePreferenceChange('notifications', checked)}
                  disabled={!isEditing}
                  size="small"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography.Text>Sound Effects</Typography.Text>
                <Switch
                  checked={preferences.soundEnabled}
                  onChange={(checked) => handlePreferenceChange('soundEnabled', checked)}
                  disabled={!isEditing}
                  size="small"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography.Text>Theme</Typography.Text>
                <Select
                  value={currentTheme.id}
                  onChange={handleThemeChange}
                  disabled={!isEditing}
                  size="small"
                  style={{ width: 150 }}
                  options={themeOptions}
                  placeholder="Select theme"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography.Text>Language</Typography.Text>
                <Select
                  value={preferences.language}
                  onChange={(value) => handlePreferenceChange('language', value)}
                  disabled={!isEditing}
                  size="small"
                  style={{ width: 100 }}
                  options={[
                    { value: 'en', label: 'English' },
                    { value: 'es', label: 'Español' },
                    { value: 'fr', label: 'Français' },
                    { value: 'de', label: 'Deutsch' }
                  ]}
                />
              </div>
            </Space>
          </Form>
        </Card>

        {/* Admin Settings (if admin) */}
        {user.isAdmin && (
          <Card
            title="Admin Settings"
            size="small"
            style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-light)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography.Text>Video Service</Typography.Text>
              <Select
                value={settings.videoService}
                onChange={(value) => updateVideoService(value as 'jitsi' | 'ringcentral')}
                size="small"
                style={{ width: 120 }}
                options={[
                  { value: 'jitsi', label: 'Jitsi Meet' },
                  { value: 'ringcentral', label: 'RingCentral' }
                ]}
              />
            </div>
          </Card>
        )}

        {/* Account Actions */}
        <Card
          title="Account"
          size="small"
          style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-light)' }}
        >
        <AvatarCustomizerModal
          open={isCustomizerOpen}
          initialConfig={avatarConfig}
          onOk={handleCustomizerSave}
          onCancel={handleCustomizerCancel}
        />
          <Space direction="vertical" style={{ width: '100%' }}>
            <Button
              icon={<Lock size={16} />}
              style={{
                width: '100%',
                textAlign: 'left',
                backgroundColor: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)'
              }}
            >
              Change Password
            </Button>
            <Button
              icon={<Mail size={16} />}
              style={{
                width: '100%',
                textAlign: 'left',
                backgroundColor: 'var(--color-bg-tertiary)',
                borderColor: 'var(--color-border)',
                color: 'var(--color-text-primary)'
              }}
            >
              Update Email
            </Button>
            <Button
              danger
              icon={<LogoutOutlined />}
              onClick={logout}
              style={{ width: '100%', textAlign: 'left' }}
            >
              Sign Out
            </Button>
          </Space>
        </Card>
      </Space>
    </div>
  );
};

export default MyProfileTab;
