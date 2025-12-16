#!/bin/bash

#═══════════════════════════════════════════════════════════════════
# Music Portal - Automated Deployment Script for DigitalOcean
#═══════════════════════════════════════════════════════════════════
#
# Usage: ./deploy.sh
# Run as: root (first time) or deployer (updates)
#
#═══════════════════════════════════════════════════════════════════

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DEPLOYER_USER="deployer"
APP_NAME="music-portal"
APP_DIR="/home/$DEPLOYER_USER/$APP_NAME"
HOMEPAGE_DIR="/var/www/homepage"
NODE_VERSION="18"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_root() {
    if [[ $EUID -ne 0 ]]; then
        log_error "This script must be run as root (initial setup)"
        log_info "Usage: sudo ./deploy.sh"
        exit 1
    fi
}

# Step 1: System Update
step_system_update() {
    log_info "Step 1/12: Updating system..."
    apt update
    apt upgrade -y
    log_info "✓ System updated"
}

# Step 2: Install Dependencies
step_install_deps() {
    log_info "Step 2/12: Installing dependencies..."
    apt install -y \
        curl \
        git \
        nginx \
        certbot \
        python3-certbot-nginx \
        ufw \
        fail2ban \
        htop \
        net-tools
    
    log_info "✓ Dependencies installed"
}

# Step 3: Install Node.js
step_install_nodejs() {
    log_info "Step 3/12: Installing Node.js ${NODE_VERSION}.x..."
    
    if command -v node &> /dev/null; then
        log_warn "Node.js already installed ($(node --version))"
    else
        curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
        apt install -y nodejs
    fi
    
    log_info "Node.js version: $(node --version)"
    log_info "npm version: $(npm --version)"
    log_info "✓ Node.js installed"
}

# Step 4: Install PM2
step_install_pm2() {
    log_info "Step 4/12: Installing PM2..."
    
    if command -v pm2 &> /dev/null; then
        log_warn "PM2 already installed ($(pm2 --version))"
    else
        npm install -g pm2
    fi
    
    log_info "✓ PM2 installed"
}

# Step 5: Install yt-dlp
step_install_ytdlp() {
    log_info "Step 5/12: Installing yt-dlp..."
    
    if command -v yt-dlp &> /dev/null; then
        log_warn "yt-dlp already installed ($(yt-dlp --version))"
    else
        pip install --break-system-packages yt-dlp
    fi
    
    log_info "✓ yt-dlp installed"
}

# Step 6: Create Deployer User
step_create_user() {
    log_info "Step 6/12: Creating deployer user..."
    
    if id "$DEPLOYER_USER" &>/dev/null; then
        log_warn "User $DEPLOYER_USER already exists"
    else
        adduser --disabled-password --gecos "" $DEPLOYER_USER
        usermod -aG sudo $DEPLOYER_USER
        
        # Copy SSH keys from root
        if [ -d /root/.ssh ]; then
            rsync --archive --chown=$DEPLOYER_USER:$DEPLOYER_USER /root/.ssh /home/$DEPLOYER_USER/
        fi
        
        log_info "✓ User $DEPLOYER_USER created"
    fi
}

# Step 7: Setup Application Directory
step_setup_app_dir() {
    log_info "Step 7/12: Setting up application directory..."
    
    if [ ! -d "$APP_DIR" ]; then
        mkdir -p "$APP_DIR"
        chown -R $DEPLOYER_USER:$DEPLOYER_USER "$APP_DIR"
        log_info "✓ Application directory created: $APP_DIR"
    else
        log_warn "Directory $APP_DIR already exists"
    fi
}

# Step 8: Setup Homepage Directory
step_setup_homepage() {
    log_info "Step 8/12: Setting up homepage directory..."
    
    if [ ! -d "$HOMEPAGE_DIR" ]; then
        mkdir -p "$HOMEPAGE_DIR"
        chown -R $DEPLOYER_USER:$DEPLOYER_USER "$HOMEPAGE_DIR"
        
        # Create simple index.html
        cat > "$HOMEPAGE_DIR/index.html" << 'EOF'
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SixOneSixO</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Courier New', monospace;
            background: #0a0a0a;
            color: #00ff00;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            text-align: center;
        }
        h1 {
            font-size: 3rem;
            margin-bottom: 2rem;
            text-shadow: 0 0 10px #00ff00;
        }
        .links {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }
        a {
            display: block;
            padding: 1rem;
            background: #1a1a1a;
            color: #00ff00;
            text-decoration: none;
            border: 2px solid #00ff00;
            transition: all 0.3s;
        }
        a:hover {
            background: #00ff00;
            color: #0a0a0a;
            box-shadow: 0 0 20px #00ff00;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>616</h1>
        <div class="links">
            <a href="https://playlist.sixonesixo.com">🎵 Music Playlists</a>
            <a href="https://github.com">💻 GitHub</a>
            <a href="mailto:hello@sixonesixo.com">📧 Contact</a>
        </div>
    </div>
</body>
</html>
EOF
        
        log_info "✓ Homepage created at $HOMEPAGE_DIR"
    else
        log_warn "Homepage directory already exists"
    fi
}

