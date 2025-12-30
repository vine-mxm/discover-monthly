import { AppleMusicScraperClient } from './lib/apple-music-scraper.js';

async function test() {
  const scraper = new AppleMusicScraperClient();
  
  console.log('Testing Apple Music scraper...\n');
  
  // Test with a well-known song
  console.log('Test 1: Searching for "Metallica - Enter Sandman"');
  const result1 = await scraper.searchAppleMusic('Metallica', 'Enter Sandman');
  console.log('Result:', result1);
  console.log();
  
  // Test with another song
  console.log('Test 2: Searching for "Daft Punk - Get Lucky"');
  const result2 = await scraper.searchAppleMusic('Daft Punk', 'Get Lucky');
  console.log('Result:', result2);
  console.log();
  
  // Test with a song that might not exist
  console.log('Test 3: Searching for "Nonexistent Artist - Fake Song"');
  const result3 = await scraper.searchAppleMusic('Nonexistent Artist', 'Fake Song');
  console.log('Result:', result3);
}

test().catch(console.error);
