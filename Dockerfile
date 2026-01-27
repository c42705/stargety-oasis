# Multi-stage Dockerfile for Stargety Oasis
# NOTE: Client is pre-built locally and committed to git
# This eliminates the 47+ minute React build in Docker

# Stage 1: Build the server
FROM node:18-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
COPY server/tsconfig.json ./
COPY server/prisma ./prisma/
RUN npm ci
COPY server/src ./src
RUN npm run build

# Stage 2: Production image
FROM node:18-alpine AS production
WORKDIR /app

# Install production dependencies for server
COPY server/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built server
COPY --from=server-builder /app/server/dist ./dist

# Copy pre-built client (built locally and committed to git)
COPY client/build ./public

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S stargety -u 1001

# Create data directory for file storage
RUN mkdir -p /app/data && chown -R stargety:nodejs /app

# Switch to non-root user
USER stargety

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["node", "dist/index.js"]
