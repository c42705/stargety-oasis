import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Switch, Select, Button, Space, Typography, Badge, Avatar, message, Alert, Flex } from 'antd';
import { SaveOutlined, EditOutlined, UserOutlined, LogoutOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { Lock, Mail } from 'lucide-react';
import { useAuth } from '../../shared/AuthContext';
import { useSettings } from '../../shared/SettingsContext';
import { useTheme } from '../../shared/ThemeContext';
import { ThemeType } from '../../theme/theme-system';
// V2 Character Selector
import { CharacterSelector as CharacterSelectorV2, MigrationDetector, MigrationModal, CharacterStorage } from '../avatar/v2';

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
  const { settings, updateTheme, saveSettings } = useSettings();
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

  // Migration state
  const [showMigrationBanner, setShowMigrationBanner] = useState(false);
  const [isMigrationModalOpen, setMigrationModalOpen] = useState(false);
  const [migrationCount, setMigrationCount] = useState(0);

  // Check for old characters on mount
  useEffect(() => {
    if (user) {
      const count = MigrationDetector.getMigrationCount(user.username);
      setMigrationCount(count);
      setShowMigrationBanner(count > 0);
    }
  }, [user]);

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

  // Character switching handlers (V2 system)
  const handleCharacterSwitchV2 = (slotNumber: number) => {
    if (!user) return;

    console.log('[MyProfileTab] Character switch triggered:', { username: user.username, slotNumber });

    // CRITICAL: Save the active character to localStorage
    const result = CharacterStorage.setActiveCharacter(user.username, slotNumber);
    if (!result.success) {
      console.error('[MyProfileTab] Failed to set active character:', result.error);
      message.error(`Failed to switch character: ${result.error}`);
      return;
    }

    console.log('[MyProfileTab] Active character saved to localStorage');
    message.success(`Switched to character ${slotNumber}`);

    // Emit custom event for game world to listen to
    const event = new CustomEvent('characterSwitchedV2', {
      detail: {
        username: user.username,
        slotNumber
      }
    });
    console.log('[MyProfileTab] Dispatching characterSwitchedV2 event:', event.detail);
    window.dispatchEvent(event);
  };

  const handleCharacterEditV2 = (slotNumber: number) => {
    if (!user) return;
    // V2 system handles editing through AvatarBuilderIntegration
    // This callback is triggered after the edit is complete
    message.info(`Character ${slotNumber} edited (V2)`);
  };

  const handleCharacterDeleteV2 = (slotNumber: number) => {
    if (!user) return;
    message.success(`Character ${slotNumber} deleted (V2)`);
  };

  const handleCharacterCreateV2 = (slotNumber: number) => {
    if (!user) return;
    message.success(`Character ${slotNumber} created (V2)`);
  };




  if (!user) return null;

  return (
    <div style={{ height: '100%' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* User Profile Header */}
        <Card style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-light)' }}>
          <Flex justify="space-between" align="center">
            <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
              <Badge
                dot
                status={preferences.status === 'online' ? 'success' :
                  preferences.status === 'busy' ? 'error' :
                    preferences.status === 'away' ? 'warning' : 'default'}
                offset={[-8, 8]}
              >
                <Avatar
                  size={64}
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


              </Space>
            </Space>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
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
          </Flex>
        </Card>

        {/* Migration Banner */}
        {showMigrationBanner && (
          <Alert
            message="Old Characters Detected!"
            description={
              <div>
                <Typography.Text>
                  You have {migrationCount} character(s) from the old system that need to be migrated.
                </Typography.Text>
                <br />
                <Button
                  type="primary"
                  size="small"
                  onClick={() => setMigrationModalOpen(true)}
                  style={{ marginTop: 8 }}
                >
                  Migrate Now
                </Button>
              </div>
            }
            type="warning"
            icon={<ExclamationCircleOutlined />}
            showIcon
            closable
            onClose={() => setShowMigrationBanner(false)}
            style={{ marginBottom: 16 }}
          />
        )}

        {/* Character Management Section - PRIMARY */}
        <Card
          title="My Characters"
          size="small"
          style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-light)' }}
        >
          <CharacterSelectorV2
            username={user.username}
            onCharacterSwitch={handleCharacterSwitchV2}
            onCharacterEdit={handleCharacterEditV2}
            onCharacterDelete={handleCharacterDeleteV2}
            onCharacterCreate={handleCharacterCreateV2}
          />
        </Card>

        {/* Migration Modal */}
        {user && (
          <MigrationModal
            username={user.username}
            visible={isMigrationModalOpen}
            onClose={() => {
              setMigrationModalOpen(false);
              // Refresh migration count after closing
              const count = MigrationDetector.getMigrationCount(user.username);
              setMigrationCount(count);
              setShowMigrationBanner(count > 0);
            }}
            onMigrationComplete={(result) => {
              if (result.success) {
                message.success(`Successfully migrated ${result.successCount} character(s)!`);
              } else {
                message.error(`Migration failed for ${result.failureCount} character(s)`);
              }
            }}
          />
        )}

     
        <Flex justify="space-between" align="center">
          {/* Preferences Section */}
          <Card
            title="Preferences"
            size="small"
            style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-light)', width: '100%' }}
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

          {/* Account Actions */}
          <Card
            title="Account"
            size="small"
            style={{ backgroundColor: 'var(--color-bg-secondary)', borderColor: 'var(--color-border-light)', width: '100%'  }}
          >
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
        </Flex>
      </Space>
    </div>
  );
};

export default MyProfileTab;
