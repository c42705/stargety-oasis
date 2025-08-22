import React, { useState, useCallback } from 'react';
import { useSettings, VideoServiceType } from '../../shared/SettingsContext';
import './SettingsModule.css';

interface SettingsModuleProps {
  className?: string;
}

export const SettingsModule: React.FC<SettingsModuleProps> = ({ className = '' }) => {
  const { settings, updateVideoService, saveSettings, resetSettings } = useSettings();
  const [tempVideoService, setTempVideoService] = useState<VideoServiceType>(settings.videoService);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

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

  const handleVideoServiceChange = useCallback((service: VideoServiceType) => {
    setTempVideoService(service);
  }, []);

  const handleSaveSettings = useCallback(async () => {
    if (tempVideoService !== settings.videoService) {
      setShowConfirmDialog(true);
      return;
    }

    await performSave();
  }, [tempVideoService, settings.videoService]);

  const performSave = useCallback(async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      // Update the video service
      updateVideoService(tempVideoService);

      // Save to localStorage
      setTimeout(() => {
        saveSettings();
        setIsSaving(false);
        setSaveMessage('Settings saved successfully!');
        setShowConfirmDialog(false);

        // Clear success message after 3 seconds
        setTimeout(() => setSaveMessage(null), 3000);
      }, 500); // Small delay for better UX

    } catch (error) {
      setIsSaving(false);
      setSaveMessage('Failed to save settings. Please try again.');
      console.error('Settings save error:', error);
    }
  }, [tempVideoService, updateVideoService, saveSettings]);

  const handleResetSettings = useCallback(() => {
    resetSettings();
    setTempVideoService('ringcentral');
    setSaveMessage('Settings reset to defaults');
    setTimeout(() => setSaveMessage(null), 3000);
  }, [resetSettings]);

  const handleConfirmChange = useCallback(() => {
    performSave();
  }, [performSave]);

  const handleCancelChange = useCallback(() => {
    setShowConfirmDialog(false);
    setTempVideoService(settings.videoService);
  }, [settings.videoService]);

  const hasChanges = tempVideoService !== settings.videoService;

  return (
    <div className={`settings-module ${className}`}>
      <div className="settings-header">
        <h2>⚙️ Admin Settings</h2>
        <p className="settings-subtitle">Configure video calling service and application preferences</p>
      </div>

      <div className="settings-content">
        {/* Video Service Selection */}
        <div className="settings-section">
          <h3>Video Calling Service</h3>
          <p className="section-description">
            Choose the video conferencing platform for your organization
          </p>

          <div className="video-service-options">
            {videoServiceOptions.map((option) => (
              <div
                key={option.value}
                className={`service-option ${tempVideoService === option.value ? 'selected' : ''}`}
                onClick={() => handleVideoServiceChange(option.value)}
              >
                <div className="service-header">
                  <div className="service-radio">
                    <input
                      type="radio"
                      name="videoService"
                      value={option.value}
                      checked={tempVideoService === option.value}
                      onChange={() => handleVideoServiceChange(option.value)}
                    />
                    <span className="radio-custom"></span>
                  </div>
                  <div className="service-info">
                    <h4>{option.label}</h4>
                    <p>{option.description}</p>
                  </div>
                  {settings.videoService === option.value && (
                    <div className="current-badge">Current</div>
                  )}
                </div>

                <div className="service-features">
                  <h5>Key Features:</h5>
                  <ul>
                    {option.features.map((feature, index) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="settings-actions">
          <button
            onClick={handleSaveSettings}
            disabled={isSaving || !hasChanges}
            className={`save-button ${hasChanges ? 'has-changes' : ''}`}
          >
            {isSaving ? (
              <>
                <span className="spinner"></span>
                Saving...
              </>
            ) : (
              <>
                💾 {hasChanges ? 'Apply Changes' : 'No Changes'}
              </>
            )}
          </button>

          <button
            onClick={handleResetSettings}
            className="reset-button"
            disabled={isSaving}
          >
            🔄 Reset to Defaults
          </button>
        </div>

        {/* Status Messages */}
        {saveMessage && (
          <div className={`save-message ${saveMessage.includes('Failed') ? 'error' : 'success'}`}>
            {saveMessage.includes('Failed') ? '❌' : '✅'} {saveMessage}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="confirmation-overlay">
          <div className="confirmation-dialog">
            <h3>⚠️ Confirm Service Change</h3>
            <p>
              You are about to change the video calling service from{' '}
              <strong>{videoServiceOptions.find(o => o.value === settings.videoService)?.label}</strong> to{' '}
              <strong>{videoServiceOptions.find(o => o.value === tempVideoService)?.label}</strong>.
            </p>
            <p>
              This will affect all users in your organization. The change will take effect immediately.
            </p>
            <div className="confirmation-actions">
              <button onClick={handleConfirmChange} className="confirm-button">
                ✅ Confirm Change
              </button>
              <button onClick={handleCancelChange} className="cancel-button">
                ❌ Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
