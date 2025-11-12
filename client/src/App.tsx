import React, { useState } from 'react';
import { logger } from './shared/logger';
import { Routes, Route } from 'react-router-dom';
import { ConfigProvider, Layout, Space, Button, Badge, Typography, Modal, Dropdown, Avatar, Switch, Tooltip, App as AntdApp } from 'antd';
import { LogoutOutlined, UserOutlined, TeamOutlined, DownOutlined, SettingOutlined, EyeOutlined } from '@ant-design/icons';
import { Star, MapPin } from 'lucide-react';
import { EventBusProvider } from './shared/EventBusContext';
import { SettingsProvider } from './shared/SettingsContext';
import { AuthProvider, useAuth } from './shared/AuthContext';
import { MapDataProvider } from './shared/MapDataContext';
import { ThemeProvider, useTheme } from './shared/ThemeContext';
import { MapSynchronizer } from './shared/MapSynchronizer';
import { ModalStateProvider } from './shared/ModalStateManager';
import { WorldModule } from './modules/world/WorldModule';
import SimpleWorldModuleDemo from './modules/simple-world-test/SimpleWorldModuleDemo';
import { LoginModule } from './modules/login/LoginModule';
import { SplitLayoutComponent } from './components/SplitLayoutComponent';
import { VideoCommunicationPanel } from './components/VideoCommunicationPanel';
import { PersistentChatPanel } from './components/PersistentChatPanel';
import { QuickAvatarBuilder } from './components/avatar/AvatarBuilderLauncher';

import { PeopleTab } from './components/panel-tabs/PeopleTab';
import { MyProfileTab } from './components/panel-tabs/MyProfileTab';

import { MapSyncStatus } from './components/MapSyncStatus';
import { MapEditorPage } from './pages/MapEditorPage';
import { KonvaTestSuitePage } from './pages/KonvaTestSuitePage';
import ConsolidatedSettings from './components/settings/ConsolidatedSettings';

import './App.css';

