import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import fs from 'fs/promises';

export class AppleMusicClient {
  constructor(cookiesPath, jwt) {
    this.cookiesPath = cookiesPath;
    this.jwt = jwt;
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      baseURL: 'https://amp-api.music.apple.com/v1',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Origin': 'https://music.apple.com',
        'Referer': 'https://music.apple.com/',
        'Authorization': `Bearer ${this.jwt}`,
      }
    }));
    
    this.mediaUserToken = null;
    this.storefront = 'us';
  }

  async loadCookies() {
    try {
      const cookiesContent = await fs.readFile(this.cookiesPath, 'utf-8');
      const lines = cookiesContent.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('#') || !line.trim()) continue;
        
        const parts = line.split('\t');
        if (parts.length >= 7) {
          const domain = parts[0];
          const path = parts[2];
          const secure = parts[3] === 'TRUE';
          const expires = parts[4];
          const name = parts[5];
          const value = parts[6];
          
          await this.jar.setCookie(
            `${name}=${value}; Domain=${domain}; Path=${path}; ${secure ? 'Secure' : ''}`,
            `https://${domain}`
          );
          
          if (name === 'media-user-token') {
            this.mediaUserToken = value;
          }
        }
      }
      
      if (!this.mediaUserToken) {
        throw new Error('media-user-token not found in cookies');
      }
      
      console.log('✓ Apple Music cookies loaded successfully');
    } catch (error) {
      throw new Error(`Failed to load cookies: ${error.message}`);
    }
  }

  async getUserPlaylists() {
    try {
      const response = await this.client.get('/me/library/playlists', {
        params: {
          limit: 100,
        },
        headers: {
          'media-user-token': this.mediaUserToken,
        }
      });
      
      return response.data.data || [];
    } catch (error) {
      throw new Error(`Failed to fetch playlists: ${error.message}`);
    }
  }

  async getPlaylistTracks(playlistId) {
    try {
      const response = await this.client.get(`/me/library/playlists/${playlistId}/tracks`, {
        params: {
          limit: 100,
        },
        headers: {
          'media-user-token': this.mediaUserToken,
        }
      });
      
      return response.data.data || [];
    } catch (error) {
      throw new Error(`Failed to fetch playlist tracks: ${error.message}`);
    }
  }

  extractTrackInfo(track) {
    const attributes = track.attributes || {};
    const playParams = attributes.playParams || {};
    
    // Try to get public catalog URL
    let appleMusicUrl = null;
    
    // If we have a catalogId, create a public URL
    if (playParams.catalogId) {
      // Simple format: just the song ID
      // Apple Music will redirect to the full album URL automatically
      appleMusicUrl = `https://music.apple.com/${this.storefront}/song/${playParams.catalogId}`;
    }
    // Fallback to library link (private, but better than nothing)
    else if (track.id) {
      appleMusicUrl = `https://music.apple.com/library/song/${track.id}`;
    }
    
    return {
      title: attributes.name || 'Unknown',
      artist: attributes.artistName || 'Unknown',
      album: attributes.albumName || 'Unknown',
      duration: attributes.durationInMillis || 0,
      isrc: attributes.isrc || null,
      artwork: attributes.artwork?.url ? 
        attributes.artwork.url.replace('{w}', '600').replace('{h}', '600') : null,
      appleMusic: {
        id: track.id,
        catalogId: playParams.catalogId || null,
        url: appleMusicUrl,
      }
    };
  }

  extractPlaylistInfo(playlist) {
    const attributes = playlist.attributes || {};
    const name = attributes.name || '';
    
    // Parse YYYY.MM format
    const match = name.match(/^(\d{4})\.(\d{2})$/);
    
    return {
      id: playlist.id,
      name: name,
      year: match ? parseInt(match[1]) : null,
      month: match ? parseInt(match[2]) : null,
      appleMusic: {
        id: playlist.id,
        url: playlist.id ? `https://music.apple.com/library/playlist/${playlist.id}` : null,
      }
    };
  }
}
