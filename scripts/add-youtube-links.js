import { YouTubeScraperClient } from './lib/youtube-scraper.js';
import fs from 'fs/promises';

async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  YouTube Links Batch Processor');
  console.log('═══════════════════════════════════════\n');

  const dataFile = './data/playlists.json';
  const batchSize = 50; // Process 50 tracks at a time
  const delayMs = 100; // 100ms between requests (faster)

  try {
    // Load existing data
    console.log('[1/4] Loading playlists data...\n');
    const rawData = await fs.readFile(dataFile, 'utf-8');
    const data = JSON.parse(rawData);
    
    // Find tracks without YouTube links
    console.log('[2/4] Finding tracks without YouTube links...\n');
    const tracksToProcess = [];
    
    for (const playlist of data.playlists) {
      for (const track of playlist.tracks) {
        if (!track.links?.youtube) {
          tracksToProcess.push({ playlist, track });
        }
      }
    }
    
    console.log(`  Found ${tracksToProcess.length} tracks without YouTube links\n`);
    
    if (tracksToProcess.length === 0) {
      console.log('✓ All tracks already have YouTube links!\n');
      return;
    }
    
    // Initialize YouTube client
    console.log('[3/4] Initializing YouTube scraper...\n');
    const youtubeClient = new YouTubeScraperClient();
    console.log('✓ YouTube scraper initialized\n');
    
    // Process in batches
    console.log(`[4/4] Processing tracks (${batchSize} at a time, saving after each batch)...\n`);
    
    let totalProcessed = 0;
    let totalFound = 0;
    const batches = Math.ceil(tracksToProcess.length / batchSize);
    
    for (let i = 0; i < tracksToProcess.length; i += batchSize) {
      const batch = tracksToProcess.slice(i, i + batchSize);
      const batchNum = Math.floor(i / batchSize) + 1;
      
      console.log(`  Batch ${batchNum}/${batches} (tracks ${i + 1}-${Math.min(i + batchSize, tracksToProcess.length)}):`);
      
      let batchFound = 0;
      
      for (const { track } of batch) {
        const result = await youtubeClient.findVideo(track.isrc, track.title, track.artist);
        
        if (result) {
          track.links = track.links || {};
          track.links.youtube = result.url;
          batchFound++;
          totalFound++;
        }
        
        totalProcessed++;
        
        // Progress indicator
        if (totalProcessed % 10 === 0) {
          process.stdout.write('.');
        }
        
        // Delay between requests
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
      
      console.log(`\n    ✓ Batch complete: ${batchFound}/${batch.length} links found`);
      
      // Save after each batch
      console.log(`    💾 Saving progress...`);
      await fs.writeFile(dataFile, JSON.stringify(data, null, 2), 'utf-8');
      console.log(`    ✓ Saved\n`);
    }
    
    console.log('═══════════════════════════════════════');
    console.log('  ✓ PROCESSING COMPLETED');
    console.log('═══════════════════════════════════════\n');
    
    console.log('Summary:');
    console.log(`  - Tracks processed: ${totalProcessed}`);
    console.log(`  - YouTube links found: ${totalFound} (${Math.round(totalFound/totalProcessed*100)}%)`);
    console.log(`  - Tracks still missing: ${totalProcessed - totalFound}\n`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
}

main();
