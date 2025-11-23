FROM alpine:latest

# Install MPD and lame encoder
RUN apk add --no-cache \
    mpd \
    mpc \
    lame

# Create directories
RUN mkdir -p /music /var/lib/mpd/playlists /var/log/mpd && \
    touch /var/lib/mpd/database /var/lib/mpd/state /var/lib/mpd/sticker.sql

# Default MPD configuration
COPY mpd.conf /etc/mpd.conf

# Fix permissions
RUN chown -R mpd:audio /music /var/lib/mpd /var/log/mpd

USER mpd

EXPOSE 6600 8001

CMD ["mpd", "--no-daemon", "/etc/mpd.conf"]

