#!/bin/bash

# Script to initialize SSL certificates for muchasradio.com
# Run this once after DNS is configured and pointing to your VPS

set -e

DOMAIN="muchasradio.com"
EMAIL="${CERTBOT_EMAIL:-your-email@example.com}"  # Set CERTBOT_EMAIL env var or edit this

echo "🔒 Initializing SSL certificates for $DOMAIN"
echo "📧 Using email: $EMAIL"
echo ""

# Check if certificates already exist (check in certbot volume)
if docker compose run --rm --entrypoint="" certbot test -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem 2>/dev/null; then
    echo "⚠️  Certificates already exist for $DOMAIN"
    echo "   If you need to renew, run: docker compose run --rm certbot renew"
    echo "   Or delete existing certificates first to get new ones"
    read -p "   Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 0
    fi
fi

# Validate email
if [ "$EMAIL" = "your-email@example.com" ]; then
    echo "❌ Error: Please set CERTBOT_EMAIL environment variable"
    echo "   Example: export CERTBOT_EMAIL=your-email@example.com"
    exit 1
fi

# Start nginx (needed for Let's Encrypt validation)
echo "🚀 Starting nginx..."
docker compose up -d nginx

# Wait for nginx to be ready and verify it's accessible
echo "⏳ Waiting for nginx to be ready..."
for i in {1..30}; do
    if docker compose exec -T nginx wget --quiet --tries=1 --spider http://localhost:80 2>/dev/null; then
        echo "✅ Nginx is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ Error: Nginx failed to start or is not responding"
        echo "   Check logs: docker compose logs nginx"
        exit 1
    fi
    sleep 1
done

# Ensure certbot directory structure exists and is writable
echo "📁 Setting up certbot directory structure..."
docker compose run --rm --entrypoint="" certbot sh -c "mkdir -p /var/www/certbot/.well-known/acme-challenge && chmod -R 755 /var/www/certbot"

# Test that nginx can serve the validation path
echo "🧪 Testing validation path accessibility..."
TEST_FILE="test-$(date +%s)"
echo "$TEST_FILE" | docker compose run --rm --entrypoint="" certbot tee /var/www/certbot/.well-known/acme-challenge/$TEST_FILE > /dev/null
sleep 1
HTTP_RESPONSE=$(curl -s "http://$DOMAIN/.well-known/acme-challenge/$TEST_FILE" || echo "")
docker compose run --rm --entrypoint="" certbot rm -f /var/www/certbot/.well-known/acme-challenge/$TEST_FILE

if [ "$HTTP_RESPONSE" = "$TEST_FILE" ]; then
    echo "✅ Validation path is accessible via HTTP"
else
    echo "⚠️  Warning: Validation path test failed"
    echo "   Response: $HTTP_RESPONSE"
    echo "   This might cause certificate generation to fail"
    echo "   Continuing anyway..."
fi

# Verify DNS is pointing to this server
echo "🔍 Verifying DNS configuration..."
SERVER_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s ipinfo.io/ip 2>/dev/null || echo "")
if [ -n "$SERVER_IP" ]; then
    RESOLVED_IP=$(dig +short $DOMAIN | tail -n1)
    if [ -n "$RESOLVED_IP" ] && [ "$RESOLVED_IP" != "$SERVER_IP" ]; then
        echo "⚠️  Warning: DNS might not be configured correctly"
        echo "   Domain $DOMAIN resolves to: $RESOLVED_IP"
        echo "   This server IP is: $SERVER_IP"
        echo "   Continuing anyway..."
    fi
fi

# Request certificates (without --force-renewal for initial request)
echo "📝 Requesting SSL certificates from Let's Encrypt..."
echo "   This may take a minute..."
echo "   Domain: $DOMAIN and www.$DOMAIN"
echo "   Email: $EMAIL"
echo ""

# Run certbot with verbose output (override entrypoint to run certbot directly)
docker compose run --rm --entrypoint="" certbot certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    --email "$EMAIL" \
    --agree-tos \
    --no-eff-email \
    --non-interactive \
    --verbose \
    -d "$DOMAIN" \
    -d "www.$DOMAIN" 2>&1 | tee /tmp/certbot-output.log

CERTBOT_EXIT_CODE=${PIPESTATUS[0]}

