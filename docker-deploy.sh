#!/bin/bash
set -e

# Docker deployment script for Muchas Radio
# Usage: ./docker-deploy.sh [DOMAIN_OR_IP]

echo "🎵 Muchas Radio - Docker Deployment"
echo "===================================="
echo ""

# Get domain/IP
DOMAIN_OR_IP=${1:-""}

if [ -z "$DOMAIN_OR_IP" ]; then
    echo "Enter your domain name or server IP address:"
    read -r DOMAIN_OR_IP
fi

# Validate input
if [ -z "$DOMAIN_OR_IP" ]; then
    echo "❌ Error: Domain or IP address is required"
    exit 1
fi

# Determine protocol based on input
if [[ $DOMAIN_OR_IP =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    USE_SSL=false
    PROTOCOL="http"
    WS_PROTOCOL="ws"
    echo "📍 Detected IP address: $DOMAIN_OR_IP"
    echo "   Using HTTP (no SSL)"
else
    USE_SSL=true
    PROTOCOL="https"
    WS_PROTOCOL="wss"
    echo "🌐 Detected domain: $DOMAIN_OR_IP"
    echo "   Using HTTPS"
fi

echo ""
echo "Configuration:"
echo "  Domain/IP: $DOMAIN_OR_IP"
echo "  Protocol: $PROTOCOL"
echo "  WebSocket: $WS_PROTOCOL"
echo ""

# Create .env file for docker-compose
cat > .env << EOF
# Muchas Radio Environment Configuration
VITE_API_URL=${PROTOCOL}://${DOMAIN_OR_IP}
VITE_WS_URL=${WS_PROTOCOL}://${DOMAIN_OR_IP}
DOMAIN=${DOMAIN_OR_IP}
# Music storage path (default: ./data/music)
# Uncomment and modify if you want a custom path:
# MUSIC_STORAGE_PATH=/var/muchas-radio/music
EOF

# Add MUSIC_STORAGE_PATH to .env if it's set
if [ -n "$MUSIC_STORAGE_PATH" ] && [ "$MUSIC_STORAGE_PATH" != "./data/music" ]; then
    echo "MUSIC_STORAGE_PATH=$MUSIC_STORAGE_PATH" >> .env
fi

echo "✅ Environment configuration created"
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed"
    echo "Please install Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is available
if ! docker compose version &> /dev/null; then
    echo "❌ Error: Docker Compose is not available"
    echo "Please install Docker Compose v2"
    exit 1
fi

echo "🐳 Docker version:"
docker --version
docker compose version
echo ""

# Setup music storage directory
echo "📁 Setting up music storage..."
MUSIC_STORAGE_PATH=${MUSIC_STORAGE_PATH:-./data/music}
MUSIC_DIR=$(realpath "$MUSIC_STORAGE_PATH" 2>/dev/null || echo "$MUSIC_STORAGE_PATH")

# Create directory if it doesn't exist
if [ ! -d "$MUSIC_DIR" ]; then
    echo "   Creating directory: $MUSIC_DIR"
    mkdir -p "$MUSIC_DIR"
    chmod 755 "$MUSIC_DIR"
    echo "   ✅ Directory created"
else
    echo "   ✅ Directory exists: $MUSIC_DIR"
fi

# Export for docker-compose
export MUSIC_STORAGE_PATH="$MUSIC_STORAGE_PATH"
echo "   📂 Music storage: $MUSIC_DIR"
echo ""

# Stop existing containers
echo "🛑 Stopping existing containers..."
docker compose down 2>/dev/null || true
echo ""

# Build and start services
echo "🏗️  Building and starting services..."
docker compose build --no-cache

echo ""
echo "🚀 Starting services..."
docker compose up -d

# Wait for services to be ready
echo ""
echo "⏳ Waiting for services to be ready..."
sleep 5

# Check service status
echo ""
echo "📊 Service Status:"
docker compose ps

# Show logs
echo ""
echo "📋 Recent logs:"
docker compose logs --tail=20

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Your application should be accessible at:"
echo "  🌐 ${PROTOCOL}://${DOMAIN_OR_IP}"
echo ""
echo "Services running:"
echo "  • Frontend: http://localhost:3000 (nginx)"
echo "  • Backend API: http://localhost:8080"
echo "  • MPD: localhost:6600"
echo "  • Stream: http://localhost:8001"
echo ""
echo "Storage:"
echo "  • Music files: $MUSIC_DIR"
echo ""
echo "Useful commands:"
echo "  View logs:        docker compose logs -f"
echo "  View backend:     docker compose logs -f backend"
echo "  Stop services:    docker compose down"
echo "  Restart:          docker compose restart"
echo "  Update & rebuild: docker compose up -d --build"
echo ""

if [ "$USE_SSL" = true ]; then
    echo "⚠️  SSL/HTTPS Setup Required:"
    echo "   You need to configure SSL certificates (Let's Encrypt) separately."
    echo "   Consider using a reverse proxy like Traefik or Caddy for automatic SSL."
    echo ""
fi

echo "🎵 Happy streaming!"
