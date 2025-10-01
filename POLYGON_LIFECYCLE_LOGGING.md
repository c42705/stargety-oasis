# Polygon Lifecycle Logging - Comprehensive Position Tracking

## Overview
This document describes the comprehensive logging system added to track polygon position changes throughout the entire lifecycle, from creation to save/reload. The logging helps diagnose position persistence issues, snap-back behavior, and visual flashes.

## Logging Markers (Emoji Guide)

| Emoji | Marker | Purpose | Location |
|-------|--------|---------|----------|
| 🆕 | POLYGON CREATED | Logs final position after polygon creation | `FabricMapCanvas.tsx` - `completePolygon()` |
| 🔄 | DRAG START/DRAGGING/DRAG END | Tracks position during drag operations | `FabricMapCanvas.tsx` - `object:moving`, `object:modified` |
| ⚡ | FLASH DETECTION | Measures timing between critical operations | `FabricMapCanvas.tsx` - Smart update section |
| 💾 | SAVE OPERATION | Logs polygon data before/after save | `SharedMapSystem.ts` - `saveMapData()` |
| 🔃 | RELOAD/RESTORE | Tracks positions during load from storage | `FabricMapCanvas.tsx` - `renderCollisionAreas()` |
| ⚠️ | POSITION JUMP | Detects unexpected position changes | `FabricMapCanvas.tsx` - Smart update section |
| 🔍 | POLYGON MODIFY | Existing debug logs for modifications | `FabricMapCanvas.tsx` - `handleObjectModified()` |

## 1. Polygon Creation Logging (🆕)

**Location:** `client/src/modules/map-editor/FabricMapCanvas.tsx` - `completePolygon()` function

**What it logs:**
- Polygon ID and name
- Total points count
- Full points array (absolute coordinates)
- Calculated bounding box (left, top, width, height)
- Fabric.js position (left, top, width, height)
- Timestamp

**Example log:**
```javascript
🆕 POLYGON CREATED {
  id: 'polygon_1234567890',
  name: 'Collision Area 1',
  pointsCount: 4,
  points: [
    { x: 1000, y: 500 },
    { x: 1200, y: 500 },
    { x: 1200, y: 700 },
    { x: 1000, y: 700 }
  ],
  boundingBox: { left: 1000, top: 500, width: 200, height: 200 },
  fabricPosition: { left: 1000, top: 500, width: 200, height: 200 },
  timestamp: '2025-09-30T00:15:30.123Z'
}
```

## 2. Drag Event Logging (🔄)

**Location:** `client/src/modules/map-editor/FabricMapCanvas.tsx` - Event listeners section

### 2.1 Drag Start
**Trigger:** First `object:moving` event
**What it logs:**
- Object ID and type
- Initial position (left, top)
- Initial scale (scaleX, scaleY)
- Initial angle
- Timestamp

**Example log:**
```javascript
🔄 DRAG START {
  id: 'polygon_1234567890',
  type: 'polygon',
  position: { left: 1000, top: 500 },
  scale: { x: 1, y: 1 },
  angle: 0,
  timestamp: '2025-09-30T00:16:00.000Z'
}
```

### 2.2 During Drag
**Trigger:** `object:moving` event (throttled to every 100ms)
**What it logs:**
- Object ID
- Current position (left, top)
- Delta from drag start (x, y)
- Timestamp

**Example log:**
```javascript
🔄 DRAGGING {
  id: 'polygon_1234567890',
  position: { left: 1050, top: 550 },
  delta: { x: 50, y: 50 },
  timestamp: '2025-09-30T00:16:00.150Z'
}
```

### 2.3 Drag End
**Trigger:** `object:modified` event
**What it logs:**
- Object ID
- Final position (left, top)
- Total delta from drag start
- Drag duration (milliseconds)
- Timestamp

**Example log:**
```javascript
🔄 DRAG END {
  id: 'polygon_1234567890',
  position: { left: 1100, top: 600 },
  delta: { x: 100, y: 100 },
  duration: 1523,
  timestamp: '2025-09-30T00:16:01.523Z'
}
```

## 3. Flash Detection Logging (⚡)

**Location:** `client/src/modules/map-editor/FabricMapCanvas.tsx` - Smart update section

**Purpose:** Measure timing between critical operations to identify visual flashes

### 3.1 Before Smart Update
**What it logs:**
- Object ID
- Position before any changes
- Timestamp

### 3.2 After polygon.set()
**What it logs:**
- Object ID
- Position after set() call
- Duration since before smart update (ms)
- Timestamp

### 3.3 After polygon.setCoords()
**What it logs:**
- Object ID
- Position after setCoords() call
- Duration since set() call (ms)
- Timestamp

**Example log sequence:**
```javascript
⚡ BEFORE SMART UPDATE {
  id: 'polygon_1234567890',
  position: { left: 1100, top: 600, scaleX: 1, scaleY: 1, angle: 0 },
  timestamp: '2025-09-30T00:16:01.600Z'
}

⚡ AFTER SET {
  id: 'polygon_1234567890',
  position: { left: 1100, top: 600, scaleX: 1, scaleY: 1 },
  duration: 2,
  timestamp: '2025-09-30T00:16:01.602Z'
}

⚡ AFTER SETCOORDS {
  id: 'polygon_1234567890',
  position: { left: 1100, top: 600 },
  duration: 1,
  timestamp: '2025-09-30T00:16:01.603Z'
}
```

## 4. Save Operation Logging (💾)

