#!/bin/bash
set -e

# Deployment script for Muchas Radio on Ubuntu ARM VPS
# Usage: 
#   ./deploy.sh                              # Interactive mode (recommended)
#   ./deploy.sh yourdomain.com               # Specify domain/IP, prompt for path
#   ./deploy.sh yourdomain.com /opt/muchas   # Specify both domain and path

# Show help
if [ "$1" = "-h" ] || [ "$1" = "--help" ]; then
    echo "Muchas Radio Deployment Script"
    echo ""
    echo "Usage:"
    echo "  ./deploy.sh                              Interactive mode (recommended)"
    echo "  ./deploy.sh DOMAIN_OR_IP                 Specify domain/IP, prompt for path"
    echo "  ./deploy.sh DOMAIN_OR_IP INSTALL_PATH    Specify both"
    echo ""
    echo "Examples:"
    echo "  ./deploy.sh"
    echo "  ./deploy.sh radio.example.com"
    echo "  ./deploy.sh 192.168.1.100 /home/user/muchas-radio"
    echo "  ./deploy.sh mydomain.com /opt/muchas-radio"
    echo ""
    exit 0
fi

DOMAIN_OR_IP=${1:-""}
INSTALL_DIR=${2:-""}
CURRENT_USER=$(whoami)

echo "🎵 Muchas Radio Deployment Script"
echo "=================================="
echo ""

