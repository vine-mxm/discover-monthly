import { AppleMusicClient } from './lib/apple-music.js';
import { config } from './config.js';

async function testCatalogIds() {
  console.log('Testing Apple Music catalogId extraction...\n');

  const appleMusicClient = new AppleMusicClient(
    config.appleMusicCookiesPath,
    config.appleMusicJwt
  );
  
  await appleMusicClient.loadCookies();
  console.log('✓ Cookies loaded\n');

  // Get first playlist
  const playlists = await appleMusicClient.getUserPlaylists();
  console.log(`✓ Found ${playlists.length} playlists\n`);

  if (playlists.length === 0) {
    console.log('No playlists found!');
    return;
  }

  const firstPlaylist = playlists[0];
  console.log(`Testing with playlist: ${firstPlaylist.attributes.name}\n`);

  // Get first 3 tracks
  const tracks = await appleMusicClient.getPlaylistTracks(firstPlaylist.id);
  console.log(`✓ Found ${tracks.length} tracks\n`);

  console.log('Checking first 3 tracks for catalogId:\n');
  
  for (let i = 0; i < Math.min(3, tracks.length); i++) {
    const track = tracks[i];
    const trackInfo = appleMusicClient.extractTrackInfo(track);
    
    console.log(`[${i + 1}] ${trackInfo.artist} - ${trackInfo.title}`);
    console.log(`    Library ID: ${trackInfo.appleMusic.id}`);
    console.log(`    Catalog ID: ${trackInfo.appleMusic.catalogId || 'NOT FOUND'}`);
    console.log(`    URL: ${trackInfo.appleMusic.url}`);
    console.log(`    Has playParams: ${track.attributes.playParams ? 'YES' : 'NO'}`);
    
    if (track.attributes.playParams) {
      console.log(`    playParams keys: ${Object.keys(track.attributes.playParams).join(', ')}`);
    }
    console.log();
  }
}

testCatalogIds().catch(error => {
  console.error('Error:', error.message);
  process.exit(1);
});
