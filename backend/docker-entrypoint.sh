#!/bin/bash
# Docker entrypoint script for Muchas Radio

set -e

echo "🎵 Starting Muchas Radio in Docker"

# Start the backend (this generates mpd.conf)
./muchas-radio-backend &
BACKEND_PID=$!

# Wait for the config to be generated
sleep 2

# Start MPD
if [ -f "/app/data/mpd.conf" ]; then
    echo "Starting MPD with generated config..."
    mpd /app/data/mpd.conf
    echo "✅ MPD started"
else
    echo "❌ Error: mpd.conf not found"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
fi

# Keep container running by waiting for the backend
wait $BACKEND_PID

