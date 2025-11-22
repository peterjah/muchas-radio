# Backend Dockerfile
FROM rust:1.83-slim as builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy manifests
COPY Cargo.toml Cargo.lock ./

# Copy source code
COPY src ./src

# Build for release
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libssl3 \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy the binary from builder
COPY --from=builder /app/target/release/muchas-radio-backend /app/backend

# Create necessary directories
RUN mkdir -p /app/uploads /app/playlists /app/data

# Copy MPD config template to the data directory
COPY mpd.conf.template /app/data/

# Set environment variables
ENV MPD_BASE_DIR=/app/data \
    MPD_MUSIC_DIR=/app/uploads \
    MPD_PLAYLIST_DIR=/app/playlists \
    MPD_BIND_ADDRESS=0.0.0.0 \
    BIND_ADDR=0.0.0.0:8080 \
    RUST_LOG=info

EXPOSE 8080

CMD ["/app/backend"]

