# Deployment Guide - Music Portal su DigitalOcean

Guida completa per il deployment del progetto music-portal su DigitalOcean con PM2, Nginx, SSL e dominio personalizzato.

---

## 📋 Architettura

```
Internet
   ↓
[DNS] playlist.sixonesixo.com + sixonesixo.com
   ↓ (HTTPS)
[DigitalOcean Droplet - Ubuntu 22.04]
   ├─ Nginx (Reverse Proxy + SSL)
   │   ├─ sixonesixo.com → /var/www/homepage
   │   └─ playlist.sixonesixo.com → localhost:3000
   ├─ PM2 Process Manager
   │   └─ music-portal (Node.js Express)
   └─ Cron Job (update playlists settimanale)
```

---

## 🚀 Quick Start

```bash
# 1. SSH nel droplet
ssh root@YOUR_DROPLET_IP

# 2. Download e esegui deploy script
curl -O https://raw.githubusercontent.com/YOUR_REPO/music-portal/main/scripts/deploy.sh
chmod +x deploy.sh
./deploy.sh
```

---

## 📝 Setup Manuale Dettagliato

### **1. Crea Droplet DigitalOcean**

**Specifiche:**
- **OS**: Ubuntu 22.04 LTS x64
- **Plan**: Basic Regular - $6/mese
  - 1 GB RAM / 1 CPU
  - 25 GB SSD
  - 1 TB transfer
- **Datacenter**: Amsterdam/Frankfurt (EU)
- **SSH Keys**: Aggiungi la tua chiave pubblica
- **Hostname**: music-portal

**Costo**: $6/mese = $72/anno

---

### **2. Setup Iniziale Server**

```bash
# SSH come root
ssh root@YOUR_DROPLET_IP

# Update sistema
apt update && apt upgrade -y

# Installa dipendenze
apt install -y \
  curl \
  git \
  nginx \
  certbot \
  python3-certbot-nginx \
  ufw \
  fail2ban

# Installa Node.js 18.x LTS
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verifica
node --version  # v18.x.x
npm --version   # 9.x.x

# Installa PM2 globalmente
npm install -g pm2

# Installa yt-dlp per YouTube fallback
pip install --break-system-packages yt-dlp

# Verifica
yt-dlp --version
```

---

### **3. Crea Utente Deployer**

```bash
# Crea utente non-root
adduser deployer
# Password: [scegli password sicura]
# Full Name: Deployer
# Resto: lascia vuoto (Enter)

# Aggiungi a sudo group
usermod -aG sudo deployer

# Copia SSH keys da root
rsync --archive --chown=deployer:deployer ~/.ssh /home/deployer

# Test SSH (da locale)
# ssh deployer@YOUR_DROPLET_IP
```

---

### **4. Deploy Music Portal**

```bash
# Switch a deployer
su - deployer
cd ~

# Clone repository
git clone https://github.com/YOUR_USERNAME/music-portal.git
cd music-portal

# Install dependencies
npm install

# Crea .env
nano .env
```

Contenuto `.env`:
```env
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
YOUTUBE_API_KEY=your_youtube_key_here
APPLE_MUSIC_JWT=your_jwt_token_here
APPLE_MUSIC_COOKIES_PATH=./cookies.txt
PORT=3000
NODE_ENV=production
```

```bash
# Crea cookies.txt
nano cookies.txt
# Incolla contenuto cookies Apple Music

# Proteggi secrets
chmod 600 .env cookies.txt

# Test fetch (prima volta - può durare 10-15 min)
npm run fetch

# Verifica output
ls -lh data/playlists.json
```

---

### **5. Avvia Applicazione con PM2**

```bash
# Start app
pm2 start server.js --name music-portal

# Save PM2 process list
pm2 save

# Setup PM2 autostart
pm2 startup systemd
# IMPORTANTE: Copia ed esegui il comando che PM2 ti restituisce!
# Esempio output:
# sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u deployer --hp /home/deployer

# Verifica status
pm2 status
pm2 logs music-portal --lines 50

# Test server locale
curl http://localhost:3000
```

---

### **6. Setup Homepage Principale**

