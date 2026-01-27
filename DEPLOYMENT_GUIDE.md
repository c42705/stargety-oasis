# 🚀 Stargety Oasis - Deployment Guide

## Quick Start

### 1. Build Client Locally (One-time per code change)

```bash
# Build the React client for production
./scripts/build-client.sh

# This will:
# - Install dependencies
# - Build optimized React bundle
# - Clean up node_modules
# - Output to client/build/
```

### 2. Commit and Push

```bash
# Stage the pre-built client
git add client/build/

# Commit with descriptive message
git commit -m "chore: rebuild client for production"

# Push to main branch
git push origin main
```

### 3. Auto-Deployment Triggers

Once you push to `main`, the production server automatically:
- Detects the changes
- Runs `./deploy.sh start`
- Builds Docker image (now only ~2-3 minutes instead of 47+)
- Starts services
- Runs health checks

### 4. Monitor Deployment

```bash
# View production logs
python3 connect_prod.py

# Or SSH directly
ssh root@192.168.0.205
cd ~/stargety-oasis
./deploy.sh logs
```

## Why This Approach?

✅ **Fast Deployments**: Docker build now takes 2-3 minutes (was 47+)
✅ **Consistent Builds**: Built on your fast local machine
✅ **Reproducible**: Same build every time
✅ **Efficient**: No wasted resources on production server
✅ **Simple**: Just commit and push

## Troubleshooting

### Build fails locally
```bash
# Clear cache and rebuild
rm -rf client/node_modules client/build
./scripts/build-client.sh
```

### Docker still building client?
Check that `Dockerfile` doesn't have client build stage:
```bash
grep -n "client-builder" Dockerfile
# Should return nothing
```

### Need to rebuild without pushing?
```bash
# Build locally
./scripts/build-client.sh

# Test locally
npm run dev

# When ready, commit and push
git add client/build/
git commit -m "chore: rebuild client"
git push origin main
```

## Environment Variables

Client environment variables are set at build time:
- `REACT_APP_API_URL`: API endpoint
- `REACT_APP_SOCKET_URL`: WebSocket endpoint
- `REACT_APP_WS_URL`: WebSocket URL

These are embedded in the build, so changes require a rebuild.

## Performance Metrics

| Stage | Before | After |
|-------|--------|-------|
| Client Build | 47+ min | 0 min (pre-built) |
| Docker Build | 47+ min | 2-3 min |
| Total Deploy | 50+ min | 3-5 min |
| Disk Usage | 6.2GB | ~3GB |
| CPU Usage | 90% | 20% |

## Rollback

If deployment fails:
```bash
ssh root@192.168.0.205
cd ~/stargety-oasis
git revert HEAD
git push origin main
# Auto-deployment will trigger with previous version
```