**Location:** `client/src/shared/SharedMapSystem.ts` - `saveMapData()` function

### 4.1 Before Save
**What it logs:**
- Total impassable areas count
- Polygon count
- For each polygon:
  - ID and name
  - Points count
  - First and last point coordinates
- Timestamp

### 4.2 After Save to localStorage
**What it logs:**
- Data size (JSON string length)
- Polygon count
- For each polygon:
  - ID
  - Points count
  - First point coordinates
- Timestamp

**Example log sequence:**
```javascript
💾 SAVING - BEFORE {
  totalImpassableAreas: 5,
  polygonCount: 2,
  polygons: [
    {
      id: 'polygon_1234567890',
      name: 'Collision Area 1',
      pointsCount: 4,
      firstPoint: { x: 1100, y: 600 },
      lastPoint: { x: 1100, y: 800 }
    }
  ],
  timestamp: '2025-09-30T00:17:00.000Z'
}

💾 SAVED TO LOCALSTORAGE {
  dataSize: 45678,
  polygonCount: 2,
  polygons: [
    {
      id: 'polygon_1234567890',
      pointsCount: 4,
      firstPoint: { x: 1100, y: 600 }
    }
  ],
  timestamp: '2025-09-30T00:17:00.050Z'
}
```

## 5. Page Reload Logging (🔃)

**Location:** `client/src/modules/map-editor/FabricMapCanvas.tsx` - `renderCollisionAreas()` function

### 5.1 Loaded from Storage
**What it logs:**
- Object ID and name
- Points count
- First and last point coordinates (absolute)
- Timestamp

### 5.2 Rendered on Canvas
**What it logs:**
- Object ID
- Position (left, top)
- Fabric.js position (left, top, width, height)
- Timestamp

**Example log sequence:**
```javascript
🔃 LOADED FROM STORAGE {
  id: 'polygon_1234567890',
  name: 'Collision Area 1',
  pointsCount: 4,
  firstPoint: { x: 1100, y: 600 },
  lastPoint: { x: 1100, y: 800 },
  timestamp: '2025-09-30T00:18:00.000Z'
}

🔃 RENDERED ON CANVAS {
  id: 'polygon_1234567890',
  position: { left: 1100, top: 600 },
  fabricPosition: { left: 1100, top: 600, width: 200, height: 200 },
  timestamp: '2025-09-30T00:18:00.050Z'
}
```

## 6. Position Jump Detection (⚠️)

**Location:** `client/src/modules/map-editor/FabricMapCanvas.tsx` - Smart update section

**Purpose:** Detect unexpected position changes during smart updates

**Threshold:** Logs if position changes by more than 0.1 pixels

**What it logs:**
- Object ID
- Position before smart update
- Position after smart update
- Difference (delta) for all properties
- Source of the jump
- Timestamp

**Example log:**
```javascript
⚠️ POSITION JUMP DETECTED {
  id: 'polygon_1234567890',
  before: { left: 1100, top: 600, scaleX: 1, scaleY: 1, angle: 0 },
  after: { left: 1000, top: 500, scaleX: 1, scaleY: 1, angle: 0 },
  diff: { left: -100, top: -100, scaleX: 0, scaleY: 0, angle: 0 },
  source: 'smart-update',
  timestamp: '2025-09-30T00:16:01.605Z'
}
```

## How to Use This Logging

### Testing Polygon Movement
1. Open browser console
2. Filter logs by emoji: `🔄` for drag events
3. Create a polygon
4. Move it and observe the sequence:
   - `🔄 DRAG START` - Initial position
   - `🔄 DRAGGING` - Movement updates (every 100ms)
   - `🔄 DRAG END` - Final position
   - `🔍 POLYGON MODIFY START` - Modification handler triggered
   - `⚡ BEFORE SMART UPDATE` - Position before update
   - `⚡ AFTER SET` - Position after set()
   - `⚡ AFTER SETCOORDS` - Position after setCoords()
   - `⚠️ POSITION JUMP DETECTED` - Only if position changed unexpectedly

### Testing Save/Reload
1. Create/move a polygon
2. Click Save button
3. Look for `💾 SAVING - BEFORE` and `💾 SAVED TO LOCALSTORAGE`
4. Refresh the page
5. Look for `🔃 LOADED FROM STORAGE` and `🔃 RENDERED ON CANVAS`
6. Compare positions to verify persistence

### Identifying Flash Issues
1. Filter logs by `⚡`
2. Look at the `duration` values
3. If duration > 16ms (one frame), it may cause visible flash
4. Check if position changes between steps

### Detecting Position Jumps
1. Filter logs by `⚠️`
2. Any logs here indicate unexpected position changes
3. Check the `diff` values to see how much it jumped
4. Check the `source` to identify where it happened

## Files Modified

1. **client/src/modules/map-editor/FabricMapCanvas.tsx**
   - Added 🆕 logging to `completePolygon()`
   - Added 🔄 logging to `object:moving` and `object:modified` events
   - Added ⚡ logging to smart update section
   - Added ⚠️ logging to smart update section
   - Added 🔃 logging to polygon creation from storage

2. **client/src/shared/SharedMapSystem.ts**
   - Added 💾 logging to `saveMapData()` function

## Next Steps

After collecting logs from manual testing:
1. Analyze the log sequence to identify where positions change unexpectedly
2. Verify that positions persist correctly across save/reload
3. Measure flash duration to identify performance bottlenecks
4. Use position jump logs to find bugs in coordinate conversion
5. Optionally clean up debug logging once issues are resolved

