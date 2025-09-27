/**
 * Map Data Manager Component
 * 
 * This component provides UI for managing map data including export, import,
 * backup, and restore functionality. It integrates with the SharedMapSystem
 * to provide comprehensive map data management.
 * 
 * TODO: Future Enhancements
 * - Add cloud storage integration for map sharing
 * - Implement map versioning and diff visualization
 * - Add collaborative editing conflict resolution UI
 * - Implement map templates and presets
 * - Add batch operations for multiple maps
 */

import React, { useState, useCallback } from 'react';
import { App, Alert, Button, Card, Descriptions, Space, Typography, Upload } from 'antd';
import { UploadOutlined, SaveOutlined, DownloadOutlined, InboxOutlined, CopyOutlined, UndoOutlined } from '@ant-design/icons';
// import { useSharedMap } from '../shared/useSharedMap';
import { useSharedMapCompat as useSharedMap } from '../stores/useSharedMapCompat';
import { SharedMapSystem } from '../shared/SharedMapSystem';

interface MapDataManagerProps {
  className?: string;
  onMapLoaded?: () => void;
  onMapSaved?: () => void;
  onError?: (error: string) => void;
}

export const MapDataManager: React.FC<MapDataManagerProps> = ({
  className = '',
  onMapLoaded,
  onMapSaved,
  onError
}) => {
  const sharedMap = useSharedMap({ source: 'editor' });

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  /**
   * Export map data to JSON file
   */
  const handleExportMap = useCallback(async () => {
    try {
      setIsExporting(true);
      
      const mapData = sharedMap.exportMap();
      const blob = new Blob([mapData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Create download link
      const link = document.createElement('a');
      link.href = url;
      link.download = `stargety-map-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Cleanup
      URL.revokeObjectURL(url);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to export map';
      onError?.(errorMessage);
    } finally {
      setIsExporting(false);
    }
  }, [sharedMap, onError]);

  /**
   * Import map data from JSON file
   */
  const handleImportMap = useCallback(async (file: File) => {
    try {
      setIsImporting(true);
      
      const text = await file.text();
      await sharedMap.importMap(text);
      
      onMapLoaded?.();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to import map';
      onError?.(errorMessage);
    } finally {
      setIsImporting(false);
    }
  }, [sharedMap, onMapLoaded, onError]);

  /**
   * Handle file input change
   */
  const uploadProps = {
    accept: '.json',
    maxCount: 1,
    showUploadList: false,
    beforeUpload: async (file: File) => {
      await handleImportMap(file);
      return Upload.LIST_IGNORE; // prevent auto-upload
    },
  } as const;

  /**
   * Trigger file input click
   */


  /**
   * Save current map data
   */
  const handleSaveMap = useCallback(async () => {
    try {
      setIsSaving(true);
      await sharedMap.saveMap();
      onMapSaved?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save map';
      onError?.(errorMessage);
    } finally {
      setIsSaving(false);
    }
  }, [sharedMap, onMapSaved, onError]);

  /**
   * Restore from backup
   */
  const handleRestoreBackup = useCallback(async () => {
    try {
      setIsRestoring(true);
      
      const mapSystem = SharedMapSystem.getInstance();
      await mapSystem.restoreFromBackup();
      
      onMapLoaded?.();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to restore from backup';
      onError?.(errorMessage);
    } finally {
      setIsRestoring(false);
    }
  }, [onMapLoaded, onError]);

  /**
   * Copy map data to clipboard
   */
  const handleCopyToClipboard = useCallback(async () => {
    try {
      const mapData = sharedMap.exportMap();
      await navigator.clipboard.writeText(mapData);
      
      // TODO: Show success toast
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to copy to clipboard';
      onError?.(errorMessage);
    }
  }, [sharedMap, onError]);

  /**
   * Paste map data from clipboard
   */
  const handlePasteFromClipboard = useCallback(async () => {
    try {
      setIsImporting(true);
      
      const text = await navigator.clipboard.readText();
      await sharedMap.importMap(text);
      
      onMapLoaded?.();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to paste from clipboard';
      onError?.(errorMessage);
    } finally {
      setIsImporting(false);
    }
  }, [sharedMap, onMapLoaded, onError]);

  /**
   * Get map statistics
   */
  const mapStats = sharedMap.getMapStatistics();

  const { message } = App.useApp();

  return (
    <Card size="small" className={className} title={<Typography.Title level={4} style={{ margin: 0 }}>Map Data Management</Typography.Title>}>
      {mapStats && (
        <Descriptions size="small" column={3} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="Version">{mapStats.version}</Descriptions.Item>
          <Descriptions.Item label="Areas">{mapStats.interactiveAreasCount}</Descriptions.Item>
          <Descriptions.Item label="Collisions">{mapStats.collisionAreasCount}</Descriptions.Item>
        </Descriptions>
      )}

      <Card size="small" type="inner" title="File Operations" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button type="primary" icon={<SaveOutlined />} loading={isSaving} disabled={sharedMap.isLoading} onClick={handleSaveMap}>
            Save Map
          </Button>
          <Button icon={<DownloadOutlined />} loading={isExporting} disabled={sharedMap.isLoading} onClick={handleExportMap}>
            Export Map
          </Button>
          <Upload {...uploadProps}>
            <Button icon={<UploadOutlined />} loading={isImporting} disabled={sharedMap.isLoading}>
              Import Map
            </Button>
          </Upload>
        </Space>
      </Card>

      <Card size="small" type="inner" title="Clipboard Operations" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button icon={<CopyOutlined />} disabled={sharedMap.isLoading} onClick={async () => {
            await handleCopyToClipboard();
            message.success('Map data copied to clipboard');
          }}>
            Copy to Clipboard
          </Button>
          <Button icon={<InboxOutlined />} loading={isImporting} disabled={sharedMap.isLoading} onClick={handlePasteFromClipboard}>
            Paste from Clipboard
          </Button>
        </Space>
      </Card>

      <Card size="small" type="inner" title="Backup & Recovery" style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Button danger icon={<UndoOutlined />} loading={isRestoring} disabled={sharedMap.isLoading} onClick={handleRestoreBackup}>
            Restore Backup
          </Button>
          <Typography.Text type="secondary">
            Restores the last automatically saved backup. This will overwrite current changes.
          </Typography.Text>
        </Space>
      </Card>

      {mapStats && (
        <Card size="small" type="inner" title="Map Information" style={{ marginBottom: 16 }}>
          <Descriptions size="small" column={2}>
            <Descriptions.Item label="Last Modified">{mapStats.lastModified.toLocaleString()}</Descriptions.Item>
            <Descriptions.Item label="Interactive Areas">{mapStats.interactiveAreasCount}</Descriptions.Item>
            <Descriptions.Item label="Collision Areas">{mapStats.collisionAreasCount}</Descriptions.Item>
            <Descriptions.Item label="Total Elements">{mapStats.totalElements}</Descriptions.Item>
            <Descriptions.Item label="Layers">{mapStats.layersCount}</Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      {sharedMap.error && (
        <Alert
          type="error"
          showIcon
          message="Map Error"
          description={sharedMap.error}
          closable
          onClose={sharedMap.clearError}
          style={{ marginBottom: 16 }}
        />
      )}



      <Card size="small" type="inner" title="Future Enhancements">
        <ul style={{ marginBottom: 0 }}>
          <li>Cloud storage integration for map sharing</li>
          <li>Map versioning and diff visualization</li>
          <li>Collaborative editing with conflict resolution</li>
          <li>Map templates and preset library</li>
          <li>Database migration for persistent storage</li>
        </ul>
      </Card>
    </Card>
  );
};
