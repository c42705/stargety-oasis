# Multi-stage Dockerfile for Stargety Oasis

# Stage 1: Build the client
FROM node:18-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
# Build with production environment variables
ARG REACT_APP_API_URL=https://oasis.stargety.com/api
ARG REACT_APP_SOCKET_URL=wss://oasis.stargety.com
ARG REACT_APP_WS_URL=wss://oasis.stargety.com
ENV REACT_APP_API_URL=${REACT_APP_API_URL}
ENV REACT_APP_SOCKET_URL=${REACT_APP_SOCKET_URL}
ENV REACT_APP_WS_URL=${REACT_APP_WS_URL}
RUN npm run build

# Stage 2: Build the server
FROM node:18-alpine AS server-builder
WORKDIR /app/server
COPY server/package*.json ./
COPY server/tsconfig.json ./
RUN npm ci
COPY server/src ./src
RUN npm run build

# Stage 3: Production image
FROM node:18-alpine AS production
WORKDIR /app

# Install production dependencies for server
COPY server/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built server
COPY --from=server-builder /app/server/dist ./dist

# Copy built client
COPY --from=client-builder /app/client/build ./public

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
