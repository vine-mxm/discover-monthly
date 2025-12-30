# Analytics Setup con Umami

Guida completa per installare e configurare Umami analytics sul server remoto.

## Indice
1. [Prerequisiti](#prerequisiti)
2. [Installazione Umami](#installazione-umami)
3. [Configurazione Database](#configurazione-database)
4. [Configurazione Nginx/Apache](#configurazione-nginx-apache)
5. [Integrazione Frontend](#integrazione-frontend)
6. [Eventi Personalizzati](#eventi-personalizzati)
7. [Manutenzione](#manutenzione)

---

## Prerequisiti

Sul tuo server remoto dovrai avere:
- Node.js 18+ (o 20+ raccomandato)
- PostgreSQL 12+ o MySQL 8+
- Nginx o Apache (per reverse proxy)
- PM2 o systemd (per gestire il processo)

### Verifica prerequisiti

```bash
# Verifica Node.js
node --version  # Deve essere >= 18

# Verifica PostgreSQL
psql --version  # Oppure mysql --version

# Verifica web server
nginx -v  # Oppure apache2 -v
```

---

## Installazione Umami

### Opzione 1: Installazione Standard (Consigliata)

```bash
# 1. Vai nella directory delle applicazioni
cd /var/www  # O dove preferisci

# 2. Clona Umami
git clone https://github.com/umami-software/umami.git
cd umami

# 3. Installa dipendenze
npm install

# 4. Crea il file .env
cp .env.example .env
```

### Opzione 2: Installazione con Docker

```bash
# Se preferisci Docker, crea un docker-compose.yml:
version: '3'
services:
  umami:
    image: ghcr.io/umami-software/umami:postgresql-latest
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://umami:umami@db:5432/umami
      DATABASE_TYPE: postgresql
      APP_SECRET: sostituisci-con-stringa-random
    depends_on:
      - db
    restart: always
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: umami
      POSTGRES_USER: umami
      POSTGRES_PASSWORD: umami
    volumes:
      - umami-db-data:/var/lib/postgresql/data
    restart: always

volumes:
  umami-db-data:
```

---

## Configurazione Database

### PostgreSQL (Consigliato)

```bash
# 1. Accedi a PostgreSQL
sudo -u postgres psql

# 2. Crea database e utente
CREATE DATABASE umami;
CREATE USER umami_user WITH ENCRYPTED PASSWORD 'tua_password_sicura';
GRANT ALL PRIVILEGES ON DATABASE umami TO umami_user;
\q
```

### MySQL

```bash
# 1. Accedi a MySQL
sudo mysql

# 2. Crea database e utente
CREATE DATABASE umami;
CREATE USER 'umami_user'@'localhost' IDENTIFIED BY 'tua_password_sicura';
GRANT ALL PRIVILEGES ON umami.* TO 'umami_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Configura .env

Edita il file `.env` in `/var/www/umami/.env`:

```bash
# PostgreSQL
DATABASE_URL=postgresql://umami_user:tua_password_sicura@localhost:5432/umami

# MySQL (alternativo)
# DATABASE_URL=mysql://umami_user:tua_password_sicura@localhost:3306/umami

# Genera una stringa random per APP_SECRET
# Puoi usare: openssl rand -base64 32
APP_SECRET=genera_una_stringa_random_sicura_qui

# Porta (default 3000)
PORT=3000

# Hostname (opzionale)
HOSTNAME=0.0.0.0
```

### Inizializza Database

```bash
cd /var/www/umami

# Build dell'applicazione
npm run build

# Inizializza il database (crea le tabelle)
npx prisma migrate deploy
```

---

## Avvio Umami

### Opzione 1: Con PM2 (Consigliato per produzione)

```bash
# Installa PM2 globalmente
npm install -g pm2

# Avvia Umami
cd /var/www/umami
pm2 start npm --name "umami" -- start

# Salva la configurazione PM2
pm2 save
pm2 startup  # Segui le istruzioni per avvio automatico

# Comandi utili PM2
pm2 status          # Controlla stato
pm2 logs umami      # Vedi logs
pm2 restart umami   # Riavvia
pm2 stop umami      # Ferma
```

### Opzione 2: Con systemd

Crea `/etc/systemd/system/umami.service`:

```ini
[Unit]
Description=Umami Analytics
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/var/www/umami
Environment="NODE_ENV=production"
ExecStart=/usr/bin/npm start
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Poi:

```bash
sudo systemctl daemon-reload
sudo systemctl enable umami
sudo systemctl start umami
sudo systemctl status umami
```

---

## Configurazione Nginx/Apache

### Nginx

Crea `/etc/nginx/sites-available/umami`:

```nginx
server {
    listen 80;
    server_name stats.sixonesixo.com;  # Sostituisci con il tuo dominio

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Attiva il sito:

```bash
sudo ln -s /etc/nginx/sites-available/umami /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Apache

Abilita moduli necessari:

```bash
sudo a2enmod proxy
sudo a2enmod proxy_http
sudo a2enmod headers
```

Crea `/etc/apache2/sites-available/umami.conf`:

```apache
<VirtualHost *:80>
    ServerName stats.sixonesixo.com

    ProxyPreserveHost On
    ProxyPass / http://localhost:3000/
    ProxyPassReverse / http://localhost:3000/

    <Proxy *>
        Order deny,allow
        Allow from all
    </Proxy>
</VirtualHost>
```

Attiva il sito:

```bash
sudo a2ensite umami
sudo systemctl reload apache2
```

### SSL con Let's Encrypt (Fortemente raccomandato)

```bash
# Installa certbot
sudo apt install certbot python3-certbot-nginx  # Per Nginx
# sudo apt install certbot python3-certbot-apache  # Per Apache

# Ottieni certificato SSL
sudo certbot --nginx -d stats.sixonesixo.com  # Per Nginx
# sudo certbot --apache -d stats.sixonesixo.com  # Per Apache
```

---

## Primo Accesso

1. Apri il browser e vai su `http://stats.sixonesixo.com`
2. Login di default:
   - **Username**: `admin`
   - **Password**: `umami`
3. **IMPORTANTE**: Cambia subito la password!

### Crea un nuovo sito

1. Vai su **Settings** > **Websites**
2. Clicca **Add website**
3. Inserisci:
   - **Name**: `Music Portal`
   - **Domain**: `sixonesixo.com` (il dominio del tuo portale)
   - **Enable share URL**: No (privacy)
4. Salva e copia il **Tracking code** generato

---

## Integrazione Frontend

### 1. Aggiungi lo script di tracking

Modifica `public/index.html` aggiungendo nel `<head>`:

```html
<head>
  <!-- ... altri meta tags ... -->
  
  <!-- Umami Analytics -->
  <script async 
    src="https://stats.sixonesixo.com/script.js" 
    data-website-id="IL-TUO-WEBSITE-ID">
  </script>
</head>
```

### 2. Aggiungi anche in `public/playlist.html`

```html
<head>
  <!-- ... altri meta tags ... -->
  
  <!-- Umami Analytics -->
  <script async 
    src="https://stats.sixonesixo.com/script.js" 
    data-website-id="IL-TUO-WEBSITE-ID">
  </script>
</head>
```

---

## Eventi Personalizzati

Per tracciare click sui link di streaming, aggiungi in `public/js/app.js`:

### Tracking click sui link

Modifica la funzione `handleStreamingLinkClick`:

```javascript
function handleStreamingLinkClick(e, platform) {
  // Track click event
  if (window.umami) {
    const trackInfo = e.currentTarget.closest('.track');
    const trackTitle = trackInfo?.querySelector('.track-title')?.textContent || 'Unknown';
    const trackArtist = trackInfo?.querySelector('.track-artist')?.textContent || 'Unknown';
    
    window.umami.track('streaming-link-click', {
      platform: platform,
      track: `${trackArtist} - ${trackTitle}`
    });
  }
  
  // ... resto della funzione ...
}
```

### Tracking selezione playlist

Modifica dove gestisci il click sulla playlist (circa linea 385):

```javascript
item.addEventListener('click', function() {
  menu.querySelectorAll('.playlist-item').forEach(i => i.classList.remove('active'));
  this.classList.add('active');
  const playlist = JSON.parse(this.dataset.playlist);
  
  // Track playlist view
  if (window.umami) {
    window.umami.track('playlist-view', {
      playlist: playlist.name,
      tracks: playlist.tracks.length
    });
  }
  
  displayPlaylistContent(playlist);
});
```

### Eventi disponibili da tracciare

```javascript
// Esempi di eventi utili

// 1. Apertura modale etica
if (window.umami) {
  window.umami.track('ethical-modal-shown');
}

// 2. Click su link specifico
window.umami.track('link-click', {
  platform: 'spotify',
  artist: 'Nome Artista',
  track: 'Nome Traccia'
});

// 3. Tempo di permanenza su playlist
window.umami.track('playlist-time', {
  playlist: 'Dicembre 2024',
  duration: 120  // secondi
});

// 4. Toggle mobile menu
window.umami.track('mobile-menu-toggle');
```

---

## Metriche Disponibili

Umami traccia automaticamente:

### Metriche base
- **Page views**: Visualizzazioni pagine
- **Unique visitors**: Visitatori unici
- **Bounce rate**: Tasso di rimbalzo
- **Average time**: Tempo medio sul sito

### Dimensioni
- **Pages**: Pagine visitate
- **Referrers**: Da dove arrivano
- **Browsers**: Browser usati
- **OS**: Sistema operativo
- **Devices**: Desktop/Mobile/Tablet
- **Countries**: Geolocalizzazione
- **Languages**: Lingua browser

### Eventi personalizzati
- Tutti gli eventi che tracki con `umami.track()`

---

## Dashboard e Reports

### Visualizza statistiche

1. Accedi a `https://stats.sixonesixo.com`
2. Seleziona il website "Music Portal"
3. Scegli periodo: Last 24h, 7 days, 30 days, custom

### Report interessanti per il tuo portale

- **Playlist più viste**: Filtra eventi `playlist-view`
- **Piattaforme preferite**: Filtra eventi `streaming-link-click` per platform
- **Picchi di traffico**: Guarda quando visitano di più
- **Provenienza utenti**: Vedi da quali siti arrivano
- **Mobile vs Desktop**: Capire come navigano

### Esporta dati

Puoi esportare in CSV per analisi più avanzate.

---

## Manutenzione

### Backup Database

PostgreSQL:
```bash
pg_dump -U umami_user umami > umami_backup_$(date +%Y%m%d).sql
```

MySQL:
```bash
mysqldump -u umami_user -p umami > umami_backup_$(date +%Y%m%d).sql
```

### Update Umami

```bash
cd /var/www/umami
git pull
npm install
npm run build
pm2 restart umami  # o sudo systemctl restart umami
```

### Logs

Con PM2:
```bash
pm2 logs umami
pm2 logs umami --lines 100
```

Con systemd:
```bash
sudo journalctl -u umami -f
```

### Performance

Per grandi volumi di traffico:
- Usa PostgreSQL (più performante di MySQL per analytics)
- Considera Redis per caching
- Abilita compressione Nginx/Apache

---

## Privacy e GDPR

Umami è GDPR compliant di default:

✅ **Cosa fa:**
- Non usa cookie
- Non traccia identificatori personali
- Salva solo dati aggregati
- Hashing degli IP

✅ **Cookie banner**: NON necessario!

✅ **Privacy policy**: Menziona solo che usi analytics anonimizzati

---

## Troubleshooting

### Umami non si avvia

```bash
# Controlla logs
pm2 logs umami

# Verifica database connection
cd /var/www/umami
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); prisma.$connect().then(() => console.log('DB OK')).catch(e => console.error('DB ERROR:', e));"
```

### Script non carica nel frontend

1. Verifica che Nginx/Apache proxy funzioni
2. Controlla CORS (dovrebbe essere OK di default)
3. Verifica che lo script URL sia corretto
4. Guarda console browser per errori

### Dati non vengono tracciati

1. Apri DevTools > Network
2. Cerca chiamate a `/api/send`
3. Se mancano, verifica:
   - Script caricato correttamente
   - Website ID corretto
   - Blocco da AdBlocker (usa `data-host-url` se necessario)

### AdBlocker blocca tracking

Modifica lo script per usare proxy:

```html
<script async 
  src="https://stats.sixonesixo.com/script.js" 
  data-website-id="IL-TUO-WEBSITE-ID"
  data-host-url="https://stats.sixonesixo.com"
  data-auto-track="true">
</script>
```

Oppure usa path personalizzato in Nginx:

```nginx
location /stats/ {
    proxy_pass http://localhost:3000/;
}
```

E poi:
```html
<script async src="/stats/script.js" data-website-id="..."></script>
```

---

## Alternative a Umami

Se Umami non ti convince:

1. **Plausible** - Più features, ma più pesante
2. **Matomo** - Più completo, simile a Google Analytics
3. **GoatCounter** - Ancora più semplice e leggero
4. **Ackee** - Node.js, design minimalista

---

## Costi e Risorse

### Requisiti server

Per traffico medio (< 100k page views/mese):
- **RAM**: 512MB - 1GB
- **CPU**: 1 core
- **Disco**: 5GB (crescerà con i dati)
- **Banda**: Minima (script è ~2KB)

### Hosting consigliati

Se vuoi server dedicato per Umami:
- **Hetzner Cloud**: 4€/mese (CX11)
- **DigitalOcean**: 6$/mese (Basic Droplet)
- **Linode**: 5$/mese (Nanode)
- **OVH**: 3-4€/mese (VPS Starter)

---

## Supporto

- **Documentazione ufficiale**: https://umami.is/docs
- **GitHub**: https://github.com/umami-software/umami
- **Discord Community**: https://discord.gg/4dz4zcXYrQ

---

## Checklist Completa

- [ ] Node.js 18+ installato
- [ ] PostgreSQL/MySQL configurato
- [ ] Umami clonato e dipendenze installate
- [ ] File .env configurato
- [ ] Database inizializzato (`npx prisma migrate deploy`)
- [ ] Umami avviato con PM2/systemd
- [ ] Nginx/Apache configurato come reverse proxy
- [ ] SSL attivo con Let's Encrypt
- [ ] Primo accesso fatto e password cambiata
- [ ] Website creato in Umami
- [ ] Script tracking aggiunto in index.html
- [ ] Script tracking aggiunto in playlist.html
- [ ] Eventi personalizzati implementati
- [ ] Test funzionamento in DevTools
- [ ] Backup automatico configurato

---

## Prossimi Passi

Dopo l'installazione:

1. ✅ Monitora per qualche giorno
2. 📊 Identifica playlist più popolari
3. 🎵 Ottimizza contenuti in base ai dati
4. 📈 Crea report mensili
5. 🔄 Itera e migliora

Buon tracking! 🚀
