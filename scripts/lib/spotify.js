import axios from 'axios';

export class SpotifyClient {
  constructor(clientId, clientSecret) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.accessToken = null;
    this.tokenExpiresAt = null;
  }

  async authenticate() {
    try {
      const response = await axios.post(
        'https://accounts.spotify.com/api/token',
        new URLSearchParams({
          grant_type: 'client_credentials',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
          }
        }
      );
      
      this.accessToken = response.data.access_token;
      this.tokenExpiresAt = Date.now() + (response.data.expires_in * 1000);
      
      console.log('✓ Spotify authenticated successfully');
    } catch (error) {
      throw new Error(`Spotify auth failed: ${error.message}`);
    }
  }

  async ensureAuthenticated() {
    if (!this.accessToken || Date.now() >= this.tokenExpiresAt) {
      await this.authenticate();
    }
  }

  async searchByISRC(isrc) {
    if (!isrc) return null;
    
    await this.ensureAuthenticated();
    
    try {
      const response = await axios.get('https://api.spotify.com/v1/search', {
        params: {
          q: `isrc:${isrc}`,
          type: 'track',
          limit: 1,
        },
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        }
      });
      
      const tracks = response.data.tracks?.items || [];
      if (tracks.length > 0) {
        return {
          id: tracks[0].id,
          url: tracks[0].external_urls.spotify,
        };
      }
      
      return null;
    } catch (error) {
      console.error(`Spotify ISRC search error: ${error.message}`);
      return null;
    }
  }

  async searchByTitleArtist(title, artist) {
    await this.ensureAuthenticated();
    
    try {
      const query = `track:${title} artist:${artist}`;
      const response = await axios.get('https://api.spotify.com/v1/search', {
        params: {
          q: query,
          type: 'track',
          limit: 1,
        },
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
        }
      });
      
      const tracks = response.data.tracks?.items || [];
      if (tracks.length > 0) {
        return {
          id: tracks[0].id,
          url: tracks[0].external_urls.spotify,
        };
      }
      
      return null;
    } catch (error) {
      console.error(`Spotify title/artist search error: ${error.message}`);
      return null;
    }
  }

  async findTrack(isrc, title, artist) {
    // Try ISRC first
    let result = await this.searchByISRC(isrc);
    
    // Fallback to title + artist
    if (!result) {
      result = await this.searchByTitleArtist(title, artist);
    }
    
    return result;
  }
}
