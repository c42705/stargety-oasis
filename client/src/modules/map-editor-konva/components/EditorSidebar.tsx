/**
 * EditorSidebar Component (Right Sidebar)
 *
 * 3-tab structure following Figma/Unity pattern:
 * - Properties: Selection-driven editing
 * - Assets: Asset library and upload
 * - Settings: Grid, preview mode, editor settings
 */

import React from 'react';
import type { TabId, InteractiveArea } from '../types';
import type { GridConfig } from '../types/ui.types';
import type { Shape } from '../types';
import type { ImpassableArea } from '../../../shared/MapDataContext';
import { EDITOR_TABS } from '../constants/editorConstants';
import { PropertiesTab } from './tabs/PropertiesTab';
import { AssetsTab } from './tabs/AssetsTab';
import { SettingsTab } from './tabs/SettingsTab';

interface EditorSidebarProps {
  // Tab state
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;

  // Properties tab (selection-driven)
  selectedIds: string[];
  shapes: Shape[];
  areas: InteractiveArea[];
  impassableAreas: ImpassableArea[];
  onEditArea: (area: InteractiveArea) => void;
  onDeleteArea: (area: InteractiveArea) => void;
  onEditCollisionArea: (area: ImpassableArea) => void;
  onDeleteCollisionArea: (area: ImpassableArea) => void;
  onUpdateArea?: (areaId: string, updates: Partial<InteractiveArea>) => void;

  // Assets tab
  onPlaceAsset: (fileData: string, fileName: string, width: number, height: number) => void;

  // Settings tab
  gridConfig: GridConfig;
  onGridConfigChange: (config: Partial<GridConfig>) => void;
  previewMode: boolean;
  onPreviewModeChange: () => void;
}

export const EditorSidebar: React.FC<EditorSidebarProps> = ({
  activeTab,
  onTabChange,
  selectedIds,
  shapes,
  areas,
  impassableAreas,
  onEditArea,
  onDeleteArea,
  onEditCollisionArea,
  onDeleteCollisionArea,
  onUpdateArea,
  onPlaceAsset,
  gridConfig,
  onGridConfigChange,
  previewMode,
  onPreviewModeChange,
}) => {
  return (
    <aside className="editor-sidebar">
      {/* Tab Navigation */}
      <div className="editor-panel-tabs">
        {EDITOR_TABS.map(tab => (
          <button
            key={tab.id}
            className={`editor-panel-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            <span className="tab-icon">
              {tab.icon}
            </span>
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="sidebar-content">
        <div className="tab-content-container">
          {activeTab === 'properties' && (
            <PropertiesTab
              selectedIds={selectedIds}
              shapes={shapes}
              areas={areas}
              impassableAreas={impassableAreas}
              onEditArea={onEditArea}
              onDeleteArea={onDeleteArea}
              onEditCollisionArea={onEditCollisionArea}
              onDeleteCollisionArea={onDeleteCollisionArea}
              onUpdateArea={onUpdateArea}
            />
          )}
          {activeTab === 'assets' && (
            <AssetsTab onPlaceAsset={onPlaceAsset} />
          )}
          {activeTab === 'settings' && (
            <SettingsTab
              gridConfig={gridConfig}
              onGridConfigChange={onGridConfigChange}
              previewMode={previewMode}
              onPreviewModeChange={onPreviewModeChange}
            />
          )}
        </div>
      </div>
    </aside>
  );
};

