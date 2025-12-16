import axios from 'axios';

export class YouTubeClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://www.googleapis.com/youtube/v3';
  }

  async searchByISRC(isrc) {
    if (!isrc) return null;
    
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
      console.error(`YouTube ISRC search error: ${error.message}`);
      return null;
    }
  }

  async searchByTitleArtist(title, artist) {
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
      console.error(`YouTube title/artist search error: ${error.message}`);
      return null;
    }
  }

  async findVideo(isrc, title, artist) {
    // Try ISRC first
    let result = await this.searchByISRC(isrc);
    
    // Fallback to title + artist
    if (!result) {
      result = await this.searchByTitleArtist(title, artist);
    }
    
    return result;
  }
}
