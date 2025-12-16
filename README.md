# 🌟 Stargety Oasis

A comprehensive virtual world platform that combines real-time chat, video calling, and an interactive 2D world experience with a powerful map editor. Built with modern web technologies and designed for seamless communication and collaboration.

## ✨ Features

### 💬 Real-time Chat
- Multi-room chat system with Socket.IO
- Typing indicators and user presence tracking
- Emoji support and message history

### 📹 Video Calling
- Integrated Jitsi Meet video calls
- Room-based video conferences with screen sharing
- Automatic join/leave when entering interactive map areas

### 🌍 Interactive 2D World
- Phaser.js-powered virtual world
- Real-time multi-player movement synchronization
- Custom avatar system with sprite animations
- Interactive areas and collision detection

### 🗺️ Map Editor
- Konva.js-based visual map editor
- Interactive area creation and management
- Background image support with dimension management
- Asset placement and impassable area drawing

### 🎨 UI/UX
- Ant Design component library with theme system
- Multiple theme support (Light, Dark, Stargety Oasis, Ant Design Default)
- Responsive design with admin dashboard

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose

### Docker Setup (Recommended)

```bash
# Start all services (client, server, database)
docker compose up -d --build

# View logs
docker compose logs -f

# Stop services
docker compose down
```

Access the application at http://localhost:3000

## 📁 Project Structure

```
stargety-oasis/
├── client/                 # React frontend
│   ├── src/
│   │   ├── modules/        # Feature modules
│   │   │   ├── chat/       # Chat module
│   │   │   ├── video-call/ # Video call module (Jitsi)
│   │   │   ├── world/      # 2D world module (Phaser.js)
│   │   │   └── map-editor-konva/  # Map editor (Konva.js)
│   │   ├── redux/          # Redux store and slices
│   │   ├── stores/         # Data services
│   │   ├── services/       # API services
│   │   ├── shared/         # Shared utilities and contexts
│   │   └── theme/          # Ant Design theming
│   └── public/
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── chat/           # Chat API
│   │   ├── map/            # Map API (PostgreSQL)
│   │   ├── avatar/         # Avatar API
│   │   └── world/          # World state management
│   └── prisma/             # Database schema and migrations
├── docker-compose.yml      # Docker configuration
└── docs/                   # Documentation
```

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript
- **Redux Toolkit** for state management (map data, user state)
- **Phaser.js** for 2D world rendering
- **Konva.js** for map editor canvas
- **Ant Design** for UI components
- **Socket.IO Client** for real-time communication

### Backend
- **Node.js** with Express and TypeScript
- **PostgreSQL** with Prisma ORM
- **Socket.IO** for real-time communication
- **RESTful API** endpoints

### Data Flow
```
PostgreSQL ← Prisma → Express API → Socket.IO → Redux Store → React Components
                                                     ↓
                                              Phaser.js / Konva.js
```

## 🔧 Configuration

### Environment Variables

Server environment variables are configured in `docker-compose.yml`:

```env
DATABASE_URL=postgresql://user:password@db:5432/stargety_oasis
PORT=3001
NODE_ENV=development
```

## 🛠️ Development

### Docker Commands

```bash
# Rebuild and start
docker compose up -d --build

# Rebuild specific service
docker compose up -d --build client

# View logs
docker compose logs client --tail=50
docker compose logs server --tail=50

# Access database
docker compose exec db psql -U stargety_user -d stargety_oasis
```

## 🙏 Technologies

- [React](https://reactjs.org/) - Frontend framework
- [Redux Toolkit](https://redux-toolkit.js.org/) - State management
- [Ant Design](https://ant.design/) - UI component library
- [Phaser.js](https://phaser.io/) - 2D game framework
- [Konva.js](https://konvajs.org/) - Canvas library for map editor
- [Node.js](https://nodejs.org/) - Backend runtime
- [PostgreSQL](https://www.postgresql.org/) - Database
- [Prisma](https://www.prisma.io/) - ORM
- [Socket.IO](https://socket.io/) - Real-time communication
- [Jitsi Meet](https://jitsi.org/) - Video conferencing
- [Docker](https://www.docker.com/) - Containerization

---

**Stargety Oasis** - Where virtual worlds come alive! 🌟
