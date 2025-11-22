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
- **🔄 Auto-cleanup** - 300MB storage with automatic deletion of oldest files

## 🏗️ Architecture

- **Backend**: Rust with Actix-web for HTTP/WebSocket serving
- **Frontend**: React + TypeScript PWA built with Vite
- **Streaming**: Music Player Daemon (MPD) for audio playback and HTTP streaming
- **Real-time**: WebSocket for live queue and track updates

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- **Rust** (latest stable) - https://rustup.rs/
- **Node.js** (v18+) - https://nodejs.org/
- **Music Player Daemon (MPD)**:
  - macOS: `brew install mpd`
  - Ubuntu/Debian: `sudo apt install mpd`
  - Arch Linux: `sudo pacman -S mpd`

## 🚀 Quick Start

### Option 1: Development Script (Easiest)

```bash
cd backend
./start-dev.sh
```

This will automatically:
- Generate the MPD configuration
- Start MPD with the generated config
- Start the backend server

### Option 2: Manual Start

#### 1. Start Backend

```bash
cd backend
cargo run
```

This generates `mpd.conf` from the template with appropriate paths.
Backend starts on `http://localhost:8080`

#### 2. Start MPD

```bash
cd backend
mpd mpd.conf
```

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
│   ├── playlists/       # MPD playlists
│   ├── mpd.conf.template # MPD configuration template
│   ├── start-dev.sh     # Development startup script
│   └── Cargo.toml
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

### Backend Environment Variables

**MPD Configuration:**
- `MPD_BASE_DIR` - Base directory for MPD files (default: current directory)
- `MPD_MUSIC_DIR` - Music files directory (default: `$MPD_BASE_DIR/uploads`)
- `MPD_PLAYLIST_DIR` - Playlists directory (default: `$MPD_BASE_DIR/playlists`)
- `MPD_DATA_DIR` - MPD data directory (default: `$MPD_BASE_DIR`)
- `MPD_BIND_ADDRESS` - MPD bind address (default: 127.0.0.1)
- `MPD_PORT` - MPD server port (default: 6600)
- `MPD_STREAM_PORT` - HTTP streaming port (default: 8001)

**Backend API:**
- `MPD_HOST` - MPD server host (default: 127.0.0.1)
- `BIND_ADDR` - HTTP server address (default: 127.0.0.1:8080)
- `RUST_LOG` - Log level (default: info)

**Production Example:**
```bash
export MPD_BASE_DIR=/var/lib/muchas-radio
export MPD_BIND_ADDRESS=0.0.0.0
export BIND_ADDR=0.0.0.0:8080
cargo run --release
```

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
- Total storage: 300MB (oldest files auto-deleted when limit reached)

## 🚢 Deployment

### Automated Deployment Script

An automated deployment script is included that handles everything for you:

```bash
# On your VPS (Ubuntu)
git clone https://github.com/yourusername/muchas-radio.git
cd muchas-radio
chmod +x deploy.sh
./deploy.sh
```

The script will:
- Install all dependencies (nginx, mpd, rust, node.js)
- Build backend and frontend
- Configure nginx with SSL (if using a domain)
- Setup systemd services for auto-start
- Configure firewall

**Usage:**
```bash
./deploy.sh                              # Interactive mode (recommended)
./deploy.sh yourdomain.com               # Specify domain
./deploy.sh yourdomain.com /opt/muchas   # Specify domain and install path
```

### Updating

Use the included update script:

```bash
./update.sh
```

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
- Ensure MPD is running: `mpd backend/mpd.conf`
- Check logs: `tail -f backend/mpd.log`

### No Audio Playing

- Check MPD stream: `curl http://localhost:8001`
- Verify port 8001 is not blocked
- Check MPD logs for encoding errors

### WebSocket Connection Failed

- Ensure backend is on port 8080: `curl http://localhost:8080/api/current`
- Check CORS settings in backend
- Verify firewall allows connections

## 📊 Monitoring

```bash
# View logs
sudo journalctl -u muchas-radio-backend -f

# Check status
sudo systemctl status muchas-radio-backend
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
