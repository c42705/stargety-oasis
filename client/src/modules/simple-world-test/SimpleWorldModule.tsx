/**
 * Simple World Module
 * 
 * A simplified, performance-focused alternative to the complex WorldModule.
 * Provides basic top-down RPG movement, camera following, and zoom functionality
 * with minimal complexity and optimal performance.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import Phaser from 'phaser';
import { SimpleGameScene } from './core/SimpleGameScene';
import './SimpleWorldModule.css';

interface SimpleWorldModuleProps {
  playerId: string;
  className?: string;
  onPlayerMoved?: (playerId: string, x: number, y: number) => void;
}

interface GameConfig {
  worldBounds: { width: number; height: number };
  playerSpeed: number;
}

const SimpleWorldModule: React.FC<SimpleWorldModuleProps> = ({
  playerId,
  className,
  onPlayerMoved
}) => {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const gameSceneRef = useRef<SimpleGameScene | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Game configuration
  const gameConfig: GameConfig = {
    worldBounds: { width: 800, height: 600 },
    playerSpeed: 200
  };

  /**
   * Initialize Phaser game
   */
  const initializeGame = useCallback(() => {
    if (!gameRef.current || phaserGameRef.current) {
      return;
    }

    try {

      // Create game scene
      const gameScene = new SimpleGameScene({
        playerId,
        worldBounds: gameConfig.worldBounds,
        playerSpeed: gameConfig.playerSpeed,
        onPlayerMoved
      });

      gameSceneRef.current = gameScene;

      // Phaser game configuration
      const phaserConfig: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        parent: gameRef.current,
        backgroundColor: 'transparent',
        scene: gameScene,
        physics: {
          default: 'arcade',
          arcade: {
            gravity: { y: 0, x: 0 },
            debug: false
          }
        },
        scale: {
          mode: Phaser.Scale.RESIZE,
          autoCenter: Phaser.Scale.CENTER_BOTH
        },
        render: {
          antialias: true,
          pixelArt: false
        }
      };

      // Create Phaser game instance
      const game = new Phaser.Game(phaserConfig);
      phaserGameRef.current = game;

      // Wait for game to be ready
      game.events.once('ready', () => {
        setIsInitialized(true);
        setError(null);
      });

      // Handle game boot errors
      game.events.once('boot', () => {
      });

    } catch (err) {
      console.error('❌ SimpleWorldModule: Failed to initialize game:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize game');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId, onPlayerMoved]);

  /**
   * Clean up Phaser game
   */
  const cleanupGame = useCallback(() => {

    if (phaserGameRef.current) {
      try {
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      } catch (err) {
        console.error('❌ Error destroying Phaser game:', err);
      }
    }

    gameSceneRef.current = null;
    setIsInitialized(false);
  }, []);

  /**
   * Handle zoom in
   */
  const handleZoomIn = useCallback(() => {
    if (gameSceneRef.current) {
      const cameraController = gameSceneRef.current.getCameraController();
      if (cameraController.canZoomIn()) {
        cameraController.zoomIn();
      }
    }
  }, []);

  /**
   * Handle zoom out
   */
  const handleZoomOut = useCallback(() => {
    if (gameSceneRef.current) {
      const cameraController = gameSceneRef.current.getCameraController();
      if (cameraController.canZoomOut()) {
        cameraController.zoomOut();
      }
    }
  }, []);

  /**
   * Get current zoom percentage
   */
  const getZoomPercentage = useCallback((): number => {
    if (gameSceneRef.current) {
      const cameraController = gameSceneRef.current.getCameraController();
      return cameraController.getZoomPercentage();
    }
    return 100;
  }, []);

  // Initialize game on mount
  useEffect(() => {
    initializeGame();
    return cleanupGame;
  }, [initializeGame, cleanupGame]);

  // Handle keyboard shortcuts for zoom
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        if (event.key === '=' || event.key === '+') {
          event.preventDefault();
          handleZoomIn();
        } else if (event.key === '-') {
          event.preventDefault();
          handleZoomOut();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleZoomIn, handleZoomOut]);

  // Expose methods for external control (e.g., zoom controls)
  useEffect(() => {
    if (isInitialized && gameSceneRef.current) {
      // Attach methods to window for external access (development/debugging)
      (window as any).simpleWorldModule = {
        zoomIn: handleZoomIn,
        zoomOut: handleZoomOut,
        getZoomPercentage,
        setPlayerPosition: (x: number, y: number) => {
          gameSceneRef.current?.setPlayerPosition(x, y);
        },
        updateWorldBounds: (width: number, height: number) => {
          gameSceneRef.current?.updateWorldBounds(width, height);
        }
      };
    }

    return () => {
      if ((window as any).simpleWorldModule) {
        delete (window as any).simpleWorldModule;
      }
    };
  }, [isInitialized, handleZoomIn, handleZoomOut, getZoomPercentage]);

  if (error) {
    return (
      <div className={`world-module-error ${className || ''}`}>
        <div className="error-content">
          <h3>Game Initialization Error</h3>
          <p>{error}</p>
          <button onClick={() => {
            setError(null);
            initializeGame();
          }}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`simple-world-module ${className || ''}`}>
      <div 
        ref={gameRef} 
        className="game-container"
        style={{
          width: '100%',
          height: '100%',
          position: 'relative'
        }}
      />
      
      {!isInitialized && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="loading-spinner" />
            <p>Initializing Simple World Module...</p>
          </div>
        </div>
      )}
      
      {isInitialized && (
        <div className="game-info">
          <div className="controls-hint">
            <p>Controls: WASD or Arrow Keys to move • Ctrl+/- to zoom</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SimpleWorldModule;
