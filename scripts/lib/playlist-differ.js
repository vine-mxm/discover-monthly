import fs from 'fs/promises';
import { existsSync } from 'fs';

export class PlaylistDiffer {
  /**
   * Carica JSON esistente se esiste
   */
  static async loadExisting(filePath) {
    if (!existsSync(filePath)) {
      return null;
    }
    
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.warn(`⚠ Warning: Could not load existing data: ${error.message}`);
      return null;
    }
  }

  /**
   * Trova differenze tra playlist esistenti e attuali
   */
  static findDifferences(existingData, currentPlaylists) {
    const existingIds = new Set(
      existingData.playlists.map(p => p.id)
    );
    const currentIds = new Set(
      currentPlaylists.map(p => p.id)
    );
    
    // Nuove playlist (in current ma non in existing)
    const newPlaylists = currentPlaylists.filter(
      p => !existingIds.has(p.id)
    );
    
    // Playlist rimosse (in existing ma non in current)
    const removedPlaylists = existingData.playlists.filter(
      p => !currentIds.has(p.id) && !p.removed
    );
    
    // Playlist esistenti (in entrambi)
    const existingPlaylists = existingData.playlists.filter(
      p => currentIds.has(p.id)
    );
    
    return {
      newPlaylists,
      removedPlaylists,
      existingPlaylists,
    };
  }

  /**
   * Trova tracce con link mancanti (Spotify o YouTube)
   */
  static findMissingLinks(playlists) {
    const tracksWithMissingLinks = [];
    
    for (const playlist of playlists) {
      if (!playlist.tracks) continue;
      
      for (const track of playlist.tracks) {
        const hasSpotify = track.links?.spotify && track.links.spotify !== '#';
        const hasYoutube = track.links?.youtube && track.links.youtube !== '#';
        
        if (!hasSpotify || !hasYoutube) {
          tracksWithMissingLinks.push({
            playlistId: playlist.id,
            playlistName: playlist.name,
            track,
            missingSpotify: !hasSpotify,
            missingYoutube: !hasYoutube,
          });
        }
      }
    }
    
    return tracksWithMissingLinks;
  }

  /**
   * Merge dati esistenti con aggiornamenti
   */
  static mergeData(existingData, newProcessedPlaylists, existingPlaylists) {
    const now = new Date().toISOString();
    
    // Crea mappa per accesso veloce
    const playlistMap = new Map();
    
    // Aggiungi playlist esistenti (aggiornate)
    for (const playlist of existingPlaylists) {
      playlist.lastUpdated = now;
      playlistMap.set(playlist.id, playlist);
    }
    
    // Aggiungi nuove playlist processate
    for (const playlist of newProcessedPlaylists) {
      playlist.lastUpdated = now;
      playlist.removed = false;
      playlistMap.set(playlist.id, playlist);
    }
    
    // Calcola statistiche
    const allPlaylists = Array.from(playlistMap.values());
    const totalTracks = allPlaylists.reduce(
      (sum, p) => sum + (p.tracks?.length || 0), 
      0
    );
    
    return {
      generated: now,
      totalPlaylists: allPlaylists.filter(p => !p.removed).length,
      totalTracks,
      playlists: allPlaylists.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      }),
    };
  }

  /**
   * Rimuove playlist con flag removed=true
   */
  static cleanupRemoved(data) {
    return {
      ...data,
      playlists: data.playlists.filter(p => !p.removed),
      totalPlaylists: data.playlists.filter(p => !p.removed).length,
    };
  }
}
