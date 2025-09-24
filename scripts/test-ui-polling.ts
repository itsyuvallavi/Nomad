#!/usr/bin/env npx tsx

/**
 * Test UI polling for progressive updates
 */

import 'dotenv/config';

async function testUIPolling() {
  console.log('🧪 Testing UI Polling Progressive Updates\n');

  const message = 'Plan a 10 day trip to Paris and Rome, 5 days each, starting January 30, 2025';
  const sessionId = `test-${Date.now()}`;

  // Start generation
  console.log('📡 Starting generation...');
  const startResponse = await fetch('http://localhost:9002/api/ai/progressive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId })
  });

  if (!startResponse.ok) {
    console.error('❌ Failed to start:', await startResponse.text());
    return;
  }

  const { data } = await startResponse.json();
  const generationId = data.generationId;
  console.log(`✅ Started: ${generationId}\n`);

  // Poll and show all status changes
  let attempts = 0;
  const statuses = new Set();

  while (attempts < 60) {
    await new Promise(resolve => setTimeout(resolve, 2000));

    const progressResponse = await fetch(`http://localhost:9002/api/ai/progressive?generationId=${generationId}`);
    const { data: progress } = await progressResponse.json();

    // Track unique statuses
    const statusKey = `${progress.status}-${progress.type}`;
    if (!statuses.has(statusKey)) {
      statuses.add(statusKey);

      const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
      console.log(`[${timestamp}] Status: ${progress.status}, Type: ${progress.type}, Progress: ${progress.progress}%`);

      if (progress.status === 'metadata_ready') {
        console.log('   ✨ Metadata available - UI should show trip overview');
      } else if (progress.status === 'city_complete') {
        console.log(`   🏙️ ${progress.city} complete - UI should show these days`);
      }
    }

    if (progress.type === 'complete') {
      console.log('\n✅ Generation complete!');
      console.log(`   Unique statuses seen: ${statuses.size}`);
      console.log(`   Statuses: ${Array.from(statuses).join(', ')}`);
      break;
    }

    if (progress.type === 'error') {
      console.error('❌ Error:', progress.message);
      break;
    }

    attempts++;
  }
}

testUIPolling().catch(console.error);