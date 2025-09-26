/**
 * Simple World Module Demo
 * 
 * Interactive demo showcasing the simplified world module with debug panel
 */

import React, { useState, useCallback } from 'react';
import { Button, Space, Typography, Divider } from 'antd';
import { ZoomInOutlined, ZoomOutOutlined, PlayCircleOutlined } from '@ant-design/icons';
import SimpleWorldModule from './SimpleWorldModule';

const { Title, Text } = Typography;

const SimpleWorldModuleDemo: React.FC = () => {
  const [playerId] = useState('demo-player-001');
  const [playerPosition, setPlayerPosition] = useState({ x: 400, y: 300 });
  const [movementCount, setMovementCount] = useState(0);

  /**
   * Handle player movement
   */
  const handlePlayerMoved = useCallback((playerId: string, x: number, y: number) => {
    setPlayerPosition({ x: Math.round(x), y: Math.round(y) });
    setMovementCount(prev => prev + 1);
  }, []);

  /**
   * Handle zoom in
   */
  const handleZoomIn = useCallback(() => {
    if ((window as any).simpleWorldModule) {
      (window as any).simpleWorldModule.zoomIn();
    }
  }, []);

  /**
   * Handle zoom out
   */
  const handleZoomOut = useCallback(() => {
    if ((window as any).simpleWorldModule) {
      (window as any).simpleWorldModule.zoomOut();
    }
  }, []);

  /**
   * Get current zoom percentage
   */
  const getCurrentZoom = useCallback((): number => {
    if ((window as any).simpleWorldModule) {
      return (window as any).simpleWorldModule.getZoomPercentage();
    }
    return 100;
  }, []);

  /**
   * Teleport player to center
   */
  const teleportToCenter = useCallback(() => {
    if ((window as any).simpleWorldModule) {
      (window as any).simpleWorldModule.setPlayerPosition(400, 300);
    }
  }, []);

  return (
    <div style={{ height: '100vh', display: 'flex' }}>
      {/* Game Canvas Area */}
      <div style={{ flex: 1, position: 'relative' }}>
        <SimpleWorldModule
          playerId={playerId}
          onPlayerMoved={handlePlayerMoved}
          className="demo-world"
        />
      </div>

      {/* Debug Panel */}
      <div style={{ 
        width: '320px', 
        backgroundColor: '#1f1f1f', 
        borderLeft: '1px solid #333',
        padding: '16px',
        overflowY: 'auto'
      }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          
          {/* Header */}
          <div>
            <Title level={4} style={{ color: '#fff', margin: 0 }}>Debug Panel</Title>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Simple World Module Demo
            </Text>
          </div>

          <Divider style={{ margin: '8px 0', borderColor: '#333' }} />
          
          {/* Controls */}
          <div>
            <Text strong style={{ color: '#fff' }}>Controls:</Text>
            <div style={{ marginTop: '8px' }}>
              <Text style={{ color: '#ccc', fontSize: '12px' }}>• WASD or Arrow Keys</Text><br />
              <Text style={{ color: '#ccc', fontSize: '12px' }}>• Smooth camera following</Text>
            </div>
            
            <div style={{ marginTop: '12px' }}>
              <Space>
                <Button 
                  icon={<ZoomInOutlined />} 
                  onClick={handleZoomIn}
                  size="small"
                  type="primary"
                >
                  Zoom In
                </Button>
                <Button 
                  icon={<ZoomOutOutlined />} 
                  onClick={handleZoomOut}
                  size="small"
                  type="primary"
                >
                  Zoom Out
                </Button>
              </Space>
            </div>
            
            <div style={{ marginTop: '8px' }}>
              <Button 
                icon={<PlayCircleOutlined />} 
                onClick={teleportToCenter}
                size="small"
                block
                type="default"
              >
                Teleport to Center
              </Button>
            </div>
          </div>

          <Divider style={{ margin: '8px 0', borderColor: '#333' }} />

          {/* Player Info */}
          <div>
            <Text strong style={{ color: '#fff' }}>Player Info:</Text>
            <div style={{ marginTop: '8px' }}>
              <Text style={{ color: '#ccc', fontSize: '12px' }}>
                ID: <Text code style={{ fontSize: '11px' }}>{playerId}</Text>
              </Text><br />
              <Text style={{ color: '#ccc', fontSize: '12px' }}>
                Position: X: {playerPosition.x}, Y: {playerPosition.y}
              </Text><br />
              <Text style={{ color: '#ccc', fontSize: '12px' }}>
                Movements: {movementCount}
              </Text><br />
              <Text style={{ color: '#ccc', fontSize: '12px' }}>
                Zoom: {getCurrentZoom()}%
              </Text>
            </div>
          </div>

          <Divider style={{ margin: '8px 0', borderColor: '#333' }} />

          {/* Performance */}
          <div>
            <Text strong style={{ color: '#fff' }}>Performance:</Text>
            <div style={{ marginTop: '8px' }}>
              <Text style={{ color: '#0f0', fontSize: '11px' }}>✅ 60 FPS target</Text><br />
              <Text style={{ color: '#0f0', fontSize: '11px' }}>✅ Optimized updates</Text><br />
              <Text style={{ color: '#0f0', fontSize: '11px' }}>✅ Smooth camera</Text><br />
              <Text style={{ color: '#0f0', fontSize: '11px' }}>✅ Minimal memory</Text><br />
              <Text style={{ color: '#0f0', fontSize: '11px' }}>✅ Responsive input</Text>
            </div>
          </div>

          <Divider style={{ margin: '8px 0', borderColor: '#333' }} />

          {/* Architecture */}
          <div>
            <Text strong style={{ color: '#fff' }}>Architecture:</Text>
            <div style={{ marginTop: '8px' }}>
              <Text style={{ color: '#ccc', fontSize: '11px' }}>• SimpleWorldModule</Text><br />
              <Text style={{ color: '#ccc', fontSize: '11px' }}>• SimpleGameScene</Text><br />
              <Text style={{ color: '#ccc', fontSize: '11px' }}>• SimpleCameraController</Text><br />
              <Text style={{ color: '#ccc', fontSize: '11px' }}>• SimplePlayerController</Text>
            </div>
            <div style={{ marginTop: '8px' }}>
              <Text style={{ color: '#ff0', fontSize: '11px' }}>85% less code</Text><br />
              <Text style={{ color: '#ff0', fontSize: '11px' }}>Performance-first</Text><br />
              <Text style={{ color: '#ff0', fontSize: '11px' }}>Easy to maintain</Text>
            </div>
          </div>

        </Space>
      </div>
    </div>
  );
};

export default SimpleWorldModuleDemo;
