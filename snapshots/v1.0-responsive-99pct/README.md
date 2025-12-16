# Music Portal

Portale web per visualizzare playlist musicali mensili con link a Apple Music, Spotify e YouTube.

## Caratteristiche

- 🎵 Playlist mensili dal 2020 (formato YYYY.MM)
- 🔗 Link automatici per Apple Music, Spotify e YouTube
- 🎨 Design minimal ASCII/cyberpunk
- 📊 Ricerca intelligente via ISRC con fallback

## Prerequisiti

- Node.js 18+
- Account Apple Music attivo
- Cookie Apple Music esportati (formato Netscape)

## Setup

### 1. Installa dipendenze

```bash
npm install
```

### 2. Configura le API Keys

#### Spotify API
1. Vai su https://developer.spotify.com/dashboard
2. Crea una nuova app
3. Copia Client ID e Client Secret

#### YouTube Data API
1. Vai su https://console.cloud.google.com/
2. Crea un nuovo progetto
3. Abilita YouTube Data API v3
4. Crea credenziali > API Key
5. Copia l'API Key

### 3. Configura le variabili ambiente

Crea file `.env` copiando `.env.example`:

```bash
cp .env.example .env
```

Modifica `.env` con le tue credenziali:

```
SPOTIFY_CLIENT_ID=tuo_client_id
SPOTIFY_CLIENT_SECRET=tuo_client_secret
YOUTUBE_API_KEY=tua_api_key
APPLE_MUSIC_COOKIES_PATH=./cookies.txt
```

### 4. Aggiungi i cookie Apple Music

Esporta i cookie dal browser usando una di queste estensioni:
- Firefox: [Export Cookies](https://addons.mozilla.org/addon/export-cookies-txt)
- Chrome: [Get cookies.txt LOCALLY](https://chromewebstore.google.com/detail/cclelndahbckbenkjhflpdbgdldlbecc)

Salva il file come `cookies.txt` nella root del progetto.

## Utilizzo

### Genera i dati delle playlist

```bash
npm run fetch
```

Questo script:
1. Recupera tutte le playlist con naming YYYY.MM dal tuo account Apple Music
2. Per ogni traccia, cerca i link su Spotify e YouTube via ISRC
3. Salva tutto in `data/playlists.json`

### Avvia il server di sviluppo

```bash
npm run dev
```

Apri http://localhost:8000 nel browser.

## Struttura Progetto

```
music-portal/
├── scripts/              # Script Node.js
│   ├── lib/              # Librerie per API
│   │   ├── apple-music.js
│   │   ├── spotify.js
│   │   └── youtube.js
│   ├── config.js
│   └── fetch-playlists.js
├── data/                 # JSON generati
│   └── playlists.json
├── public/               # Frontend statico
│   ├── index.html
│   ├── playlist.html
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
├── cookies.txt           # Cookie Apple Music
├── .env                  # Variabili ambiente
└── package.json
```

## Deployment

Il frontend è completamente statico e può essere deployato su:
- GitHub Pages
- Netlify
- Vercel
- DigitalOcean App Platform
- Qualsiasi hosting statico

Basta caricare la cartella `public/` e il file `data/playlists.json`.

## Licenza

MIT
