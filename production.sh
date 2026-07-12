#!/bin/bash

# AiAS v1.2 (DevNetwork) Production Runner
# Run from the repo root:
#   ./production.sh [port]
#
# Storage engine is env-switched (see .env.example):
#   DEVNET_STORAGE=nedb   (default) → NEDB via nedbd  ← AiAS v1.2
#   DEVNET_STORAGE=redis            → original DevNetwork mode

# Configuration
PORT=${1:-4633}
WORKERS=${WORKERS:-1}
HOST=${HOST:-0.0.0.0}
STORAGE=${DEVNET_STORAGE:-nedb}
NEDBD=${NEDBD_URL:-http://localhost:7070}
NEDB_DATABASE=${NEDB_DB:-devnet}

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}   AiAS v1.2 — DevNetwork       ${NC}"
echo -e "${GREEN}================================${NC}"
echo ""

# Step 1: Storage engine
if [ "$STORAGE" = "nedb" ]; then
    if curl -sf "$NEDBD/health" > /dev/null 2>&1; then
        echo -e "${GREEN}[1/4]${NC} nedbd reachable at $NEDBD"
        # Ensure the database exists (idempotent — already-exists is fine).
        curl -sf -X POST "$NEDBD/v1/databases" \
             -H "Content-Type: application/json" \
             ${NEDBD_TOKEN:+-H "Authorization: Bearer $NEDBD_TOKEN"} \
             -d "{\"name\":\"$NEDB_DATABASE\"}" > /dev/null 2>&1
        echo -e "        database: ${CYAN}$NEDB_DATABASE${NC}"
        if [ -n "$NEDBD_TOKEN" ]; then
            echo -e "        auth:     ${GREEN}bearer token configured${NC}"
        else
            echo -e "        auth:     ${YELLOW}OPEN — set NEDBD_TOKEN on both nedbd and this app${NC}"
        fi
    else
        echo -e "${RED}[1/4] nedbd NOT reachable at $NEDBD${NC}"
        echo -e "      Start it first, e.g.:"
        echo -e "      ${CYAN}python3 -m nedb.server --host 127.0.0.1 --port 7070 --data ./nedb-data${NC}"
        exit 1
    fi
    if [ "$WORKERS" != "1" ]; then
        echo -e "${YELLOW}      WORKERS=$WORKERS forced to 1 — NEDB mode uses in-process${NC}"
        echo -e "${YELLOW}      pub/sub and websocket state (single-worker doctrine).${NC}"
        WORKERS=1
    fi
else
    if redis-cli ping &> /dev/null; then
        echo -e "${GREEN}[1/4]${NC} Redis is running (legacy mode)"
    else
        echo -e "${RED}[1/4] Redis not reachable and DEVNET_STORAGE=redis${NC}"
        exit 1
    fi
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
echo -e "  Host:     ${GREEN}$HOST${NC}"
echo -e "  Port:     ${GREEN}$PORT${NC}"
echo -e "  Workers:  ${GREEN}$WORKERS${NC}"
echo -e "  Storage:  ${GREEN}$STORAGE${NC}"
if [ "$STORAGE" = "nedb" ]; then
echo -e "  nedbd:    ${GREEN}$NEDBD${NC} / db ${GREEN}$NEDB_DATABASE${NC} / auth ${GREEN}$([ -n "$NEDBD_TOKEN" ] && echo on || echo OFF)${NC}"
fi
echo -e "  Sys bots: ${GREEN}${DEVNET_SYSTEM_BOTS:-off}${NC}"
echo -e "  AiAS API: ${GREEN}${AIAS_API_BASE:-https://api.aiassist.net}${NC}"
echo ""

# Run with uvicorn (from the repo root)
exec python -m uvicorn src.main:app \
    --host $HOST \
    --port $PORT \
    --workers $WORKERS \
    --access-log \
    --log-level info