// Inner App component that uses both auth and settings context
const AppContent: React.FC = () => {
  const { user, logout } = useAuth();
  const [currentVideoRoom, setCurrentVideoRoom] = useState<string>('general');
  const [currentChatRoom, setCurrentChatRoom] = useState<string>('general');
  const [showProfile, setShowProfile] = useState(false);
  const [showPeople, setShowPeople] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showMapAreas, setShowMapAreas] = useState(false);

  // If no user is authenticated, this shouldn't render
  if (!user) {
    return null;
  }

  // Handle logout
  const handleLogout = () => {
    logout();
  };

  // Handle map editor navigation
  const handleMapEditorClick = () => {
    // Open Map Editor in new tab
    window.open('/map-editor', '_blank');
  };

  // Handle video room change
  const handleVideoRoomChange = (roomId: string) => {
    setCurrentVideoRoom(roomId);
  };

  // Handle chat room change
  const handleChatRoomChange = (roomId: string) => {
    setCurrentChatRoom(roomId);
  };

  // Handle settings
  const handleSettingsClick = () => {
    setShowSettings(true);
  };

  const handleSettingsClose = () => {
    setShowSettings(false);
  };

  // Handle profile modal
  const handleProfileClick = () => {
    setShowProfile(true);
  };

  const handleProfileClose = () => {
    setShowProfile(false);
  };

  // Handle people modal
  const handlePeopleClick = () => {
    setShowPeople(true);
  };

  const handlePeopleClose = () => {
    setShowPeople(false);
  };

  return (
    <EventBusProvider>
      <div className="App" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Layout.Header style={{
          background: 'var(--color-bg-secondary)',
          padding: '0 16px',
          borderBottom: '1px solid var(--color-border-light)',
          height: 'var(--header-height)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <Typography.Title level={4} style={{
            margin: 0,
            color: 'var(--color-text-primary)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <Star size={24} style={{ color: 'var(--color-accent)' }} />
            Stargety Oasis
          </Typography.Title>
          <span>Room: {user.roomId}</span>
          <Space size="middle" style={{ color: 'var(--color-text-secondary)' }}>

            {/* Admin-only Debug Toggle for Map Areas */}
            {user.isAdmin && (
              <Tooltip title="Show/hide map areas (impassable polygons and interactive zones) for debugging">
                <Space size="small">
                  <EyeOutlined style={{ fontSize: '16px' }} />
                  <Switch
                    checked={showMapAreas}
                    onChange={setShowMapAreas}
                    size="small"
                  />
                  <span style={{ fontSize: '12px' }}>Map Areas</span>
                </Space>
              </Tooltip>
            )}

            {/* Map Sync Status */}
            <MapSyncStatus showText={true} />
            {/* User Menu Dropdown */}
            <Dropdown
              menu={{
                items: [
                  {
                    key: 'profile',
                    label: 'My Profile',
                    icon: <UserOutlined />,
                    onClick: handleProfileClick
                  },
                  {
                    key: 'people',
                    label: 'People & Teams',
                    icon: <TeamOutlined />,
                    onClick: handlePeopleClick
                  },
                  // Admin-only Settings menu item
                  ...(user.isAdmin ? [{
                    key: 'settings',
                    label: 'Admin Settings',
                    icon: <SettingOutlined />,
                    onClick: handleSettingsClick
                  }] : []),
                  { type: 'divider' },
                  {
                    key: 'logout',
                    label: 'Logout',
                    icon: <LogoutOutlined />,
                    onClick: handleLogout
                  }
                ]
              }}
              trigger={['click']}
            >
              <Button
                type="text"
                style={{
                  color: 'var(--color-text-secondary)',
                  border: 'none',
                  padding: '4px 8px'
                }}
              >
                <Space>
                  <Avatar size="small" icon={<UserOutlined />} />
                  <span>Welcome, {user.displayName}</span>
                  <DownOutlined style={{ fontSize: '10px' }} />
                </Space>
              </Button>
            </Dropdown>
            <QuickAvatarBuilder />
            
            {user.isAdmin && (
              <Badge count="Admin" style={{
                backgroundColor: 'var(--color-accent)',
                color: 'var(--color-text-primary)'
              }} />
            )}            

            {user.isAdmin && (
              <Button
                type="primary"
                icon={<MapPin size={16} />}
                onClick={handleMapEditorClick}
                style={{
                  backgroundColor: 'var(--color-accent)',
                  borderColor: 'var(--color-accent)'
                }}
              >
                Map Editor
              </Button>
            )}
          </Space>
        </Layout.Header>

        {/* Main Content Area with Split Layout */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <SplitLayoutComponent
            leftPanel={
              <WorldModule
                playerId={user.username}
                className="world-module-panel"
              />
            }
            rightTopPanel={
              <VideoCommunicationPanel
                currentRoom={currentVideoRoom}
                onRoomChange={handleVideoRoomChange}
                className="video-panel"
              />
            }
            rightBottomPanel={
              <PersistentChatPanel
                roomId={currentChatRoom}
                onRoomChange={handleChatRoomChange}
                className="chat-panel"
              />
            }
            className="main-split-layout"
          />
        </div>

        {/* Consolidated Settings Modal */}
        <ConsolidatedSettings
          open={showSettings}
          onClose={handleSettingsClose}
        />

        {/* Profile Modal */}
        <Modal
          title="My Profile"
          open={showProfile}
          onCancel={handleProfileClose}
          footer={null}
          width={900}
          style={{ top: 20 }}
        >
          <MyProfileTab />
        </Modal>

        {/* People & Teams Modal */}
        <Modal
          title="People & Teams"
          open={showPeople}
          onCancel={handlePeopleClose}
          footer={null}
          width={1000}
          style={{ top: 20 }}
        >
          <PeopleTab />
        </Modal>
      </div>
    </EventBusProvider>
  );
};

// Main App wrapper component with authentication
const AuthenticatedApp: React.FC = () => {
  const { user } = useAuth();

  if (!user) {
    return null; // This shouldn't happen as we check in the parent
  }

  return (
    <SettingsProvider currentUser={user.username}>
      <EventBusProvider>
        <MapDataProvider>
          <MapSynchronizer
            enableCrossTabSync={true}
            syncDebounceMs={100}
            onSyncError={(error) => {
              logger.error('Map synchronization error', error);
              // TODO: Add user-visible error notification
            }}
            onSyncSuccess={() => {
              logger.info('Map synchronized successfully');
              // TODO: Add user-visible success notification
            }}
          >
            <AppContent />
          </MapSynchronizer>
        </MapDataProvider>
      </EventBusProvider>
    </SettingsProvider>
  );
};

// Root App component with routing
const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner">          
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Simple World Module Demo Route */}
      <Route
        path="/simple-world-demo"
        element={<SimpleWorldModuleDemo />}
      />

      {/* Map Editor Route - accessible to authenticated admin users */}
      <Route
        path="/map-editor"
        element={
          isAuthenticated ? (
            <MapEditorPage />
          ) : (
            <LoginModule />
          )
        }
      />

      {/* Konva Test Suite Route - Comprehensive testing */}
      <Route
        path="/konva-test-suite"
        element={<KonvaTestSuitePage />}
      />

      {/* Main App Route */}
      <Route
        path="/"
        element={
          isAuthenticated ? (
            <AuthenticatedApp />
          ) : (
            <LoginModule />
          )
        }
      />
      {/* Avatar Builder Dedicated Route */}
      <Route
        path="/avatar-builder"
        element={<QuickAvatarBuilder />}
      />
    </Routes>
  );
};

// Theme-aware ConfigProvider wrapper
const ThemedApp: React.FC = () => {
  const { currentTheme } = useTheme();

  return (
    <ConfigProvider theme={currentTheme.antdConfig}>
      {/* Ant Design App provider enables context-driven components like message, modal, notification */}
      <AntdApp>
        <AuthProvider>
          <App />
        </AuthProvider>
      </AntdApp>
    </ConfigProvider>
  );
};

// Main App wrapper with all providers
const AppWithProviders: React.FC = () => {
  return (
    <ThemeProvider>
      <ModalStateProvider>
        <ThemedApp />
      </ModalStateProvider>
    </ThemeProvider>
  );
};

export default AppWithProviders;