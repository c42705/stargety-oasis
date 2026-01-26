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

## 🗄️ Database Management

### Database Reset Script

The database reset script allows you to completely wipe and reinitialize the database during development.

**⚠️ WARNING:** This script is **ONLY** for development environments. Never use this in production!

#### Usage

```bash
# From root directory
npm run db:reset

# Or from server directory
cd server && npm run db:reset
```

#### What It Does

1. **Prompts for confirmation** - Requires two separate confirmations to prevent accidental data loss
2. **Drops all tables** - Completely wipes the database
3. **Runs migrations** - Re-applies Prisma migrations to restore the schema
4. **Optional seeding** - Prompts to populate with default test data

#### Confirmation Process

The script implements a two-step confirmation process:

1. **First prompt:** `Are you sure you want to WIPE the database? This will DELETE ALL DATA. Type 'YES' to continue:`
   - Must type exactly `YES` (case-sensitive)

2. **Second prompt:** `This action is IRREVERSIBLE. Type 'WIPE DATABASE' to confirm:`
   - Must type exactly `WIPE DATABASE` (case-sensitive)

3. **Countdown:** 3-second countdown before execution begins
   - Press `Ctrl+C` to cancel during countdown

#### Example Session

```bash
$ npm run db:reset

╔════════════════════════════════════════════════════════════════╗
║                    ⚠️  DATABASE RESET WARNING  ⚠️               ║
╚════════════════════════════════════════════════════════════════╝

This action will:
  1. DROP all tables in the database
  2. DELETE ALL DATA permanently
  3. Re-run Prisma migrations to restore schema

Target Database:
  postgresql://user:****@db:5432/stargety_oasis

Are you sure you want to WIPE the database? This will DELETE ALL DATA. Type 'YES' to continue: YES
This action is IRREVERSIBLE. Type 'WIPE DATABASE' to confirm: WIPE DATABASE

Executing in 3 seconds... Press Ctrl+C to cancel.

🔌 Connecting to database...
✅ Database connected
🗑️  Wiping all data from database...
✅ All tables dropped
🔄 Running Prisma migrations...
✅ Migrations completed

Do you want to seed the database with default data? (y/n): y
🌱 Running seed script...
✅ Seed completed

╔════════════════════════════════════════════════════════════════╗
║                   ✅ DATABASE RESET SUCCESSFUL ✅              ║
╚════════════════════════════════════════════════════════════════╝
```

#### When to Use

- **Development:** Resetting to a clean state for testing
- **Testing:** Preparing a fresh database for test runs
- **Debugging:** Clearing corrupted or test data
- **Schema changes:** Starting fresh after major schema modifications

#### Default Seed Data

When you choose to seed the database, it creates:

- **Test User:**
  - Email: `test@stargety.io`
  - Password: `password123`
  - Username: `testuser`

- **Default Map:** "Stargety Oasis" with interactive areas (Meeting Room, Presentation Hall, Coffee Corner, Game Zone)

- **Character Slots:** 5 empty character slots for the test user

- **User Settings:** Default theme and editor preferences

- **Chat Room:** General chat room for testing

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