# Check if running on Ubuntu
if ! grep -q "Ubuntu" /etc/os-release; then
    echo "⚠️  Warning: This script is designed for Ubuntu. Continue anyway? (y/n)"
    read -r response
    if [[ ! "$response" =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Ask for domain/IP if not provided
if [ -z "$DOMAIN_OR_IP" ]; then
    echo "Enter your domain name or VPS IP address:"
    read -r DOMAIN_OR_IP
fi

# Ask for installation path if not provided
if [ -z "$INSTALL_DIR" ]; then
    echo ""
    echo "Enter installation directory path (default: /opt/muchas-radio):"
    read -r input_path
    if [ -z "$input_path" ]; then
        INSTALL_DIR="/opt/muchas-radio"
    else
        # Remove trailing slash if present
        INSTALL_DIR="${input_path%/}"
    fi
fi

# Validate and expand path
INSTALL_DIR=$(eval echo "$INSTALL_DIR")

# Check if path is absolute
if [[ ! "$INSTALL_DIR" = /* ]]; then
    echo "❌ Error: Installation path must be absolute (start with /)"
    exit 1
fi

echo ""
echo "📍 Installation directory: $INSTALL_DIR"

# Check if domain or IP
if [[ $DOMAIN_OR_IP =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    USE_SSL=false
    echo "📍 Detected IP address: $DOMAIN_OR_IP"
    echo "   SSL will not be configured"
else
    USE_SSL=true
    echo "🌐 Detected domain: $DOMAIN_OR_IP"
    echo "   SSL will be configured with Let's Encrypt"
fi

echo ""
echo "This script will:"
echo "  • Install to: $INSTALL_DIR"
echo "  • Domain/IP: $DOMAIN_OR_IP"
if [ "$USE_SSL" = true ]; then
    echo "  • SSL: Yes (Let's Encrypt)"
else
    echo "  • SSL: No (HTTP only)"
fi
echo ""
echo "Steps:"
echo "  1. Install dependencies (nginx, mpd, rust, node.js)"
echo "  2. Build backend and frontend"
echo "  3. Configure nginx"
echo "  4. Setup systemd services"
if [ "$USE_SSL" = true ]; then
    echo "  5. Configure SSL certificate"
fi
echo ""
echo "Continue? (y/n)"
read -r response
if [[ ! "$response" =~ ^[Yy]$ ]]; then
    exit 0
fi

echo ""
echo "📦 Step 1: Installing dependencies..."
sudo apt update
sudo apt install -y nginx mpd build-essential pkg-config libssl-dev

# Install Rust if not present
if ! command -v cargo &> /dev/null; then
    echo "Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
fi

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
fi

echo ""
echo "🏗️  Step 2: Preparing installation directory..."

# Expand current directory path for comparison
CURRENT_DIR="$(cd "$(dirname "$0")" && pwd)"

if [ "$INSTALL_DIR" = "$CURRENT_DIR" ]; then
    echo "Using current directory: $INSTALL_DIR"
elif [ -d "$INSTALL_DIR" ] && [ -f "$INSTALL_DIR/backend/Cargo.toml" ]; then
    echo "Installation directory already exists with code: $INSTALL_DIR"
    cd "$INSTALL_DIR"
elif [ -d "$INSTALL_DIR" ] && [ "$(ls -A $INSTALL_DIR)" ]; then
    echo "❌ Error: Directory exists and is not empty: $INSTALL_DIR"
    echo "Please choose an empty directory or remove existing contents."
    exit 1
else
    echo "Creating installation directory: $INSTALL_DIR"
    sudo mkdir -p "$INSTALL_DIR"
    sudo chown $CURRENT_USER:$CURRENT_USER "$INSTALL_DIR"
    
    echo "Copying files to $INSTALL_DIR..."
    cp -r "$CURRENT_DIR"/* "$INSTALL_DIR/"
    cd "$INSTALL_DIR"
fi

echo ""
echo "🔨 Step 3: Building application..."

# Build backend
echo "Building backend..."
cd backend
cargo build --release
cd ..

# Build frontend
echo "Building frontend..."
cd frontend

# Create production environment file
if [ "$USE_SSL" = true ]; then
    cat > .env.production << EOF
VITE_API_URL=https://$DOMAIN_OR_IP
VITE_WS_URL=wss://$DOMAIN_OR_IP
EOF
else
    cat > .env.production << EOF
VITE_API_URL=http://$DOMAIN_OR_IP
VITE_WS_URL=ws://$DOMAIN_OR_IP
EOF
fi

npm install
npm run build
cd ..

echo ""
echo "⚙️  Step 4: Configuring Nginx..."

# Create nginx configuration
if [ "$USE_SSL" = true ]; then
    # Configuration for SSL (will be updated by certbot)
    sudo tee /etc/nginx/sites-available/muchas-radio > /dev/null << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN_OR_IP;
    
    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }
    
    location / {
        root $INSTALL_DIR/frontend/dist;
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
        client_max_body_size 100M;
        proxy_buffering off;
        proxy_request_buffering off;
    }
}
EOF
else
    # Configuration without SSL
    sudo tee /etc/nginx/sites-available/muchas-radio > /dev/null << EOF
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN_OR_IP;

    # Serve frontend static files
    location / {
        root $INSTALL_DIR/frontend/dist;
        try_files \$uri \$uri/ /index.html;
    }

    # Proxy API requests to backend
    location /api {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
        client_max_body_size 100M;
        proxy_buffering off;
    }
}
EOF
fi

# Enable site
sudo ln -sf /etc/nginx/sites-available/muchas-radio /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

echo ""
echo "🔧 Step 5: Setting up systemd services..."

# Backend service
sudo tee /etc/systemd/system/muchas-radio-backend.service > /dev/null << EOF
[Unit]
Description=Muchas Radio Backend
After=network.target

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$INSTALL_DIR/backend
Environment="MPD_BASE_DIR=$INSTALL_DIR/backend"
Environment="MPD_BIND_ADDRESS=127.0.0.1"
Environment="BIND_ADDR=127.0.0.1:8080"
Environment="RUST_LOG=info"
ExecStart=$INSTALL_DIR/backend/target/release/backend
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# MPD service
sudo tee /etc/systemd/system/muchas-radio-mpd.service > /dev/null << EOF
[Unit]
Description=Muchas Radio MPD
After=network.target muchas-radio-backend.service

[Service]
Type=simple
User=$CURRENT_USER
WorkingDirectory=$INSTALL_DIR/backend
ExecStart=/usr/bin/mpd --no-daemon $INSTALL_DIR/backend/mpd.conf
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Reload and start services
sudo systemctl daemon-reload
sudo systemctl enable muchas-radio-backend
sudo systemctl enable muchas-radio-mpd
sudo systemctl start muchas-radio-backend
sleep 3  # Wait for backend to generate mpd.conf
sudo systemctl start muchas-radio-mpd

# Configure firewall
echo ""
echo "🔥 Step 6: Configuring firewall..."
if command -v ufw &> /dev/null; then
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw --force enable
fi

# Setup SSL if domain
if [ "$USE_SSL" = true ]; then
    echo ""
    echo "🔒 Step 7: Setting up SSL certificate..."
    
    # Install certbot if not present
    if ! command -v certbot &> /dev/null; then
        sudo apt install -y certbot python3-certbot-nginx
    fi
    
    echo ""
    echo "Running certbot to obtain SSL certificate..."
    echo "You'll need to provide an email address and agree to terms."
    sudo certbot --nginx -d "$DOMAIN_OR_IP"
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Your application is now running at:"
if [ "$USE_SSL" = true ]; then
    echo "  🌐 https://$DOMAIN_OR_IP"
else
    echo "  🌐 http://$DOMAIN_OR_IP"
fi
echo ""
echo "Service status:"
sudo systemctl status muchas-radio-backend --no-pager -l
echo ""
sudo systemctl status muchas-radio-mpd --no-pager -l
echo ""
echo "Useful commands:"
echo "  View backend logs:  sudo journalctl -u muchas-radio-backend -f"
echo "  View MPD logs:      sudo journalctl -u muchas-radio-mpd -f"
echo "  Restart backend:    sudo systemctl restart muchas-radio-backend"
echo "  Restart MPD:        sudo systemctl restart muchas-radio-mpd"
echo ""
echo "🎵 Happy streaming!"

