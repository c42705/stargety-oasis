import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { useEventBus } from '../../shared/EventBusContext';
import { useSettings } from '../../shared/SettingsContext';
import { VideoServiceModal } from '../../components/VideoServiceModal';
import './WorldModule.css';

interface WorldModuleProps {
  playerId: string;
  className?: string;
}

interface InteractiveArea {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: number;
  description: string;
  icon: string;
}

interface MeetingRoomData {
  id: string;
  name: string;
  description: string;
  participants: Array<{
    id: string;
    name: string;
    avatar: string;
  }>;
  onlineCount: number;
}

class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private eventBus: any;
  private playerId: string;
  private interactiveAreas: Phaser.GameObjects.Rectangle[] = [];
  private areaLabels: Phaser.GameObjects.Text[] = [];
  private onAreaClick: (areaId: string) => void;
  private currentArea: string | null = null;

  constructor(eventBus: any, playerId: string, onAreaClick: (areaId: string) => void) {
    super({ key: 'GameScene' });
    this.eventBus = eventBus;
    this.playerId = playerId;
    this.onAreaClick = onAreaClick;
  }

  preload() {
    // Create simple colored rectangles as sprites
    this.add.graphics()
      .fillStyle(0x00ff00)
      .fillRect(0, 0, 32, 32)
      .generateTexture('player', 32, 32);
  }

  private createInteractiveAreas() {
    const areas: InteractiveArea[] = [
      {
        id: 'meeting-room',
        name: 'Meeting Room',
        x: 150,
        y: 150,
        width: 120,
        height: 80,
        color: 0x4A90E2,
        description: 'Join the weekly team sync',
        icon: '🏢'
      },
      {
        id: 'presentation-hall',
        name: 'Presentation Hall',
        x: 500,
        y: 120,
        width: 140,
        height: 100,
        color: 0x7B68EE,
        description: 'Watch presentations and demos',
        icon: '📊'
      },
      {
        id: 'coffee-corner',
        name: 'Coffee Corner',
        x: 300,
        y: 350,
        width: 100,
        height: 80,
        color: 0xD2691E,
        description: 'Casual conversations',
        icon: '☕'
      },
      {
        id: 'game-zone',
        name: 'Game Zone',
        x: 100,
        y: 450,
        width: 120,
        height: 90,
        color: 0xFF6347,
        description: 'Fun and games',
        icon: '🎮'
      }
    ];

    areas.forEach(area => {
      // Create interactive area rectangle
      const rect = this.add.rectangle(
        area.x + area.width / 2,
        area.y + area.height / 2,
        area.width,
        area.height,
        area.color,
        0.7
      );

      rect.setStrokeStyle(3, 0xffffff, 0.8);
      rect.setInteractive();
      rect.setData('areaId', area.id);
      rect.setData('areaData', area);

      // Add hover effects
      rect.on('pointerover', () => {
        rect.setAlpha(0.9);
        rect.setStrokeStyle(4, 0xffffff, 1);
      });

      rect.on('pointerout', () => {
        rect.setAlpha(0.7);
        rect.setStrokeStyle(3, 0xffffff, 0.8);
      });

      rect.on('pointerdown', () => {
        this.onAreaClick(area.id);
      });

      // Create area label
      const label = this.add.text(
        area.x + area.width / 2,
        area.y + area.height / 2 - 10,
        `${area.icon}\n${area.name}`,
        {
          fontSize: '14px',
          color: '#ffffff',
          align: 'center',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 2
        }
      );
      label.setOrigin(0.5);

      // Add "You" indicator if player is in this area
      const youIndicator = this.add.text(
        area.x + 10,
        area.y + 10,
        'You',
        {
          fontSize: '12px',
          color: '#00ff00',
          backgroundColor: '#000000',
          padding: { x: 4, y: 2 }
        }
      );
      youIndicator.setVisible(false);
      youIndicator.setData('areaId', area.id);

      this.interactiveAreas.push(rect);
      this.areaLabels.push(label);
    });
  }

  create() {
    // Create world background with gradient effect
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x87CEEB, 0x87CEEB, 0xE0F6FF, 0xE0F6FF, 1);
    bg.fillRect(0, 0, 800, 600);

    // Add instructions
    this.add.text(20, 20, 'Use arrow keys to move around\nWalk into colored areas to interact', {
      fontSize: '14px',
      color: '#333333',
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      padding: { x: 8, y: 6 }
    });

    // Create interactive areas first
    this.createInteractiveAreas();

    // Create player sprite
    this.player = this.add.sprite(400, 300, 'player');
    this.player.setDepth(10); // Ensure player is above areas

    // Create cursor keys
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Handle click movement (but not on interactive areas)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, currentlyOver: Phaser.GameObjects.GameObject[]) => {
      // Check if clicking on an interactive area
      const clickedOnArea = currentlyOver.some(obj =>
        this.interactiveAreas.includes(obj as Phaser.GameObjects.Rectangle)
      );

      if (!clickedOnArea) {
        this.player.x = pointer.x;
        this.player.y = pointer.y;

        this.eventBus.publish('world:playerMoved', {
          playerId: this.playerId,
          x: this.player.x,
          y: this.player.y,
        });
      }
    });

    // Announce player joined
    this.eventBus.publish('world:playerJoined', {
      playerId: this.playerId,
      x: this.player.x,
      y: this.player.y,
    });
  }

  update() {
    const speed = 200;
    let moved = false;

    if (this.cursors.left.isDown) {
      this.player.x -= speed * this.game.loop.delta / 1000;
      moved = true;
    } else if (this.cursors.right.isDown) {
      this.player.x += speed * this.game.loop.delta / 1000;
      moved = true;
    }

    if (this.cursors.up.isDown) {
      this.player.y -= speed * this.game.loop.delta / 1000;
      moved = true;
    } else if (this.cursors.down.isDown) {
      this.player.y += speed * this.game.loop.delta / 1000;
      moved = true;
    }

    // Keep player within bounds
    this.player.x = Phaser.Math.Clamp(this.player.x, 16, 784);
    this.player.y = Phaser.Math.Clamp(this.player.y, 16, 584);

    // Check for collision with interactive areas
    this.checkAreaCollisions();

    if (moved) {
      this.eventBus.publish('world:playerMoved', {
        playerId: this.playerId,
        x: this.player.x,
        y: this.player.y,
      });
    }
  }

  private checkAreaCollisions() {
    const areas = [
      {
        id: 'meeting-room',
        name: 'Meeting Room',
        x: 150,
        y: 150,
        width: 120,
        height: 80,
        color: 0x4A90E2,
        description: 'Join the weekly team sync',
        icon: '🏢'
      },
      {
        id: 'presentation-hall',
        name: 'Presentation Hall',
        x: 500,
        y: 120,
        width: 140,
        height: 100,
        color: 0x7B68EE,
        description: 'Watch presentations and demos',
        icon: '📊'
      },
      {
        id: 'coffee-corner',
        name: 'Coffee Corner',
        x: 300,
        y: 350,
        width: 100,
        height: 80,
        color: 0xD2691E,
        description: 'Casual conversations',
        icon: '☕'
      },
      {
        id: 'game-zone',
        name: 'Game Zone',
        x: 100,
        y: 450,
        width: 120,
        height: 90,
        color: 0xFF6347,
        description: 'Fun and games',
        icon: '🎮'
      }
    ];

    areas.forEach(area => {
      // Check if player is within area bounds
      if (this.player.x >= area.x &&
          this.player.x <= area.x + area.width &&
          this.player.y >= area.y &&
          this.player.y <= area.y + area.height) {

        // Trigger area entry if not already triggered
        if (!this.currentArea || this.currentArea !== area.id) {
          this.currentArea = area.id;
          this.onAreaClick(area.id);
        }
      }
    });

    // Reset current area if player is not in any area
    const inAnyArea = areas.some(area =>
      this.player.x >= area.x &&
      this.player.x <= area.x + area.width &&
      this.player.y >= area.y &&
      this.player.y <= area.y + area.height
    );

    if (!inAnyArea) {
      this.currentArea = null;
    }
  }
}

