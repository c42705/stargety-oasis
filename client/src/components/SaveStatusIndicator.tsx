/**
 * Save Status Indicator Component
 * 
 * This component provides visual feedback about the save state of the map data,
 * including saving progress, success states, error states, and unsaved changes.
 * 
 * Features:
 * - Real-time save status updates
 * - Visual indicators for different states
 * - Manual save button
 * - Auto-save configuration
 * - Error handling and display
 */

import React, { useState, useEffect } from 'react';
import { SharedMapSystem } from '../shared/SharedMapSystem';
import { Save, AlertCircle, CheckCircle, Clock, Settings } from 'lucide-react';
import './SaveStatusIndicator.css';

interface SaveStatusIndicatorProps {
  className?: string;
  showManualSave?: boolean;
  showAutoSaveToggle?: boolean;
  onSaveSuccess?: () => void;
  onSaveError?: (error: string) => void;
}

export const SaveStatusIndicator: React.FC<SaveStatusIndicatorProps> = ({
  className = '',
  showManualSave = true,
  showAutoSaveToggle = true,
  onSaveSuccess,
  onSaveError
}) => {
  const [saveState, setSaveState] = useState({
    isSaving: false,
    hasUnsavedChanges: false,
    lastSaveTime: null as Date | null,
    saveError: null as string | null,
    autoSaveEnabled: true
  });

  const [isManualSaving, setIsManualSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Get SharedMapSystem instance
  const mapSystem = SharedMapSystem.getInstance();

  // Update save state from SharedMapSystem
  const updateSaveState = () => {
    const currentState = mapSystem.getSaveState();
    setSaveState(currentState);
  };

  // Set up event listeners
  useEffect(() => {
    // Initial state
    updateSaveState();

    const handleSaving = () => {
      updateSaveState();
    };

    const handleSaved = () => {
      updateSaveState();
      onSaveSuccess?.();
    };

    const handleSaveError = (data: any) => {
      updateSaveState();
      onSaveError?.(data.error);
    };

    const handleMapChanged = () => {
      updateSaveState();
    };

    // Subscribe to events
    mapSystem.on('map:saving', handleSaving);
    mapSystem.on('map:saved', handleSaved);
    mapSystem.on('map:save:error', handleSaveError);
    mapSystem.on('map:changed', handleMapChanged);

    // Cleanup
    return () => {
      mapSystem.off('map:saving', handleSaving);
      mapSystem.off('map:saved', handleSaved);
      mapSystem.off('map:save:error', handleSaveError);
      mapSystem.off('map:changed', handleMapChanged);
    };
  }, [mapSystem, onSaveSuccess, onSaveError]);

  // Manual save handler
  const handleManualSave = async () => {
    if (isManualSaving || saveState.isSaving) return;

    try {
      setIsManualSaving(true);
      await mapSystem.saveMapData(undefined, true); // Force save
    } catch (error) {
      console.error('Manual save failed:', error);
    } finally {
      setIsManualSaving(false);
    }
  };

  // Auto-save toggle handler
  const handleAutoSaveToggle = () => {
    const newEnabled = !saveState.autoSaveEnabled;
    mapSystem.configureAutoSave(newEnabled);
    updateSaveState();
  };

  // Get status display info
  const getStatusInfo = () => {
    if (saveState.isSaving || isManualSaving) {
      return {
        icon: <Clock className="animate-spin" size={16} />,
        text: 'Saving...',
        className: 'saving'
      };
    }

    if (saveState.saveError) {
      return {
        icon: <AlertCircle size={16} />,
        text: `Error: ${saveState.saveError}`,
        className: 'error'
      };
    }

    if (saveState.hasUnsavedChanges) {
      return {
        icon: <AlertCircle size={16} />,
        text: 'Unsaved changes',
        className: 'unsaved'
      };
    }

    if (saveState.lastSaveTime) {
      const timeAgo = getTimeAgo(saveState.lastSaveTime);
      return {
        icon: <CheckCircle size={16} />,
        text: `Saved ${timeAgo}`,
        className: 'saved'
      };
    }

    return {
      icon: <Save size={16} />,
      text: 'Ready to save',
      className: 'ready'
    };
  };

  // Format time ago
  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffSeconds < 60) {
      return 'just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className={`save-status-indicator ${className}`}>
      {/* Main Status Display */}
      <div className={`status-display ${statusInfo.className}`}>
        <span className="status-icon">{statusInfo.icon}</span>
        <span className="status-text">{statusInfo.text}</span>
      </div>

      {/* Action Buttons */}
      <div className="status-actions">
        {showManualSave && (
          <button
            onClick={handleManualSave}
            disabled={isManualSaving || saveState.isSaving}
            className="save-button"
            title="Save map manually"
          >
            <Save size={14} />
            {isManualSaving ? 'Saving...' : 'Save'}
          </button>
        )}

        {showAutoSaveToggle && (
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="settings-button"
            title="Save settings"
          >
            <Settings size={14} />
          </button>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="save-settings">
          <div className="setting-item">
            <label>
              <input
                type="checkbox"
                checked={saveState.autoSaveEnabled}
                onChange={handleAutoSaveToggle}
              />
              Auto-save enabled
            </label>
          </div>
          <div className="setting-info">
            <p>Auto-save triggers 2 seconds after changes</p>
          </div>
        </div>
      )}

      {/* Detailed Status (when expanded) */}
      {saveState.lastSaveTime && (
        <div className="detailed-status">
          <div className="status-detail">
            <span className="detail-label">Last saved:</span>
            <span className="detail-value">
              {saveState.lastSaveTime.toLocaleString()}
            </span>
          </div>
          {saveState.autoSaveEnabled && (
            <div className="status-detail">
              <span className="detail-label">Auto-save:</span>
              <span className="detail-value">Enabled</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
