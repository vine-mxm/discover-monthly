import axios from 'axios';

export class AppleMusicScraperClient {
  constructor() {
    this.client = axios.create({
      headers: {
        'User-Agent': 'iTunes/12.12.0 (Macintosh; OS X 10.15.7) AppleWebKit/605.1.15',
        'Accept': 'application/json',
      },
      timeout: 15000,
    });
    this.lastRequestTime = 0;
  }

  async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const minDelay = 1500; // 1.5 seconds between requests
    
    if (timeSinceLastRequest < minDelay) {
      await new Promise(resolve => setTimeout(resolve, minDelay - timeSinceLastRequest));
    }
    
    this.lastRequestTime = Date.now();
  }

  async searchAppleMusic(artist, title, retries = 2) {
    if (!artist || !title) return null;
    
    // Clean up search query
    const query = `${artist} ${title}`.trim();
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Rate limiting
        await this.rateLimit();
        
        // Use Apple Music's public search API
        const response = await this.client.get('https://itunes.apple.com/search', {
          params: {
            term: query,
            media: 'music',
            entity: 'song',
            limit: 5,
          }
        });
        
        if (!response.data?.results || response.data.results.length === 0) {
          return null;
        }
        
        // Try to find best match
        const results = response.data.results;
        
        // First, try exact match
        const exactMatch = results.find(result => 
          this.normalizeString(result.artistName) === this.normalizeString(artist) &&
          this.normalizeString(result.trackName) === this.normalizeString(title)
        );
        
        if (exactMatch) {
          return this.formatResult(exactMatch);
        }
        
        // Try partial match (artist must match, title can be close)
        const partialMatch = results.find(result =>
          this.normalizeString(result.artistName) === this.normalizeString(artist) &&
          this.normalizeString(result.trackName).includes(this.normalizeString(title).substring(0, 10))
        );
        
        if (partialMatch) {
          return this.formatResult(partialMatch);
        }
        
        // Fallback to first result if artist matches
        const firstArtistMatch = results.find(result =>
          this.normalizeString(result.artistName) === this.normalizeString(artist)
        );
        
        if (firstArtistMatch) {
          return this.formatResult(firstArtistMatch);
        }
        
        // Last resort: return first result
        return this.formatResult(results[0]);
        
      } catch (error) {
        // If it's the last attempt, return null
        if (attempt === retries - 1) {
          if (error.code !== 'ECONNABORTED' && !error.message?.includes('timeout')) {
            console.error(`Apple Music search error: ${error.message.substring(0, 50)}`);
          }
          return null;
        }
        
        // Wait a bit before retry
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return null;
  }

  formatResult(result) {
    // Extract country code from trackViewUrl
    // Example: https://music.apple.com/us/album/track-name/123456?i=789
    const urlMatch = result.trackViewUrl?.match(/music\.apple\.com\/([a-z]{2})\//);
    const country = urlMatch ? urlMatch[1] : 'us';
    
    return {
      id: result.trackId,
      url: result.trackViewUrl || `https://music.apple.com/${country}/album/${result.collectionId}?i=${result.trackId}`,
      artistName: result.artistName,
      trackName: result.trackName,
    };
  }

  normalizeString(str) {
    if (!str) return '';
    return str
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special chars
      .replace(/\s+/g, ' ')     // Normalize whitespace
      .trim();
  }

  // Batch search with rate limiting
  async searchBatch(tracks, options = {}) {
    const {
      maxConcurrent = 3,
      delayMs = 500,
      onProgress = null,
    } = options;

    const results = [];
    
    for (let i = 0; i < tracks.length; i += maxConcurrent) {
      const batch = tracks.slice(i, i + maxConcurrent);
      
      const batchResults = await Promise.all(
        batch.map(async (track) => {
          const result = await this.searchAppleMusic(track.artist, track.title);
          
          if (onProgress) {
            onProgress({
              current: i + batch.indexOf(track) + 1,
              total: tracks.length,
              track: track,
              result: result,
            });
          }
          
          return {
            track,
            appleMusic: result,
          };
        })
      );
      
      results.push(...batchResults);
      
      // Delay between batches to avoid rate limiting
      if (i + maxConcurrent < tracks.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
    
    return results;
  }
}
