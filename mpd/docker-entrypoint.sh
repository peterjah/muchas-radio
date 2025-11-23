#!/bin/sh
set -e

# MPD Docker Entrypoint
# Ensures database files are properly initialized

DB_DIR="/var/lib/mpd"
DB_FILE="$DB_DIR/database"
STATE_FILE="$DB_DIR/state"
STICKER_FILE="$DB_DIR/sticker.sql"
PID_FILE="$DB_DIR/pid"

# Ensure directory exists
mkdir -p "$DB_DIR/playlists"

# If database file exists but is empty or very small, remove it
# MPD will create a fresh database on startup
if [ -f "$DB_FILE" ]; then
    # Check if file is empty (size 0) or very small (likely corrupted/empty)
    FILE_SIZE=$(wc -c < "$DB_FILE" 2>/dev/null || echo 0)
    if [ "$FILE_SIZE" -eq 0 ] || [ "$FILE_SIZE" -lt 100 ]; then
        echo "Removing empty/corrupted database file (size: $FILE_SIZE bytes), MPD will create a fresh one"
        rm -f "$DB_FILE"
    fi
fi

# Remove state and sticker files if database is missing (they need to match)
if [ ! -f "$DB_FILE" ]; then
    echo "Removing state files to match missing database"
    rm -f "$STATE_FILE" "$STICKER_FILE" "$PID_FILE"
fi

# Start MPD
exec mpd --no-daemon /etc/mpd.conf

