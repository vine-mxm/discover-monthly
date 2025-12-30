import fs from 'fs/promises';
import { AppleMusicScraperClient } from './lib/apple-music-scraper.js';

const DATA_FILE = './data/playlists.json';

async function updateAppleMusicLinksTest() {
  console.log('Testing Apple Music link update...\n');

  // Load existing data
  const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf-8'));
  
  // Initialize scraper
  const appleMusicScraper = new AppleMusicScraperClient();

  // Get first 5 tracks with library links
  const tracksToTest = [];
  
  for (const playlist of data.playlists) {
    for (const track of playlist.tracks) {
      if (track.links?.appleMusic?.includes('/library/')) {
        tracksToTest.push({
          playlist: playlist.name,
          track: track,
        });
        
        if (tracksToTest.length >= 5) break;
      }
    }
    if (tracksToTest.length >= 5) break;
  }

  console.log(`Testing with ${tracksToTest.length} tracks:\n`);

  // Update tracks
  for (let i = 0; i < tracksToTest.length; i++) {
    const { playlist, track } = tracksToTest[i];
    
    console.log(`[${i + 1}/${tracksToTest.length}] ${track.artist} - ${track.title}`);
    console.log(`  Old: ${track.links.appleMusic}`);

    const result = await appleMusicScraper.searchAppleMusic(track.artist, track.title);
    
    if (result) {
      console.log(`  New: ${result.url}`);
      console.log(`  ✓ Found!\n`);
    } else {
      console.log(`  ✗ Not found\n`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

updateAppleMusicLinksTest().catch(console.error);
