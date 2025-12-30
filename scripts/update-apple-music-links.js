import fs from 'fs/promises';
import { AppleMusicClient } from './lib/apple-music.js';
import { config } from './config.js';

const DATA_FILE = './data/playlists.json';

async function updateAppleMusicLinksFromAPI() {
  console.log('═══════════════════════════════════════');
  console.log('  UPDATE APPLE MUSIC LINKS FROM API');
  console.log('═══════════════════════════════════════\n');

  // Load existing data
  console.log('📂 Loading playlists data...');
  const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf-8'));
  console.log(`✓ Loaded ${data.playlists.length} playlists\n`);

  // Initialize Apple Music client
  console.log('🎵 Connecting to Apple Music...');
  const appleMusicClient = new AppleMusicClient(
    config.appleMusicCookiesPath,
    config.appleMusicJwt
  );
  await appleMusicClient.loadCookies();
  console.log();

  // Get all playlists from Apple Music
  console.log('📥 Fetching playlists from Apple Music API...');
  const applePlaylists = await appleMusicClient.getUserPlaylists();
  console.log(`✓ Found ${applePlaylists.length} playlists from API\n`);

  // Create a map of playlist name -> Apple Music playlist
  const applePlaylistMap = new Map();
  for (const applePlaylist of applePlaylists) {
    const name = applePlaylist.attributes?.name;
    if (name) {
      applePlaylistMap.set(name, applePlaylist);
    }
  }

  let updatedPlaylists = 0;
  let updatedTracks = 0;
  let failedTracks = 0;
  let skippedPlaylists = 0;

  // Process each playlist
  for (let i = 0; i < data.playlists.length; i++) {
    const playlist = data.playlists[i];
    const progress = `[${i + 1}/${data.playlists.length}]`;
    
    console.log(`${progress} ${playlist.name}`);

    // Find corresponding Apple Music playlist
    const applePlaylist = applePlaylistMap.get(playlist.name);
    
    if (!applePlaylist) {
      console.log(`  ⚠ Not found in Apple Music (skipping)`);
      skippedPlaylists++;
      continue;
    }

    try {
      // Get tracks from Apple Music API
      const appleTracks = await appleMusicClient.getPlaylistTracks(applePlaylist.id);
      
      // Create a map of "artist - title" -> Apple Music track info
      const appleTrackMap = new Map();
      for (const appleTrack of appleTracks) {
        const trackInfo = appleMusicClient.extractTrackInfo(appleTrack);
        const key = `${trackInfo.artist.toLowerCase()} - ${trackInfo.title.toLowerCase()}`;
        appleTrackMap.set(key, trackInfo);
      }

      // Update each track in our data
      let playlistUpdated = false;
      for (const track of playlist.tracks) {
        const key = `${track.artist.toLowerCase()} - ${track.title.toLowerCase()}`;
        const appleTrackInfo = appleTrackMap.get(key);
        
        if (appleTrackInfo && appleTrackInfo.appleMusic.url) {
          const oldUrl = track.links?.appleMusic;
          const newUrl = appleTrackInfo.appleMusic.url;
          
          // Update if different
          if (oldUrl !== newUrl) {
            if (!track.links) track.links = {};
            track.links.appleMusic = newUrl;
            updatedTracks++;
            playlistUpdated = true;
          }
        } else {
          failedTracks++;
        }
      }

      if (playlistUpdated) {
        updatedPlaylists++;
        console.log(`  ✓ Updated ${playlist.tracks.length} tracks`);
      } else {
        console.log(`  - No changes needed`);
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      console.log(`  ✗ Error: ${error.message}`);
      skippedPlaylists++;
    }
  }

  console.log('\n═══════════════════════════════════════');
  console.log(`✓ Playlists updated: ${updatedPlaylists}`);
  console.log(`✓ Tracks updated: ${updatedTracks}`);
  console.log(`✗ Tracks failed: ${failedTracks}`);
  console.log(`⊘ Playlists skipped: ${skippedPlaylists}`);
  console.log('═══════════════════════════════════════\n');

  // Save updated data
  console.log('💾 Saving updated data...');
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
  
  console.log('✓ Done!\n');
}

updateAppleMusicLinksFromAPI().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
