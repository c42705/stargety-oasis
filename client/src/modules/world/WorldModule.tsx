import React, { useEffect, useRef, useState, useCallback } from 'react';
import Phaser from 'phaser';
import { useEventBus } from '../../shared/EventBusContext';
import { useAuth } from '../../shared/AuthContext';
import { useMapStore } from '../../stores/useMapStore';
import WorldZoomControls from './WorldZoomControls';
import { makeFocusable, addClickToFocus } from '../../shared/keyboardFocusUtils';
import { GameScene } from './GameScene';
import { logger } from '../../shared/logger';
import './WorldModule.css';

interface WorldModuleProps {
  playerId: string;
  className?: string;
  showMapAreas?: boolean;
}

/**
 * WorldModule - React component for the game world
 *
 * Responsibilities:
 * - Phaser game initialization
 * - Zoom controls UI
 * - Resize observer
 * - Canvas focus management
 */
export const WorldModule: React.FC<WorldModuleProps> = ({
  playerId,
  className = '',
  showMapAreas = false,
}) => {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const gameSceneRef = useRef<GameScene | null>(null);
  const { user } = useAuth();
  const { mapData } = useMapStore();

  // Zoom control state
  const [canZoomIn, setCanZoomIn] = useState(true);
  const [canZoomOut, setCanZoomOut] = useState(true);
  const [isCameraFollowing, setIsCameraFollowing] = useState(true);

  // Listen for camera follow changes from Phaser and update UI state
  useEffect(() => {
    const handler = (evt: any) => {
      if (typeof evt.detail === 'boolean') {
        setIsCameraFollowing(evt.detail);
      }
    };
    window.addEventListener('phaser-camera-follow-changed', handler);
    return () => window.removeEventListener('phaser-camera-follow-changed', handler);
  }, []);

  const eventBus = useEventBus();

  // Update zoom state function
  const updateZoomState = useCallback(() => {
    if (gameSceneRef.current) {
      const canIn = gameSceneRef.current.canZoomIn();
      const canOut = gameSceneRef.current.canZoomOut();
      const isFollowing = gameSceneRef.current.isCameraFollowingPlayer();
      setCanZoomIn(canIn);
      setCanZoomOut(canOut);
      setIsCameraFollowing(isFollowing);
    }
  }, []);

  // Zoom control handlers
  const handleZoomIn = useCallback(() => {
    if (gameSceneRef.current) {
      gameSceneRef.current.zoomIn();
      gameSceneRef.current.enableCameraFollowing();
      gameSceneRef.current.centerCameraOnPlayer();
      setIsCameraFollowing(true);
      updateZoomState();
    }
  }, [updateZoomState]);

  const handleZoomOut = useCallback(() => {
    if (gameSceneRef.current) {
      gameSceneRef.current.zoomOut();
      gameSceneRef.current.enableCameraFollowing();
      gameSceneRef.current.centerCameraOnPlayer();
      setIsCameraFollowing(true);
      updateZoomState();
    }
  }, [updateZoomState]);

  const handleResetZoom = useCallback(() => {
    if (gameSceneRef.current) {
      gameSceneRef.current.resetZoom();
      gameSceneRef.current.enableCameraFollowing();
      gameSceneRef.current.centerCameraOnPlayer();
      setIsCameraFollowing(true);
      updateZoomState();
    }
  }, [updateZoomState]);

  const handleToggleCameraFollow = useCallback(() => {
    if (gameSceneRef.current) {
      const newFollowState = !isCameraFollowing;

      if (newFollowState) {
        gameSceneRef.current.enableCameraFollowing();
        gameSceneRef.current.centerCameraOnPlayer();
      } else {
        gameSceneRef.current.disableCameraFollowing();
      }

      setIsCameraFollowing(newFollowState);
      updateZoomState();
    }
  }, [isCameraFollowing, updateZoomState]);

  // Use refs to avoid recreating Phaser when dependencies change
  const mapDataRef = useRef(mapData);
  mapDataRef.current = mapData;

  const eventBusRef = useRef(eventBus);
  eventBusRef.current = eventBus;

  const handleAreaClick = useCallback((areaId: string) => {
    const currentMapData = mapDataRef.current;
    const currentEventBus = eventBusRef.current;
    if (currentMapData && currentEventBus) {
      const area = currentMapData.interactiveAreas.find(a => a.id === areaId);
      if (area) {
        currentEventBus.publish('area-selected', {
          areaId: area.id,
          areaName: area.name,
          roomId: area.id
        });
      }
    }
  }, []);

  // Initialize Phaser only once on mount
  useEffect(() => {
    if (!gameRef.current || phaserGameRef.current) {
      return;
    }

    const worldRoomId = user?.worldRoomId || 'Stargety-Oasis-1';
    const gameScene = new GameScene(eventBusRef.current, user?.username || playerId, worldRoomId, handleAreaClick);
    gameSceneRef.current = gameScene;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: '100%',
      height: '100%',
      parent: gameRef.current,
      backgroundColor: 'transparent',
      scene: gameScene,
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: '100%',
        height: '100%',
      },
    };

    try {
      phaserGameRef.current = new Phaser.Game(config);

      // Make canvas focusable
      setTimeout(() => {
        const canvas = phaserGameRef.current?.canvas;
        if (canvas && gameSceneRef.current) {
          const cleanupFocusable = makeFocusable(canvas);
          const cleanupClickToFocus = addClickToFocus(canvas);

          (canvas as any).__focusCleanup = () => {
            cleanupFocusable();
            cleanupClickToFocus();
          };
        }
      }, 1000);

      // Store game instance globally for debugging
      (window as any).phaserGame = phaserGameRef.current;
      (window as any).validateObjectPositioning = () => {
        return gameSceneRef.current?.validateObjectPositioning();
      };
      (window as any).collectEnhancedDebugData = () => {
        return gameSceneRef.current?.collectEnhancedDebugData();
      };
      (window as any).testCharacterCentering = () => {
        return gameSceneRef.current?.testCharacterCentering();
      };

      // Update zoom state after game is ready
      setTimeout(() => {
        updateZoomState();
      }, 500);

      // Set up resize observer
      let resizeTimeout: NodeJS.Timeout | null = null;
      const resizeObserver = new ResizeObserver(() => {
        if (gameSceneRef.current && phaserGameRef.current) {
          if (resizeTimeout) {
            clearTimeout(resizeTimeout);
          }

          resizeTimeout = setTimeout(() => {
            gameSceneRef.current?.adjustViewportWithoutZoomReset();
            updateZoomState();
            resizeTimeout = null;
          }, 50);
        }
      });

      if (gameRef.current) {
        resizeObserver.observe(gameRef.current);
      }

      (phaserGameRef.current as any).resizeObserver = resizeObserver;
      (phaserGameRef.current as any).resizeTimeout = resizeTimeout;
    } catch (error) {
      logger.error('Failed to create Phaser game', error);
    }

    return () => {
      if (phaserGameRef.current) {
        const resizeObserver = (phaserGameRef.current as any).resizeObserver;
        const resizeTimeout = (phaserGameRef.current as any).resizeTimeout;
        if (resizeObserver) {
          resizeObserver.disconnect();
        }
        if (resizeTimeout) {
          clearTimeout(resizeTimeout);
        }

        const canvas = phaserGameRef.current.canvas;
        if (canvas && (canvas as any).__focusCleanup) {
          (canvas as any).__focusCleanup();
          delete (canvas as any).__focusCleanup;
        }

        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
        gameSceneRef.current = null;
        delete (window as any).phaserGame;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]); // Only reinitialize if playerId changes - other values use refs

  // Update map areas visibility when showMapAreas prop changes
  useEffect(() => {
    if (gameSceneRef.current) {
      gameSceneRef.current.setMapAreasVisibility(showMapAreas);
    }
  }, [showMapAreas]);

  // Pass Redux mapData to GameScene when it changes
  useEffect(() => {
    if (gameSceneRef.current && mapData) {
      gameSceneRef.current.updateMapData(mapData);
      logger.debug('[WorldModule] Passed mapData to GameScene');
    }
  }, [mapData]);

  return (
    <div className={`world-module ${className}`} style={{ height: '100%', width: '100%' }}>
      <div className="world-container" style={{ height: '100%', width: '100%', position: 'relative' }}>
        <div ref={gameRef} className="game-canvas" style={{ height: '100%', width: '100%' }} />

        <WorldZoomControls
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onResetZoom={handleResetZoom}
          onToggleCameraFollow={handleToggleCameraFollow}
          canZoomIn={canZoomIn}
          canZoomOut={canZoomOut}
          isCameraFollowing={isCameraFollowing}
        />
      </div>
    </div>
  );
};
