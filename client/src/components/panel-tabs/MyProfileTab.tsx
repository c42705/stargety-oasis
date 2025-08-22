import React, { useState } from 'react';
import { useAuth } from '../../shared/AuthContext';
import { useSettings } from '../../shared/SettingsContext';
import './PanelTabs.css';

interface UserPreferences {
  notifications: boolean;
  soundEnabled: boolean;
  theme: 'light' | 'dark' | 'auto';
  language: string;
  timezone: string;
  status: 'online' | 'busy' | 'away' | 'offline';
  statusMessage: string;
}

export const MyProfileTab: React.FC = () => {
  const { user, logout } = useAuth();
  const { settings, updateVideoService } = useSettings();
  
  const [preferences, setPreferences] = useState<UserPreferences>({
    notifications: true,
    soundEnabled: true,
    theme: 'auto',
    language: 'en',
    timezone: 'UTC',
    status: 'online',
    statusMessage: 'Working on exciting projects!'
  });

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
    console.log('Preferences saved:', preferences);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online': return '🟢';
      case 'busy': return '🔴';
      case 'away': return '🟡';
      case 'offline': return '⚫';
      default: return '🟢';
    }
  };

  if (!user) return null;

  return (
    <div className="profile-tab">
      {/* User Profile Header */}
      <div className="profile-header">
        <div className="profile-avatar-large">
          <div className="avatar-circle-large">
            {user.displayName.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="status-overlay">
            {getStatusIcon(preferences.status)}
          </div>
        </div>
        
        <div className="profile-info">
          <h3 className="profile-name">{user.displayName}</h3>
          <p className="profile-username">@{user.username}</p>
          {user.isAdmin && (
            <span className="admin-badge-profile">Administrator</span>
          )}
          <p className="profile-room">Room: {user.roomId}</p>
        </div>
      </div>

      {/* Status Section */}
      <div className="profile-section">
        <h4 className="section-title">Status</h4>
        <div className="status-controls">
          <select
            value={preferences.status}
            onChange={(e) => handlePreferenceChange('status', e.target.value)}
            className="status-select"
          >
            <option value="online">🟢 Online</option>
            <option value="busy">🔴 Busy</option>
            <option value="away">🟡 Away</option>
            <option value="offline">⚫ Offline</option>
          </select>
          
          <input
            type="text"
            placeholder="Set a status message..."
            value={preferences.statusMessage}
            onChange={(e) => handlePreferenceChange('statusMessage', e.target.value)}
            className="status-message-input"
          />
        </div>
      </div>

      {/* Preferences Section */}
      <div className="profile-section">
        <div className="section-header">
          <h4 className="section-title">Preferences</h4>
          <button
            className="edit-button"
            onClick={() => setIsEditing(!isEditing)}
          >
            {isEditing ? '💾 Save' : '✏️ Edit'}
          </button>
        </div>
        
        <div className="preferences-list">
          <div className="preference-item">
            <label className="preference-label">
              <input
                type="checkbox"
                checked={preferences.notifications}
                onChange={(e) => handlePreferenceChange('notifications', e.target.checked)}
                disabled={!isEditing}
              />
              <span>Enable Notifications</span>
            </label>
          </div>
          
          <div className="preference-item">
            <label className="preference-label">
              <input
                type="checkbox"
                checked={preferences.soundEnabled}
                onChange={(e) => handlePreferenceChange('soundEnabled', e.target.checked)}
                disabled={!isEditing}
              />
              <span>Sound Effects</span>
            </label>
          </div>
          
          <div className="preference-item">
            <label className="preference-label">
              <span>Theme</span>
              <select
                value={preferences.theme}
                onChange={(e) => handlePreferenceChange('theme', e.target.value)}
                disabled={!isEditing}
                className="preference-select"
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="auto">Auto</option>
              </select>
            </label>
          </div>
          
          <div className="preference-item">
            <label className="preference-label">
              <span>Language</span>
              <select
                value={preferences.language}
                onChange={(e) => handlePreferenceChange('language', e.target.value)}
                disabled={!isEditing}
                className="preference-select"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
              </select>
            </label>
          </div>
        </div>
        
        {isEditing && (
          <div className="preference-actions">
            <button className="save-btn" onClick={handleSavePreferences}>
              Save Changes
            </button>
            <button className="cancel-btn" onClick={() => setIsEditing(false)}>
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Admin Settings (if admin) */}
      {user.isAdmin && (
        <div className="profile-section">
          <h4 className="section-title">Admin Settings</h4>
          <div className="admin-controls">
            <div className="admin-setting">
              <label className="preference-label">
                <span>Video Service</span>
                <select
                  value={settings.videoService}
                  onChange={(e) => updateVideoService(e.target.value as 'jitsi' | 'ringcentral')}
                  className="preference-select"
                >
                  <option value="jitsi">Jitsi Meet</option>
                  <option value="ringcentral">RingCentral</option>
                </select>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Account Actions */}
      <div className="profile-section">
        <h4 className="section-title">Account</h4>
        <div className="account-actions">
          <button className="account-btn secondary">
            <span className="action-icon">🔒</span>
            <span>Change Password</span>
          </button>
          <button className="account-btn secondary">
            <span className="action-icon">📧</span>
            <span>Update Email</span>
          </button>
          <button className="account-btn danger" onClick={logout}>
            <span className="action-icon">🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default MyProfileTab;
