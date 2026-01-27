#!/bin/bash

# Build Client for Production
# This script builds the React client locally and prepares it for deployment
# Usage: ./scripts/build-client.sh

set -e

echo "╔════════════════════════════════════════╗"
echo "║ BUILDING CLIENT FOR PRODUCTION         ║"
echo "╚════════════════════════════════════════╝"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if client directory exists
if [ ! -d "client" ]; then
    echo -e "${RED}✗ Error: client directory not found${NC}"
    exit 1
fi

# Navigate to client directory
cd client

echo -e "${YELLOW}→ Installing dependencies...${NC}"
npm ci

echo -e "${YELLOW}→ Building React application...${NC}"
GENERATE_SOURCEMAP=false CI=true npm run build

echo -e "${YELLOW}→ Cleaning up node_modules...${NC}"
rm -rf node_modules

# Return to root directory
cd ..

echo -e "${GREEN}✓ Client build completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "  1. Review the build output in client/build/"
echo "  2. Commit the changes: git add client/build/ && git commit -m 'chore: rebuild client for production'"
echo "  3. Push to main: git push origin main"
echo "  4. Deployment will start automatically"

