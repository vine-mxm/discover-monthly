# Analytics Setup con Plausible

Guida completa per installare e configurare Plausible Analytics sul server remoto.

## Indice
1. [Perché Plausible](#perché-plausible)
2. [Prerequisiti](#prerequisiti)
3. [Installazione con Docker](#installazione-con-docker)
4. [Configurazione Nginx/Apache](#configurazione-nginx-apache)
5. [Primo Accesso](#primo-accesso)
6. [Integrazione Frontend](#integrazione-frontend)
7. [Eventi Personalizzati](#eventi-personalizzati)
8. [Manutenzione](#manutenzione)

---

## Perché Plausible

✅ **Vantaggi:**
- UI bellissima e intuitiva
- Installazione semplicissima con Docker
- Script leggerissimo (< 1KB)
- Privacy-first, GDPR compliant
- No cookie, no tracking invasivo
- Open source e self-hosted

✅ **Perfetto per il tuo portale musicale!**

---

## Prerequisiti

Sul tuo server remoto dovrai avere:
- **Docker + Docker Compose** OPPURE **Podman + Podman Compose**
- Nginx o Apache (per reverse proxy)
- Dominio configurato (`stats.sixonesixo.com`)

### Opzione A: Installa Docker

Se non hai Docker installato:

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Installa Docker Compose
sudo apt-get install docker-compose-plugin

# Verifica installazione
docker --version
docker compose version
```

### Opzione B: Installa Podman (Consigliato per sicurezza)

Se preferisci Podman (rootless, più sicuro):

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install -y podman podman-compose

# Verifica installazione
podman --version
podman-compose --version

# (Opzionale) Abilita socket compatibilità Docker
systemctl --user enable --now podman.socket
export DOCKER_HOST=unix:///run/user/$UID/podman/podman.sock

# Oppure system-wide (come root)
# sudo systemctl enable --now podman.socket
# export DOCKER_HOST=unix:///run/podman/podman.sock
```

**Nota per Podman:** Tutti i comandi `docker` e `docker-compose` funzionano con Podman. Basta sostituire:
- `docker` → `podman`
- `docker-compose` → `podman-compose` (o usa `docker-compose` con socket Podman)

---

## Installazione con Docker/Podman

### Step 1: Scarica Plausible Hosting

```bash
# Vai nella directory delle applicazioni
cd /var/www

# Clona la repository di hosting
git clone https://github.com/plausible/hosting
cd hosting
```

### Step 2: Configura le variabili d'ambiente

```bash
# Genera chiavi segrete
openssl rand -base64 64 | tr -d '\n' ; echo

# Copia il file di esempio
cp plausible-conf.env.example plausible-conf.env

# Edita il file
nano plausible-conf.env
```

Configura nel file `plausible-conf.env`:

```bash
# Server
BASE_URL=https://stats.sixonesixo.com
SECRET_KEY_BASE=<inserisci-la-chiave-generata-con-openssl>

# Database (non modificare se usi Docker)
DATABASE_URL=postgres://postgres:postgres@plausible_db:5432/plausible_db
CLICKHOUSE_DATABASE_URL=http://plausible_events_db:8123/plausible_events_db

# Admin (per primo accesso)
ADMIN_USER_EMAIL=tua-email@esempio.com
ADMIN_USER_NAME=Admin
ADMIN_USER_PWD=cambiami-dopo-primo-accesso

# Disabilita registrazioni pubbliche (importante!)
DISABLE_REGISTRATION=true

# SMTP (opzionale - per email alerts)
# MAILER_EMAIL=noreply@stats.sixonesixo.com
# SMTP_HOST_ADDR=smtp.tuo-provider.com
# SMTP_HOST_PORT=587
# SMTP_USER_NAME=tuo-username
# SMTP_USER_PWD=tua-password
# SMTP_HOST_SSL_ENABLED=true
```

### Step 3: Configura Docker Compose (opzionale)

Il file `docker-compose.yml` di default va bene, ma puoi personalizzare le porte se necessario.

Edita `docker-compose.yml` se vuoi cambiare la porta (default 8000):

```yaml
services:
  plausible:
    ports:
      - 8000:8000  # Cambia se la porta 8000 è occupata
```

### Step 3b: (Solo Podman) Verifica compatibilità

Se usi Podman, assicurati che il socket sia attivo:

```bash
# Verifica socket Podman
systemctl --user status podman.socket

# Se non attivo, avvialo
systemctl --user enable --now podman.socket

# Esporta DOCKER_HOST per usare docker-compose
export DOCKER_HOST=unix:///run/user/$UID/podman/podman.sock

# Verifica che docker-compose veda Podman
docker-compose version
```

### Step 4: Avvia Plausible

**Con Docker:**

```bash
# Nella directory /var/www/hosting
docker compose up -d

# Verifica che tutto funzioni
docker compose ps

# Vedi i logs
docker compose logs -f plausible
```

**Con Podman (Opzione 1 - podman-compose):**

```bash
# Nella directory /var/www/hosting
podman-compose up -d

# Verifica
podman-compose ps

# Logs
podman-compose logs -f plausible
```

**Con Podman (Opzione 2 - docker-compose via socket):**

```bash
# Assicurati che DOCKER_HOST sia impostato
export DOCKER_HOST=unix:///run/user/$UID/podman/podman.sock

# Usa docker-compose normalmente
docker-compose up -d
docker-compose ps
docker-compose logs -f plausible
```

Dovresti vedere qualcosa come:
```
plausible    | [info] Running PlausibleWeb.Endpoint with Bandit 1.2.0 at 0.0.0.0:8000 (http)
```

### Step 5: Verifica funzionamento

```bash
# Testa localmente
curl http://localhost:8000

# Dovresti vedere l'HTML della pagina di login
```

---

## Configurazione Nginx/Apache

### Nginx (Consigliato)

Crea `/etc/nginx/sites-available/stats.sixonesixo.com`:

```nginx
server {
    listen 80;
    server_name stats.sixonesixo.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
    }
}
```

Attiva il sito:

```bash
sudo ln -s /etc/nginx/sites-available/stats.sixonesixo.com /etc/nginx/sites-enabled/
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

Crea `/etc/apache2/sites-available/stats.sixonesixo.com.conf`:

```apache
<VirtualHost *:80>
    ServerName stats.sixonesixo.com

    ProxyPreserveHost On
    ProxyPass / http://localhost:8000/
    ProxyPassReverse / http://localhost:8000/

    <Proxy *>
        Order deny,allow
        Allow from all
    </Proxy>
</VirtualHost>
```

Attiva il sito:

```bash
sudo a2ensite stats.sixonesixo.com
sudo systemctl reload apache2
```

### SSL con Let's Encrypt (IMPORTANTE!)

```bash
# Installa certbot
sudo apt install certbot python3-certbot-nginx  # Per Nginx
# sudo apt install certbot python3-certbot-apache  # Per Apache

# Ottieni certificato SSL
sudo certbot --nginx -d stats.sixonesixo.com  # Per Nginx
# sudo certbot --apache -d stats.sixonesixo.com  # Per Apache

# Il certificato si rinnoverà automaticamente
```

---

## Primo Accesso

1. Apri il browser e vai su `https://stats.sixonesixo.com`
2. Login con le credenziali che hai messo in `plausible-conf.env`:
   - Email: `tua-email@esempio.com`
   - Password: `cambiami-dopo-primo-accesso`
3. **IMPORTANTE**: Cambia subito la password!

### Aggiungi il tuo sito

1. Clicca su **"+ Add website"**
2. **Domain**: `sixonesixo.com` (senza http/https)
3. **Timezone**: Scegli il tuo timezone
4. Clicca **"Add snippet"**
5. Copia lo snippet che ti viene mostrato

---

## Integrazione Frontend

### Script di tracking

Lo snippet sarà tipo:

```html
<script defer data-domain="sixonesixo.com" src="https://stats.sixonesixo.com/js/script.js"></script>
```

**GIÀ FATTO!** Ho già aggiunto gli script nel tuo codice, devi solo:

1. Sostituire in `public/index.html` e `public/playlist.html`:
   - L'URL dello script è già corretto: `https://stats.sixonesixo.com/js/script.js`
   - Cambia `data-website-id="YOUR-WEBSITE-ID-HERE"` con `data-domain="sixonesixo.com"`

Il codice nei file HTML dovrebbe diventare:

```html
<!-- Plausible Analytics -->
<script defer 
  data-domain="sixonesixo.com" 
  src="https://stats.sixonesixo.com/js/script.js">
</script>
```

### Verifica funzionamento

1. Apri il tuo sito `https://sixonesixo.com`
2. Apri DevTools > Network
3. Cerca una chiamata a `stats.sixonesixo.com/js/script.js`
4. Se vedi la chiamata e non ci sono errori, funziona!
5. Vai su `https://stats.sixonesixo.com` e dovresti vedere la visita in tempo reale

---

## Eventi Personalizzati

Plausible usa un'API diversa da Umami. Ho già implementato il tracking nel codice, ma devi aggiornare da `window.umami` a `window.plausible`.

### API Plausible per eventi personalizzati

```javascript
// Sintassi Plausible
window.plausible('event-name', {props: {key: 'value'}})
```

**GIÀ FATTO!** Ho già implementato gli eventi in `public/js/app.js`, ma con sintassi Umami. Li devo aggiornare per Plausible.

Gli eventi tracciati sono:

### 1. Visualizzazioni Playlist

```javascript
// Track playlist view
if (window.plausible) {
  window.plausible('Playlist View', {
    props: {
      playlist: playlist.name,
      tracks: playlist.tracks.length,
      year: playlist.year
    }
  });
}
```

### 2. Click sui Link Streaming

```javascript
// Track streaming link click
if (window.plausible) {
  window.plausible('Streaming Link Click', {
    props: {
      platform: platform,  // spotify, applemusic, youtube, bandcamp
      artist: trackArtist,
      track: trackTitle
    }
  });
}
```

### Visualizzare eventi personalizzati

1. Vai su `https://stats.sixonesixo.com`
2. Clicca sul tuo sito
3. In alto clicca su **"More" > "Goals"**
4. Aggiungi i goal:
   - **Custom Event**: `Playlist View`
   - **Custom Event**: `Streaming Link Click`

Ora potrai vedere questi eventi nelle statistiche!

---

## Dashboard Plausible

### Metriche disponibili

Plausible traccia automaticamente:

**Realtime (ultimi 30 min)**
- Visitatori ora online
- Pagine viste in tempo reale

**Overview**
- Unique visitors
- Total pageviews
- Bounce rate
- Visit duration

**Top Pages**
- Pagine più visitate

**Top Sources**
- Da dove arrivano i visitatori
- Direct / Search / Social / Referral

**Locations**
- Paesi
- Regioni

**Devices**
- Desktop vs Mobile vs Tablet
- Browser
- OS

**Goals (Eventi personalizzati)**
- Playlist View
- Streaming Link Click

### Report utili per il tuo portale

- **Playlist più popolari**: Vai su Goals > Playlist View
- **Piattaforme preferite**: Vai su Goals > Streaming Link Click > Breakdown by platform
- **Quando visitano**: Guarda il grafico orario
- **Mobile vs Desktop**: Devices section

---

## Manutenzione

### Comandi Docker/Podman utili

**Con Docker:**

```bash
# Vai nella directory di Plausible
cd /var/www/hosting

# Ferma tutto
docker compose down

# Avvia
docker compose up -d

# Riavvia
docker compose restart

# Vedi logs
docker compose logs -f plausible

# Vedi stato
docker compose ps

# Aggiorna Plausible
docker compose down
docker compose pull
docker compose up -d
```

**Con Podman:**

```bash
cd /var/www/hosting

# Ferma tutto
podman-compose down
# oppure: docker-compose down (con socket Podman)

# Avvia
podman-compose up -d

# Riavvia
podman-compose restart

# Vedi logs
podman-compose logs -f plausible

# Vedi stato
podman-compose ps

# Lista containers
podman ps

# Entra in un container
podman exec -it hosting_plausible_1 sh

# Aggiorna Plausible
podman-compose down
podman-compose pull
podman-compose up -d
```

### Backup Database

```bash
# Backup PostgreSQL (analytics data)
docker compose exec plausible_db pg_dump -U postgres plausible_db > backup_plausible_$(date +%Y%m%d).sql

# Backup ClickHouse (events data)
docker compose exec plausible_events_db clickhouse-client --query "BACKUP DATABASE plausible_events_db TO Disk('backups', 'backup_$(date +%Y%m%d).zip')"
```

### Restore Database

```bash
# Restore PostgreSQL
cat backup_plausible_20251230.sql | docker compose exec -T plausible_db psql -U postgres plausible_db
```

### Update Plausible

```bash
cd /var/www/hosting

# Pull ultima versione
docker compose down
docker compose pull
docker compose up -d

# Verifica versione
docker compose exec plausible sh -c 'cat /app/VERSION'
```

### Logs e Troubleshooting

```bash
# Logs applicazione
docker compose logs -f plausible

# Logs database
docker compose logs -f plausible_db

# Logs ClickHouse
docker compose logs -f plausible_events_db

# Spazio occupato
docker compose exec plausible_db psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('plausible_db'));"
```

---

## Privacy e GDPR

Plausible è GDPR compliant di default:

✅ **Non usa cookie** - Nessun cookie banner necessario!
✅ **No dati personali** - Non traccia IP completi
✅ **No cross-site tracking**
✅ **Dati aggregati** - Solo statistiche anonime
✅ **Open source** - Codice trasparente

### Privacy Policy

Puoi semplicemente menzionare:

> "Questo sito usa Plausible Analytics, una soluzione privacy-friendly che non raccoglie dati personali e non usa cookie. Per maggiori informazioni: https://plausible.io/privacy-focused-web-analytics"

---

## Troubleshooting

### Plausible non si avvia

```bash
# Controlla logs
docker compose logs plausible

# Verifica configurazione
cat plausible-conf.env | grep -v "^#" | grep -v "^$"

# Ricrea database
docker compose down -v  # ATTENZIONE: Cancella i dati!
docker compose up -d
```

### Script non carica nel frontend

1. Verifica che Nginx/Apache proxy funzioni:
   ```bash
   curl -I https://stats.sixonesixo.com/js/script.js
   ```
2. Controlla CORS (dovrebbe essere OK di default)
3. Verifica in DevTools > Network

### Dati non vengono tracciati

1. Apri DevTools > Network
2. Cerca chiamate a `/api/event`
3. Se mancano:
   - Verifica `data-domain` corretto
   - Controlla che script sia caricato
   - Verifica AdBlocker non blocchi

### AdBlocker blocca tracking

Usa **Proxy script** (consigliato):

```html
<!-- Usa script proxy invece di script.js -->
<script defer 
  data-domain="sixonesixo.com" 
  src="https://stats.sixonesixo.com/js/script.local.js">
</script>
```

Configura Nginx:

```nginx
location = /js/script.local.js {
    proxy_pass https://stats.sixonesixo.com/js/script.js;
}

location = /api/event {
    proxy_pass https://stats.sixonesixo.com/api/event;
}
```

### Troubleshooting Podman

#### podman-compose non funziona

```bash
# Usa docker-compose con socket Podman invece
export DOCKER_HOST=unix:///run/user/$UID/podman/podman.sock
docker-compose up -d
```

#### Permessi volumi

```bash
# Se hai problemi con permessi, usa Podman come root
sudo podman-compose up -d

# Oppure sistema permessi SELinux
sudo setsebool -P container_manage_cgroup on
```

#### Network non raggiungibile tra containers

```bash
# Ricrea network
podman network rm hosting_default
podman-compose up -d

# Verifica networks
podman network ls
podman network inspect hosting_default
```

#### Container non si avvia

```bash
# Vedi logs dettagliati
podman logs hosting_plausible_1

# Rimuovi tutti i container e ricomincia
podman-compose down -v
podman-compose up -d
```

#### Volumi Podman

I volumi Podman sono salvati in:
- **Rootless**: `~/.local/share/containers/storage/volumes/`
- **Root**: `/var/lib/containers/storage/volumes/`

```bash
# Lista volumi
podman volume ls

# Inspect volume
podman volume inspect hosting_plausible-db-data
```

---

## Costi e Risorse

### Requisiti server Plausible

Per traffico medio (< 100k page views/mese):
- **RAM**: 2GB minimo (consigliato 4GB)
- **CPU**: 2 core
- **Disco**: 10GB iniziale (crescerà con i dati)
- **Banda**: Minima (script è ~1KB)

### Hosting consigliati

- **Hetzner Cloud**: 7-10€/mese (CX21/CX31)
- **DigitalOcean**: 12-18$/mese (2GB-4GB Droplet)
- **Linode**: 12-24$/mese (4GB)
- **OVH**: 8-12€/mese (VPS)

**Nota**: Plausible ha bisogno di più risorse di Umami per via di ClickHouse (database per eventi).

---

## Alternative e Confronto

### Plausible vs Umami vs GoatCounter

| Feature | Plausible | Umami | GoatCounter |
|---------|-----------|-------|-------------|
| **UI** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |
| **Leggerezza** | ~1KB | ~2KB | <1KB |
| **Setup** | Docker (facile) | npm (medio) | Binary (facile) |
| **RAM** | 2-4GB | 512MB-1GB | 256MB |
| **Eventi custom** | ✅ | ✅ | ⚠️ Limitati |
| **Realtime** | ✅ | ✅ | ❌ |
| **Multi-sites** | ✅ | ✅ | ✅ |

---

## Supporto

- **Documentazione ufficiale**: https://plausible.io/docs
- **Self-hosting guide**: https://plausible.io/docs/self-hosting
- **GitHub**: https://github.com/plausible/analytics
- **Forum**: https://github.com/plausible/analytics/discussions

---

## Checklist Completa

- [ ] Docker/Podman installato sul server
- [ ] Repository clonata in `/var/www/hosting`
- [ ] File `plausible-conf.env` configurato
- [ ] Secret key generata
- [ ] Email admin configurata
- [ ] `DISABLE_REGISTRATION=true` impostato
- [ ] (Podman) Socket attivo e DOCKER_HOST esportato
- [ ] Containers avviati (`docker compose up -d` o `podman-compose up -d`)
- [ ] Nginx/Apache configurato per `stats.sixonesixo.com`
- [ ] SSL attivo con Let's Encrypt
- [ ] Primo accesso fatto e password cambiata
- [ ] Sito aggiunto in Plausible (domain: `sixonesixo.com`)
- [ ] Script tracking aggiornato in `index.html`
- [ ] Script tracking aggiornato in `playlist.html`
- [ ] Eventi personalizzati aggiornati in `app.js`
- [ ] Goals configurati in Plausible dashboard
- [ ] Test funzionamento in DevTools
- [ ] Backup configurato

---

## Prossimi Passi

Dopo l'installazione:

1. ✅ Monitora per qualche giorno
2. 📊 Identifica playlist più popolari  
3. 🎵 Scopri piattaforme streaming preferite
4. 📈 Analizza picchi di traffico
5. 🌍 Vedi da dove arrivano i visitatori
6. 🔄 Ottimizza contenuti in base ai dati

Buon tracking con Plausible! 🚀