```bash
# Come root o con sudo
sudo mkdir -p /var/www/homepage
sudo chown deployer:deployer /var/www/homepage

# Come deployer
cd /var/www/homepage

# Crea index.html semplice
cat > index.html << 'EOF'
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
            <a href="https://github.com/YOUR_USERNAME">💻 GitHub</a>
            <a href="mailto:hello@sixonesixo.com">📧 Contact</a>
        </div>
    </div>
</body>
</html>
EOF
```

---

### **7. Configurazione Nginx**

#### **7.1 Config per Music Portal (playlist.sixonesixo.com)**

```bash
# Come root
sudo nano /etc/nginx/sites-available/playlist.sixonesixo.com
```

Contenuto:
```nginx
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

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|woff|woff2|ttf|svg)$ {
        proxy_pass http://localhost:3000;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Data JSON
    location /data/ {
        proxy_pass http://localhost:3000;
        expires 1h;
        add_header Cache-Control "public";
    }
}
```

#### **7.2 Config per Homepage (sixonesixo.com)**

```bash
sudo nano /etc/nginx/sites-available/sixonesixo.com
```

Contenuto:
```nginx
server {
    listen 80;
    server_name sixonesixo.com www.sixonesixo.com;

    root /var/www/homepage;
    index index.html;

    access_log /var/log/nginx/homepage.access.log;
    error_log /var/log/nginx/homepage.error.log;

    location / {
        try_files $uri $uri/ =404;
    }

    # Cache static assets
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

#### **7.3 Abilita Siti**

```bash
# Abilita configurazioni
sudo ln -s /etc/nginx/sites-available/playlist.sixonesixo.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/sixonesixo.com /etc/nginx/sites-enabled/

# Rimuovi default (opzionale)
sudo rm /etc/nginx/sites-enabled/default

# Test configurazione
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

### **8. Configurazione DNS**

Sul tuo provider DNS:

```
# Record per homepage
Type: A
Name: @
Value: YOUR_DROPLET_IP
TTL: 3600

# Record per www (opzionale)
Type: A
Name: www
Value: YOUR_DROPLET_IP
TTL: 3600

# Record per music portal
Type: A
Name: playlist
Value: YOUR_DROPLET_IP
TTL: 3600
```

Verifica propagazione:
```bash
dig sixonesixo.com
dig playlist.sixonesixo.com
```

---

### **9. Setup SSL con Let's Encrypt**

```bash
# Ottieni certificati per entrambi i domini
sudo certbot --nginx -d sixonesixo.com -d www.sixonesixo.com
sudo certbot --nginx -d playlist.sixonesixo.com

# Segui le istruzioni interattive per entrambi
# - Email per notifiche
# - Accetta ToS
# - Redirect HTTP → HTTPS (opzione 2)

# Verifica SSL
curl https://sixonesixo.com
curl https://playlist.sixonesixo.com

# Verifica auto-renewal
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

---

### **10. Setup Firewall (UFW)**

```bash
# Abilita firewall
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Verifica
sudo ufw status verbose
```

Output atteso:
```
Status: active

To                         Action      From
--                         ------      ----
OpenSSH                    ALLOW       Anywhere
Nginx Full                 ALLOW       Anywhere
```

---

### **11. Cron Job per Update Automatici**

```bash
# Come deployer
crontab -e

# Aggiungi (update ogni lunedì alle 2 AM):
0 2 * * 1 cd /home/deployer/music-portal && /usr/bin/npm run fetch >> /home/deployer/music-portal/logs/cron.log 2>&1

# Crea directory logs
mkdir -p /home/deployer/music-portal/logs

# Test manuale
cd /home/deployer/music-portal && npm run fetch
tail -f logs/cron.log
```

---

### **12. Hardening Sicurezza**

```bash
# Disabilita root login via SSH
sudo nano /etc/ssh/sshd_config
# Modifica:
# PermitRootLogin no
# PasswordAuthentication no

sudo systemctl restart sshd

# Abilita fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
sudo fail2ban-client status

# Setup automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## 🔄 Workflow Aggiornamenti

### **Update Codice**

```bash
# SSH nel server
ssh deployer@YOUR_DROPLET_IP

# Pull changes
cd ~/music-portal
git pull origin main

# Install new dependencies (se ci sono)
npm install

# Restart PM2
pm2 restart music-portal

# Verifica
pm2 status
pm2 logs music-portal --lines 20
```

### **Update Secrets (JWT/Cookies)**

