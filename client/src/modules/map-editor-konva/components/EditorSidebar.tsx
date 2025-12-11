/**
 * EditorSidebar Component
 * 
 * Renders the sidebar with tab navigation and tab content panels.
 * Includes all editor tabs: Areas, Terrain, Assets, Collision, Jitsi, Settings.
 */

import React from 'react';
import type { TabId, InteractiveArea } from '../types';
import type { GridConfig } from '../types/ui.types';
import { EDITOR_TABS } from '../constants/editorConstants';
import { AreasTab } from './tabs/AreasTab';
import { TerrainTab } from './tabs/TerrainTab';
import { AssetsTab } from './tabs/AssetsTab';
import { CollisionTab } from './tabs/CollisionTab';
import { JitsiTab } from './tabs/JitsiTab';
import { SettingsTab } from './tabs/SettingsTab';

interface EditorSidebarProps {
  // Tab state
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  
  // Areas tab
  areas: InteractiveArea[];
  onCreateNewArea: () => void;
  onEditArea: (area: InteractiveArea) => void;
  onDeleteArea: (area: InteractiveArea) => void;
  
  // Assets tab
  onPlaceAsset: (fileData: string, fileName: string, width: number, height: number) => void;
  
  // Collision tab
  impassableAreas: any[];
  onCreateNewCollisionArea: () => void;
  onEditCollisionArea: (area: any) => void;
  onDeleteCollisionArea: (area: any) => void;
  
  // Settings tab
  gridConfig: GridConfig;
  onGridConfigChange: (config: Partial<GridConfig>) => void;
  previewMode: boolean;
  onPreviewModeChange: () => void;
}

export const EditorSidebar: React.FC<EditorSidebarProps> = ({
  activeTab,
  onTabChange,
  areas,
  onCreateNewArea,
  onEditArea,
  onDeleteArea,
  onPlaceAsset,
  impassableAreas,
  onCreateNewCollisionArea,
  onEditCollisionArea,
  onDeleteCollisionArea,
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
          {activeTab === 'areas' && (
            <AreasTab
              areas={areas}
              onCreateNewArea={onCreateNewArea}
              onEditArea={onEditArea}
              onDeleteArea={onDeleteArea}
            />
          )}
          {activeTab === 'terrain' && <TerrainTab />}
          {activeTab === 'assets' && (
            <AssetsTab onPlaceAsset={onPlaceAsset} />
          )}
          {activeTab === 'collision' && (
            <CollisionTab
              impassableAreas={impassableAreas}
              onCreateNewCollisionArea={onCreateNewCollisionArea}
              onEditCollisionArea={onEditCollisionArea}
              onDeleteCollisionArea={onDeleteCollisionArea}
            />
          )}
          {activeTab === 'jitsi' && <JitsiTab areas={areas} onEditArea={onEditArea} />}
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

