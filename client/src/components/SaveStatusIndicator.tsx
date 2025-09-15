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
import { Button, Space, Typography, Badge, Spin, Switch, Popover, Alert } from 'antd';
import { SaveOutlined, CheckCircleOutlined, ExclamationCircleOutlined, SettingOutlined } from '@ant-design/icons';
import { Clock } from 'lucide-react';
// import { SharedMapSystem } from '../shared/SharedMapSystem';
import { useMapStore } from '../stores/useMapStore';

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

  // Get state from Zustand store
  const {
    isLoading,
    isDirty,
    lastSaved,
    error,
    saveMap,
    autoSaveEnabled,
    setAutoSaveEnabled
  } = useMapStore();

  // Update save state based on store state
  useEffect(() => {
    setSaveState({
      isSaving: isLoading,
      hasUnsavedChanges: isDirty,
      lastSaveTime: lastSaved,
      saveError: error,
      autoSaveEnabled: autoSaveEnabled
    });

    // Trigger callbacks
    if (lastSaved && !isLoading && !error) {
      onSaveSuccess?.();
    }
    if (error) {
      onSaveError?.(error);
    }
  }, [isLoading, isDirty, lastSaved, error, autoSaveEnabled, onSaveSuccess, onSaveError]);

  // Manual save handler
  const handleManualSave = async () => {
    if (isManualSaving || saveState.isSaving) return;

    try {
      setIsManualSaving(true);
      await saveMap(); // Use Zustand store save
    } catch (error) {
      console.error('Manual save failed:', error);
    } finally {
      setIsManualSaving(false);
    }
  };

  // Auto-save toggle handler
  const handleAutoSaveToggle = () => {
    const newEnabled = !autoSaveEnabled;
    setAutoSaveEnabled(newEnabled);
    console.log(`Auto-save ${newEnabled ? 'enabled' : 'disabled'}`);
  };

  // Get status display info
  const getStatusInfo = () => {
    if (saveState.isSaving || isManualSaving) {
      return {
        text: 'Saving...',
        className: 'saving'
      };
    }

    if (saveState.saveError) {
      return {
        text: `Error: ${saveState.saveError}`,
        className: 'error'
      };
    }

    if (saveState.hasUnsavedChanges) {
      return {
        text: 'Unsaved changes',
        className: 'unsaved'
      };
    }

    if (saveState.lastSaveTime) {
      const timeAgo = getTimeAgo(saveState.lastSaveTime);
      return {
        text: `Saved ${timeAgo}`,
        className: 'saved'
      };
    }

    return {
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

  // Settings panel content
  const settingsContent = (
    <div style={{ padding: '8px', minWidth: '200px' }}>
      <Space direction="horizontal" style={{ width: '100%' }}>
        <Space>
          <Switch
            checked={autoSaveEnabled}
            onChange={handleAutoSaveToggle}
            size="small"
          />
          <Typography.Text style={{ fontSize: '12px' }}>
            Auto-save enabled
          </Typography.Text>
        </Space>
        <Typography.Text type="secondary" style={{ fontSize: '11px' }}>
          Auto-save triggers 2 seconds after changes
        </Typography.Text>
      </Space>
    </div>
  );

  return (
    <Space
      size="small"
      className={className}
     
    >
      <Space direction="horizontal" size="small" style={{ width: '100%' }}>
        {/* Main Status Display */}
        <Space>
          {saveState.isSaving ? (
            <Spin size="small" />
          ) : saveState.saveError ? (
            <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
          ) : saveState.hasUnsavedChanges ? (
            <Clock size={16} style={{ color: '#faad14' }} />
          ) : saveState.lastSaveTime ? (
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
          ) : (
            <SaveOutlined style={{ color: 'var(--color-text-secondary)' }} />
          )}

          <Typography.Text style={{ fontSize: '12px', color: 'var(--color-text-primary)' }}>
            {statusInfo.text}
          </Typography.Text>
        </Space>

        {/* Action Buttons */}
        <Space>
          {showManualSave && (
            <Button
              size="small"
              icon={<SaveOutlined />}
              onClick={handleManualSave}
              loading={isManualSaving || saveState.isSaving}
              style={{
                backgroundColor: 'var(--color-accent)',
                borderColor: 'var(--color-accent)',
                color: 'white'
              }}
            >
              {isManualSaving ? 'Saving...' : 'Save'}
            </Button>
          )}

          {showAutoSaveToggle && (
            <Popover
              content={settingsContent}
              trigger="click"
              placement="bottomLeft"
              title="Save Settings"
            >
              <Button
                size="small"
                icon={<SettingOutlined />}
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  borderColor: 'var(--color-border)',
                  color: 'var(--color-text-primary)'
                }}
              />
            </Popover>
          )}
        </Space>

        {/* Error Display */}
        {saveState.saveError && (
          <Alert
            message={saveState.saveError}
            type="error"
            showIcon
            style={{ fontSize: '11px' }}
          />
        )}

        {/* Detailed Status */}
        {saveState.lastSaveTime && (
          <Space direction="vertical" size="small" style={{ fontSize: '11px' }}>
            <Typography.Text type="secondary" style={{ fontSize: '11px' }}>
              Last saved: {saveState.lastSaveTime.toLocaleString()}
            </Typography.Text>
            {autoSaveEnabled && (
              <Badge status="success" text="Auto-save enabled" style={{ fontSize: '11px' }} />
            )}
          </Space>
        )}
      </Space>
    </Space>
  );
};
