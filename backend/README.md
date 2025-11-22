# Muchas Radio Backend

Rust backend server for Muchas Radio application using Actix-web and MPD (Music Player Daemon).

## Configuration

The backend generates MPD configuration at runtime from `mpd.conf.template`. This approach:
- ✅ Works in any environment (dev, production, Docker)
- ✅ No hardcoded paths in the repository
- ✅ Easy to customize via environment variables
- ✅ Automatically creates required directories

### Environment Variables

**MPD Configuration:**
- `MPD_BASE_DIR`: Base directory for MPD files (default: current directory)
- `MPD_MUSIC_DIR`: Directory for music files (default: `$MPD_BASE_DIR/uploads`)
- `MPD_PLAYLIST_DIR`: Directory for playlists (default: `$MPD_BASE_DIR/playlists`)
- `MPD_DATA_DIR`: Directory for MPD database and state files (default: `$MPD_BASE_DIR`)
- `MPD_BIND_ADDRESS`: IP address for MPD to bind to (default: `127.0.0.1`)
- `MPD_PORT`: Port for MPD server (default: `6600`)
- `MPD_STREAM_PORT`: Port for HTTP audio stream (default: `8001`)

**Backend API:**
- `MPD_HOST`: MPD server host to connect to (default: `127.0.0.1`)
- `BIND_ADDR`: Address for HTTP API server (default: `127.0.0.1:8080`)
- `RUST_LOG`: Logging level (default: `info`)

### Creating a .env File

You can create a `.env` file in the backend directory for easier configuration:

```bash
# .env
MPD_BASE_DIR=/var/lib/muchas-radio
MPD_MUSIC_DIR=/mnt/music
MPD_BIND_ADDRESS=0.0.0.0
RUST_LOG=debug
```

Then load it before running:
```bash
export $(cat .env | xargs) && cargo run
```

### Example Usage

Development (using defaults):
```bash
cd backend
cargo run
# In another terminal:
mpd backend/mpd.conf
```

Production with custom paths:
```bash
export MPD_BASE_DIR=/var/lib/muchas-radio
export MPD_MUSIC_DIR=/mnt/music
export MPD_BIND_ADDRESS=0.0.0.0
cargo run --release
# In another terminal:
mpd /var/lib/muchas-radio/mpd.conf
```

Docker:
```dockerfile
ENV MPD_BASE_DIR=/app/data
ENV MPD_MUSIC_DIR=/app/data/music
ENV MPD_BIND_ADDRESS=0.0.0.0
```

## Development

```bash
# Build
cargo build

# Run with logging
RUST_LOG=info cargo run

# Run tests
cargo test
```

## API Endpoints

- `POST /api/upload` - Upload music files
- `GET /api/storage` - Get storage information
- `GET /api/current` - Get current playing track
- `GET /api/queue` - Get playback queue
- `POST /api/queue` - Add track to queue
- `GET /api/stream` - Audio stream proxy
- `GET /ws` - WebSocket for real-time updates
