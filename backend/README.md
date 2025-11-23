# Muchas Radio Backend

Rust backend server for Muchas Radio application using Actix-web. The backend connects to MPD (Music Player Daemon) as a client - it does not run MPD itself.

## Architecture

- **Backend**: Connects to MPD via TCP (MPD protocol on port 6600)
- **MPD**: Runs as a separate service (either locally or in a Docker container)
- In Docker: MPD runs in a dedicated `mpd` container, backend connects via service name

## Configuration

### Environment Variables

**MPD Connection:**
- `MPD_HOST`: MPD server hostname/IP to connect to (default: `127.0.0.1`)
  - In Docker: use service name `mpd`
  - In development: use `127.0.0.1` or `localhost`
- `MPD_PORT`: MPD server port (default: `6600`)

**Backend API:**
- `BIND_ADDR`: Address for HTTP API server (default: `127.0.0.1:8080`)
- `RUST_LOG`: Logging level (default: `info`)

### Creating a .env File

You can create a `.env` file in the backend directory for easier configuration:

```bash
# .env
MPD_HOST=127.0.0.1
MPD_PORT=6600
BIND_ADDR=0.0.0.0:8080
RUST_LOG=debug
```

Then load it before running:
```bash
export $(cat .env | xargs) && cargo run
```

### Example Usage

**Development:**

Option 1: Using Docker (Recommended)
```bash
# Start MPD and backend with Docker
docker compose up mpd backend

# In another terminal, start backend for development
cd backend
cargo run
```

Option 2: Local MPD
```bash
cd backend

# Create MPD config from example (first time only)
cp mpd.conf.example mpd.conf
# Edit mpd.conf if needed (adjust paths)

# Start MPD and backend
./start-dev.sh

# Or start manually:
# Terminal 1: mpd mpd.conf
# Terminal 2: cargo run
```

**Docker:**
The backend connects to the MPD service automatically:
```yaml
environment:
  - MPD_HOST=mpd  # Service name in docker-compose
  - MPD_PORT=6600
  - BIND_ADDR=0.0.0.0:8080
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
