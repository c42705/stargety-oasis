# **Plan de Implementación Actualizado (React + LXC)**

### **1. Arquitectura Modular con React**
- **Frontend**: Aplicación React con módulos independientes para chat, videollamadas y el mundo 2D.
- **Backend**: Servidor Node.js/Express/Socket.IO para manejar la lógica del mundo virtual, chat y videollamadas.
- **Comunicación**: APIs REST y WebSocket (Socket.IO) para la interacción entre módulos.
- **Despliegue**: Contenedor LXC en Proxmox VE, con Nginx Proxy Manager para SSL y routing.

---

## **2. Estructura de Directorios (React + TypeScript)**

```
stargety-oasis/
├── client/                  # Aplicación React
│   ├── public/              # Archivos estáticos
│   ├── src/
│   │   ├── components/      # Componentes compartidos
│   │   ├── modules/         # Módulos independientes
│   │   │   ├── chat/        # Módulo de Chat
│   │   │   ├── video-call/  # Módulo de Videollamadas
│   │   │   └── world/       # Módulo del Mundo 2D (Phaser.js)
│   │   ├── shared/          # Utilidades, tipos y bus de eventos
│   │   └── App.tsx          # Componente principal
│   └── package.json
├── server/                  # Backend (Node.js/Express/Socket.IO)
│   ├── chat/                # API del chat
│   ├── video-call/          # API de videollamadas
│   ├── world/               # Lógica del mundo virtual
│   └── package.json
├── Dockerfile               # Para construir la imagen del contenedor
└── lxc-config/              # Configuración para el contenedor LXC
```

---

## **3. Pasos Detallados**

---

### **Fase 1: Configuración del Entorno de Desarrollo**
#### **Objetivo**: Preparar el entorno para desarrollar la aplicación React y el backend en un contenedor LXC.

- **Acciones**:
  1. **Crear un contenedor LXC en Proxmox VE**:
     - Usar una plantilla de Ubuntu/Debian.
     - Asignar recursos (CPU, RAM, almacenamiento).
     - Configurar red y acceso SSH.
  2. **Instalar dependencias en el contenedor**:
     ```bash
     apt update && apt upgrade -y
     apt install -y nodejs npm git curl
     npm install -g pnpm  # Opcional: Usar pnpm para gestionar dependencias
     ```
  3. **Clonar el repositorio** (o copiar los archivos generados anteriormente) en el contenedor.
  4. **Inicializar el proyecto React**:
     ```bash
     npx create-react-app client --template typescript
     cd client
     pnpm add phaser react-router-dom socket.io-client @types/phaser @types/socket.io-client
     ```
  5. **Inicializar el backend**:
     ```bash
     mkdir server && cd server
     npm init -y
     npm install express socket.io cors mongoose
     ```

---

### **Fase 2: Implementar Módulos en React**
#### **Objetivo**: Crear los módulos de chat, videollamadas y mundo 2D como componentes React independientes.

