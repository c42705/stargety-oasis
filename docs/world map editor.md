Here’s your **updated, comprehensive plan** in Markdown, now factoring in your **React + Phaser + Socket.io + Event Bus** stack. This plan ensures seamless integration with your existing architecture and real-time updates.

---

```markdown
# Phaser + Fabric.js Map Editor: React + Socket.io Integration Plan

---

## **1. Project Overview**
### **1.1. Stack**
- **Frontend:** React (hosts Phaser game and Fabric.js editor)
- **Game Engine:** Phaser 3 (rendering)
- **Editor:** Fabric.js (drag-and-drop, object manipulation)
- **Real-Time:** Socket.io (sync between editor and game instances)
- **State Management:** Event Bus (for internal app communication)
- **Backend:** (Optional) Node.js for saving/loading maps

### **1.2. Directory Structure**
```
src/
├── components/
│   ├── Game/            # Phaser game component
│   │   ├── Game.jsx
│   │   ├── game.js      # Phaser config and logic
│   │   └── sync.js      # Socket.io and event bus logic
│   ├── Editor/          # Fabric.js editor component
│   │   ├── Editor.jsx
│   │   ├── editor.js    # Fabric.js logic
│   │   └── sync.js      # Socket.io and event bus logic
│   └── App.jsx          # Main React app
├── shared/
│   ├── mapSchema.js     # Shared JSON schema for maps
│   └── events.js        # Event bus constants
├── services/
│   └── socket.js        # Socket.io client setup
└── assets/              # Shared assets (images, sprites)
```

---

## **2. React Integration**
### **2.1. App.jsx**
- Host both Phaser game and Fabric.js editor in React components.
- Use React state to manage the editor window (modal or separate route).

**Code:**
```jsx
// App.jsx
import React, { useState } from 'react';
import Game from './components/Game/Game';
import Editor from './components/Editor/Editor';

function App() {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [currentMap, setCurrentMap] = useState(null);

  return (
    <div className="app">
      <Game currentMap={currentMap} />
      {isEditorOpen && (
        <Editor
          onClose={() => setIsEditorOpen(false)}
          onMapChange={(mapData) => setCurrentMap(mapData)}
        />
      )}
      <button onClick={() => setIsEditorOpen(true)}>Open Editor</button>
    </div>
  );
}
```

---

## **3. Game Component (Phaser + React)**
### **3.1. Game.jsx**
- Initialize Phaser game in a React `useEffect`.
- Listen for map updates via **Event Bus** and **Socket.io**.

**Code:**
```jsx
// Game/Game.jsx
import React, { useEffect } from 'react';
import Phaser from 'phaser';
import { gameConfig } from './game';
import { eventBus } from '../../shared/events';
import { socket } from '../../services/socket';

export default function Game({ currentMap }) {
  useEffect(() => {
    const game = new Phaser.Game(gameConfig);

    // Listen for map updates from Event Bus
    eventBus.on('MAP_UPDATE', (mapData) => {
      // Update Phaser scene
      game.scene.keys.main.renderMap(mapData);
    });

    // Listen for real-time updates from Socket.io
    socket.on('map_update', (mapData) => {
      eventBus.emit('MAP_UPDATE', mapData);
    });

    return () => {
      game.destroy(true);
      eventBus.off('MAP_UPDATE');
      socket.off('map_update');
    };
  }, []);

  return <div id="game-container" />;
}
```

### **3.2. game.js**
- Phaser scene to render the map.
- Use `eventBus` to receive updates from the editor.

**Code:**
```javascript
// Game/game.js
import { eventBus } from '../../shared/events';

export const gameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  scene: {
    preload: preload,
    create: create,
  },
};

function preload() {
  // Dynamically load assets based on currentMap
}

function create() {
  eventBus.on('MAP_UPDATE', (mapData) => {
    this.children.removeAll(true);
    renderMap.call(this, mapData);
  });
}

function renderMap(mapData) {
  // Render background, objects, and areas
}
```

---

## **4. Editor Component (Fabric.js + React)**
### **4.1. Editor.jsx**
- Initialize Fabric.js in a React `useEffect`.
- Emit changes via **Event Bus** and **Socket.io**.

**Code:**
```jsx
// Editor/Editor.jsx
import React, { useEffect, useRef } from 'react';
import { initFabric } from './editor';
import { eventBus } from '../../shared/events';
import { socket } from '../../services/socket';

