/**
 * Map Editor Selector Component
 * 
 * Selects between Fabric.js and Konva editors based on feature flags.
 */

import React, { useMemo } from 'react';
import { Alert } from 'antd';
import { shouldUseKonvaEditor, getFeatureFlags, getRolloutStage } from '../config/featureFlags';
import { KonvaMapCanvas } from './KonvaMapCanvas';
// import { FabricMapEditor } from '../../map-editor/FabricMapEditor'; // Placeholder

interface MapEditorSelectorProps {
  /** User ID for deterministic rollout */
  userId?: string;
  /** Force specific editor (for testing) */
  forceEditor?: 'konva' | 'fabric';
  /** Map data */
  mapData?: any;
  /** Other props to pass to editor */
  [key: string]: any;
}

/**
 * Component that selects which map editor to render
 */
export const MapEditorSelector: React.FC<MapEditorSelectorProps> = ({
  userId,
  forceEditor,
  mapData,
  ...otherProps
}) => {
  // Determine which editor to use
  const useKonva = useMemo(() => {
    if (forceEditor === 'konva') return true;
    if (forceEditor === 'fabric') return false;
    return shouldUseKonvaEditor(userId);
  }, [userId, forceEditor]);

  const flags = getFeatureFlags();
  const rolloutStage = getRolloutStage();

  // Log editor selection (for monitoring)
  React.useEffect(() => {
    console.log('Map Editor Selected:', {
      editor: useKonva ? 'Konva' : 'Fabric.js',
      userId,
      rolloutStage,
      rolloutPercentage: flags.KONVA_ROLLOUT_PERCENTAGE,
    });

    // TODO: Send analytics event
    // analytics.track('map_editor_selected', {
    //   editor: useKonva ? 'konva' : 'fabric',
    //   userId,
    //   rolloutStage,
    // });
  }, [useKonva, userId, rolloutStage, flags.KONVA_ROLLOUT_PERCENTAGE]);

  return (
    <div>
      {/* Debug info (only in development) */}
      {process.env.NODE_ENV === 'development' && flags.ENABLE_DEBUG_OVERLAY && (
        <Alert
          message={`Using ${useKonva ? 'Konva' : 'Fabric.js'} Editor`}
          description={`Rollout Stage: ${rolloutStage} (${flags.KONVA_ROLLOUT_PERCENTAGE}%)`}
          type="info"
          showIcon
          closable
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* Render selected editor */}
      {useKonva ? (
        <KonvaMapCanvas mapData={mapData} {...otherProps} />
      ) : (
        <div>
          {/* TODO: Render Fabric.js editor */}
          {/* <FabricMapEditor mapData={mapData} {...otherProps} /> */}
          <Alert
            message="Fabric.js Editor"
            description="The Fabric.js editor would be rendered here. Replace this with the actual Fabric.js editor component."
            type="warning"
            showIcon
          />
        </div>
      )}
    </div>
  );
};