```bash
# Quando JWT scade (~3 mesi)
cd ~/music-portal
nano .env
# Aggiorna APPLE_MUSIC_JWT

nano cookies.txt
# Aggiorna cookies

# Restart app
pm2 restart music-portal
```

### **Manual Playlist Update**

```bash
cd ~/music-portal
npm run fetch

# Verifica nuovo JSON
ls -lh data/playlists.json
cat data/changes.log
```

---

## 📊 Monitoring & Maintenance

### **PM2 Monitoring**

```bash
# Dashboard real-time
pm2 monit

# Status
pm2 status

# Logs
pm2 logs music-portal
pm2 logs music-portal --lines 100

# Restart app
pm2 restart music-portal

# Stop/Start
pm2 stop music-portal
pm2 start music-portal
```

### **Nginx Logs**

```bash
# Access logs
sudo tail -f /var/log/nginx/playlist.access.log
sudo tail -f /var/log/nginx/homepage.access.log

# Error logs
sudo tail -f /var/log/nginx/playlist.error.log
sudo tail -f /var/log/nginx/homepage.error.log
```

### **System Resources**

```bash
# Disk usage
df -h

# Memory usage
free -h

# CPU usage
htop

# PM2 resource usage
pm2 monit
```

### **Backup**

```bash
# Backup secrets
mkdir -p ~/backups
cp ~/music-portal/.env ~/backups/.env.$(date +%Y%m%d)
cp ~/music-portal/cookies.txt ~/backups/cookies.txt.$(date +%Y%m%d)
chmod 600 ~/backups/*

# Backup data (opzionale)
cp ~/music-portal/data/playlists.json ~/backups/playlists.json.$(date +%Y%m%d)
```

---

## 💰 Costi Mensili

| Servizio | Costo |
|----------|-------|
| **DigitalOcean Droplet** (1GB) | $6/mese |
| Dominio sixonesixo.com | $0 (già posseduto) |
| SSL Certificates (Let's Encrypt) | $0 |
| **TOTALE** | **$6/mese** |

**Annuale**: $72/anno

---

## 🆘 Troubleshooting

### **App non si avvia con PM2**

```bash
# Check logs
pm2 logs music-portal --err --lines 50

# Verifica .env
cat ~/music-portal/.env

# Test manuale
cd ~/music-portal
node server.js
```

### **Nginx 502 Bad Gateway**

```bash
# Verifica app running
pm2 status

# Verifica porta 3000
sudo netstat -tulpn | grep :3000

# Test localhost
curl http://localhost:3000

# Check Nginx error log
sudo tail -f /var/log/nginx/playlist.error.log
```

### **SSL non funziona**

```bash
# Verifica certificati
sudo certbot certificates

# Rinnova manualmente
sudo certbot renew --force-renewal

# Test Nginx config
sudo nginx -t
sudo systemctl restart nginx
```

### **Cron job non funziona**

```bash
# Verifica cron
crontab -l

# Check log
tail -f ~/music-portal/logs/cron.log

# Test manuale
cd ~/music-portal && npm run fetch
```

---

## 📚 Riferimenti

- [DigitalOcean Docs](https://docs.digitalocean.com/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Nginx Documentation](https://nginx.org/en/docs/)
- [Certbot Documentation](https://certbot.eff.org/docs/)
- [UFW Guide](https://help.ubuntu.com/community/UFW)

---

## ✅ Checklist Post-Deployment

- [ ] Droplet creato e configurato
- [ ] SSH funzionante con chiave
- [ ] Utente deployer creato
- [ ] Node.js, PM2, Nginx installati
- [ ] Repository clonato
- [ ] .env e cookies.txt configurati
- [ ] PM2 app running
- [ ] DNS configurato (entrambi i domini)
- [ ] Nginx configurato (entrambi i siti)
- [ ] SSL attivo (entrambi i domini)
- [ ] Firewall abilitato
- [ ] Cron job configurato
- [ ] Fail2ban attivo
- [ ] Backup secrets eseguito
- [ ] Test HTTPS funzionante
- [ ] PM2 autostart configurato
- [ ] Monitoring setup (PM2, logs)

---

**Deployment completato! 🎉**

Il tuo Music Portal è live su:
- **Homepage**: https://sixonesixo.com
- **Playlists**: https://playlist.sixonesixo.com
