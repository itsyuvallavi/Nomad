#!/usr/bin/env npx tsx

/**
 * Test polling with detailed logs
 */

import 'dotenv/config';

async function testPolling() {
  const message = '2 weeks trip to London and Paris, one week in each city';

  console.log('🚀 Starting test with message:', message);
  console.log('');

  // Start generation
  const startResponse = await fetch('http://localhost:9002/api/ai/progressive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId: 'test-' + Date.now() })
  });

  const { data } = await startResponse.json();
  const genId = data.generationId;
  console.log('📍 Generation ID:', genId);
  console.log('');

  // Poll immediately and show all status changes
  for (let i = 0; i < 20; i++) {
    // First poll immediate, then wait
    if (i > 0) {
      await new Promise(r => setTimeout(r, 1000));
    }

    const pollResponse = await fetch(`http://localhost:9002/api/ai/progressive?generationId=${genId}`);
    const { data: progress } = await pollResponse.json();

    const time = new Date().toISOString().split('T')[1].slice(0, 8);
    console.log(`Poll #${i + 1} @ ${time}:`, {
      status: progress.status,
      type: progress.type,
      progress: progress.progress + '%',
      hasMetadata: !!progress.metadata,
      hasCityData: !!progress.cityData,
      hasItinerary: !!progress.itinerary
    });

    if (progress.type === 'complete' || progress.type === 'error') {
      console.log('\n📊 Final status:', progress.type);
      if (progress.itinerary) {
        console.log('Days generated:', progress.itinerary.itinerary?.length);
      }
      break;
    }
  }
}

testPolling().catch(console.error);