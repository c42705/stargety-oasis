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

