import axios from 'axios';

export class YouTubeClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://www.googleapis.com/youtube/v3';
    this.quotaExhausted = false;
  }

  async searchByISRC(isrc) {
    if (!isrc || this.quotaExhausted) return null;
    
    try {
      const response = await axios.get(`${this.baseURL}/search`, {
        params: {
          part: 'snippet',
          q: isrc,
          type: 'video',
          maxResults: 1,
          key: this.apiKey,
        }
      });
      
      const items = response.data.items || [];
      if (items.length > 0) {
        return {
          id: items[0].id.videoId,
          url: `https://www.youtube.com/watch?v=${items[0].id.videoId}`,
        };
      }
      
      return null;
    } catch (error) {
      // Check for quota exceeded error
      if (error.response?.status === 403 && 
          error.response?.data?.error?.errors?.[0]?.reason === 'quotaExceeded') {
        this.quotaExhausted = true;
        return null;
      }
      
      console.error(`YouTube ISRC search error: ${error.message}`);
      return null;
    }
  }

  async searchByTitleArtist(title, artist) {
    if (this.quotaExhausted) return null;
    
    try {
      const query = `${artist} ${title}`;
      const response = await axios.get(`${this.baseURL}/search`, {
        params: {
          part: 'snippet',
          q: query,
          type: 'video',
          videoCategoryId: '10', // Music category
          maxResults: 1,
          key: this.apiKey,
        }
      });
      
      const items = response.data.items || [];
      if (items.length > 0) {
        return {
          id: items[0].id.videoId,
          url: `https://www.youtube.com/watch?v=${items[0].id.videoId}`,
        };
      }
      
      return null;
    } catch (error) {
      // Check for quota exceeded error
      if (error.response?.status === 403 && 
          error.response?.data?.error?.errors?.[0]?.reason === 'quotaExceeded') {
        this.quotaExhausted = true;
        return null;
      }
      
      console.error(`YouTube title/artist search error: ${error.message}`);
      return null;
    }
  }

  async findVideo(isrc, title, artist) {
    // Skip entirely if quota exhausted
    if (this.quotaExhausted) return null;
    
    // Try ISRC first
    let result = await this.searchByISRC(isrc);
    
    // Fallback to title + artist (only if quota not exhausted)
    if (!result && !this.quotaExhausted) {
      result = await this.searchByTitleArtist(title, artist);
    }
    
    return result;
  }
  
  isQuotaExhausted() {
    return this.quotaExhausted;
  }
}
