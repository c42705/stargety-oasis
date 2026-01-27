# Stargety Oasis - Technology Stack Documentation

## Frontend Technologies

### Core Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.1.1 | UI framework with concurrent features |
| TypeScript | 4.9.5 | Type-safe JavaScript |
| React Router DOM | 7.8.1 | Client-side routing |

### State Management
| Technology | Version | Purpose |
|------------|---------|---------|
| Redux Toolkit | 2.9.0 | Global state management |
| React Redux | 9.2.0 | React bindings for Redux |
| Immer | 10.1.3 | Immutable state updates |

### UI Components
| Technology | Version | Purpose |
|------------|---------|---------|
| Ant Design | 5.27.1 | Component library |
| @ant-design/icons | 6.0.0 | Icon library |
| antd-img-crop | 4.25.0 | Image cropping for avatars |
| Lucide React | 0.540.0 | Additional icons |

### Graphics & Game Engine
| Technology | Version | Purpose |
|------------|---------|---------|
| Phaser | 3.90.0 | 2D game engine (world module) |
| Konva | 9.3.0 | 2D canvas library |
| React Konva | 19.2.0 | React bindings for Konva |
| Gifler | 0.1.0 | GIF animation support |

### Real-Time Communication
| Technology | Version | Purpose |
|------------|---------|---------|
| Socket.IO Client | 4.8.1 | WebSocket client |

### Utilities
| Technology | Version | Purpose |
|------------|---------|---------|
| UUID | 11.0.5 | Unique ID generation |

## Backend Technologies

### Core Framework
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | ≥16.0.0 | JavaScript runtime |
| Express | 5.1.0 | Web framework |
| TypeScript | 5.9.2 | Type-safe JavaScript |

### Database
| Technology | Version | Purpose |
|------------|---------|---------|
| PostgreSQL | 17 | Relational database |
| PostGIS | 3.4 | Spatial data extension |
| Prisma | 5.22.0 | ORM & schema management |
| @prisma/client | 5.22.0 | Database client |

### Real-Time & File Handling
| Technology | Version | Purpose |
|------------|---------|---------|
| Socket.IO | 4.8.1 | WebSocket server |
| Multer | 1.4.5-lts.1 | File upload handling |
| bcryptjs | 2.4.3 | Password hashing |
| CORS | 2.8.5 | Cross-origin resource sharing |
| dotenv | 17.2.1 | Environment variables |

### Development Tools
| Technology | Version | Purpose |
|------------|---------|---------|
| Nodemon | 3.1.10 | Hot reload for development |
| ts-node | 10.9.2 | TypeScript execution |

## Infrastructure

### Containerization
| Technology | Version | Purpose |
|------------|---------|---------|
| Docker | Latest | Container runtime |
| Docker Compose | 3.8 spec | Multi-container orchestration |

### Container Images
- **PostgreSQL**: `postgis/postgis:17-3.4` (with PostGIS)
- **Redis**: `redis:7-alpine` (optional caching)
- **Nginx**: `nginx:alpine` (production reverse proxy)

## Development Setup

### Prerequisites
```bash
node >= 16.0.0
npm >= 8.0.0
docker >= 20.0.0
docker compose >= 2.0.0
```

### Quick Start Commands

**Development Mode (Docker)**:
```bash
# Start all services with hot reload
docker compose --profile dev up --build

# View logs
docker compose logs -f

# Stop services
docker compose --profile dev down
```

**Local Development (Without Docker)**:
```bash
# Install all dependencies
npm run install:all

# Start dev (server + client concurrently)
npm run dev

# Or start individually
npm run dev:server  # Port 3001
npm run dev:client  # Port 3000
```

**Database Commands**:
```bash
# Run migrations
npm run prisma:dev

# Open Prisma Studio (GUI)
npm run prisma:studio

# Generate Prisma client
cd server && npm run prisma:generate
```

### Environment Variables

