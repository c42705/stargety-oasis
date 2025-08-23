import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { MessageCircle, Users, User, Star, LogOut, Settings, MapPin } from 'lucide-react';
import { EventBusProvider } from './shared/EventBusContext';
import { SettingsProvider } from './shared/SettingsContext';
import { AuthProvider, useAuth } from './shared/AuthContext';
import { ChatModule } from './modules/chat/ChatModule';
import { WorldModule } from './modules/world/WorldModule';
import { SettingsModule } from './modules/settings/SettingsModule';
import { LoginModule } from './modules/login/LoginModule';
import { SlidingPanel, PanelToggle, PanelTab } from './components/SlidingPanel';
import { PeopleTab } from './components/panel-tabs/PeopleTab';
import { MyProfileTab } from './components/panel-tabs/MyProfileTab';
import { MapEditorPage } from './pages/MapEditorPage';
import './App.css';

// Inner App component that uses both auth and settings context
const AppContent: React.FC = () => {
  const { user, logout } = useAuth();
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // If no user is authenticated, this shouldn't render
  if (!user) {
    return null;
  }



  // Handle logout
  const handleLogout = () => {
    logout();
  };

  // Handle panel toggle
  const handlePanelToggle = () => {
    setIsPanelOpen(!isPanelOpen);
  };

  // Handle map editor navigation
  const handleMapEditorClick = () => {
    // Open Map Editor in new tab
    window.open('/map-editor', '_blank');
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

  // Add settings tab for admin users
  if (user.isAdmin) {
    panelTabs.push({
      id: 'settings',
      label: 'Settings',
      icon: <Settings size={16} />,
      component: (
        <SettingsModule
          className="panel-settings-module"
        />
      )
    });
  }

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
          <h1>
            <Star size={24} className="app-logo" /> Stargety Oasis
          </h1>
          <div className="user-info">
            <span>Welcome, {user.displayName}</span>
            <span>Room: {user.roomId}</span>
            {user.isAdmin && <span className="admin-badge">Admin</span>}
            {user.isAdmin && (
              <button className="map-editor-button" onClick={handleMapEditorClick}>
                <MapPin size={16} /> Map Editor
              </button>
            )}
            <button className="logout-button" onClick={handleLogout}>
              <LogOut size={16} /> Logout
            </button>
          </div>
        </header>

        <main className={`main-content ${isPanelOpen ? 'panel-open' : ''}`}>
          <WorldModule
            playerId={user.username}
            className="module-content"
          />
        </main>
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

// Root App component with routing
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

  return (
    <Routes>
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
    </Routes>
  );
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