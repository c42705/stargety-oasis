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

import React, { useState, useCallback, useRef } from 'react';
import { useSharedMap } from '../shared/useSharedMap';
import { SharedMapSystem } from '../shared/SharedMapSystem';
import './MapDataManager.css';

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
  const handleFileInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleImportMap(file);
    }
    // Reset input value to allow importing the same file again
    event.target.value = '';
  }, [handleImportMap]);

  /**
   * Trigger file input click
   */
  const triggerFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

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
      console.log('Map data copied to clipboard');
      
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

  return (
    <div className={`map-data-manager ${className}`}>
      <div className="manager-header">
        <h4>Map Data Management</h4>
        {mapStats && (
          <div className="map-stats">
            <span>Version: {mapStats.version}</span>
            <span>Areas: {mapStats.interactiveAreasCount}</span>
            <span>Collisions: {mapStats.collisionAreasCount}</span>
          </div>
        )}
      </div>

      {/* File Operations */}
      <div className="manager-section">
        <h5>File Operations</h5>
        <div className="button-group">
          <button
            onClick={handleSaveMap}
            disabled={isSaving || sharedMap.isLoading}
            className="manager-button primary"
          >
            {isSaving ? '💾 Saving...' : '💾 Save Map'}
          </button>
          
          <button
            onClick={handleExportMap}
            disabled={isExporting || sharedMap.isLoading}
            className="manager-button"
          >
            {isExporting ? '📤 Exporting...' : '📤 Export Map'}
          </button>
          
          <button
            onClick={triggerFileInput}
            disabled={isImporting || sharedMap.isLoading}
            className="manager-button"
          >
            {isImporting ? '📥 Importing...' : '📥 Import Map'}
          </button>
        </div>
      </div>

      {/* Clipboard Operations */}
      <div className="manager-section">
        <h5>Clipboard Operations</h5>
        <div className="button-group">
          <button
            onClick={handleCopyToClipboard}
            disabled={sharedMap.isLoading}
            className="manager-button"
          >
            📋 Copy to Clipboard
          </button>
          
          <button
            onClick={handlePasteFromClipboard}
            disabled={isImporting || sharedMap.isLoading}
            className="manager-button"
          >
            {isImporting ? '📋 Pasting...' : '📋 Paste from Clipboard'}
          </button>
        </div>
      </div>

      {/* Backup Operations */}
      <div className="manager-section">
        <h5>Backup & Recovery</h5>
        <div className="button-group">
          <button
            onClick={handleRestoreBackup}
            disabled={isRestoring || sharedMap.isLoading}
            className="manager-button warning"
          >
            {isRestoring ? '🔄 Restoring...' : '🔄 Restore Backup'}
          </button>
        </div>
        <p className="backup-info">
          Restores the last automatically saved backup. This will overwrite current changes.
        </p>
      </div>

      {/* Map Information */}
      {mapStats && (
        <div className="manager-section">
          <h5>Map Information</h5>
          <div className="map-info">
            <div className="info-row">
              <span className="info-label">Last Modified:</span>
              <span className="info-value">
                {mapStats.lastModified.toLocaleString()}
              </span>
            </div>
            <div className="info-row">
              <span className="info-label">Interactive Areas:</span>
              <span className="info-value">{mapStats.interactiveAreasCount}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Collision Areas:</span>
              <span className="info-value">{mapStats.collisionAreasCount}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Total Elements:</span>
              <span className="info-value">{mapStats.totalElements}</span>
            </div>
            <div className="info-row">
              <span className="info-label">Layers:</span>
              <span className="info-value">{mapStats.layersCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {sharedMap.error && (
        <div className="manager-error">
          <span>⚠️ {sharedMap.error}</span>
          <button onClick={sharedMap.clearError} className="error-close">×</button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileInputChange}
        style={{ display: 'none' }}
      />

      {/* TODO Notice */}
      <div className="todo-notice">
        <h6>🚧 Future Enhancements</h6>
        <ul>
          <li>Cloud storage integration for map sharing</li>
          <li>Map versioning and diff visualization</li>
          <li>Collaborative editing with conflict resolution</li>
          <li>Map templates and preset library</li>
          <li>Database migration for persistent storage</li>
        </ul>
      </div>
    </div>
  );
};