export const WorldModule: React.FC<WorldModuleProps> = ({
  playerId,
  className = '',
}) => {
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserGameRef = useRef<Phaser.Game | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedArea, setSelectedArea] = useState<InteractiveArea | null>(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const eventBus = useEventBus();
  const { settings } = useSettings();

  const handleAreaClick = (areaId: string) => {
    const areas: InteractiveArea[] = [
      {
        id: 'meeting-room',
        name: 'Meeting Room',
        x: 150,
        y: 150,
        width: 120,
        height: 80,
        color: 0x4A90E2,
        description: 'Join the weekly team sync',
        icon: '🏢'
      },
      {
        id: 'presentation-hall',
        name: 'Presentation Hall',
        x: 500,
        y: 120,
        width: 140,
        height: 100,
        color: 0x7B68EE,
        description: 'Watch presentations and demos',
        icon: '📊'
      },
      {
        id: 'coffee-corner',
        name: 'Coffee Corner',
        x: 300,
        y: 350,
        width: 100,
        height: 80,
        color: 0xD2691E,
        description: 'Casual conversations',
        icon: '☕'
      },
      {
        id: 'game-zone',
        name: 'Game Zone',
        x: 100,
        y: 450,
        width: 120,
        height: 90,
        color: 0xFF6347,
        description: 'Fun and games',
        icon: '🎮'
      }
    ];

    const area = areas.find(a => a.id === areaId);
    if (area) {
      setSelectedArea(area);
      setIsLoadingVideo(true);
      setShowVideoModal(true);

      // Simulate loading time for video service connection
      setTimeout(() => {
        setIsLoadingVideo(false);
      }, 2500); // Longer loading time for more realistic experience
    }
  };

  const handleCloseVideoModal = () => {
    setShowVideoModal(false);
    setSelectedArea(null);
    setIsLoadingVideo(false);
  };

  useEffect(() => {
    if (!gameRef.current || phaserGameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 600,
      parent: gameRef.current,
      backgroundColor: '#87CEEB',
      scene: new GameScene(eventBus, playerId, handleAreaClick),
    };

    phaserGameRef.current = new Phaser.Game(config);
    setIsLoaded(true);

    return () => {
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      }
    };
  }, [eventBus, playerId]);

  // Mock meeting data
  const getMeetingData = (areaId: string): MeetingRoomData => {
    const meetingData: Record<string, MeetingRoomData> = {
      'meeting-room': {
        id: 'meeting-room',
        name: 'Meeting Room',
        description: 'Join the weekly team sync',
        participants: [
          { id: '1', name: 'Alice Johnson', avatar: 'AJ' },
          { id: '2', name: 'Bob Smith', avatar: 'BS' },
          { id: '3', name: 'Charlie Davis', avatar: 'CD' }
        ],
        onlineCount: 3
      },
      'presentation-hall': {
        id: 'presentation-hall',
        name: 'Presentation Hall',
        description: 'Watch presentations and demos',
        participants: [
          { id: '1', name: 'Diana Wilson', avatar: 'DW' },
          { id: '2', name: 'Emma Brown', avatar: 'EB' }
        ],
        onlineCount: 2
      },
      'coffee-corner': {
        id: 'coffee-corner',
        name: 'Coffee Corner',
        description: 'Casual conversations',
        participants: [
          { id: '1', name: 'Frank Miller', avatar: 'FM' }
        ],
        onlineCount: 1
      },
      'game-zone': {
        id: 'game-zone',
        name: 'Game Zone',
        description: 'Fun and games',
        participants: [
          { id: '1', name: 'Grace Lee', avatar: 'GL' },
          { id: '2', name: 'Henry Kim', avatar: 'HK' },
          { id: '3', name: 'Ivy Chen', avatar: 'IC' }
        ],
        onlineCount: 3
      }
    };

    return meetingData[areaId] || meetingData['meeting-room'];
  };

  const currentMeetingData = selectedArea ? getMeetingData(selectedArea.id) : null;

  return (
    <div className={`world-module ${className}`}>
      <div className="world-header">
        <h3>Virtual World</h3>
        <div className="world-info">
          <span>Player: {playerId}</span>
          <span className={`status ${isLoaded ? 'loaded' : 'loading'}`}>
            {isLoaded ? '🟢 Ready' : '🟡 Loading...'}
          </span>
        </div>
      </div>

      <div className="world-container">
        <div ref={gameRef} className="game-canvas" />

        <div className="world-controls">
          <div className="controls-info">
            <h4>Controls:</h4>
            <p>🖱️ Click to move</p>
            <p>⌨️ Arrow keys</p>
            <p>🟢 You (Green)</p>
            <p>🎯 Click colored areas to join meetings</p>
          </div>
        </div>
      </div>

      {/* Video Service Modal */}
      {selectedArea && (
        <VideoServiceModal
          isOpen={showVideoModal}
          onClose={handleCloseVideoModal}
          areaName={selectedArea.name}
          roomId={selectedArea.id}
          isLoading={isLoadingVideo}
        />
      )}
    </div>
  );
};
