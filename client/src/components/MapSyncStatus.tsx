import React, { useState, useEffect } from 'react';
import { Badge, Tooltip, Typography } from 'antd';
import { SyncOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { SharedMapSystem } from '../shared/SharedMapSystem';

const { Text } = Typography;

interface MapSyncStatusProps {
  className?: string;
  showText?: boolean;
}

type SyncStatus = 'idle' | 'syncing' | 'success' | 'error';

/**
 * Map Sync Status Component
 * Shows the current synchronization status between the main app and map editor
 */
export const MapSyncStatus: React.FC<MapSyncStatusProps> = ({
  className = '',
  showText = false
}) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const mapSystem = SharedMapSystem.getInstance();

    // Event handlers
    const handleSyncStarted = () => {
      setSyncStatus('syncing');
      setErrorMessage('');
    };

    const handleSyncCompleted = () => {
      setSyncStatus('success');
      setLastSyncTime(new Date());
      
      // Reset to idle after 2 seconds
      setTimeout(() => {
        setSyncStatus('idle');
      }, 2000);
    };

    const handleSyncError = (data: any) => {
      setSyncStatus('error');
      setErrorMessage(data.error || 'Synchronization failed');
      
      // Reset to idle after 5 seconds
      setTimeout(() => {
        setSyncStatus('idle');
        setErrorMessage('');
      }, 5000);
    };

    const handleMapSaved = () => {
      setSyncStatus('success');
      setLastSyncTime(new Date());
      
      // Reset to idle after 2 seconds
      setTimeout(() => {
        setSyncStatus('idle');
      }, 2000);
    };

    // Subscribe to events
    mapSystem.on('map:sync:started', handleSyncStarted);
    mapSystem.on('map:sync:completed', handleSyncCompleted);
    mapSystem.on('map:sync:error', handleSyncError);
    mapSystem.on('map:saved', handleMapSaved);

    // Cleanup
    return () => {
      mapSystem.off('map:sync:started', handleSyncStarted);
      mapSystem.off('map:sync:completed', handleSyncCompleted);
      mapSystem.off('map:sync:error', handleSyncError);
      mapSystem.off('map:saved', handleMapSaved);
    };
  }, []);

  const getStatusIcon = () => {
    switch (syncStatus) {
      case 'syncing':
        return <SyncOutlined spin style={{ color: '#1890ff' }} />;
      case 'success':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'error':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <SyncOutlined style={{ color: 'var(--color-text-secondary)' }} />;
    }
  };

  const getStatusText = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'Syncing...';
      case 'success':
        return 'Synced';
      case 'error':
        return 'Sync Error';
      default:
        return 'Map Sync';
    }
  };

  const getTooltipContent = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'Synchronizing map data between main app and editor...';
      case 'success':
        return lastSyncTime 
          ? `Last synced: ${lastSyncTime.toLocaleTimeString()}`
          : 'Map data synchronized successfully';
      case 'error':
        return errorMessage || 'Map synchronization failed';
      default:
        return 'Map synchronization status - keeps main app and editor in sync';
    }
  };

  const getBadgeStatus = () => {
    switch (syncStatus) {
      case 'syncing':
        return 'processing';
      case 'success':
        return 'success';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  return (
    <div className={`map-sync-status ${className}`}>
      <Tooltip title={getTooltipContent()} placement="bottom">
        <Badge status={getBadgeStatus()} dot={syncStatus !== 'idle'}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 4,
            cursor: 'help',
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: syncStatus === 'error' ? 'rgba(255, 77, 79, 0.1)' : 
                           syncStatus === 'success' ? 'rgba(82, 196, 26, 0.1)' :
                           syncStatus === 'syncing' ? 'rgba(24, 144, 255, 0.1)' : 'transparent'
          }}>
            {getStatusIcon()}
            {showText && (
              <Text 
                style={{ 
                  fontSize: '12px',
                  color: syncStatus === 'error' ? '#ff4d4f' : 
                         syncStatus === 'success' ? '#52c41a' :
                         syncStatus === 'syncing' ? '#1890ff' : 'var(--color-text-secondary)'
                }}
              >
                {getStatusText()}
              </Text>
            )}
          </div>
        </Badge>
      </Tooltip>
    </div>
  );
};

/**
 * Hook for accessing map sync status
 */
export const useMapSyncStatus = () => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    const mapSystem = SharedMapSystem.getInstance();

    const handleSyncStarted = () => setSyncStatus('syncing');
    const handleSyncCompleted = () => {
      setSyncStatus('success');
      setLastSyncTime(new Date());
      setTimeout(() => setSyncStatus('idle'), 2000);
    };
    const handleSyncError = () => {
      setSyncStatus('error');
      setTimeout(() => setSyncStatus('idle'), 5000);
    };

    mapSystem.on('map:sync:started', handleSyncStarted);
    mapSystem.on('map:sync:completed', handleSyncCompleted);
    mapSystem.on('map:sync:error', handleSyncError);

    return () => {
      mapSystem.off('map:sync:started', handleSyncStarted);
      mapSystem.off('map:sync:completed', handleSyncCompleted);
      mapSystem.off('map:sync:error', handleSyncError);
    };
  }, []);

  return {
    syncStatus,
    lastSyncTime,
    isIdle: syncStatus === 'idle',
    isSyncing: syncStatus === 'syncing',
    isSuccess: syncStatus === 'success',
    isError: syncStatus === 'error'
  };
};

export default MapSyncStatus;
