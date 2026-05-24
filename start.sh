#!/usr/bin/env bash
set -e

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "========================================="
echo "  Cloud Lottery — Starting up"
echo "========================================="

# Install backend dependencies
echo ""
echo ">>> Installing backend dependencies..."
cd "$ROOT_DIR/backend"
if [ ! -f ".env" ]; then
  echo "WARNING: No .env file found in backend/. Copying .env.example..."
  cp .env.example .env
  echo "         Edit backend/.env with your AWS credentials before continuing."
fi
npm install

# Install frontend dependencies
echo ""
echo ">>> Installing frontend dependencies..."
cd "$ROOT_DIR/frontend"
npm install

# Start backend in background
echo ""
echo ">>> Starting backend on http://localhost:3000 ..."
cd "$ROOT_DIR/backend"
node server.js &
BACKEND_PID=$!

# Give backend a moment to boot
sleep 2

# Start frontend
echo ""
echo ">>> Starting frontend on http://localhost:3001 ..."
cd "$ROOT_DIR/frontend"
npm start &
FRONTEND_PID=$!

echo ""
echo "========================================="
echo "  Backend  PID: $BACKEND_PID  → http://localhost:3000"
echo "  Frontend PID: $FRONTEND_PID → http://localhost:3001"
echo "  Press Ctrl+C to stop both."
echo "========================================="

# Wait and clean up on exit
trap "echo 'Shutting down...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" SIGINT SIGTERM
wait
