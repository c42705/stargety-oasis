# Map Dimension and Background Image Investigation

## Executive Summary

This investigation reveals a comprehensive system for managing map dimensions and background images across the Stargety Oasis application. The investigation identified the root cause of dimension mismatches that cause background image stretching in the Phaser renderer.

## System Architecture Overview

### 1. Data Storage Hierarchy

#### 1.1 Database Layer (PostgreSQL)
- **Table**: `maps` 
- **Storage**: JSONB field `data` stores complete map structure
- **Key Fields**:
  ```typescript
  {
    worldDimensions: { width: 7603, height: 3679 },
    backgroundImage: "/default-background.jpg",
    backgroundImageDimensions: { width: 7603, height: 3679 },
    interactiveAreas: [...],
    impassableAreas: [...],
    assets: [...]
  }
  ```

#### 1.2 Server Layer (Node.js/Express)
- **Controller**: `server/src/map/mapController.ts`
- **Operations**: CRUD operations for map data
- **Socket.IO**: Real-time map updates to clients
- **Schema**: `server/prisma/schema.prisma` defines database structure

#### 1.3 Client Layer (React/Redux)
- **Redux Store**: `client/src/redux/slices/mapSlice.ts`
- **Data Service**: `client/src/stores/MapDataService.ts`
- **Context**: `client/src/shared/MapDataContext.tsx`
- **Dimension Manager**: `client/src/shared/WorldDimensionsManager.ts`

### 2. Data Flow Architecture

```
Database (PostgreSQL) 
    ↕ (API calls)
MapApiService (server)
    ↕ (Socket.IO events)
MapController (server)
    ↕ (HTTP/WebSocket)
MapApiService (client)
    ↕ (Redux actions)
MapDataService (client)
    ↕ (Context/props)
MapDataContext (client)
    ↕ (Hooks)
Components (Konva/Phaser)
```

## Detailed Investigation Findings

### 1. Map Dimension Storage Locations

#### 1.1 Database Storage
- **Table**: `maps`
- **Field**: `data.worldDimensions`
- **Default Values**: 
  ```typescript
  { width: 7603, height: 3679 }
  ```
- **Source**: `server/prisma/seed.ts` defines default map data

#### 1.2 Client-Side Storage
- **Redux State**: `mapSlice.ts` - `mapData.worldDimensions`
- **Context**: `MapDataContext.tsx` - provides dimensions to components
- **Dimension Manager**: `WorldDimensionsManager.ts` - runtime cache with validation

#### 1.3 Component Usage
- **Konva Editor**: Uses dimensions for stage sizing and coordinate system
- **Phaser Renderer**: Uses dimensions for world bounds and background scaling

### 2. Background Image Storage Locations

#### 2.1 Database Storage
- **Field**: `data.backgroundImage` (URL/path)
- **Field**: `data.backgroundImageDimensions` (width/height)
- **Default**: `/default-background.jpg` with 7603×3679 dimensions

#### 2.2 Client-Side Storage
- **Redux State**: `mapSlice.ts` - background image URL and dimensions
- **Context**: `MapDataContext.tsx` - provides background data to components
- **Image Service**: `MapDataService.ts` - handles image upload and validation

#### 2.3 Component Usage
- **Konva Editor**: `useKonvaBackground.ts` loads and displays background
- **Phaser Renderer**: `PhaserMapRenderer.ts` scales background to world dimensions

### 3. Dimension Management System

#### 3.1 WorldDimensionsManager
```typescript
// Constants define the system's dimension limits
export const DIMENSION_LIMITS = {
  MIN_WIDTH: 400,
  MIN_HEIGHT: 300,
  MAX_WIDTH: 8000,
  MAX_HEIGHT: 4000,
  DEFAULT_WIDTH: 7603,  // Legacy from seed data
  DEFAULT_HEIGHT: 3679, // Legacy from seed data
};
```

#### 3.2 Dimension Validation
- Validates dimensions against limits
- Provides warnings for aspect ratio mismatches
- Handles dimension updates from multiple sources

#### 3.3 Dimension Sources
- **World**: From map data (primary source)
- **Editor**: From user interactions in Konva editor
- **Background**: Derived from background image dimensions
- **System**: Default values and fallbacks
- **Migration**: Data migration and updates

### 4. Background Image Processing

#### 4.1 Image Upload Flow
1. User selects image file
2. `MapDataService.handleBackgroundImageUpload()` processes file
3. Image converted to data URL via canvas
4. Dimensions extracted using `Image` object
5. Data saved to Redux store and database

#### 4.2 Image Loading Flow
1. URL stored in Redux state
2. Components use hooks to load images
3. `useKonvaBackground.ts` loads images for editor
4. `PhaserMapRenderer.ts` loads images for game

#### 4.3 Image Scaling Logic
**Konva Editor**: Displays images at actual dimensions
**Phaser Renderer**: Scales images to fit world dimensions

## Root Cause Analysis: Dimension Mismatch Issue

### 1. Problem Identification
The investigation revealed that background images are stretched in the Phaser renderer because:

1. **Default World Dimensions**: 7603×3679 px (from seed data)
2. **Actual Image Dimensions**: Varying sizes (e.g., 1300px width)
3. **Phaser Scaling Logic**: Applies `scaleX = worldWidth / backgroundImage.width`
4. **Result**: 1300px images stretched to 7603px world width

### 2. Specific Code Locations

