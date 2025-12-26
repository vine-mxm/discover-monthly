import { AppleMusicClient } from './lib/apple-music.js';
import { SpotifyClient } from './lib/spotify.js';
import { YouTubeScraperClient } from './lib/youtube-scraper.js';
import { BandcampClient } from './lib/bandcamp.js';
import { PlaylistDiffer } from './lib/playlist-differ.js';
import { ChangeLogger } from './lib/change-logger.js';
import { config, validateConfig } from './config.js';
import fs from 'fs/promises';
import { existsSync } from 'fs';

// Track if we've warned about YouTube quota
let youtubeQuotaWarned = false;

// Helper to check and warn about YouTube quota
function checkYoutubeQuota(youtubeClient, context = '') {
  if (youtubeClient.isQuotaExhausted() && !youtubeQuotaWarned) {
    console.log(`\n  ⚠️  YouTube API quota exhausted - skipping YouTube searches${context}\n`);
    youtubeQuotaWarned = true;
    return false;
  }
  return !youtubeClient.isQuotaExhausted();
}

// Helper function to update .env file
async function updateEnvFile(key, value) {
  const envPath = './.env';
  
  try {
    let envContent = '';
    
    // Read existing .env if it exists
    if (existsSync(envPath)) {
      envContent = await fs.readFile(envPath, 'utf-8');
    }
    
    // Check if key already exists
    const keyRegex = new RegExp(`^${key}=.*$`, 'm');
    
    if (keyRegex.test(envContent)) {
      // Update existing key
      envContent = envContent.replace(keyRegex, `${key}=${value}`);
    } else {
      // Add new key
      envContent += `\n${key}=${value}\n`;
    }
    
    // Write back to file
    await fs.writeFile(envPath, envContent, 'utf-8');
    console.log(`✓ Updated ${key} in .env file\n`);
  } catch (error) {
    console.error(`⚠ Warning: Could not update .env file: ${error.message}`);
  }
}

// Parse command-line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const parsed = {};
  
  for (const arg of args) {
    if (arg.startsWith('--apple-jwt=')) {
      parsed.appleJwt = arg.split('=')[1];
    } else if (arg === '--cleanup-removed') {
      parsed.cleanupRemoved = true;
    } else if (arg === '--force-refresh') {
      parsed.forceRefresh = true;
    }
  }
  
  return parsed;
}

