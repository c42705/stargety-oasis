import React, { useState } from 'react';
import { Video, Globe, Settings, MessageCircle, Users, User } from 'lucide-react';
import { EventBusProvider } from './shared/EventBusContext';
import { SettingsProvider, useSettings } from './shared/SettingsContext';
import { AuthProvider, useAuth } from './shared/AuthContext';
import { ChatModule } from './modules/chat/ChatModule';
import { VideoCallModule } from './modules/video-call/VideoCallModule';
import { WorldModule } from './modules/world/WorldModule';
import { RingCentralModule } from './modules/ringcentral/RingCentralModule';
import { SettingsModule } from './modules/settings/SettingsModule';
import { LoginModule } from './modules/login/LoginModule';
import { SlidingPanel, PanelToggle, PanelTab } from './components/SlidingPanel';
import { PeopleTab } from './components/panel-tabs/PeopleTab';
import { MyProfileTab } from './components/panel-tabs/MyProfileTab';
import './App.css';

type ActiveModule = 'video' | 'world' | 'ringcentral' | 'settings';

// Inner App component that uses both auth and settings context
const AppContent: React.FC = () => {
  const { user, logout } = useAuth();
  const { settings } = useSettings();
  const [activeModule, setActiveModule] = useState<ActiveModule>('world');
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // If no user is authenticated, this shouldn't render
  if (!user) {
    return null;
  }

  const renderActiveModule = () => {
    switch (activeModule) {
      case 'video':
        // Show the selected video service based on settings
        if (settings.videoService === 'jitsi') {
          return (
            <VideoCallModule
              roomId={user.roomId}
              userName={user.username}
              className="module-content"
            />
          );
        } else {
          return (
            <RingCentralModule
              userName={user.username}
              className="module-content"
            />
          );
        }
      case 'world':
        return (
          <WorldModule
            playerId={user.username}
            className="module-content"
          />
        );
      case 'settings':
        return (
          <SettingsModule
            className="module-content"
          />
        );
      default:
        return null;
    }
  };

  // Get available navigation tabs based on admin status
  const getNavigationTabs = () => {
    const baseTabs = [
      // Chat is now accessible through the side panel, so removed from main navigation
      {
        id: 'video' as ActiveModule,
        label: `${settings.videoService === 'jitsi' ? 'Jitsi Meet' : 'RingCentral'}`,
        icon: <Video size={18} />
      },
      {
        id: 'world' as ActiveModule,
        label: 'Virtual World',
        icon: <Globe size={18} />
      },
    ];

    // Add settings tab for admin users
    if (user.isAdmin) {
      baseTabs.push({
        id: 'settings' as ActiveModule,
        label: 'Settings',
        icon: <Settings size={18} />
      });
    }

    return baseTabs;
  };

  // Handle logout
  const handleLogout = () => {
    logout();
  };

  // Handle panel toggle
  const handlePanelToggle = () => {
    setIsPanelOpen(!isPanelOpen);
  };

  // Create panel tabs (Chat is now the primary interface through the side panel)
  const panelTabs: PanelTab[] = [
    {
      id: 'chat',
      label: 'Chat',
      icon: <MessageCircle size={16} />,
      component: (
        <ChatModule
          currentUser={user.username}
          roomId={user.roomId}
          className="panel-chat-module"
        />
      )
    },
    {
      id: 'people',
      label: 'People',
      icon: <Users size={16} />,
      component: <PeopleTab />
    },
    {
      id: 'profile',
      label: 'My Profile',
      icon: <User size={16} />,
      component: <MyProfileTab />
    }
  ];

  return (
    <EventBusProvider>
      <div className="App">
        {/* Panel Toggle Button */}
        <PanelToggle
          isOpen={isPanelOpen}
          onToggle={handlePanelToggle}
        />

        {/* Sliding Panel */}
        <SlidingPanel
          isOpen={isPanelOpen}
          onToggle={handlePanelToggle}
          tabs={panelTabs}
        />

        <header className="App-header">
          <h1>🌟 Stargety Oasis</h1>
          <div className="user-info">
            <span>Welcome, {user.displayName}</span>
            <span>Room: {user.roomId}</span>
            {user.isAdmin && <span className="admin-badge">Admin</span>}
            <button className="logout-button" onClick={handleLogout}>
              🚪 Logout
            </button>
          </div>
        </header>

        <nav className="module-nav">
          {getNavigationTabs().map((tab) => (
            <button
              key={tab.id}
              className={`nav-button ${activeModule === tab.id ? 'active' : ''}`}
              onClick={() => setActiveModule(tab.id)}
            >
              <span className="nav-icon">{tab.icon}</span>
              <span className="nav-label">{tab.label}</span>
            </button>
          ))}
        </nav>

        <main className={`main-content ${isPanelOpen ? 'panel-open' : ''}`}>
          {renderActiveModule()}
        </main>

        <footer className="App-footer">
          <p>Stargety Oasis - Virtual World Platform</p>
        </footer>
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
        <AppContent />
      </EventBusProvider>
    </SettingsProvider>
  );
};

// Root App component
const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state
  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading Stargety Oasis...</p>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!isAuthenticated) {
    return <LoginModule />;
  }

  // Show main app if authenticated
  return <AuthenticatedApp />;
};

// Main App wrapper with all providers
const AppWithProviders: React.FC = () => {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  );
};

export default AppWithProviders;