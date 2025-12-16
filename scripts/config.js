import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const config = {
  // Apple Music
  appleMusicCookiesPath: process.env.APPLE_MUSIC_COOKIES_PATH || './cookies.txt',
  appleMusicJwt: process.env.APPLE_MUSIC_JWT,
  
  // Spotify
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  },
  
  // YouTube
  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY,
  },
  
  // Paths
  dataDir: join(__dirname, '..', 'data'),
  outputFile: join(__dirname, '..', 'data', 'playlists.json'),
  
  // Playlist filter
  playlistPattern: /^\d{4}\.\d{2}$/,  // Match YYYY.MM format
};

// Validate configuration
export function validateConfig() {
  const errors = [];
  
  if (!config.spotify.clientId) {
    errors.push('Missing SPOTIFY_CLIENT_ID in .env');
  }
  
  if (!config.spotify.clientSecret) {
    errors.push('Missing SPOTIFY_CLIENT_SECRET in .env');
  }
  
  if (!config.youtube.apiKey) {
    errors.push('Missing YOUTUBE_API_KEY in .env');
  }
  
  if (!config.appleMusicJwt) {
    errors.push('Missing APPLE_MUSIC_JWT in .env');
  }
  
  if (errors.length > 0) {
    throw new Error(`Configuration errors:\n${errors.join('\n')}`);
  }
  
  return true;
}