**Server** (`.env` in `/server`):
```env
DATABASE_URL=postgresql://stargety:stargety_dev_password@postgres:5432/stargety_oasis
PORT=3001
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

**Client** (set in docker-compose or `.env`):
```env
REACT_APP_API_URL=http://localhost:3001
REACT_APP_WS_URL=http://localhost:3001
```

## Key Dependencies Explained

### Phaser.js (Game Engine)
Used for the virtual world module. Key features:
- Scene management (`GameScene.ts`)
- Camera controls with zoom/pan
- Sprite animations
- Input handling (keyboard, mouse)
- Collision detection with map areas

### React Konva (Map Editor)
Used for the map editor canvas. Key features:
- Layer management
- Shape transformations
- Event handling
- Zoom/pan viewport
- Custom shapes (polygons, rectangles)

### Redux Toolkit
Central state management for:
- Map data (`mapSlice.ts`)
- Async thunks for API calls
- Middleware for side effects

### Prisma ORM
Database access layer with:
- Type-safe queries
- Auto-generated client
- Migration system
- Schema-first design

### Socket.IO
Real-time communication for:
- Chat messages
- Player position updates
- Map synchronization
- Video call signaling

## Build & Deployment

### Production Build
```bash
# Build both client and server
npm run build

# Build separately
npm run build:client  # Creates client/build/
npm run build:server  # Creates server/dist/
```

### Production Docker
```bash
# Build and start production containers
docker compose --profile production up -d

# Uses single Dockerfile that bundles client into server
```

### Port Configuration
| Service | Development | Production |
|---------|-------------|------------|
| Client (React) | 3000 | 3001 (served by Express) |
| Server (API) | 3001 | 3001 |
| PostgreSQL | 5432 | 5432 |
| Redis (optional) | 6379 | 6379 |
| Nginx (optional) | 80/443 | 80/443 |

## Testing

### Frontend Testing
```bash
cd client && npm test
```
- Jest for unit tests
- React Testing Library for component tests
- Test files: `*.test.ts`, `*.test.tsx`

### Testing Stack
| Technology | Purpose |
|------------|---------|
| Jest | Test runner |
| @testing-library/react | Component testing |
| @testing-library/jest-dom | DOM matchers |
| @testing-library/user-event | User interaction simulation |

## Technical Constraints

1. **TypeScript Strict Mode**: Client uses strict mode; some type suppressions exist
2. **Browser Support**: Chrome, Firefox, Safari (last 1 version each)
3. **Node Version**: Requires Node.js 16+ for ES modules support
4. **Database**: PostgreSQL required; PostGIS extension optional but recommended
5. **File Uploads**: Stored locally in `/tmp/uploads` (consider S3 for production)

## Upgrade Considerations

### React 19 Features Used
- Concurrent rendering
- Automatic batching
- `use` hook (potentially)

### Breaking Changes Watch
- Ant Design 5 uses CSS-in-JS (different from v4)
- React Router v7 has different API than v6
- Express 5 has promise-based middleware

## Related Documentation

- [Phaser.js Docs](https://phaser.io/docs)
- [React Konva Docs](https://konvajs.org/docs/react/)
- [Ant Design Docs](https://ant.design/docs/react/introduce)
- [Prisma Docs](https://www.prisma.io/docs)
- [Socket.IO Docs](https://socket.io/docs/v4/)


# Production Deployment Guide

## Quick Access

```bash
# View production logs
python3 connect_prod.py

# Manual SSH access to start containers
ssh root@oasis.stargety.com
ssh root@192.168.0.205
cd ~/stargety-oasis
./deploy.sh start
```

## Credentials

- **Main Server**: oasis.stargety.com (root / Netflix$1000)
- **Docker VM**: 192.168.0.205 (root / Netflix$1000)
- **Project Path**: ~/stargety-oasis/

## Auto-Deployment Rule

⚠️ **Every push to main branch automatically triggers `./deploy.sh start`**

A background process monitors the main branch and executes deployment automatically.

## Deployment Commands

```bash
./deploy.sh start      # Start services
./deploy.sh stop       # Stop services
./deploy.sh restart    # Restart services
./deploy.sh health     # Health check
./deploy.sh logs       # View logs
./deploy.sh backup     # Database backup
./deploy.sh status     # Service status
./deploy.sh migrate    # Run migrations
```

## Workflow

1. Develop & test locally
2. Push to main branch
3. Wait 30-60 seconds for auto-deployment
4. Check logs: `python3 connect_prod.py`
5. Verify: `./deploy.sh health`
6. Test application

## Important Rules

✅ **DO:**
- Push only tested code to main
- Monitor logs after deployment
- Keep .env.production secure

❌ **DON'T:**
- Push incomplete code
- Make manual production changes
- Ignore deployment failures

