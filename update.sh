#!/bin/bash
set -e

# Update script for Muchas Radio
# Run this on your VPS to update the application

echo "🔄 Updating Muchas Radio..."
echo ""

# Detect if we're in the right directory
if [ ! -f "backend/Cargo.toml" ] || [ ! -f "frontend/package.json" ]; then
    echo "❌ Error: Must be run from the muchas-radio root directory"
    exit 1
fi

# Pull latest changes
echo "📥 Pulling latest code..."
if [ -d ".git" ]; then
    git pull
else
    echo "⚠️  Not a git repository. Skipping git pull."
fi

# Build frontend
echo ""
echo "🏗️  Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Build backend
echo ""
echo "🏗️  Building backend..."
cd backend
cargo build --release
cd ..

# Restart services
echo ""
echo "🔄 Restarting services..."

if systemctl is-active --quiet muchas-radio-backend; then
    echo "Restarting backend service..."
    sudo systemctl restart muchas-radio-backend
    sudo systemctl restart muchas-radio-mpd
    
    # Wait and check status
    sleep 2
    if systemctl is-active --quiet muchas-radio-backend; then
        echo "✅ Backend restarted successfully"
    else
        echo "❌ Backend failed to restart!"
        sudo systemctl status muchas-radio-backend
        exit 1
    fi
    
    if systemctl is-active --quiet muchas-radio-mpd; then
        echo "✅ MPD restarted successfully"
    else
        echo "⚠️  MPD may have issues!"
        sudo systemctl status muchas-radio-mpd
    fi
elif systemctl is-active --quiet muchas-radio; then
    echo "Restarting combined service..."
    sudo systemctl restart muchas-radio
    
    sleep 2
    if systemctl is-active --quiet muchas-radio; then
        echo "✅ Service restarted successfully"
    else
        echo "❌ Service failed to restart!"
        sudo systemctl status muchas-radio
        exit 1
    fi
else
    echo "⚠️  No systemd services found. You may need to restart manually."
fi

echo ""
echo "✅ Update complete!"
echo ""
echo "View logs with:"
echo "  sudo journalctl -u muchas-radio-backend -f"
echo "  sudo journalctl -u muchas-radio-mpd -f"
echo ""

