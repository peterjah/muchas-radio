<div align="center">
  <img src="frontend/muchas_logo.png" alt="Muchas Radio Logo" width="200"/>
  
  # 🎵 Muchas Radio
  
  **A collaborative radio streaming application where users can upload music and listen together**
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
  [![Rust](https://img.shields.io/badge/rust-%23000000.svg?style=flat&logo=rust&logoColor=white)](https://www.rust-lang.org/)
  [![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)
  [![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
</div>

---

## ✨ Features

- **🌍 Global Radio Stream** - Everyone listens to the same music together in real-time
- **📤 Upload & Share** - Upload music files that are automatically added to the shared queue
- **⚡ Real-time Updates** - WebSocket-powered live queue and track updates
- **👤 Simple Username System** - No registration required, just pick a name
- **📱 Progressive Web App** - Install on mobile and desktop devices
- **🎨 Beautiful UI** - Modern, responsive design with smooth animations
- **🔄 Auto-cleanup** - Configurable storage limit (default: 300MB) with automatic deletion of oldest files

## 🏗️ Architecture

- **Backend**: Rust with Actix-web for HTTP/WebSocket serving (connects to MPD as client)
- **Frontend**: React + TypeScript PWA built with Vite
- **Streaming**: Music Player Daemon (MPD) for audio playback and HTTP streaming (separate service)
- **Real-time**: WebSocket for live queue and track updates

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Rust** (1.83.0 or newer) - https://rustup.rs/
  ```bash
  # Install or update Rust
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  rustup update stable
  ```
- **Node.js** (v18+) - https://nodejs.org/
- **Music Player Daemon (MPD)**:
  - macOS: `brew install mpd`
  - Ubuntu/Debian: `sudo apt install mpd`
  - Arch Linux: `sudo pacman -S mpd`

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# Start MPD service
docker compose up -d mpd

# Start backend (in another terminal)
cd backend
cargo run
```

### Option 2: Local Development

#### 1. Start MPD Locally

```bash
cd backend

# Create MPD config from example (first time only)
cp mpd.conf.example mpd.conf
# Edit mpd.conf if needed

# Start MPD
mpd mpd.conf
```

Or use the development script:
```bash
cd backend
./start-dev.sh  # Starts MPD and backend
```

#### 2. Start Backend

```bash
cd backend
cargo run
```

Backend starts on `http://localhost:8080` and connects to MPD at `127.0.0.1:6600`

#### 3. Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will be available at `http://localhost:5173`

#### 4. Open in Browser

Navigate to `http://localhost:5173` and start listening!

## 📁 Project Structure

```
muchas-radio/
├── backend/              # Rust backend server
│   ├── src/
│   │   ├── main.rs      # Server entry point
│   │   ├── mpd_manager.rs
│   │   ├── api/         # API endpoints
│   │   │   ├── upload.rs
│   │   │   ├── playlist.rs
│   │   │   └── stream.rs
│   │   ├── models.rs
│   │   └── state.rs
│   ├── uploads/         # Uploaded music files (gitignored)
│   ├── mpd.conf.example # MPD configuration example (for local dev)
│   ├── start-dev.sh     # Development startup script
│   └── Cargo.toml
│
├── mpd/                 # MPD Docker container
│   └── Dockerfile       # MPD service configuration
│
└── frontend/            # React TypeScript PWA
    ├── src/
    │   ├── App.tsx
    │   ├── components/  # UI components
    │   ├── hooks/       # React hooks
    │   ├── api/         # API client
    │   └── types/       # TypeScript types
    ├── public/
    └── package.json
```

## 🔌 API Endpoints

- `POST /api/upload` - Upload a music file
- `GET /api/current` - Get currently playing track
- `GET /api/queue` - Get upcoming tracks
- `POST /api/queue/add` - Add track to queue
- `GET /api/stream` - Audio stream proxy
- `WS /api/ws` - WebSocket for real-time updates

## ⚙️ Configuration

### Music Storage Setup

The backend and MPD containers share the same music storage. By default, Docker named volumes are used, but you can configure bind mounts for easier access.

**Current Setup:**
- Backend writes to: `/app/uploads` (mounted from `music-uploads` volume)
- MPD reads from: `/music` (mounted from same `music-uploads` volume)
- Both containers share the same data

**For production or easier file access:**
- Use bind mounts by setting `MUSIC_STORAGE_PATH` environment variable
- Default: `./data/music` (relative to docker-compose.yml)
- Example: `export MUSIC_STORAGE_PATH=/var/muchas-radio/music && docker compose up -d`

### Backend Environment Variables

**MPD Connection:**
- `MPD_HOST` - MPD server hostname/IP to connect to (default: 127.0.0.1)
- `MPD_PORT` - MPD server port (default: 6600)

**Backend API:**
- `BIND_ADDR` - HTTP server address (default: 127.0.0.1:8080)
- `RUST_LOG` - Log level (default: info)
- `MAX_TOTAL_STORAGE` - Maximum total storage size (default: 300MB). Supports formats like "500MB", "1GB", or bytes as a number.

**Production Example:**
```bash
export MPD_HOST=mpd  # Use service name in Docker, or IP/hostname otherwise
export MPD_PORT=6600
export BIND_ADDR=0.0.0.0:8080
cargo run --release
```

**Note**: In Docker deployments, MPD runs in a separate container. The backend connects to it via `MPD_HOST=mpd` (the service name).

### Frontend Environment Variables

- `VITE_API_URL` - Backend API URL (default: http://localhost:8080)
- `VITE_WS_URL` - WebSocket URL (default: ws://localhost:8080)

## 🎵 Supported Audio Formats

- MP3
- FLAC
- OGG
- M4A
- WAV

**Storage Limits:**
- Maximum file size: 100MB
- Total storage: 300MB by default (configurable via `MAX_TOTAL_STORAGE` environment variable). Oldest files are auto-deleted when limit is reached.

## 🚢 Deployment

### Docker Deployment (Recommended) 🐳

The easiest and most reliable way to deploy Muchas Radio is using Docker:

#### Quick Deploy

```bash
# On your server
git clone https://github.com/yourusername/muchas-radio.git
cd muchas-radio

# Run the deployment script
./docker-deploy.sh yourdomain.com
# or with an IP address
./docker-deploy.sh 192.168.1.100
```

The deployment script will:
- Configure environment variables for your domain/IP
- Build all Docker images
- Start all services (MPD, Backend, Frontend, Nginx)
- Display service status and useful commands

#### Manual Docker Deployment

```bash
# Set your domain or IP
export VITE_API_URL=http://your-domain.com
export VITE_WS_URL=ws://your-domain.com

# Build and start
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

#### Services

Once deployed, you'll have:
- **Frontend**: Port 3000 (nginx serving React app)
- **Backend API**: Port 8080 (connects to MPD service)
- **MPD Server**: Port 6600 (separate container, internal network)
- **Audio Stream**: Port 8001 (from MPD container, internal network)

#### Storage

Music files are stored in a shared Docker volume (`music-uploads`) accessible by both backend and MPD containers:
- Backend writes to: `/app/uploads`
- MPD reads from: `/music`
- Both point to the same volume

For production deployments, consider using bind mounts to a host directory by setting the `MUSIC_STORAGE_PATH` environment variable (default: `./data/music`).

#### Update Deployment

```bash
# Pull latest changes
git pull

# Rebuild and restart
docker compose up -d --build

# Or use the shortcut
docker compose build && docker compose up -d
```

#### SSL/HTTPS Setup

For production with HTTPS, you'll need to configure SSL certificates separately. Consider using:
- **Traefik** - Automatic Let's Encrypt certificates
- **Caddy** - Automatic HTTPS
- **Nginx Proxy Manager** - Web UI for reverse proxy + SSL

See `DOCKER_DEPLOYMENT.md` for advanced configuration options.

## 🛠️ Development

### Backend
```bash
cd backend
cargo watch -x run  # Auto-reload on changes
cargo test          # Run tests
```

### Frontend
```bash
cd frontend
npm run dev      # Hot reload enabled
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run linter
```

## 🐛 Troubleshooting

### MPD Won't Start

**Error**: `Failed to bind to socket`
- Kill existing MPD: `pkill mpd` and try again

**Error**: `Failed to open database`
- Delete `backend/mpd.db` and restart MPD

### Backend Won't Connect

**Error**: `Failed to connect to MPD`
- Ensure MPD is running: `mpd backend/mpd.conf` (development) or check Docker service: `docker compose ps mpd`
- Verify MPD_HOST and MPD_PORT environment variables are correct
- In Docker: ensure the `mpd` service is running and the backend can reach it on the Docker network
- Check logs: `tail -f backend/mpd.log` (development) or `docker compose logs mpd` (Docker)

### No Audio Playing

- Check MPD stream: `curl http://localhost:8001`
- Verify port 8001 is not blocked
- Check MPD logs for encoding errors

### WebSocket Connection Failed

- Ensure backend is on port 8080: `curl http://localhost:8080/api/current`
- Check CORS settings in backend
- Verify firewall allows connections

## 📊 Monitoring

### Docker Deployment

```bash
# View all logs
docker compose logs -f

# View specific service logs
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f mpd

# Check service status
docker compose ps

# Check resource usage
docker stats
```

### Development (Non-Docker)

```bash
# Backend logs (if using cargo run)
# Logs will appear in the terminal

# MPD logs
tail -f backend/mpd.log

# Check MPD status
mpc status
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Music Player Daemon (MPD)](https://www.musicpd.org/) - Audio playback daemon
- [Actix Web](https://actix.rs/) - Rust web framework
- [React](https://react.dev/) - Frontend framework
- [Vite](https://vitejs.dev/) - Build tool
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework

---

<div align="center">
  Made with ❤️ for music lovers everywhere
  
  **[Report Bug](https://github.com/yourusername/muchas-radio/issues)** · **[Request Feature](https://github.com/yourusername/muchas-radio/issues)**
</div>
