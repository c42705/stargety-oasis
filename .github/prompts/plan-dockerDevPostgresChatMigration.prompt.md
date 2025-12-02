## Plan: Docker Dev Postgres+Chat Migration

Refined plan incorporating chat (Postgres tables for rooms/messages w/ JSONB content/mentions, 8hr TTL cleanup via pg_cron), low-volume scale (20 users/10-15 msgs/min/2-3 files/2hrs). Split monolith to client/server/postgres services (dev profile, hot-reload vols), Prisma ORM for maps (`Map.data: JsonB`) + chat (`ChatRoom/Message`), Socket.IO real-time, multer temp uploads (`/tmp/uploads` vol). Run `docker-compose --profile dev up`; migrate localStorage → API.

### Steps
1. Update [`docker-compose.yml`](docker-compose.yml): Add `postgres` (postgis:17-3.4, vol `postgres_data`, healthcheck), `client`/`server` services (vols `./client:/app`, `./server:/app/server`, `uploads:/tmp/uploads`, ports 3000/3001/5432, `dev` profile).
2. Server Prisma: Create `server/prisma/schema.prisma` (`Map` JSONB data/roomId, `ChatRoom`/`Message` w/ `expiresAt`, `User`); add deps (`prisma@^5`, `@prisma/client`, `multer`, `pg-cron`); `npx prisma migrate dev`.
3. Server APIs/Socket: Extend [`server/src/index.ts`](server/src/index.ts) w/ `/api/maps/:roomId` (GET/POST/PUT Prisma), `/api/chat/:roomId/messages`; Socket.IO `chat:message`/`map:updated` broadcasts; multer uploads to `/tmp/uploads`.
4. Client refactor: Update [`SharedMapSystem.loadMapData()`](client/src/shared/SharedMapSystem.ts)/`saveMapData()` → `fetch('/api/maps/default')`; add Socket.IO in chat modules (`client/src/modules/chat/`).
5. Cleanup/Run: pg_cron jobs for TTL deletes; add scripts (`prisma:dev`, `docker:dev`); test `docker-compose --profile dev up --build`.

### Further Considerations
1. Session length/multi-room?: Add `sessionId` to `ChatRoom`;
2. File sizes? Default 40MB multer limit; monitor `/tmp/uploads` vol growth (<1GB/day).
3. Auth? simple registration via `/api/auth/register` (email/username/pw); JWTs.
4 do not break the current functionality of the app. focus on running the app in docker with postgres and prisma in dev mode, hot reloading, and volume mounts for code and uploads.
