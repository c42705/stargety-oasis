# 🌟 Stargety Oasis

A comprehensive virtual world platform that combines real-time chat, video calling, and an interactive 2D world experience. Built with modern web technologies and designed for seamless communication and collaboration.

## ✨ Features

### 💬 Real-time Chat
- Multi-room chat system
- Real-time messaging with Socket.IO
- Typing indicators
- User presence tracking
- Emoji support
- Message history

### 📹 Video Calling
- Integrated Jitsi Meet video calls
- Room-based video conferences
- Screen sharing support
- Participant management
- Audio/video controls

### 🌍 Interactive 2D World
- Phaser.js-powered virtual world
- Real-time player movement
- Multi-user synchronization
- Interactive environment
- Avatar system

### 🔧 Technical Features
- Modular architecture with event bus communication
- TypeScript for type safety
- Docker containerization
- Responsive design
- Real-time synchronization
- File-based storage (easily upgradeable to database)

## 🚀 Quick Start

### Prerequisites
- Node.js 16+ and npm 8+
- Docker and Docker Compose (optional)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/stargety-oasis.git
   cd stargety-oasis
   ```

2. **Install all dependencies**
   ```bash
   npm run install:all
   ```

3. **Start development servers**
   ```bash
   npm run dev
   ```

   This will start:
   - React client on http://localhost:3000
   - Node.js server on http://localhost:3001

### Docker Setup

1. **Development with Docker**
   ```bash
   npm run docker:dev
   ```

2. **Production with Docker**
   ```bash
   npm run docker:prod
   ```

## 📁 Project Structure

```
stargety-oasis/
├── client/                 # React frontend
│   ├── src/
│   │   ├── modules/        # Feature modules
│   │   │   ├── chat/       # Chat module
│   │   │   ├── video-call/ # Video call module
│   │   │   └── world/      # 2D world module
│   │   ├── shared/         # Shared utilities
│   │   └── components/     # Reusable components
│   └── public/
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── chat/           # Chat API
│   │   ├── video-call/     # Video call API
│   │   ├── world/          # World API
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Utilities
│   └── dist/               # Compiled JavaScript
├── docker-compose.yml      # Docker configuration
├── Dockerfile             # Multi-stage Docker build
└── package.json           # Root package.json
```

## 🛠️ Available Scripts

### Root Level
- `npm run dev` - Start both client and server in development mode
- `npm run build` - Build both client and server for production
- `npm run install:all` - Install dependencies for all packages
- `npm run docker:build` - Build Docker image
- `npm run docker:dev` - Run with Docker Compose (development)
- `npm run docker:prod` - Run with Docker Compose (production)

### Client Scripts
- `npm start` - Start React development server
- `npm run build` - Build React app for production
- `npm test` - Run tests

### Server Scripts
- `npm run dev` - Start server with nodemon (development)
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start production server

## 🔧 Configuration

### Environment Variables

Create `.env` files in the server directory:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Client Configuration
CLIENT_URL=http://localhost:3000

# CORS Configuration
CORS_ORIGIN=http://localhost:3000
```

### Docker Configuration

The project includes comprehensive Docker support:

- **Multi-stage Dockerfile** for optimized production builds
- **Docker Compose** with profiles for different environments
- **Health checks** and proper container orchestration
- **Volume mounting** for persistent data

## 🏗️ Architecture

### Frontend Architecture
- **React 18** with TypeScript
- **Modular design** with separate modules for each feature
- **Event Bus** for inter-module communication
- **Phaser.js** for 2D world rendering
- **Socket.IO Client** for real-time communication

### Backend Architecture
- **Node.js** with Express and TypeScript
- **Socket.IO** for real-time communication
- **Modular controllers** for each feature
- **File-based storage** (easily upgradeable to database)
- **RESTful API** endpoints

### Communication Flow
1. **Event Bus** manages frontend module communication
2. **Socket.IO** handles real-time client-server communication
3. **REST API** provides additional data endpoints
4. **Jitsi Meet** integration for video calling

## 🚀 Deployment

### Docker Deployment (Recommended)

1. **Build and run with Docker Compose**
   ```bash
   docker-compose up --build -d
   ```

2. **For production with Nginx**
   ```bash
   docker-compose --profile production up -d
   ```

### Manual Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Start the production server**
   ```bash
   npm start
   ```

## 🔮 Future Enhancements

- [ ] Database integration (MongoDB/PostgreSQL)
- [ ] User authentication and authorization
- [ ] Advanced world features (objects, interactions)
- [ ] Mobile app support
- [ ] Advanced chat features (file sharing, voice messages)
- [ ] Recording and playback for video calls
- [ ] Admin dashboard
- [ ] Performance monitoring
- [ ] Automated testing suite

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [React](https://reactjs.org/) - Frontend framework
- [Node.js](https://nodejs.org/) - Backend runtime
- [Socket.IO](https://socket.io/) - Real-time communication
- [Phaser.js](https://phaser.io/) - 2D game framework
- [Jitsi Meet](https://jitsi.org/) - Video conferencing
- [TypeScript](https://www.typescriptlang.org/) - Type safety
- [Docker](https://www.docker.com/) - Containerization

---

**Stargety Oasis** - Where virtual worlds come alive! 🌟
# Stargety Oasis - Virtual World Platform

A modular virtual world platform built with React, Node.js, and real-time communication technologies.

## Project Structure

```
stargety-oasis/
├── client/                  # React Frontend Application
│   ├── public/              # Static assets
│   ├── src/
│   │   ├── components/      # Shared React components
│   │   ├── modules/         # Feature modules
│   │   │   ├── chat/        # Real-time chat module
│   │   │   ├── video-call/  # Video conferencing module
│   │   │   └── world/       # 2D world module (Phaser.js)
│   │   └── shared/          # Utilities, types, and event bus
│   └── package.json
├── server/                  # Node.js Backend
│   ├── chat/                # Chat API and controllers
│   ├── video-call/          # Video call API
│   ├── world/               # World state management
│   └── package.json
├── lxc-config/              # LXC container configuration
├── docs/                    # Documentation
├── tests/                   # Test files
├── Dockerfile               # Container build configuration
├── docker-compose.yml       # Development environment
└── README.md               # This file
```

## Features

- **Real-time Chat**: WebSocket-based messaging with Socket.IO
- **Video Conferencing**: Integrated Jitsi Meet for video calls
- **2D Virtual World**: Interactive world built with Phaser.js
- **Modular Architecture**: Independent modules with event-based communication
- **Containerized Deployment**: Docker and LXC support
- **TypeScript**: Full type safety across frontend and backend

## Technology Stack

- **Frontend**: React 18, TypeScript, Phaser.js
- **Backend**: Node.js, Express, Socket.IO
- **Database**: MongoDB with Mongoose
- **Real-time**: WebSocket (Socket.IO)
- **Video**: Jitsi Meet integration
- **Deployment**: Docker, LXC, Nginx
- **Testing**: Jest, React Testing Library

## Quick Start

1. Install dependencies:
   ```bash
   npm install -g pnpm
   ```

2. Setup client:
   ```bash
   cd client
   pnpm install
   ```

3. Setup server:
   ```bash
   cd server
   npm install
   ```

4. Run development environment:
   ```bash
   docker-compose up -d
   ```

## Development

See individual module documentation in their respective directories for detailed development instructions.

## Deployment

For production deployment instructions, see `lxc-config/container-setup.md`.
