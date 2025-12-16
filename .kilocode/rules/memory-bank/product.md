# Stargety Oasis - Product Documentation

## Problem Statement

Remote teams need a way to collaborate that captures the spontaneous interactions and spatial awareness of physical offices. Traditional video conferencing tools lack the sense of presence and proximity that makes in-person work feel natural.

## Solution

Stargety Oasis is a virtual world platform that simulates a 2D office environment where team members can:
- **Move freely** as avatars in a shared space
- **See who's nearby** through spatial awareness
- **Join video calls automatically** when entering designated areas
- **Chat in real-time** with presence indicators
- **Customize their avatar** for personal expression

## Target Users

1. **Remote teams** seeking better collaboration tools
2. **Companies** with hybrid or fully remote workforces
3. **Communities** wanting virtual gathering spaces
4. **Administrators** who design and manage virtual spaces

## User Experience Goals

### For Regular Users
- **Seamless navigation**: Arrow keys or WASD to move avatar
- **Automatic interactions**: Enter a meeting room → join video call automatically
- **Persistent presence**: See who's online and where they are
- **Chat integration**: Contextual chat based on location

### For Administrators
- **Visual map editor**: Design spaces with drag-and-drop tools
- **Area configuration**: Define interactive zones (Jitsi rooms, portals)
- **Collision mapping**: Set boundaries where players can't walk
- **Real-time updates**: Changes sync to all connected users

## Core Features

### 1. Virtual World (Phaser.js)
- Top-down 2D view with scrollable background
- Character sprites with 4-directional movement
- Camera following with zoom controls (0.3x - 3.1x)
- Interactive area detection with visual overlays

### 2. Video Calling (Jitsi Meet)
- Auto-join when entering designated areas
- Auto-leave when exiting areas
- Embedded video panel with configurable Jitsi server

### 3. Real-Time Chat (Socket.IO)
- Persistent chat rooms with message history
- Typing indicators
- 8-hour message TTL (auto-cleanup)
- DB-backed persistence

### 4. Map Editor (React Konva)
- Background image upload with auto-sizing
- Interactive area creation (rectangles, polygons)
- Collision area definition
- Asset placement (sprites, images)
- Undo/redo, zoom/pan, grid snapping
- Export/import as JSON

### 5. Avatar Builder
- Multiple character slots (up to 5)
- Sprite sheet customization
- Frame selection for animations
- Preview before save

## Success Metrics

1. **User engagement**: Time spent in virtual world
2. **Meeting adoption**: Video calls initiated through area entry
3. **Map customization**: Admin usage of map editor
4. **System reliability**: Uptime and sync accuracy

## Future Roadmap (Potential)

- Multiple floor/room support
- Custom object interactions
- Audio proximity (spatial audio)
- Mobile app support
- Analytics dashboard
