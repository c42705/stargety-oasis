import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import { useEventBus } from '../../shared/EventBusContext';

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



class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private eventBus: any;
  private playerId: string;
  private interactiveAreas: Phaser.GameObjects.Rectangle[] = [];
  private areaLabels: Phaser.GameObjects.Text[] = [];
  private onAreaClick: (areaId: string) => void;
  private currentArea: string | null = null;

  // Interactive controls
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private xKey!: Phaser.Input.Keyboard.Key;
  private oKey!: Phaser.Input.Keyboard.Key;

  // Animation states
  private isJumping: boolean = false;
  private isRotating: boolean = false;
  private originalY: number = 0;
  private fireEffects: Phaser.GameObjects.Graphics[] = [];
  private rotationTween?: Phaser.Tweens.Tween;

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
    this.add.text(20, 20, 'Controls:\n• Arrow keys: Move around\n• SPACEBAR: Jump\n• X: Fire\n• O: Toggle rotation\n• Walk into colored areas to interact', {
      fontSize: '12px',
      color: '#333333',
      backgroundColor: 'rgba(255, 255, 255, 0.9)',
      padding: { x: 10, y: 8 },
      lineSpacing: 2
    });

    // Create interactive areas first
    this.createInteractiveAreas();

    // Create player sprite
    this.player = this.add.sprite(400, 300, 'player');
    this.player.setDepth(10); // Ensure player is above areas

    // Create cursor keys
    this.cursors = this.input.keyboard!.createCursorKeys();

    // Create custom key bindings for interactive controls
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.xKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    this.oKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.O);

    // Set up key event handlers
    this.setupKeyHandlers();

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

    // Store original Y position for jump animation
    this.originalY = this.player.y;

    // Announce player joined
    this.eventBus.publish('world:playerJoined', {
      playerId: this.playerId,
      x: this.player.x,
      y: this.player.y,
    });
  }

  private setupKeyHandlers() {
    // Jump action (Spacebar)
    this.spaceKey.on('down', () => {
      this.performJump();
    });

    // Fire action (X key)
    this.xKey.on('down', () => {
      this.performFire();
    });

    // Rotation toggle (O key)
    this.oKey.on('down', () => {
      this.toggleRotation();
    });
  }

  private performJump() {
    if (this.isJumping) return; // Prevent multiple jumps

    this.isJumping = true;
    const jumpHeight = 60;
    const jumpDuration = 600;

    // Create jump animation using tweens
    this.tweens.add({
      targets: this.player,
      y: this.originalY - jumpHeight,
      duration: jumpDuration / 2,
      ease: 'Power2',
      yoyo: true,
      onComplete: () => {
        this.isJumping = false;
        this.originalY = this.player.y; // Update original position
      }
    });

    // Add visual effect for jump
    this.createJumpEffect();
  }

  private performFire() {
    // Create fire effect
    this.createFireEffect();

    // Add brief cooldown to prevent spam
    this.xKey.enabled = false;
    this.time.delayedCall(200, () => {
      this.xKey.enabled = true;
    });
  }

  private toggleRotation() {
    if (this.isRotating) {
      // Stop rotation
      this.isRotating = false;
      if (this.rotationTween) {
        this.rotationTween.stop();
        this.rotationTween = undefined;
      }
      // Reset rotation smoothly
      this.tweens.add({
        targets: this.player,
        rotation: 0,
        duration: 300,
        ease: 'Power2'
      });
    } else {
      // Start continuous rotation
      this.isRotating = true;
      this.rotationTween = this.tweens.add({
        targets: this.player,
        rotation: Math.PI * 2,
        duration: 2000,
        ease: 'Linear',
        repeat: -1
      });
    }
  }

  private createJumpEffect() {
    // Create dust cloud effect at player's feet
    const dustCloud = this.add.graphics();
    dustCloud.fillStyle(0xD2B48C, 0.6);
    dustCloud.fillCircle(this.player.x, this.originalY + 16, 20);
    dustCloud.setDepth(5);

    // Animate dust cloud
    this.tweens.add({
      targets: dustCloud,
      scaleX: 2,
      scaleY: 2,
      alpha: 0,
      duration: 400,
      ease: 'Power2',
      onComplete: () => {
        dustCloud.destroy();
      }
    });
  }

  private createFireEffect() {
    // Create projectile/fire effect
    const projectile = this.add.graphics();
    projectile.fillStyle(0xFF4500, 0.8);
    projectile.fillCircle(0, 0, 8);
    projectile.setPosition(this.player.x, this.player.y);
    projectile.setDepth(8);

    // Determine direction based on player's last movement or default to right
    const direction = this.player.scaleX < 0 ? -1 : 1;
    const targetX = this.player.x + (direction * 150);

    // Animate projectile
    this.tweens.add({
      targets: projectile,
      x: targetX,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        // Create explosion effect
        this.createExplosionEffect(targetX, this.player.y);
        projectile.destroy();
      }
    });

    // Add fire trail effect
    const trail = this.add.graphics();
    trail.lineStyle(4, 0xFF6347, 0.6);
    trail.beginPath();
    trail.moveTo(this.player.x, this.player.y);
    trail.lineTo(targetX, this.player.y);
    trail.strokePath();
    trail.setDepth(7);

    // Fade out trail
    this.tweens.add({
      targets: trail,
      alpha: 0,
      duration: 600,
      onComplete: () => {
        trail.destroy();
      }
    });
  }

  private createExplosionEffect(x: number, y: number) {
    // Create explosion particles
    for (let i = 0; i < 8; i++) {
      const particle = this.add.graphics();
      particle.fillStyle(0xFF4500, 0.8);
      particle.fillCircle(0, 0, 4);
      particle.setPosition(x, y);
      particle.setDepth(9);

      const angle = (i / 8) * Math.PI * 2;
      const distance = 40 + Math.random() * 20;
      const targetX = x + Math.cos(angle) * distance;
      const targetY = y + Math.sin(angle) * distance;

      this.tweens.add({
        targets: particle,
        x: targetX,
        y: targetY,
        alpha: 0,
        duration: 300 + Math.random() * 200,
        ease: 'Power2',
        onComplete: () => {
          particle.destroy();
        }
      });
    }
  }

  update() {
    // Only allow movement if not jumping (to prevent interference with jump animation)
    if (!this.isJumping) {
      const speed = 200;
      let moved = false;
      let verticalMovement = false;

      if (this.cursors.left.isDown) {
        this.player.x -= speed * this.game.loop.delta / 1000;
        this.player.setFlipX(true); // Face left
        moved = true;
      } else if (this.cursors.right.isDown) {
        this.player.x += speed * this.game.loop.delta / 1000;
        this.player.setFlipX(false); // Face right
        moved = true;
      }

      if (this.cursors.up.isDown) {
        this.player.y -= speed * this.game.loop.delta / 1000;
        moved = true;
        verticalMovement = true;
      } else if (this.cursors.down.isDown) {
        this.player.y += speed * this.game.loop.delta / 1000;
        moved = true;
        verticalMovement = true;
      }

      // Keep player within bounds
      this.player.x = Phaser.Math.Clamp(this.player.x, 16, 784);
      this.player.y = Phaser.Math.Clamp(this.player.y, 16, 584);

      // Update original Y position when moving vertically (but not during jump)
      if (verticalMovement) {
        this.originalY = this.player.y;
      }

      if (moved) {
        this.eventBus.publish('world:playerMoved', {
          playerId: this.playerId,
          x: this.player.x,
          y: this.player.y,
        });
      }
    }

    // Check for collision with interactive areas
    this.checkAreaCollisions();
  }

  shutdown() {
    // Clean up rotation tween if it exists
    if (this.rotationTween) {
      this.rotationTween.stop();
      this.rotationTween = undefined;
    }

    // Clean up fire effects
    this.fireEffects.forEach(effect => {
      if (effect && effect.scene) {
        effect.destroy();
      }
    });
    this.fireEffects = [];
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

  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedArea, setSelectedArea] = useState<InteractiveArea | null>(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const eventBus = useEventBus();


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
      backgroundColor: '#020811ff',
      scene: new GameScene(eventBus, playerId, handleAreaClick),
    };

    phaserGameRef.current = new Phaser.Game(config);

    return () => {
      if (phaserGameRef.current) {
        phaserGameRef.current.destroy(true);
        phaserGameRef.current = null;
      }
    };
  }, [eventBus, playerId]);





  return (
    <div className={`world-module ${className}`}>
      <div className="world-container">
        <div ref={gameRef} className="game-canvas" />
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
