import fs from 'fs/promises';

const DATA_FILE = './data/playlists.json';

async function removeLibraryLinks() {
  console.log('═══════════════════════════════════════');
  console.log('  REMOVE BROKEN APPLE MUSIC LINKS');
  console.log('═══════════════════════════════════════\n');

  // Load existing data
  console.log('📂 Loading playlists data...');
  const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf-8'));
  
  let removed = 0;
  let kept = 0;

  for (const playlist of data.playlists) {
    for (const track of playlist.tracks) {
      if (track.links?.appleMusic) {
        // Check if it's a library link (private)
        if (track.links.appleMusic.includes('/library/')) {
          delete track.links.appleMusic;
          removed++;
        } else {
          kept++;
        }
      }
    }
  }

  console.log(`✓ Removed ${removed} private library links`);
  console.log(`✓ Kept ${kept} public catalog links\n`);

  // Save updated data
  console.log('💾 Saving updated data...');
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
  
  console.log('✓ Done!\n');
  console.log('Note: You can manually add public Apple Music links later');
  console.log('or try the update script from a different IP/location.\n');
}

removeLibraryLinks().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