# Step 9: Configure Nginx
step_configure_nginx() {
    log_info "Step 9/12: Configuring Nginx..."
    
    # Config for playlist.sixonesixo.com
    cat > /etc/nginx/sites-available/playlist.sixonesixo.com << 'EOF'
server {
    listen 80;
    server_name playlist.sixonesixo.com;

    access_log /var/log/nginx/playlist.access.log;
    error_log /var/log/nginx/playlist.error.log;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|ttf|svg)$ {
        proxy_pass http://localhost:3000;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location /data/ {
        proxy_pass http://localhost:3000;
        expires 1h;
        add_header Cache-Control "public";
    }
}
EOF
    
    # Config for sixonesixo.com
    cat > /etc/nginx/sites-available/sixonesixo.com << EOF
server {
    listen 80;
    server_name sixonesixo.com www.sixonesixo.com;

    root $HOMEPAGE_DIR;
    index index.html;

    access_log /var/log/nginx/homepage.access.log;
    error_log /var/log/nginx/homepage.error.log;

    location / {
        try_files \$uri \$uri/ =404;
    }

    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF
    
    # Enable sites
    ln -sf /etc/nginx/sites-available/playlist.sixonesixo.com /etc/nginx/sites-enabled/
    ln -sf /etc/nginx/sites-available/sixonesixo.com /etc/nginx/sites-enabled/
    
    # Remove default
    rm -f /etc/nginx/sites-enabled/default
    
    # Test and reload
    nginx -t
    systemctl reload nginx
    
    log_info "✓ Nginx configured"
}

# Step 10: Configure Firewall
step_configure_firewall() {
    log_info "Step 10/12: Configuring firewall..."
    
    ufw --force enable
    ufw allow OpenSSH
    ufw allow 'Nginx Full'
    
    log_info "✓ Firewall configured"
}

# Step 11: Configure Fail2ban
step_configure_fail2ban() {
    log_info "Step 11/12: Configuring fail2ban..."
    
    systemctl enable fail2ban
    systemctl start fail2ban
    
    log_info "✓ Fail2ban configured"
}

# Step 12: Harden SSH
step_harden_ssh() {
    log_info "Step 12/12: Hardening SSH..."
    
    # Backup original config
    cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
    
    # Disable root login and password auth
    sed -i 's/#\?PermitRootLogin.*/PermitRootLogin no/' /etc/ssh/sshd_config
    sed -i 's/#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config
    
    log_warn "SSH hardened: root login and password auth disabled"
    log_warn "Make sure you have SSH key access before restarting sshd!"
    
    # Don't restart yet - let user verify
    log_info "To apply: sudo systemctl restart sshd"
    log_info "✓ SSH configuration updated"
}

# Main deployment flow
main() {
    echo "═══════════════════════════════════════════════════════════════"
    echo "  MUSIC PORTAL - Automated Deployment Script"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    
    check_root
    
    log_warn "This will configure your server for music-portal deployment"
    read -p "Continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_error "Deployment cancelled"
        exit 1
    fi
    
    step_system_update
    step_install_deps
    step_install_nodejs
    step_install_pm2
    step_install_ytdlp
    step_create_user
    step_setup_app_dir
    step_setup_homepage
    step_configure_nginx
    step_configure_firewall
    step_configure_fail2ban
    step_harden_ssh
    
    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "  ✓ DEPLOYMENT SCRIPT COMPLETED"
    echo "═══════════════════════════════════════════════════════════════"
    echo ""
    log_info "Next steps:"
    echo "  1. Switch to deployer user: su - deployer"
    echo "  2. Clone repository: git clone <your-repo-url> $APP_DIR"
    echo "  3. Install npm deps: cd $APP_DIR && npm install"
    echo "  4. Create .env and cookies.txt files"
    echo "  5. Run: npm run fetch (first time)"
    echo "  6. Start with PM2: pm2 start server.js --name music-portal"
    echo "  7. Save PM2: pm2 save && pm2 startup"
    echo "  8. Configure DNS A records for both domains"
    echo "  9. Setup SSL: sudo certbot --nginx -d sixonesixo.com -d www.sixonesixo.com"
    echo "  10. Setup SSL: sudo certbot --nginx -d playlist.sixonesixo.com"
    echo "  11. Setup cron: crontab -e (as deployer)"
    echo ""
    log_warn "IMPORTANT: Restart sshd ONLY after verifying SSH key access!"
    echo ""
}

main "$@"
