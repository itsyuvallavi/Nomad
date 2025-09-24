#!/usr/bin/env npx tsx

/**
 * Quick test for progressive generation with detailed server logs
 */

async function testProgressive() {
  const message = '2 weeks trip to London and Paris, one week in each city, starting March 15, 2024';

  console.log('🚀 Starting progressive generation test');
  console.log('Message:', message);
  console.log('');

  // Start generation
  const startRes = await fetch('http://localhost:9002/api/ai/progressive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      sessionId: 'test-' + Date.now()
    })
  });

  const startData = await startRes.json();
  console.log('📍 Generation started:', startData.data.generationId);
  console.log('');

  // Poll for updates
  const genId = startData.data.generationId;
  let complete = false;
  let pollCount = 0;
  const maxPolls = 30;

  while (!complete && pollCount < maxPolls) {
    pollCount++;

    // Wait before polling (except first one)
    if (pollCount > 1) {
      await new Promise(r => setTimeout(r, 2000));
    }

    const pollRes = await fetch(`http://localhost:9002/api/ai/progressive?generationId=${genId}`);
    const pollData = await pollRes.json();
    const progress = pollData.data;

    console.log(`📊 Poll #${pollCount}:`, {
      status: progress.status,
      type: progress.type,
      progress: progress.progress + '%',
      message: progress.message
    });

    // Check what data we have
    if (progress.metadata) {
      console.log('  ✅ Has metadata:', {
        title: progress.metadata.title,
        destinations: progress.metadata.destinations,
        daysPerCity: progress.metadata.daysPerCity
      });
    }

    if (progress.cityData) {
      console.log('  ✅ Has city data for:', progress.city, {
        days: progress.cityData.days?.length
      });
    }

    if (progress.allCities) {
      console.log('  📍 All cities so far:', progress.allCities.map(c => c.city).join(', '));
    }

    if (progress.itinerary) {
      console.log('  ✅ Has complete itinerary:', {
        totalDays: progress.itinerary.itinerary?.length
      });
    }

    if (progress.type === 'complete' || progress.type === 'error') {
      complete = true;
      console.log('\n🎉 Generation complete!');
    }

    console.log('');
  }

  if (!complete) {
    console.log('⚠️ Generation did not complete after', maxPolls, 'polls');
  }
}

testProgressive().catch(console.error);