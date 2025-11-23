#!/bin/bash
# Development startup script for Muchas Radio Backend

set -e

cd "$(dirname "$0")"

echo "🎵 Starting Muchas Radio Backend (Development Mode)"
echo "=================================================="

# Step 1: Check if MPD config exists, create from example if not
if [ ! -f "mpd.conf" ]; then
    if [ -f "mpd.conf.example" ]; then
        echo "Creating mpd.conf from example..."
        cp mpd.conf.example mpd.conf
        echo "✅ Created mpd.conf (edit if needed)"
    else
        echo "❌ Error: mpd.conf not found and mpd.conf.example doesn't exist"
        echo "Please create mpd.conf manually or use Docker: docker compose up"
        exit 1
    fi
fi

# Step 3: Start MPD first
echo "Starting MPD..."
if command -v mpd &> /dev/null; then
    # Stop any existing MPD instance
    echo "Checking for existing MPD processes..."
    pkill -9 mpd 2>/dev/null || true
    sleep 1
    
    # Clean up stale PID file
    rm -f mpd.pid 2>/dev/null || true
    
    # Start MPD
    mpd mpd.conf
    echo "✅ MPD started"
else
    echo "❌ MPD not found. Please install MPD:"
    echo "    macOS: brew install mpd"
    echo "    Ubuntu: sudo apt install mpd"
    exit 1
fi

# Step 4: Wait for MPD to be ready
echo "Waiting for MPD to be ready..."
sleep 2

# Step 5: Now start the backend (it will connect successfully)
echo "Starting backend server..."
cargo run &
BACKEND_PID=$!

# Wait a moment for backend to start
sleep 2

# Check if backend is still running
if ! kill -0 $BACKEND_PID 2>/dev/null; then
    echo "❌ Backend failed to start. Check logs above."
    mpd --kill mpd.conf 2>/dev/null || true
    exit 1
fi

echo ""
echo "✅ All services started!"
echo "   Backend API: http://127.0.0.1:8080"
echo "   MPD Server: 127.0.0.1:6600"
echo "   Audio Stream: http://127.0.0.1:8001"
echo ""
echo "Press Ctrl+C to stop all services..."

# Cleanup function
cleanup() {
    echo ""
    echo "Stopping services..."
    kill $BACKEND_PID 2>/dev/null || true
    pkill -9 mpd 2>/dev/null || true
    rm -f mpd.pid 2>/dev/null || true
    echo "✅ Stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

# Wait for backend process
wait $BACKEND_PID

