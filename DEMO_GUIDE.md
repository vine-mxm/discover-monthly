# Music Portal - Demo Guide

## 🎨 Preview Immediato

Abbiamo creato due modi per visualizzare il design senza configurare nulla:

### Opzione 1: DEMO.html (Standalone)

Apri direttamente nel browser senza server:

```bash
open DEMO.html
# oppure
firefox DEMO.html
# oppure
chrome DEMO.html
```

Questo file HTML standalone mostra:
- ✅ Design ASCII/cyberpunk completo
- ✅ Font Iosevka Nerd Font Mono
- ✅ 6 playlist di esempio (2024, 2023, 2020)
- ✅ Filtro per anno funzionante
- ✅ Effetti hover e animazioni
- ✅ Layout responsive

**Limitazioni:**
- Non mostra i dettagli delle tracce
- Link non funzionanti (è solo UI)
- Nessuna integrazione con dati reali

---

### Opzione 2: Server con Dati Mock

Usa i dati stubbed completi con tutte le funzionalità:

```bash
# Avvia il server
npm run dev

# Apri nel browser
open http://localhost:8000
```

Questo include:
- ✅ Homepage con lista playlist completa
- ✅ Pagina dettaglio playlist con tracce
- ✅ Link a Apple Music, Spotify, YouTube (esempio)
- ✅ 36 tracce totali distribuite in 6 playlist
- ✅ Tutte le funzionalità complete

---

## 📊 Dati Mock Inclusi

Il file `data/playlists.json` contiene:

**6 Playlist:**
- 2024.11 (6 tracce) - Sabrina Carpenter, Billie Eilish, Chappell Roan, Kendrick Lamar
- 2024.10 (6 tracce) - ROSÉ, Lady Gaga, Taylor Swift, Chappell Roan
- 2024.09 (6 tracce) - Billie Eilish, Taylor Swift, Hozier, Noah Kahan
- 2023.12 (6 tracce) - Doja Cat, Olivia Rodrigo, Taylor Swift, SZA
- 2023.06 (6 tracce) - The Weeknd, Dua Lipa, Ariana Grande, Harry Styles
- 2020.01 (6 tracce) - The Weeknd, Dua Lipa, Post Malone, Billie Eilish

**Totale: 36 tracce**

Ogni traccia include:
- Titolo, artista, album
- Durata
- ISRC
- Link a Apple Music, Spotify, YouTube (dove disponibile)
- Artwork URL

---

## 🎨 Design Features Visibili

### Colori
- Background: Nero (#000000)
- Text: Verde fosforescente (#00ff00)
- Effetto glow su tutti gli elementi
- Effetto scanline su tutto lo schermo

### Typography
- Font: Iosevka Term Nerd Font Mono
- Caratteri ASCII per decorazioni (╔═╗ ║ └─┘)
- Monospaced perfetto per estetica cyberpunk

### Animazioni
- Flicker effect sul logo
- Hover effects sui card con scale e glow
- Smooth transitions su tutti gli elementi interattivi

### Responsive
- Griglia adattiva per playlist
- Layout ottimizzato per mobile
- Font size ridotto su schermi piccoli

---

## 🚀 Prossimi Passi

Dopo aver visto il demo, per popolare con i tuoi dati reali:

1. **Configura le API keys** (vedi README.md)
   - Spotify Client ID/Secret
   - YouTube API Key

2. **Aggiungi i cookie Apple Music**
   - Esporta da browser
   - Salva come `cookies.txt`

3. **Genera i dati reali**
   ```bash
   npm run fetch
   ```

4. **Avvia e goditi**
   ```bash
   npm run dev
   ```

---

## 📝 File Demo

- `DEMO.html` - Preview standalone (apri direttamente)
- `data/playlists.json` - 36 tracce mock per testing completo
- `public/index.html` - Homepage vera (richiede server)
- `public/playlist.html` - Dettaglio playlist (richiede server)

---

## 💡 Tips

- Usa il filtro per anno per vedere l'animazione
- Hover sulle playlist cards per vedere gli effetti
- Apri le devtools per vedere il CSS in azione
- Testa su mobile per vedere il responsive design

Buona visione! 🎵