#### 2.1 PhaserMapRenderer.ts (Lines 318-366)
```typescript
// PROBLEMATIC CODE - Causes stretching
const createSimpleBackground = (worldWidth: number, worldHeight: number) => {
  // ... existing code ...
  
  // This line stretches images without validation
  const scaleX = worldWidth / backgroundImage.width;
  const scaleY = worldHeight / backgroundImage.height;
  
  // ... rest of scaling logic ...
};
```

#### 2.2 Default Data (server/prisma/seed.ts)
```typescript
// Sets the legacy dimensions that cause the issue
worldDimensions: {
  width: 7603,
  height: 3679
},
backgroundImageDimensions: {
  width: 7603,
  height: 3679
},
```

#### 2.3 WorldDimensionsManager.ts
```typescript
// Constants that perpetuate the legacy dimensions
export const DIMENSION_LIMITS = {
  DEFAULT_WIDTH: 7603,  // Should be updated
  DEFAULT_HEIGHT: 3679, // Should be updated
};
```

### 3. System Design Issues

#### 3.1 Assumption Mismatch
- **System Assumption**: World dimensions always match background image dimensions
- **Reality**: Users upload images with different dimensions
- **Result**: Stretching occurs when assumption is violated

#### 3.2 Lack of Validation
- No validation ensures background image dimensions match world dimensions
- No warning system when dimensions don't match
- No automatic dimension adjustment when images are uploaded

#### 3.3 Legacy Dimensions
- The 7603×3679 dimensions are legacy from original implementation
- These became the "standard" but don't match actual user needs
- System lacks flexibility for different image sizes

## Data Persistence Strategy

### 1. Primary Storage (PostgreSQL)
- **Advantages**: Centralized, persistent, scalable
- **Disadvantages**: Network dependency, potential latency
- **Usage**: Production environment, shared maps

### 2. Fallback Storage (localStorage)
- **Advantages**: Offline support, fast access
- **Disadvantages**: Limited storage, not synchronized
- **Usage**: Editor mode, offline editing support

### 3. Data Synchronization
- **MapDataService**: Handles primary data persistence
- **Redux Store**: Client-side state management
- **Socket.IO**: Real-time updates across clients
- **Event System**: Notifications for data changes

## Component Integration Points

### 1. Konva Map Editor
- **Background Hook**: `useKonvaBackground.ts`
- **Canvas Component**: `EditorCanvas.tsx`
- **Dimension Usage**: Stage sizing and coordinate system

### 2. Phaser Map Renderer
- **Background Creation**: `createSimpleBackground()` method
- **Dimension Usage**: World bounds and scaling calculations
- **Problem Area**: Lines 318-366 in `PhaserMapRenderer.ts`

### 3. Shared Systems
- **Map Data Context**: Provides unified data access
- **Redux Store**: Manages application state
- **Dimension Manager**: Handles dimension validation and updates

## Recommended Solutions

### 1. Immediate Fixes (High Priority)
1. **Add Dimension Validation**: Check if background dimensions match world dimensions
2. **Implement Proper Scaling**: Use aspect ratio preservation instead of stretching
3. **Update Default Dimensions**: Change to more reasonable defaults (e.g., 1920×1080)

### 2. System Improvements (Medium Priority)
1. **Background Detection**: Automatically detect and store actual image dimensions
2. **Dimension Warnings**: Alert users when dimensions don't match
3. **Flexible Scaling**: Support different scaling modes (stretch, fit, fill)

### 3. Long-term Enhancements (Low Priority)
1. **Dynamic Dimension System**: Allow world dimensions to adapt to content
2. **Image Optimization**: Automatic image resizing and optimization
3. **Aspect Ratio Preservation**: Maintain image quality across different sizes

## Investigation Methodology

### 1. Code Analysis
- Examined all files related to map dimensions and background images
- Traced data flow from database to components
- Identified specific code causing the stretching issue

### 2. System Review
- Analyzed the complete data persistence architecture
- Documented all storage locations and data flows
- Identified integration points between systems

### 3. Problem Reproduction
- Confirmed the stretching issue in PhaserMapRenderer.ts
- Identified the exact lines causing the problem
- Documented the assumption mismatch in system design

## Conclusion

The investigation revealed a well-architected system with a critical flaw: the assumption that world dimensions always match background image dimensions. This assumption was valid in the original implementation but breaks when users upload images with different dimensions.

The root cause is in the Phaser renderer's scaling logic, which stretches images to fit world dimensions without validation. The solution requires adding dimension validation and implementing proper scaling that preserves aspect ratios.

The 7603×3679 pixel dimensions are legacy from the original implementation that became the de facto standard. Updating these to more reasonable defaults and adding proper validation would resolve the stretching issue and improve the overall user experience.

## Files Referenced

### Database Layer
- `server/prisma/schema.prisma` - Database schema definition
- `server/prisma/seed.ts` - Default map data with legacy dimensions

### Server Layer
- `server/src/map/mapController.ts` - Map CRUD operations

### Client Layer
- `client/src/shared/MapDataContext.tsx` - Map data context provider
- `client/src/shared/WorldDimensionsManager.ts` - Dimension management system
- `client/src/stores/MapDataService.ts` - Data persistence service
- `client/src/redux/slices/mapSlice.ts` - Redux state management
- `client/src/services/api/MapApiService.ts` - API client service

### Component Layer
- `client/src/modules/world/PhaserMapRenderer.ts` - Game renderer (problem area)
- `client/src/modules/map-editor-konva/KonvaMapEditorModule.tsx` - Map editor
- `client/src/modules/map-editor-konva/hooks/useKonvaBackground.ts` - Background hook
- `client/src/modules/map-editor-konva/components/EditorCanvas.tsx` - Editor canvas