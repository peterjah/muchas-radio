# Docker Deployment Guide

This guide covers deploying Muchas Radio using Docker and Docker Compose.

## Prerequisites

- Docker (20.10+)
- Docker Compose (2.0+)

### Install Docker on Ubuntu

```bash
# Update packages
sudo apt update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin

# Verify installation
docker --version
docker compose version
```

Log out and back in for group changes to take effect.

## Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo> muchas-radio
cd muchas-radio
```

### 2. Configure Environment

```bash
# Copy environment template
cp .env.docker .env

# Edit with your domain/IP
nano .env
```

Update these values:
```env
VITE_API_URL=http://YOUR_IP_OR_DOMAIN
VITE_WS_URL=ws://YOUR_IP_OR_DOMAIN
```

### 3. Build and Start

```bash
# Build images
docker compose build

# Start all services
docker compose up -d

# View logs
docker compose logs -f
```

### 4. Access Your Radio

- **Main Application**: `http://YOUR_IP`
- **Frontend Only**: `http://YOUR_IP:3000`
- **Backend API**: `http://YOUR_IP:8080`

## Architecture

The Docker setup includes:

- **MPD** (Port 6600, 8001): Music Player Daemon for audio playback and streaming
- **Backend** (Port 8080): Rust API server
- **Frontend** (Port 3000): React PWA served by nginx
- **Nginx** (Port 80): Reverse proxy combining frontend + backend

## Docker Compose Services

### Full Stack (Recommended)

```bash
# Start everything with reverse proxy
docker compose up -d

# Access at http://YOUR_IP
```

### Without Main Nginx (Development)

```bash
# Start only backend, frontend, and mpd
docker compose up -d mpd backend frontend

# Frontend: http://YOUR_IP:3000
# Backend: http://YOUR_IP:8080
```

### Individual Services

```bash
# Start only backend
docker compose up -d mpd backend

# Start only frontend
docker compose up -d frontend
```

## Management Commands

### View Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend
docker compose logs -f mpd
docker compose logs -f frontend
```

### Restart Services

```bash
# Restart all
docker compose restart

# Restart specific service
docker compose restart backend
```

### Stop Services

```bash
# Stop all
docker compose stop

# Stop specific service
docker compose stop backend
```

### Remove Everything

```bash
# Stop and remove containers
docker compose down

# Remove everything including volumes (⚠️ deletes uploaded music)
docker compose down -v
```

## Updating

### Update Code

```bash
cd muchas-radio
git pull

# Rebuild and restart
docker compose build
docker compose up -d
```

### Update Only Backend

```bash
docker compose build backend
docker compose up -d backend
```

### Update Only Frontend

```bash
docker compose build frontend
docker compose up -d frontend
```

## Data Persistence

Data is stored in Docker volumes:

```bash
# List volumes
docker volume ls | grep muchas

# Inspect volume
docker volume inspect muchas-radio_music-uploads

# Backup uploads
docker run --rm -v muchas-radio_music-uploads:/data -v $(pwd):/backup \
  alpine tar czf /backup/music-backup.tar.gz /data

# Restore uploads
docker run --rm -v muchas-radio_music-uploads:/data -v $(pwd):/backup \
  alpine tar xzf /backup/music-backup.tar.gz -C /
```

## Custom Configuration

### Custom MPD Config

1. Generate default config:
```bash
docker compose up -d backend
# Let it generate mpd.conf
docker compose stop
```

2. Edit `backend/mpd.conf`

3. Restart:
```bash
docker compose up -d
```

### Custom Nginx Config

Edit `nginx/conf.d/muchas-radio.conf` and reload:

```bash
docker compose restart nginx
```

### Environment Variables

Create `docker-compose.override.yml`:

```yaml
version: '3.8'

services:
  backend:
    environment:
      - RUST_LOG=debug
      - CUSTOM_VAR=value
```

## Ports

Default ports used:

- **80**: Main nginx (combines everything)
- **3000**: Frontend (direct access)
- **6600**: MPD control (internal)
- **8001**: MPD HTTP stream (internal)
- **8080**: Backend API

### Change Ports

Edit `docker-compose.yml`:

```yaml
services:
  frontend:
    ports:
      - "8888:80"  # Frontend now on port 8888
