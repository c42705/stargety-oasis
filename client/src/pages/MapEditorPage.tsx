import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapEditorModule } from '../modules/map-editor/MapEditorModule';
import { KonvaMapEditorModule } from '../modules/map-editor-konva';
import { useAuth } from '../shared/AuthContext';
import { MapDataProvider } from '../shared/MapDataContext';
import { UnsavedChangesWarning } from '../components/UnsavedChangesWarning';
import { getFeatureFlags, setFeatureFlagsOverride } from '../modules/map-editor-konva/config/featureFlags';
import { Switch } from 'antd';
import './MapEditorPage.css';

export const MapEditorPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Feature flag state
  const [useKonva, setUseKonva] = useState(() => {
    const flags = getFeatureFlags();
    return flags.USE_KONVA_EDITOR;
  });

  useEffect(() => {
    // Redirect non-admin users back to main app
    if (!user?.isAdmin) {
      navigate('/');
      return;
    }

    // Set page title
    document.title = 'Stargety Oasis - Map Editor';
  }, [user, navigate]);

  // Handle feature flag toggle
  const handleToggleEditor = (checked: boolean) => {
    setUseKonva(checked);
    setFeatureFlagsOverride({ USE_KONVA_EDITOR: checked });
    console.log(`Switched to ${checked ? 'Konva' : 'Fabric.js'} editor`);
  };

  // Show loading or redirect for non-admin users
  if (!user?.isAdmin) {
    return (
      <div className="map-editor-page">
        <div className="access-denied">
          <h1>Access Denied</h1>
          <p>You need administrator privileges to access the Map Editor.</p>
          <p>Redirecting to main application...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="map-editor-page">
      {/* Editor Toggle */}
      <div className="editor-toggle" style={{
        position: 'absolute',
        bottom: '10px',
        left: '50%',
        zIndex: 1000,        
        padding: '8px 12px',
        borderRadius: '4px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span style={{ fontSize: '12px', fontWeight: 500 }}>
          {useKonva ? 'Konva Editor' : 'Fabric.js Editor'}
        </span>
        <Switch
          checked={useKonva}
          onChange={handleToggleEditor}
          checkedChildren="Konva"
          unCheckedChildren="Fabric"
        />
      </div>

      <MapDataProvider>
        <UnsavedChangesWarning
          enabled={true}
          customMessage="You have unsaved map changes. Are you sure you want to leave the Map Editor?"
          onNavigationAttempt={() => {
          }}
        />
        {useKonva ? <KonvaMapEditorModule /> : <MapEditorModule />}
      </MapDataProvider>
    </div>
  );
};
