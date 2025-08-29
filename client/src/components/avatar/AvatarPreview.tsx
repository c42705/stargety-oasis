import React from 'react';
import { Card, Switch, Tooltip } from 'antd';
import { AvatarConfig, LAYER_ORDER, LayerId } from './avatarTypes';

interface AvatarPreviewProps {
  config: AvatarConfig;
  onToggleLayer?: (layer: LayerId, enabled: boolean) => void;
  size?: number; // pixel size of square preview
}

const layerZIndex: Record<LayerId, number> = {
  base: 1,
  clothes: 2,
  hair: 3,
  accessories: 4,
};

export const AvatarPreview: React.FC<AvatarPreviewProps> = ({ config, onToggleLayer, size = 160 }) => {
  return (
    <Card size="small" bordered style={{ background: 'var(--color-bg-tertiary)' }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <div
          aria-label="avatar-preview"
          style={{
            width: size,
            height: size,
            position: 'relative',
            borderRadius: 8,
            background: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border-light)',
            overflow: 'hidden',
          }}
        >
          {LAYER_ORDER.map((layer) => {
            const state = (config as any)[layer];
            if (!state?.enabled || !state?.src) return null;
            return (
              <img
                key={layer}
                alt={layer}
                src={state.src}
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  imageRendering: 'pixelated',
                  zIndex: layerZIndex[layer],
                }}
              />
            );
          })}
        </div>

        {onToggleLayer && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {LAYER_ORDER.map((layer) => (
              <div key={layer} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Tooltip title={`Toggle ${layer} layer`}>
                  <Switch
                    size="small"
                    checked={(config as any)[layer]?.enabled}
                    onChange={(checked) => onToggleLayer(layer, checked)}
                    disabled={layer === 'base'}
                  />
                </Tooltip>
                <span style={{ color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>{layer}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default AvatarPreview;