```

## SSL/HTTPS Setup

### Option 1: Let's Encrypt with Certbot

```bash
# Install certbot
sudo apt install certbot

# Stop nginx container
docker compose stop nginx

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Update nginx config to use certificates
# See nginx/conf.d/muchas-radio-ssl.conf.example

# Restart
docker compose up -d nginx
```

### Option 2: Use Traefik

Replace nginx with Traefik for automatic SSL. See `docker-compose.traefik.yml` example.

## Troubleshooting

### Services Won't Start

```bash
# Check logs
docker compose logs

# Check specific service
docker compose logs backend

# Verify no port conflicts
sudo netstat -tlnp | grep -E ':(80|3000|6600|8001|8080)'
```

### Backend Can't Connect to MPD

```bash
# Check MPD is running
docker compose ps mpd

# Check MPD logs
docker compose logs mpd

# Verify network
docker compose exec backend ping mpd
```

### Frontend Can't Reach Backend

1. Check environment variables in `.env`
2. Rebuild frontend: `docker compose build frontend`
3. Restart: `docker compose up -d frontend`

### Permission Errors

```bash
# Fix volume permissions
docker compose down
docker volume rm muchas-radio_music-uploads
docker compose up -d
```

### High Memory Usage

```bash
# Add resource limits in docker-compose.yml
services:
  backend:
    deploy:
      resources:
        limits:
          memory: 512M
```

### Cleanup Unused Resources

```bash
# Remove unused containers, networks, images
docker system prune -a

# Remove unused volumes
docker volume prune
```

## Production Recommendations

1. **Use volumes for data persistence**
   - Already configured in docker-compose.yml

2. **Enable automatic restarts**
   - Already configured with `restart: unless-stopped`

3. **Set up SSL/TLS**
   - Use Let's Encrypt or Cloudflare

4. **Configure resource limits**
   - Add memory/CPU limits if needed

5. **Set up monitoring**
   - Use `docker stats` or integrate with Prometheus

6. **Regular backups**
   - Backup music-uploads volume regularly

7. **Update regularly**
   - Pull latest images and rebuild

8. **Use docker-compose.override.yml for local customizations**
   - Keeps main docker-compose.yml clean

## Security

### Firewall Setup

```bash
# Allow only necessary ports
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

### Run as Non-Root

Services already run as non-root users inside containers.

### Secrets Management

For production, use Docker secrets:

```yaml
secrets:
  api_key:
    file: ./secrets/api_key.txt

services:
  backend:
    secrets:
      - api_key
```

## Performance Tuning

### Nginx Caching

Enabled by default in nginx config.

### Backend Workers

Increase in docker-compose.yml:

```yaml
services:
  backend:
    environment:
      - ACTIX_WEB_WORKERS=4
```

### MPD Buffer Size

Edit `backend/mpd.conf`:

```
max_output_buffer_size "32768"
```

## Monitoring

### Health Checks

```bash
# Check service health
docker compose ps

# Test endpoints
curl http://localhost/health
curl http://localhost:8080/api/current
```

### Resource Usage

```bash
# Real-time stats
docker stats

# Specific container
docker stats muchas-backend
```

## Development

### Local Development with Docker

```bash
# Start backend and MPD
docker compose up -d mpd backend

# Run frontend locally
cd frontend
npm run dev
```

### Hot Reload

Mount source code:

```yaml
services:
  backend:
    volumes:
      - ./backend/src:/app/src
```

Then use `cargo watch` inside container.

---

## Quick Reference

```bash
# Start everything
docker compose up -d

# View logs
docker compose logs -f

# Restart all
docker compose restart

# Stop all
docker compose stop

# Update and restart
git pull && docker compose build && docker compose up -d

# Cleanup
docker compose down && docker system prune -a

# Backup
docker run --rm -v muchas-radio_music-uploads:/data -v $(pwd):/backup \
  alpine tar czf /backup/music-backup.tar.gz /data
```

---

🎵 **Enjoy your dockerized Muchas Radio!**

