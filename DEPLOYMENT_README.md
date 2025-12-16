# Deployment Files - Summary

Questa directory contiene tutti i file necessari per il deployment su DigitalOcean.

## 📁 File Creati

### 1. **docs/DEPLOYMENT.md**
Guida completa step-by-step per il deployment:
- Setup server DigitalOcean
- Configurazione Nginx per 2 domini
- Setup SSL con Let's Encrypt
- Configurazione PM2
- Sicurezza e hardening
- Troubleshooting

### 2. **server.js** (root)
Server Express.js per servire il frontend:
- Serve static files da `public/`
- Serve JSON da `data/`
- Health check endpoint `/health`
- Gestione graceful shutdown
- Pronto per PM2

### 3. **scripts/deploy.sh**
Script bash automatizzato per setup iniziale:
- Installa Node.js, PM2, Nginx, Certbot
- Crea utente deployer
- Configura Nginx per entrambi i domini
- Setup firewall (UFW)
- Setup fail2ban
- Hardening SSH

### 4. **package.json** (aggiornato)
Aggiunto script `start` e dipendenza Express:
```json
{
  "scripts": {
    "start": "node server.js",
    "fetch": "node scripts/fetch-playlists.js",
    "dev": "python3 -m http.server 8000 --directory public"
  },
  "dependencies": {
    "express": "^4.18.2"
  }
}
```

## 🚀 Quick Start Deployment

### Su DigitalOcean Droplet (come root):

```bash
# 1. Download deploy script
curl -O https://raw.githubusercontent.com/YOUR_REPO/music-portal/main/scripts/deploy.sh

# 2. Rendi eseguibile
chmod +x deploy.sh

# 3. Esegui
./deploy.sh
```

### Setup Applicazione (come deployer):

```bash
# 1. Clone repo
git clone https://github.com/YOUR_REPO/music-portal.git
cd music-portal

# 2. Install deps
npm install

# 3. Crea .env
nano .env
# Aggiungi API keys

# 4. Crea cookies.txt
nano cookies.txt
# Aggiungi cookies Apple Music

# 5. Fetch playlists (prima volta)
npm run fetch

# 6. Start con PM2
pm2 start server.js --name music-portal
pm2 save
pm2 startup

# 7. Setup SSL (come root)
sudo certbot --nginx -d sixonesixo.com -d www.sixonesixo.com
sudo certbot --nginx -d playlist.sixonesixo.com
```

## 🌐 Domini Configurati

1. **sixonesixo.com** (e www) → Homepage statica in `/var/www/homepage`
2. **playlist.sixonesixo.com** → Music Portal app (Node.js su porta 3000)

## 📊 Architettura

```
                    Internet
                       ↓
          [DNS] sixonesixo.com + playlist.*
                       ↓
              [DigitalOcean Droplet]
                       ↓
                  [Nginx:80/443]
                  /         \
                 /           \
    [Homepage Static]    [Reverse Proxy:3000]
    /var/www/homepage          ↓
                         [PM2: music-portal]
                               ↓
                         [Express Server]
                          /           \
                         /             \
                  [public/]       [data/playlists.json]
```

## 💰 Costi

- **DigitalOcean Droplet** (1GB RAM): $6/mese = $72/anno
- **SSL Certificates**: Gratis (Let's Encrypt)
- **Dominio**: $0 (già posseduto)

**TOTALE: $6/mese**

## 🔧 Comandi Utili

### PM2
```bash
pm2 status                    # Verifica status
pm2 logs music-portal        # Vedi logs
pm2 restart music-portal     # Restart app
pm2 monit                    # Dashboard real-time
```

### Nginx
```bash
sudo nginx -t                 # Test config
sudo systemctl reload nginx   # Reload config
sudo tail -f /var/log/nginx/playlist.access.log
```

### Update Codice
```bash
cd ~/music-portal
git pull
npm install
pm2 restart music-portal
```

### Update Playlists Manualmente
```bash
cd ~/music-portal
npm run fetch
```

### SSL Renewal (automatico via certbot timer)
```bash
sudo certbot renew --dry-run  # Test
sudo systemctl status certbot.timer
```

## 📚 Documentazione Completa

Vedi `docs/DEPLOYMENT.md` per la guida completa con:
- Setup dettagliato passo-passo
- Configurazioni Nginx complete
- Troubleshooting
- Sicurezza e hardening
- Monitoring e maintenance

## ✅ Checklist Deployment

- [ ] Crea Droplet DigitalOcean (Ubuntu 22.04, 1GB RAM)
- [ ] Esegui `deploy.sh` come root
- [ ] Switch a utente `deployer`
- [ ] Clone repository
- [ ] Crea `.env` e `cookies.txt`
- [ ] `npm install`
- [ ] `npm run fetch` (prima volta)
- [ ] Start PM2: `pm2 start server.js --name music-portal`
- [ ] `pm2 save && pm2 startup`
- [ ] Configura DNS (A records per entrambi i domini)
- [ ] Setup SSL: `sudo certbot --nginx` (per entrambi)
- [ ] Setup cron: `crontab -e` (update settimanale)
- [ ] Test HTTPS: https://sixonesixo.com e https://playlist.sixonesixo.com

## 🆘 Support

Per problemi o domande, consulta:
1. `docs/DEPLOYMENT.md` - Troubleshooting section
2. PM2 logs: `pm2 logs music-portal`
3. Nginx logs: `/var/log/nginx/*.log`

---

**Deployment completato! 🚀**
