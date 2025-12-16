import { AppleMusicClient } from './lib/apple-music.js';
import { SpotifyClient } from './lib/spotify.js';
import { YouTubeClient } from './lib/youtube.js';
import { config, validateConfig } from './config.js';
import fs from 'fs/promises';

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  MUSIC PORTAL - Playlist Fetcher');
  console.log('═══════════════════════════════════════\n');

  try {
    // Validate configuration
    validateConfig();
    
    // Initialize clients
    console.log('[1/5] Initializing API clients...\n');
    
    const appleMusicClient = new AppleMusicClient(config.appleMusicCookiesPath);
    await appleMusicClient.loadCookies();
    
    const spotifyClient = new SpotifyClient(
      config.spotify.clientId,
      config.spotify.clientSecret
    );
    await spotifyClient.authenticate();
    
    const youtubeClient = new YouTubeClient(config.youtube.apiKey);
    console.log('✓ YouTube client initialized\n');
    
    // Fetch playlists from Apple Music
    console.log('[2/5] Fetching playlists from Apple Music...\n');
    const allPlaylists = await appleMusicClient.getUserPlaylists();
    
    // Filter playlists by naming pattern (YYYY.MM)
    const monthlyPlaylists = allPlaylists.filter(playlist => {
      const name = playlist.attributes?.name || '';
      return config.playlistPattern.test(name);
    });
    
    console.log(`✓ Found ${monthlyPlaylists.length} monthly playlists\n`);
    
    // Process each playlist
    console.log('[3/5] Fetching tracks from playlists...\n');
    const processedPlaylists = [];
    
    for (const playlist of monthlyPlaylists) {
      const playlistInfo = appleMusicClient.extractPlaylistInfo(playlist);
      console.log(`  Processing: ${playlistInfo.name}`);
      
      // Get tracks
      const tracks = await appleMusicClient.getPlaylistTracks(playlist.id);
      console.log(`    - ${tracks.length} tracks found`);
      
      playlistInfo.tracks = tracks.map(track => 
        appleMusicClient.extractTrackInfo(track)
      );
      
      processedPlaylists.push(playlistInfo);
    }
    
    console.log(`\n✓ Fetched ${processedPlaylists.length} playlists with tracks\n`);
    
    // Match tracks with Spotify and YouTube
    console.log('[4/5] Matching tracks with Spotify and YouTube...\n');
    
    let totalTracks = 0;
    let spotifyMatches = 0;
    let youtubeMatches = 0;
    
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
        
        // Search on YouTube
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
        
        // Always add Apple Music link
        track.links = track.links || {};
        track.links.appleMusic = track.appleMusic.url;
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`    ✓ Completed`);
    }
    
    console.log(`\n✓ Matching complete:`);
    console.log(`  - Total tracks: ${totalTracks}`);
    console.log(`  - Spotify matches: ${spotifyMatches} (${Math.round(spotifyMatches/totalTracks*100)}%)`);
    console.log(`  - YouTube matches: ${youtubeMatches} (${Math.round(youtubeMatches/totalTracks*100)}%)\n`);
    
    // Sort playlists by date (newest first)
    processedPlaylists.sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
    
    // Save to JSON
    console.log('[5/5] Saving data...\n');
    
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
    console.log('  ✓ COMPLETED SUCCESSFULLY');
    console.log('═══════════════════════════════════════\n');
    
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
