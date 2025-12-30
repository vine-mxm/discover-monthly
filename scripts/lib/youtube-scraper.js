import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

export class YouTubeScraperClient {
  constructor() {
    this.quotaExhausted = false; // Always false for scraper, kept for interface compatibility
  }

  async searchYouTube(query, retries = 2) {
    if (!query) return null;
    
    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const { stdout, stderr } = await execFileAsync('yt-dlp', [
          `ytsearch1:${query}`,
          '--print', '%(id)s',
          '--flat-playlist',
          '--no-warnings',
          '--socket-timeout', '8',
        ], {
          timeout: 12000, // 12 second timeout (reduced from 15s)
          killSignal: 'SIGKILL', // Force kill if timeout
        });
        
        const videoId = stdout.trim();
        
        if (videoId && !videoId.includes('ERROR') && videoId.length > 0) {
          return {
            id: videoId,
            url: `https://www.youtube.com/watch?v=${videoId}`,
          };
        }
        
        return null;
      } catch (error) {
        // If it's a timeout, don't retry - just fail fast
        if (error.killed || error.signal === 'SIGKILL') {
          return null;
        }
        
        // If it's the last attempt, return null
        if (attempt === retries - 1) {
          // Only log non-trivial errors
          if (!error.message?.includes('Unable to download') && 
              !error.message?.includes('HTTP Error')) {
            console.error(`YT error: ${error.message.substring(0, 50)}`);
          }
          return null;
        }
        
        // Wait before retry (shorter backoff)
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
    
    return null;
  }

  async searchByISRC(isrc) {
    if (!isrc) return null;
    return await this.searchYouTube(isrc);
  }

  async searchByTitleArtist(title, artist) {
    if (!title || !artist) return null;
    
    // Search YouTube using artist + title (like Spotify does)
    const query = `${artist} ${title}`;
    return await this.searchYouTube(query);
  }

  async findVideo(isrc, title, artist) {
    // Try ISRC first (priority as per requirements)
    let result = await this.searchByISRC(isrc);
    
    // Fallback to title + artist (same strategy as Spotify)
    if (!result) {
      result = await this.searchByTitleArtist(title, artist);
    }
    
    return result;
  }
  
  isQuotaExhausted() {
    // Scraper has no quota limits
    return false;
  }
}
