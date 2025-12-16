# Music Portal - Setup Guide

## Status: ✅ CORE IMPLEMENTAZIONE COMPLETATA

Tutti i file principali sono stati creati. Il progetto è pronto per essere configurato e testato.

## 📁 Struttura Progetto

```
music-portal/
├── scripts/                    # Backend Node.js
│   ├── lib/
│   │   ├── apple-music.js     # ✅ Client Apple Music (cookie-based)
│   │   ├── spotify.js         # ✅ Client Spotify API (ISRC + fallback)
│   │   └── youtube.js         # ✅ Client YouTube API (ISRC + fallback)
│   ├── config.js              # ✅ Configurazione centralizzata
│   └── fetch-playlists.js     # ✅ Script principale orchestratore
├── public/                     # Frontend statico
│   ├── index.html             # ✅ Homepage lista playlist
│   ├── playlist.html          # ✅ Dettaglio playlist
│   ├── css/
│   │   └── style.css          # ✅ Stile ASCII/cyberpunk
│   └── js/
│       └── app.js             # ✅ Logica frontend
├── data/                       # Directory per JSON generati
│   └── .gitkeep
├── .env.example               # ✅ Template variabili ambiente
├── .gitignore                 # ✅ 
├── cookies.txt.example        # ✅ Template cookies
├── package.json               # ✅ 
└── README.md                  # ✅ Documentazione completa

```

## 🚀 Prossimi Passi per l'Utente

### 1. Installa le dipendenze

```bash
cd music-portal
npm install
```

### 2. Ottieni le API Keys

#### Spotify
1. Vai su https://developer.spotify.com/dashboard
2. Fai login o crea un account
3. Clicca "Create App"
4. Compila i campi richiesti (nome, descrizione, ecc.)
5. Copia il **Client ID** e **Client Secret**

#### YouTube
1. Vai su https://console.cloud.google.com/
2. Crea un nuovo progetto (o usa uno esistente)
3. Vai su "APIs & Services" > "Library"
4. Cerca "YouTube Data API v3" e abilitala
5. Vai su "APIs & Services" > "Credentials"
6. Clicca "Create Credentials" > "API Key"
7. Copia l'**API Key**

### 3. Configura le variabili ambiente

```bash
cp .env.example .env
```

Modifica `.env` con le tue credenziali:

```env
SPOTIFY_CLIENT_ID=xxx
SPOTIFY_CLIENT_SECRET=xxx
YOUTUBE_API_KEY=xxx
APPLE_MUSIC_COOKIES_PATH=./cookies.txt
```

### 4. Esporta i cookie Apple Music

1. Apri il browser e vai su https://music.apple.com
2. Fai login con il tuo account Apple Music
3. Installa l'estensione per esportare cookie:
   - **Firefox**: https://addons.mozilla.org/addon/export-cookies-txt
   - **Chrome**: https://chromewebstore.google.com/detail/cclelndahbckbenkjhflpdbgdldlbecc
4. Esporta i cookie in formato Netscape
5. Salva il file come `cookies.txt` nella root del progetto

### 5. Genera i dati delle playlist

```bash
npm run fetch
```

Questo comando:
- Recupera tutte le playlist con naming YYYY.MM
- Per ogni traccia cerca link su Spotify e YouTube via ISRC
- Salva tutto in `data/playlists.json`

**Nota**: Il processo può richiedere alcuni minuti a seconda del numero di playlist e tracce.

### 6. Avvia il server di sviluppo

```bash
npm run dev
```

Apri il browser su http://localhost:8000

## 🎨 Design

Il sito usa un'estetica **ASCII/Cyberpunk** ispirata a:
- Uplink (videogioco)
- Ryoji Ikeda (artista)

Caratteristiche:
- Colori: verde fosforescente su nero (#00ff00)
- Font: Courier New (monospace)
- Bordi e decorazioni: caratteri ASCII
- Effetti: glow, scanline, flicker
- Responsive: funziona su mobile

## 🔄 Aggiornamento Playlist

Per aggiornare le playlist con nuove tracce:

```bash
npm run fetch
```

Poi ricarica la pagina nel browser.

## 📊 Statistiche (Future)

Attualmente non implementate, ma previste:
- Artisti più ascoltati
- Generi più presenti
- Tracce duplicate
- Timeline ascolti
- ecc.

## 🐛 Troubleshooting

### Errore: "media-user-token not found"
- Esporta di nuovo i cookie da Apple Music
- Assicurati di essere loggato mentre esporti

### Errore: "Spotify auth failed"
- Verifica Client ID e Client Secret in `.env`
- Controlla che non ci siano spazi extra

### Errore: "YouTube search error"
- Verifica l'API Key in `.env`
- Controlla che YouTube Data API v3 sia abilitata nel progetto Google Cloud

### Nessuna traccia trovata su Spotify/YouTube
- Normale per tracce rare o molto nuove
- L'ISRC potrebbe non essere disponibile
- Il fallback su titolo+artista potrebbe non trovare risultati precisi

## 📝 Note Tecniche

### Apple Music API
- Usa approccio cookie (non MusicKit ufficiale)
- Endpoint: https://amp-api.music.apple.com/v1
- Richiede: media-user-token dai cookie

### Spotify API
- OAuth Client Credentials flow
- Ricerca via ISRC: `q=isrc:XXXX`
- Fallback: `q=track:TITLE artist:ARTIST`

### YouTube Data API
- Ricerca via ISRC prima
- Fallback su titolo + artista
- Filtro categoria musica (ID: 10)

## 🚀 Deploy

Il sito è completamente statico (HTML/CSS/JS + JSON).

Può essere deployato su:
- **GitHub Pages** (gratis)
- **Netlify** (gratis)
- **Vercel** (gratis)
- **DigitalOcean App Platform**
- Qualsiasi hosting statico

**Da uploadare:**
- Cartella `public/`
- File `data/playlists.json`

## 📄 Licenza

MIT