// Process a new playlist completely (fetch tracks + match Spotify/YouTube/Bandcamp)
async function processNewPlaylist(playlist, appleMusicClient, spotifyClient, youtubeClient, bandcampClient) {
  const playlistInfo = appleMusicClient.extractPlaylistInfo(playlist);
  
  try {
    const tracks = await appleMusicClient.getPlaylistTracks(playlist.id);
    console.log(`    - ${tracks.length} tracks found`);
    
    playlistInfo.tracks = [];
    
    for (const track of tracks) {
      const trackInfo = appleMusicClient.extractTrackInfo(track);
      
      // Match Spotify
      const spotifyResult = await spotifyClient.findTrack(
        trackInfo.isrc,
        trackInfo.title,
        trackInfo.artist
      );
      if (spotifyResult) {
        trackInfo.links = trackInfo.links || {};
        trackInfo.links.spotify = spotifyResult.url;
      }
      
      // Match YouTube (only if quota not exhausted)
      if (checkYoutubeQuota(youtubeClient)) {
        const youtubeResult = await youtubeClient.findVideo(
          trackInfo.isrc,
          trackInfo.title,
          trackInfo.artist
        );
        if (youtubeResult) {
          trackInfo.links = trackInfo.links || {};
          trackInfo.links.youtube = youtubeResult.url;
        }
      }
      
      // Match Bandcamp
      const bandcampResult = await bandcampClient.findTrack(
        trackInfo.isrc,
        trackInfo.title,
        trackInfo.artist,
        trackInfo.album
      );
      if (bandcampResult) {
        trackInfo.links = trackInfo.links || {};
        trackInfo.links.bandcamp = bandcampResult.url;
      }
      
      // Apple Music link
      trackInfo.links = trackInfo.links || {};
      trackInfo.links.appleMusic = trackInfo.appleMusic.url;
      
      playlistInfo.tracks.push(trackInfo);
      
      // Delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    playlistInfo.removed = false;
    playlistInfo.lastUpdated = new Date().toISOString();
    
    return playlistInfo;
  } catch (error) {
    console.log(`    ⚠ Error: ${error.message} (skipping)`);
    return null;
  }
}

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  MUSIC PORTAL - Playlist Fetcher');
  console.log('═══════════════════════════════════════\n');

  try {
    // Parse CLI arguments
    const cliArgs = parseArgs();
    
    // If JWT provided via CLI, update .env
    if (cliArgs.appleJwt) {
      console.log('[0/6] Updating Apple Music JWT...\n');
      await updateEnvFile('APPLE_MUSIC_JWT', cliArgs.appleJwt);
      // Update config with new JWT
      config.appleMusicJwt = cliArgs.appleJwt;
    }
    
    // Validate configuration
    validateConfig();
    
    // Initialize clients
    console.log('[1/6] Initializing API clients...\n');
    
    const appleMusicClient = new AppleMusicClient(
      config.appleMusicCookiesPath,
      config.appleMusicJwt
    );
    await appleMusicClient.loadCookies();
    
    const spotifyClient = new SpotifyClient(
      config.spotify.clientId,
      config.spotify.clientSecret
    );
    await spotifyClient.authenticate();
    
    const youtubeClient = new YouTubeScraperClient();
    console.log('✓ YouTube scraper client initialized (no API key required)\n');
    
    const bandcampClient = new BandcampClient();
    console.log('✓ Bandcamp scraper client initialized (no API key required)\n');
    
    // Load existing data (if not force refresh)
    console.log('[2/6] Checking for existing data...\n');
    const existingData = cliArgs.forceRefresh 
      ? null 
      : await PlaylistDiffer.loadExisting(config.outputFile);
    
    if (existingData) {
      console.log('✓ Found existing data, using incremental update mode\n');
    } else {
      console.log('✓ No existing data found, using full refresh mode\n');
    }
    
    // Fetch playlists from Apple Music
    console.log('[3/6] Fetching playlists from Apple Music...\n');
    const allPlaylists = await appleMusicClient.getUserPlaylists();
    
    // Filter playlists by naming pattern (YYYY.MM)
    const monthlyPlaylists = allPlaylists.filter(playlist => {
      const name = playlist.attributes?.name || '';
      return config.playlistPattern.test(name);
    });
    
    console.log(`✓ Found ${monthlyPlaylists.length} monthly playlists\n`);
    
    if (existingData) {
      // ========== INCREMENTAL UPDATE MODE ==========
      
      console.log('[4/6] Analyzing differences...\n');
      const diff = PlaylistDiffer.findDifferences(existingData, monthlyPlaylists);
      
      console.log(`  New playlists: ${diff.newPlaylists.length}`);
      console.log(`  Removed playlists: ${diff.removedPlaylists.length}`);
      console.log(`  Existing playlists: ${diff.existingPlaylists.length}\n`);
      
      // Mark removed playlists
      if (diff.removedPlaylists.length > 0) {
        console.log('  Marking removed playlists...');
        for (const removed of diff.removedPlaylists) {
          removed.removed = true;
          removed.removedAt = new Date().toISOString();
          await ChangeLogger.log({
            type: 'playlist_removed',
            playlistId: removed.id,
            playlistName: removed.name,
          });
          console.log(`    - ${removed.name} marked as removed`);
        }
        console.log('');
      }
      
      // Process new playlists
      const newProcessed = [];
      if (diff.newPlaylists.length > 0) {
        console.log('  Processing new playlists...\n');
        
        for (const playlist of diff.newPlaylists) {
          const playlistInfo = appleMusicClient.extractPlaylistInfo(playlist);
          console.log(`    ${playlistInfo.name}`);
          
          const processed = await processNewPlaylist(
            playlist, 
            appleMusicClient, 
            spotifyClient, 
            youtubeClient,
            bandcampClient
          );
          
          if (processed) {
            newProcessed.push(processed);
            await ChangeLogger.log({
              type: 'playlist_added',
              playlistId: processed.id,
              playlistName: processed.name,
              tracksCount: processed.tracks.length,
            });
          }
        }
        
        console.log(`\n  ✓ Processed ${newProcessed.length} new playlists\n`);
      } else {
        console.log('  No new playlists to process\n');
      }
      
      // Retry missing links
      console.log('[5/6] Retrying missing links...\n');
      const missingLinks = PlaylistDiffer.findMissingLinks(diff.existingPlaylists);
      
      console.log(`  Found ${missingLinks.length} tracks with missing links`);
      
      if (missingLinks.length > 0) {
        let spotifyFixed = 0;
        let youtubeFixed = 0;
        let bandcampFixed = 0;
        
        for (const item of missingLinks) {
          if (item.missingSpotify) {
            const spotifyResult = await spotifyClient.findTrack(
              item.track.isrc,
              item.track.title,
              item.track.artist
            );
            if (spotifyResult) {
              item.track.links = item.track.links || {};
              item.track.links.spotify = spotifyResult.url;
              spotifyFixed++;
            }
          }
          
          if (item.missingYoutube && checkYoutubeQuota(youtubeClient, ' during retry')) {
            const youtubeResult = await youtubeClient.findVideo(
              item.track.isrc,
              item.track.title,
              item.track.artist
            );
            if (youtubeResult) {
              item.track.links = item.track.links || {};
              item.track.links.youtube = youtubeResult.url;
              youtubeFixed++;
            }
          }
          
          // Try Bandcamp if missing
          if (item.missingBandcamp) {
            const bandcampResult = await bandcampClient.findTrack(
              item.track.isrc,
              item.track.title,
              item.track.artist,
              item.track.album
            );
            if (bandcampResult) {
              item.track.links = item.track.links || {};
              item.track.links.bandcamp = bandcampResult.url;
              bandcampFixed++;
            }
          }
          
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        console.log(`  ✓ Fixed ${spotifyFixed} Spotify links`);
        console.log(`  ✓ Fixed ${youtubeFixed} YouTube links`);
        console.log(`  ✓ Fixed ${bandcampFixed} Bandcamp links\n`);
      } else {
        console.log('  No missing links to retry\n');
      }
      
      // Merge data
      console.log('[6/6] Merging and saving data...\n');
      
      // Add removed playlists to existing
      diff.existingPlaylists.push(...diff.removedPlaylists);
      
      const mergedData = PlaylistDiffer.mergeData(
        existingData,
        newProcessed,
        diff.existingPlaylists
      );
      
      // Cleanup if requested
      if (cliArgs.cleanupRemoved) {
        const removedCount = mergedData.playlists.filter(p => p.removed).length;
        if (removedCount > 0) {
          console.log(`  🗑️  Cleaning up ${removedCount} removed playlists...`);
          const cleanedData = PlaylistDiffer.cleanupRemoved(mergedData);
          await fs.mkdir(config.dataDir, { recursive: true });
          await fs.writeFile(
            config.outputFile,
            JSON.stringify(cleanedData, null, 2),
            'utf-8'
          );
          await ChangeLogger.log({
            type: 'cleanup_removed',
            removedCount,
          });
        } else {
          console.log('  No removed playlists to clean up');
          await fs.mkdir(config.dataDir, { recursive: true });
          await fs.writeFile(
            config.outputFile,
            JSON.stringify(mergedData, null, 2),
            'utf-8'
          );
        }
      } else {
        await fs.mkdir(config.dataDir, { recursive: true });
        await fs.writeFile(
          config.outputFile,
          JSON.stringify(mergedData, null, 2),
          'utf-8'
        );
      }
      
      console.log(`\n✓ Data saved to: ${config.outputFile}\n`);
      
      console.log('═══════════════════════════════════════');
      console.log('  ✓ INCREMENTAL UPDATE COMPLETED');
      console.log('═══════════════════════════════════════\n');
      
      console.log('Summary:');
      console.log(`  - New playlists added: ${newProcessed.length}`);
      console.log(`  - Playlists marked as removed: ${diff.removedPlaylists.length}`);
      console.log(`  - Total active playlists: ${mergedData.totalPlaylists}`);
      console.log(`  - Total tracks: ${mergedData.totalTracks}\n`);
      
    } else {
      // ========== FULL REFRESH MODE ==========
      
      console.log('[4/6] Fetching tracks from playlists (FULL REFRESH)...\n');
      const processedPlaylists = [];
      let skippedPlaylists = 0;
      
      for (const playlist of monthlyPlaylists) {
        const playlistInfo = appleMusicClient.extractPlaylistInfo(playlist);
        console.log(`  Processing: ${playlistInfo.name}`);
        
        try {
          // Get tracks
          const tracks = await appleMusicClient.getPlaylistTracks(playlist.id);
          console.log(`    - ${tracks.length} tracks found`);
          
          playlistInfo.tracks = tracks.map(track => 
            appleMusicClient.extractTrackInfo(track)
          );
          
          playlistInfo.removed = false;
          playlistInfo.lastUpdated = new Date().toISOString();
          processedPlaylists.push(playlistInfo);
        } catch (error) {
          // Handle 404 or other errors gracefully
          if (error.message.includes('404')) {
            console.log(`    ⚠ Playlist not found or inaccessible (skipping)`);
            skippedPlaylists++;
          } else {
            console.log(`    ⚠ Error: ${error.message} (skipping)`);
            skippedPlaylists++;
          }
        }
      }
      
      console.log(`\n✓ Fetched ${processedPlaylists.length} playlists with tracks`);
      if (skippedPlaylists > 0) {
        console.log(`  ⚠ Skipped ${skippedPlaylists} playlists due to errors\n`);
      } else {
        console.log('');
      }
      
      // Match tracks with Spotify and YouTube
      console.log('[5/6] Matching tracks with Spotify, YouTube, and Bandcamp...\n');
      
      let totalTracks = 0;
      let spotifyMatches = 0;
      let youtubeMatches = 0;
      let bandcampMatches = 0;
      
      for (const playlist of processedPlaylists) {
        console.log(`  ${playlist.name}:`);
        
        for (const track of playlist.tracks) {
          totalTracks++;
          
          // Search on Spotify
          const spotifyResult = await spotifyClient.findTrack(
            track.isrc,
            track.title,
            track.artist
          );
          
          if (spotifyResult) {
            track.links = track.links || {};
            track.links.spotify = spotifyResult.url;
            spotifyMatches++;
          }
          
          // Search on YouTube (only if quota not exhausted)
          if (checkYoutubeQuota(youtubeClient)) {
            const youtubeResult = await youtubeClient.findVideo(
              track.isrc,
              track.title,
              track.artist
            );
            
            if (youtubeResult) {
              track.links = track.links || {};
              track.links.youtube = youtubeResult.url;
              youtubeMatches++;
            }
          }
          
          // Search on Bandcamp
          const bandcampResult = await bandcampClient.findTrack(
            track.isrc,
            track.title,
            track.artist,
            track.album
          );
          
          if (bandcampResult) {
            track.links = track.links || {};
            track.links.bandcamp = bandcampResult.url;
            bandcampMatches++;
          }
          
          // Always add Apple Music link
          track.links = track.links || {};
          track.links.appleMusic = track.appleMusic.url;
          
          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
        console.log(`    ✓ Completed`);
      }
      
      console.log(`\n✓ Matching complete:`);
      console.log(`  - Total tracks: ${totalTracks}`);
      console.log(`  - Spotify matches: ${spotifyMatches} (${Math.round(spotifyMatches/totalTracks*100)}%)`);
      console.log(`  - YouTube matches: ${youtubeMatches} (${Math.round(youtubeMatches/totalTracks*100)}%)`);
      console.log(`  - Bandcamp matches: ${bandcampMatches} (${Math.round(bandcampMatches/totalTracks*100)}%)\n`);
      
      // Sort playlists by date (newest first)
      processedPlaylists.sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });
      
      // Save to JSON
      console.log('[6/6] Saving data...\n');
      
      const output = {
        generated: new Date().toISOString(),
        totalPlaylists: processedPlaylists.length,
        totalTracks: totalTracks,
        playlists: processedPlaylists,
      };
      
      await fs.mkdir(config.dataDir, { recursive: true });
      await fs.writeFile(
        config.outputFile,
        JSON.stringify(output, null, 2),
        'utf-8'
      );
      
      console.log(`✓ Data saved to: ${config.outputFile}\n`);
      
      console.log('═══════════════════════════════════════');
      console.log('  ✓ FULL REFRESH COMPLETED');
      console.log('═══════════════════════════════════════\n');
    }
    
    console.log('Next steps:');
    console.log('  1. Run: npm run dev');
    console.log('  2. Open: http://localhost:8000\n');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

main();