- **Acciones**:
  1. **Módulo de Chat**:
     - Crear `client/src/modules/chat/ChatModule.tsx` (componente React).
     - Usar `Socket.IO` para conectarse al backend.
     - Ejemplo:
       ```tsx
       // ChatModule.tsx
       import { useEffect, useState } from 'react';
       import { io } from 'socket.io-client';

       export const ChatModule = () => {
         const [messages, setMessages] = useState<string[]>([]);
         const socket = io('http://localhost:3001');

         useEffect(() => {
           socket.on('chatMessage', (msg: string) => {
             setMessages(prev => [...prev, msg]);
           });
         }, []);

         return (
           <div>
             {messages.map((msg, i) => <div key={i}>{msg}</div>)}
           </div>
         );
       };
       ```
  2. **Módulo de Videollamadas**:
     - Crear `client/src/modules/video-call/VideoCallModule.tsx`.
     - Usar un `iframe` para Jitsi o el SDK de RingCentral.
     - Ejemplo para Jitsi:
       ```tsx
       export const VideoCallModule = ({ room }: { room: string }) => {
         return (
           <iframe
             src={`https://meet.jit.si/${room}`}
             width="100%"
             height="400px"
           />
         );
       };
       ```
  3. **Módulo del Mundo 2D**:
     - Integrar Phaser.js en un componente React.
     - Ejemplo:
       ```tsx
       // WorldModule.tsx
       import { useEffect } from 'react';
       import Phaser from 'phaser';

       export const WorldModule = () => {
         useEffect(() => {
           const config = { /* Configuración de Phaser */ };
           new Phaser.Game(config);
         }, []);

         return <div id="game-container" />;
       };
       ```

---

### **Fase 3: Backend y APIs**
#### **Objetivo**: Implementar el servidor para manejar el chat, videollamadas y el mundo virtual.

- **Acciones**:
  1. **Servidor Express + Socket.IO**:
     ```javascript
     // server/index.js
     const express = require('express');
     const http = require('http');
     const { Server } = require('socket.io');

     const app = express();
     const server = http.createServer(app);
     const io = new Server(server, { cors: { origin: "*" } });

     io.on('connection', (socket) => {
       socket.on('chatMessage', (msg) => {
         io.emit('chatMessage', msg);
       });
     });

     server.listen(3001, () => {
       console.log('Server running on port 3001');
     });
     ```
  2. **APIs para videollamadas**:
     - Si usas Jitsi, no necesitas API (solo el iframe).
     - Si usas RingCentral, implementar endpoints para generar tokens de acceso.

---

### **Fase 4: Comunicación entre Módulos**
#### **Objetivo**: Usar un bus de eventos (o Context API de React) para la comunicación interna.

- **Acciones**:
  1. **Crear un contexto global**:
     ```tsx
     // client/src/shared/EventBus.tsx
     import { createContext, useContext } from 'react';

     type EventBus = {
       publish: (event: string, data: any) => void;
       subscribe: (event: string, callback: (data: any) => void) => void;
     };

     const EventBusContext = createContext<EventBus | null>(null);

     export const EventBusProvider = ({ children }: { children: React.ReactNode }) => {
       const bus: EventBus = {
         events: {},
         publish(event, data) {
           this.events[event]?.forEach(cb => cb(data));
         },
         subscribe(event, callback) {
           if (!this.events[event]) this.events[event] = [];
           this.events[event].push(callback);
         }
       };

       return (
         <EventBusContext.Provider value={bus}>
           {children}
         </EventBusContext.Provider>
       );
     };

     export const useEventBus = () => useContext(EventBusContext);
     ```
  2. **Usar el contexto en los módulos**:
     ```tsx
     // En App.tsx
     <EventBusProvider>
       <ChatModule />
       <VideoCallModule room="sala-principal" />
       <WorldModule />
     </EventBusProvider>
     ```

---

### **Fase 5: Despliegue en LXC**
#### **Objetivo**: Configurar el contenedor LXC para ejecutar la aplicación.

- **Acciones**:
  1. **Crear un `Dockerfile`** para la aplicación:
     ```dockerfile
     FROM node:18

     WORKDIR /app
     COPY client/package.json client/package-lock.json ./
     RUN npm install

     COPY client .
     RUN npm run build

     COPY server .
     RUN npm install

     EXPOSE 3000 3001
     CMD ["node", "server/index.js"]
     ```
  2. **Construir y ejecutar la imagen**:
     ```bash
     docker build -t stargety-oasis .
     docker run -p 3000:3000 -p 3001:3001 stargety-oasis
     ```
  3. **Configurar Nginx Proxy Manager**:
     - Crear un host para el frontend (puerto 3000).
     - Crear un host para el backend (puerto 3001).
     - Configurar SSL con Let's Encrypt.

---

### **Fase 6: Pruebas y Ajustes**
#### **Objetivo**: Probar la aplicación y ajustar detalles.

- **Acciones**:
  1. Probar la comunicación entre módulos.
  2. Verificar que el mundo 2D, chat y videollamadas funcionen correctamente.
  3. Ajustar el rendimiento del contenedor LXC si es necesario.

---

## **4. Tecnologías Clave**
| Área               | Tecnología                          |
|--------------------|-------------------------------------|
| **Frontend**       | React, TypeScript, Phaser.js        |
| **Backend**        | Node.js, Express, Socket.IO         |
| **Videollamadas**  | Jitsi (iframe) o RingCentral (SDK)  |
| **Base de Datos**  | MongoDB o PostgreSQL                |
| **Despliegue**     | LXC (Proxmox VE), Docker, Nginx     |

---

