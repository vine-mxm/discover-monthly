import { BandcampClient } from './lib/bandcamp.js';

async function testBandcamp() {
  console.log('═══════════════════════════════════════');
  console.log('  BANDCAMP CLIENT TEST');
  console.log('═══════════════════════════════════════\n');

  const client = new BandcampClient();

  // Test cases: mix of mainstream and indie artists
  const testTracks = [
    {
      title: 'Creep',
      artist: 'Radiohead',
      album: 'Pablo Honey',
      description: 'Mainstream rock band'
    },
    {
      title: 'Float On',
      artist: 'Modest Mouse',
      album: 'Good News for People Who Love Bad News',
      description: 'Indie rock classic'
    },
    {
      title: 'Such Great Heights',
      artist: 'The Postal Service',
      album: 'Give Up',
      description: 'Indie electronic'
    },
    {
      title: 'New Slang',
      artist: 'The Shins',
      album: 'Oh, Inverted World',
      description: 'Indie pop'
    },
    {
      title: 'Fake Plastic Trees',
      artist: 'Radiohead',
      album: 'The Bends',
      description: 'Another Radiohead track'
    }
  ];

  let successCount = 0;
  let failCount = 0;

  for (const [index, track] of testTracks.entries()) {
    console.log(`\n[Test ${index + 1}/${testTracks.length}] ${track.artist} - ${track.title}`);
    console.log(`  Description: ${track.description}`);
    
    try {
      const result = await client.findTrack(
        null, // no ISRC
        track.title,
        track.artist,
        track.album
      );

      if (result) {
        console.log(`  ✓ FOUND: ${result.url}`);
        console.log(`    Type: ${result.type}`);
        console.log(`    Matched by: ${result.matchedBy}`);
        successCount++;
      } else {
        console.log(`  ✗ NOT FOUND`);
        failCount++;
      }
    } catch (error) {
      console.log(`  ✗ ERROR: ${error.message}`);
      failCount++;
    }

    // Rate limiting already handled by client
  }

  console.log('\n═══════════════════════════════════════');
  console.log('  TEST SUMMARY');
  console.log('═══════════════════════════════════════\n');
  console.log(`  Total tests: ${testTracks.length}`);
  console.log(`  ✓ Successful: ${successCount} (${Math.round(successCount/testTracks.length*100)}%)`);
  console.log(`  ✗ Failed: ${failCount} (${Math.round(failCount/testTracks.length*100)}%)`);
  console.log('');
}

testBandcamp().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
