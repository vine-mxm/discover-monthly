import axios from 'axios';
import * as cheerio from 'cheerio';

/**
 * Bandcamp Client for searching and matching tracks
 * Uses web scraping since Bandcamp has no public search API
 */
export class BandcampClient {
  constructor() {
    this.baseUrl = 'https://bandcamp.com';
    this.searchUrl = `${this.baseUrl}/search`;
    this.lastRequestTime = 0;
    this.minRequestInterval = 1500; // 1.5 seconds between requests
  }

  /**
   * Rate limiting helper
   */
  async waitForRateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Performs a search on Bandcamp and parses the HTML results
   * @param {string} query - Search query
   * @param {string} filterType - Filter by 'track', 'album', or 'all'
   * @returns {Array} Array of search results
   */
  async searchBandcamp(query, filterType = 'all') {
    try {
      await this.waitForRateLimit();

      console.log(`[Bandcamp] Searching for: "${query}"`);

      const response = await axios.get(this.searchUrl, {
        params: { q: query },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const results = [];

      // Parse search results
      $('.searchresult').each((index, element) => {
        const $result = $(element);
        
        // Extract item type (TRACK, ALBUM, ARTIST, etc.)
        const itemType = $result.find('.itemtype').text().trim().toLowerCase();
        
        // Extract title
        const title = $result.find('.heading a').text().trim();
        
        // Extract artist (from subhead)
        let artist = $result.find('.subhead').text().trim();
        // Remove "by " prefix if present
        artist = artist.replace(/^by\s+/i, '');
        
        // Extract URL
        const url = $result.find('.itemurl a').text().trim() || 
                    $result.find('.heading a').attr('href');
        
        // Extract genre/location info if available
        const genre = $result.find('.genre').text().trim();
        const location = $result.find('.location').text().trim();

        // Only add valid results with required fields
        if (title && url) {
          const result = {
            type: itemType,
            title,
            artist,
            url,
            genre: genre || null,
            location: location || null,
          };

          // Apply filter if specified
          if (filterType === 'all' || itemType === filterType) {
            results.push(result);
          }
        }
      });

      console.log(`[Bandcamp] Found ${results.length} results (filter: ${filterType})`);
      return results;

    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        console.error('[Bandcamp] Request timeout');
      } else if (error.response) {
        console.error(`[Bandcamp] HTTP error: ${error.response.status}`);
      } else {
        console.error(`[Bandcamp] Search error: ${error.message}`);
      }
      return [];
    }
  }

  /**
   * Search by title and artist (primary strategy)
   * @param {string} title - Track title
   * @param {string} artist - Artist name
   * @returns {Object|null} Best matching result or null
   */
  async searchByTitleArtist(title, artist) {
    if (!title || !artist) {
      console.log('[Bandcamp] Missing title or artist for search');
      return null;
    }

    const query = `${artist} ${title}`;
    const results = await this.searchBandcamp(query, 'track');

    if (results.length === 0) {
      console.log('[Bandcamp] No tracks found for title+artist search');
      return null;
    }

    // Return the first track result (most relevant)
    // Could implement fuzzy matching here for better accuracy
    const match = results[0];
    console.log(`[Bandcamp] Match found: ${match.artist} - ${match.title}`);
    return match;
  }

  /**
   * Search by album name (fallback strategy)
   * @param {string} album - Album name
   * @param {string} artist - Artist name
   * @returns {Object|null} Best matching result or null
   */
  async searchByAlbum(album, artist) {
    if (!album || !artist) {
      console.log('[Bandcamp] Missing album or artist for search');
      return null;
    }

    const query = `${artist} ${album}`;
    const results = await this.searchBandcamp(query, 'album');

    if (results.length === 0) {
      console.log('[Bandcamp] No albums found for album search');
      return null;
    }

    // Return the first album result
    const match = results[0];
    console.log(`[Bandcamp] Album match found: ${match.artist} - ${match.title}`);
    return match;
  }

  /**
   * Main method to find a track on Bandcamp
   * Strategy: 
   * 1. Try title + artist (filter: track)
   * 2. Fallback to album search (filter: album)
   * 
   * @param {string} isrc - ISRC code (not used for Bandcamp, but kept for API consistency)
   * @param {string} title - Track title
   * @param {string} artist - Artist name
   * @param {string} album - Album name
   * @returns {Object|null} {id, url, type} or null if not found
   */
  async findTrack(isrc, title, artist, album) {
    console.log(`[Bandcamp] Starting search for: ${artist} - ${title}`);

    try {
      // Strategy 1: Search by title + artist (tracks only)
      let result = await this.searchByTitleArtist(title, artist);
      
      if (result) {
        return {
          id: null, // Bandcamp doesn't have a simple ID system
          url: result.url,
          type: result.type,
          matchedBy: 'title+artist'
        };
      }

      // Strategy 2: Fallback to album search
      if (album) {
        console.log('[Bandcamp] Title+artist search failed, trying album search...');
        result = await this.searchByAlbum(album, artist);
        
        if (result) {
          return {
            id: null,
            url: result.url,
            type: result.type,
            matchedBy: 'album'
          };
        }
      }

      console.log('[Bandcamp] No match found for this track');
      return null;

    } catch (error) {
      console.error(`[Bandcamp] Error in findTrack: ${error.message}`);
      return null;
    }
  }

  /**
   * Helper method to normalize/clean strings for better matching
   * Can be expanded with more sophisticated matching logic
   */
  normalizeString(str) {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' '); // Normalize whitespace
  }
}

export default BandcampClient;
