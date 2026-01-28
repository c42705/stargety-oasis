/**
 * Map Data Manager Component
 *
 * This component provides UI for managing map data including export, import,
 * backup, and restore functionality. It integrates with the Redux mapSlice
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
import { App, Alert, Button, Card, Space, Upload } from 'antd';
import { UploadOutlined, DownloadOutlined, InboxOutlined, CopyOutlined } from '@ant-design/icons';
import { useMapStore } from '../stores/useMapStore';
import { useMapStoreInit } from '../stores/useMapStoreInit';

interface MapDataManagerProps {
  className?: string;
  onMapLoaded?: () => void;
  onMapSaved?: () => void;
  onError?: (error: string) => void;
}

export const MapDataManager: React.FC<MapDataManagerProps> = ({
  className = '',
  onMapLoaded,
  onError
}) => {
  // Initialize the map store
  useMapStoreInit({ autoLoad: true, source: 'editor' });
  
  // Get store state and actions
  const {
    isLoading,
    error,
    exportMap,
    importMap,
    clearError
  } = useMapStore();

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  /**
   * Export map data to JSON file
   */
  const handleExportMap = useCallback(async () => {
    try {
      setIsExporting(true);
      
      const mapData = exportMap();
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
  }, [exportMap, onError]);

  /**
   * Import map data from JSON file
   */
  const handleImportMap = useCallback(async (file: File) => {
    try {
      setIsImporting(true);
      
      const text = await file.text();
      await importMap(text);
      
      onMapLoaded?.();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to import map';
      onError?.(errorMessage);
    } finally {
      setIsImporting(false);
    }
  }, [importMap, onMapLoaded, onError]);

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
   * Copy map data to clipboard
   */
  const handleCopyToClipboard = useCallback(async () => {
    try {
      const mapData = exportMap();
      await navigator.clipboard.writeText(mapData);
      
      // TODO: Show success toast
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to copy to clipboard';
      onError?.(errorMessage);
    }
  }, [exportMap, onError]);

  /**
   * Paste map data from clipboard
   */
  const handlePasteFromClipboard = useCallback(async () => {
    try {
      setIsImporting(true);
      
      const text = await navigator.clipboard.readText();
      await importMap(text);
      
      onMapLoaded?.();
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to paste from clipboard';
      onError?.(errorMessage);
    } finally {
      setIsImporting(false);
    }
  }, [importMap, onMapLoaded, onError]);

  const { message } = App.useApp();

  return (
    <Card size="small" className={className} title="Map Data Management">      
<Space wrap style={{display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <Button icon={<DownloadOutlined />} loading={isExporting} disabled={isLoading} onClick={handleExportMap}>
            Export Map
          </Button>
          <Upload {...uploadProps}>
            <Button icon={<UploadOutlined />} loading={isImporting} disabled={isLoading}>
              Import Map
            </Button>
          </Upload>
      </Space>
          
      

      <Card size="small" type="inner" title="Clipboard Operations" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Button icon={<CopyOutlined />} disabled={isLoading} onClick={async () => {
            await handleCopyToClipboard();
            message.success('Map data copied to clipboard');
          }}>
            Copy to Clipboard
          </Button>
          <Button icon={<InboxOutlined />} loading={isImporting} disabled={isLoading} onClick={handlePasteFromClipboard}>
            Paste from Clipboard
          </Button>
        </Space>
      </Card>


  

      {error && (
        <Alert
          type="error"
          showIcon
          message="Map Error"
          description={error}
          closable
          onClose={clearError}
          style={{ marginBottom: 16 }}
        />
      )}

    </Card>
  );
};
