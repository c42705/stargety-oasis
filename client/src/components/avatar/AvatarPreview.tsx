import React from 'react';
import { Card } from 'antd';
import { AvatarConfig, LAYER_ORDER, LayerId } from './avatarTypes';

interface AvatarPreviewProps {
  config: AvatarConfig;
  size?: number; // pixel size of square preview
}

const layerZIndex: Record<LayerId, number> = {
  base: 1,
  clothes: 2,
  hair: 3,
  accessories: 4,
};

export const AvatarPreview: React.FC<AvatarPreviewProps> = ({ config, size = 160 }) => {
  return (
    <Card size="small" >
      <div style={{ display: 'flex', flexDirection:'column', gap: 12 }}>
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
      </div>
    </Card>
  );
};

export default AvatarPreview;

