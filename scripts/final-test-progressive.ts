#!/usr/bin/env npx tsx

/**
 * Final test of progressive generation with all fixes
 */

async function testProgressive() {
  const message = '2 weeks trip to London and Paris, one week in each city, starting March 15, 2024';

  console.log('🚀 Starting FINAL progressive generation test');
  console.log('Message:', message);
  console.log('');

  // Start generation
  const startRes = await fetch('http://localhost:9002/api/ai/progressive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      sessionId: 'final-test-' + Date.now()
    })
  });

  const startData = await startRes.json();
  console.log('📍 Generation started:', startData.data.generationId);
  console.log('');

  // Poll for updates
  const genId = startData.data.generationId;
  let complete = false;
  let pollCount = 0;
  const maxPolls = 60; // 2 minutes max
  let lastStatus = '';

  while (!complete && pollCount < maxPolls) {
    pollCount++;

    // Wait before polling (except first one)
    if (pollCount > 1) {
      await new Promise(r => setTimeout(r, 2000));
    }

    const pollRes = await fetch(`http://localhost:9002/api/ai/progressive?generationId=${genId}`);
    const pollData = await pollRes.json();
    const progress = pollData.data;

    // Only log when status changes
    if (progress.status !== lastStatus) {
      console.log(`📊 Poll #${pollCount} - Status: ${progress.status} (${progress.progress}%)`);

      if (progress.metadata) {
        console.log('  ✅ Metadata ready:', progress.metadata.destinations);
      }

      if (progress.allCities && progress.allCities.length > 0) {
        console.log('  🏙️ Cities generated:', progress.allCities.map(c => c.city).join(', '));
      }

      lastStatus = progress.status;
    }

    if (progress.type === 'complete') {
      complete = true;
      console.log('\n🎉 GENERATION COMPLETE!');
      console.log('Total days in itinerary:', progress.itinerary.itinerary?.length);

      // Count days per city
      const londonDays = progress.itinerary.itinerary.filter(d => d.title.includes('London')).length;
      const parisDays = progress.itinerary.itinerary.filter(d => d.title.includes('Paris')).length;

      console.log('Breakdown:');
      console.log(`  London: ${londonDays} days`);
      console.log(`  Paris: ${parisDays} days`);

      if (londonDays === 7 && parisDays === 7) {
        console.log('\n✅✅✅ SUCCESS: Both cities have correct day counts!');
      } else {
        console.log('\n❌ ERROR: Day counts are incorrect!');
      }
    } else if (progress.type === 'error') {
      complete = true;
      console.log('\n❌ Generation failed:', progress.message);
    }
  }

  if (!complete) {
    console.log('\n⚠️ Generation did not complete after', maxPolls, 'polls');
  }
}

testProgressive().catch(console.error);