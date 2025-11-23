FROM alpine:latest

# Install MPD and LAME encoder
RUN apk add --no-cache \
    mpd \
    mpc \
    lame

# Create directories (don't create database file - MPD will create it)
RUN mkdir -p /music /var/lib/mpd/playlists /var/log/mpd

# Default MPD configuration
COPY mpd.conf /etc/mpd.conf

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Fix permissions
RUN chown -R mpd:audio /music /var/lib/mpd /var/log/mpd

USER mpd

EXPOSE 6600 8001 8002 8003

ENTRYPOINT ["/docker-entrypoint.sh"]