export default function Editor({ onClose, onMapChange }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const { canvas, updateMapData } = initFabric(canvasRef.current);

    // Sync with game via Event Bus
    eventBus.on('LOAD_MAP', (mapData) => {
      canvas.loadFromJSON(mapData, () => {
        canvas.renderAll();
      });
    });

    // Sync with other clients via Socket.io
    socket.on('map_update', (mapData) => {
      canvas.loadFromJSON(mapData, () => {
        canvas.renderAll();
      });
    });

    return () => {
      eventBus.off('LOAD_MAP');
      socket.off('map_update');
    };
  }, []);

  return (
    <div className="editor-modal">
      <div className="toolbar">
        <button onClick={() => uploadBackground()}>Upload Background</button>
        <button onClick={() => uploadCharacter()}>Upload Character</button>
        <button onClick={() => saveMap()}>Save Map</button>
        <button onClick={onClose}>Close</button>
      </div>
      <canvas ref={canvasRef} width="1000" height="800" />
    </div>
  );
}
```

### **4.2. editor.js**
- Fabric.js setup and event handling.
- Emit changes to **Event Bus** and **Socket.io**.

**Code:**
```javascript
// Editor/editor.js
import { eventBus } from '../../shared/events';
import { socket } from '../../services/socket';

export function initFabric(canvasEl) {
  const canvas = new fabric.Canvas(canvasEl, {
    selection: true,
    preserveObjectStacking: true,
  });

  let mapData = { layers: [], areas: [] };

  canvas.on('object:added', updateMapData);
  canvas.on('object:modified', updateMapData);
  canvas.on('object:removed', updateMapData);

  function updateMapData() {
    mapData = {
      layers: canvas.getObjects().map(obj => ({
        id: obj.id,
        type: obj.type,
        x: obj.left,
        y: obj.top,
        width: obj.width,
        height: obj.height,
        src: obj.src,
      })),
      areas: /* serialized area data */,
    };
    eventBus.emit('MAP_UPDATE', mapData);
    socket.emit('map_update', mapData);
  }

  return { canvas, updateMapData };
}
```

---

## **5. Real-Time Sync with Socket.io**
### **5.1. Socket.io Setup**
- Emit map changes from the editor to all connected clients.
- Listen for updates in both editor and game.

**Code:**
```javascript
// services/socket.js
import io from 'socket.io-client';

export const socket = io('http://your-backend-url');

socket.on('connect', () => {
  console.log('Connected to Socket.io server');
});
```

### **5.2. Backend (Node.js)**
- Broadcast map updates to all clients.

**Code:**
```javascript
// server.js (Node.js)
const io = require('socket.io')(3001);

