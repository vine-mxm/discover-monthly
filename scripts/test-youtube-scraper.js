import { YouTubeScraperClient } from './lib/youtube-scraper.js';

async function test() {
  console.log('Testing YouTubeScraperClient with ISRC + fallback...\n');
  
  const client = new YouTubeScraperClient();
  
  // Test cases: mix of valid ISRC and null ISRC (like real data)
  const testCases = [
    { isrc: 'USVR10100017', title: 'Lateralus', artist: 'Tool' },
    { isrc: null, title: 'Hunger', artist: 'Worm Shepherd' },
    { isrc: null, title: 'Paradox', artist: 'Roklem & Sebalo' },
    { isrc: null, title: 'Move Too Slow', artist: 'Cesco' },
  ];
  
  for (const test of testCases) {
    console.log(`\n${test.artist} - ${test.title}`);
    console.log(`ISRC: ${test.isrc || 'null (will use fallback)'}`);
    
    const result = await client.findVideo(test.isrc, test.title, test.artist);
    
    if (result) {
      console.log(`✓ Found: ${result.url}`);
    } else {
      console.log(`✗ Not found`);
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n✓ Test completed!\n');
}

test().catch(console.error);
