#!/bin/bash

# DevNetwork Production Runner
# Run from inside the devnet/ directory:
#   cd devnet && ./production.sh [port]

# Configuration
PORT=${1:-5000}
WORKERS=${WORKERS:-1}
HOST=${HOST:-0.0.0.0}

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}   DevNetwork Production Server ${NC}"
echo -e "${GREEN}================================${NC}"
echo ""

# Step 1: Redis
if redis-cli ping &> /dev/null; then
    echo -e "${GREEN}[1/4]${NC} Redis is running"
else
    echo "Failed to start Redis"
fi

# Step 2: Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}[2/4]${NC} Installing npm dependencies..."
    npm install
else
    echo -e "${GREEN}[2/4]${NC} npm dependencies present"
fi

# Step 3: Build CSS and JS
echo -e "${YELLOW}[3/4]${NC} Building frontend assets..."
npm run build
echo -e "${GREEN}[3/4]${NC} Frontend built"

# Step 4: Display config and start
echo ""
echo -e "${YELLOW}[4/4]${NC} Starting server..."
echo -e "  Host:    ${GREEN}$HOST${NC}"
echo -e "  Port:    ${GREEN}$PORT${NC}"
echo -e "  Workers: ${GREEN}$WORKERS${NC}"
echo ""

# Run with uvicorn (from inside devnet/ directory)
exec python -m uvicorn src.main:app \
    --host $HOST \
    --port $PORT \
    --workers $WORKERS \
    --access-log \
    --log-level info