io.on('connection', (socket) => {
  socket.on('map_update', (mapData) => {
    io.emit('map_update', mapData); // Broadcast to all clients
  });
});
```

---

## **6. Event Bus**
### **6.1. Shared Events**
- Use a simple event bus for internal React app communication.

**Code:**
```javascript
// shared/events.js
import { EventEmitter } from 'events';
export const eventBus = new EventEmitter();
```

### **6.2. Event Types**
| Event          | Payload       | Emitter       | Listener      |
|----------------|---------------|---------------|---------------|
| `MAP_UPDATE`   | `mapData`     | Editor        | Game          |
| `LOAD_MAP`     | `mapData`     | Game/Editor   | Editor        |

---

## **7. Core Features (Updated for React/Socket.io)**
### **7.1. Upload Background/Characters/Objects**
- Use React file inputs and Fabric.js to add objects.
- Emit changes via `updateMapData`.

**Code:**
```javascript
// Editor/editor.js
export function uploadBackground() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = (e) => {
    const file = e.target.files[0];
    const url = URL.createObjectURL(file);
    fabric.Image.fromURL(url, (img) => {
      canvas.setBackgroundImage(url, () => {
        canvas.renderAll();
        updateMapData();
      });
    });
  };
  input.click();
}
```

### **7.2. Draw Areas**
- Use Fabric.js free drawing for areas.
- Assign `type` and `color` based on area type.

**Code:**
```javascript
// Editor/editor.js
export function drawArea(type) {
  canvas.isDrawingMode = true;
  canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
  canvas.freeDrawingBrush.color = getColorForAreaType(type);
  canvas.freeDrawingBrush.width = 10;
  canvas.on('path:created', (e) => {
    const path = e.path;
    path.set({ type: 'area', areaType: type });
    updateMapData();
    canvas.isDrawingMode = false;
  });
}
```

---

## **8. Save/Load Maps**
### **8.1. Save Map**
- Serialize Fabric.js canvas to JSON.
- Optionally send to backend via Socket.io or REST.

**Code:**
```javascript
// Editor/editor.js
export function saveMap() {
  const json = JSON.stringify(mapData);
  const blob = new Blob([json], { type: 'application/json' });
  saveAs(blob, 'map.json');
  // Or: socket.emit('save_map', mapData);
}
```

### **8.2. Load Map**
- Load JSON into Fabric.js and emit to game.

**Code:**
```javascript
// Editor/editor.js
export function loadMapFromFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const json = JSON.parse(event.target.result);
      canvas.loadFromJSON(json, () => {
        canvas.renderAll();
        updateMapData();
      });
    };
    reader.readAsText(file);
  };
  input.click();
}
```

---

## **9. JSON Schema**
### **9.1. Map Data Structure**
```json
{
  "layers": [
    {
      "id": "bg1",
      "type": "background",
      "src": "path/to/bg.png",
      "x": 0,
      "y": 0
    },
    {
      "id": "tree1",
      "type": "object",
      "src": "path/to/tree.png",
      "x": 100,
      "y": 200,
      "zIndex": 1
    }
  ],
  "areas": [
    {
      "id": "area1",
      "type": "private",
      "points": [[10, 10], [50, 10], [50, 50], [10, 50]],
      "color": "rgba(255, 0, 0, 0.5)"
    }
  ]
}
```

---

## **10. Phaser Rendering (Updated)**
### **10.1. Dynamic Asset Loading**
- Preload assets dynamically based on `mapData`.

**Code:**
```javascript
// Game/game.js
function preload() {
  this.load.image('bg', currentMap.layers.find(l => l.type === 'background').src);
  currentMap.layers
    .filter(l => l.type === 'object')
    .forEach(obj => {
      this.load.image(obj.id, obj.src);
    });
}
```

### **10.2. Render Map**
- Clear and redraw all objects/areas on `MAP_UPDATE`.

**Code:**
```javascript
// Game/game.js
function renderMap(mapData) {
  this.children.removeAll(true);

  // Render background
  const bg = mapData.layers.find(l => l.type === 'background');
  this.add.image(bg.x, bg.y, 'bg').setOrigin(0);

  // Render objects
  mapData.layers
    .filter(l => l.type === 'object')
    .forEach(obj => {
      this.add.image(obj.x, obj.y, obj.id).setDepth(obj.zIndex);
    });

  // Render areas
  mapData.areas.forEach(area => {
    const graphics = this.add.graphics();
    graphics.fillStyle(area.color);
    graphics.fillPoints(area.points);
  });
}
```

---

## **11. Testing Plan**
### **11.1. Test Cases**
1. Open editor and upload background/objects.
2. Draw private/room/impassable areas.
3. Verify real-time sync between multiple game clients.
4. Save and load maps.
5. Test with Socket.io backend (if applicable).

### **11.2. Debugging Tips**
- Log `mapData` in both editor and game.
- Use React DevTools and Phaser Debug plugin.
- Check Socket.io connection and events in browser console.

---

## **12. Deployment**
- **Frontend:** Build React app and serve static files.
- **Backend:** Deploy Node.js/Socket.io server (if used).
- **Assets:** Ensure CORS headers for uploaded images.

---

## **13. Next Steps**
1. Set up React components for Game and Editor.
2. Integrate Phaser and Fabric.js.
3. Implement Socket.io and Event Bus sync.
4. Add upload/drawing functionality.
5. Test real-time updates and save/load.

---