if [ $CERTBOT_EXIT_CODE -ne 0 ]; then
    echo ""
    echo "❌ Certificate generation failed with exit code: $CERTBOT_EXIT_CODE"
    echo "   Full output saved to /tmp/certbot-output.log"
    echo ""
    echo "   Common issues:"
    echo "   1. DNS not propagated - wait a few minutes and try again"
    echo "   2. Port 80 not accessible - check firewall: sudo ufw allow 80/tcp"
    echo "   3. Domain already has certificates - check: docker compose run --rm certbot certificates"
    echo "   4. Rate limiting - wait 1 hour if you've tried too many times"
    echo ""
    echo "   To debug, check:"
    echo "   - Nginx logs: docker compose logs nginx"
    echo "   - Certbot logs: docker compose run --rm --entrypoint=\"\" certbot certbot logs"
    echo "   - Test validation path: curl http://$DOMAIN/.well-known/acme-challenge/test"
    echo "   - Check existing certificates: docker compose run --rm --entrypoint=\"\" certbot certbot certificates"
    exit 1
fi

# Check if certificates were created
if ! docker compose run --rm --entrypoint="" certbot test -f /etc/letsencrypt/live/$DOMAIN/fullchain.pem 2>/dev/null; then
    echo "❌ Error: Certificate generation failed"
    echo "   Check the logs above for details"
    echo "   Common issues:"
    echo "   - DNS not pointing to this server"
    echo "   - Port 80 not accessible from internet"
    echo "   - Domain already has certificates (use --force-renewal if needed)"
    exit 1
fi

echo "✅ Certificates obtained successfully!"

# Enable HTTPS configuration
echo "🔧 Enabling HTTPS configuration..."
if [ -f "nginx/conf.d/muchas-radio-ssl.conf.example" ]; then
    cp nginx/conf.d/muchas-radio-ssl.conf.example nginx/conf.d/muchas-radio-ssl.conf
    echo "✅ SSL configuration file created"
else
    echo "⚠️  SSL example config not found, creating it..."
    # Create SSL config inline (upstream and map are in muchas-radio.conf, don't duplicate)
    cat > nginx/conf.d/muchas-radio-ssl.conf << 'SSL_EOF'
# HTTPS server configuration
# Note: upstream and map definitions are in muchas-radio.conf

server {
    listen 443 ssl;
    http2 on;
    server_name muchasradio.com www.muchasradio.com;

    ssl_certificate /etc/letsencrypt/live/muchasradio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/muchasradio.com/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    ssl_session_tickets off;

    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    client_max_body_size 100M;

    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/stream {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_cache off;
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
        gzip off;
        add_header Cache-Control "no-cache, no-store, must-revalidate" always;
        add_header Pragma "no-cache" always;
        add_header Connection "keep-alive" always;
        add_header X-Accel-Buffering "no" always;
        chunked_transfer_encoding on;
    }

    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
        proxy_buffering off;
        proxy_request_buffering off;
    }

    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
SSL_EOF
fi

echo ""
echo "📝 Note: HTTP server is currently serving content (not redirecting)"
echo "   To enable HTTP→HTTPS redirect, edit nginx/conf.d/muchas-radio.conf:"
echo "   1. Comment out the 'location /' block with proxy_pass"
echo "   2. Uncomment the redirect block at the top"
echo "   3. Restart nginx: docker compose restart nginx"

# Reload nginx to use the new certificates and SSL config
echo "🔄 Reloading nginx with SSL configuration..."
docker compose restart nginx

# Wait a moment for nginx to restart
sleep 3

# Test HTTPS
echo "🧪 Testing HTTPS connection..."
if curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN | grep -q "200\|301\|302"; then
    echo "✅ HTTPS is working!"
else
    echo "⚠️  HTTPS test failed, but certificates are installed"
    echo "   You may need to wait a moment for DNS/propagation"
fi

echo ""
echo "✅ SSL certificates initialized successfully!"
echo "🔐 Your site should now be accessible at https://$DOMAIN"
echo ""
echo "📋 Next steps:"
echo "   1. Test HTTPS: curl -I https://$DOMAIN"
echo "   2. (Optional) Enable HTTP→HTTPS redirect (see instructions above)"
echo "   3. Certificates will auto-renew via the certbot container"


