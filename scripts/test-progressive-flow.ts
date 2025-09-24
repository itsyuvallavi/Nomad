#!/usr/bin/env npx tsx

/**
 * Test complete progressive flow
 */

import 'dotenv/config';

async function testFlow() {
  console.log('🧪 Testing Complete Progressive Flow\n');
  console.log('API Key available:', !!process.env.OPENAI_API_KEY);

  const message = 'make a 2-weeks trip, one week in london, second week in paris. starting october 2nd';

  // Start generation
  console.log('📡 Starting generation...');
  const startResponse = await fetch('http://localhost:9002/api/ai/progressive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      sessionId: 'test-' + Date.now()
    })
  });

  if (!startResponse.ok) {
    console.error('❌ Failed to start:', await startResponse.text());
    return;
  }

  const { data } = await startResponse.json();
  const genId = data.generationId;
  console.log('✅ Started:', genId);

  // Track all status changes
  const statusHistory: string[] = [];
  let lastStatus = '';

  for (let i = 0; i < 100; i++) {
    await new Promise(r => setTimeout(r, 1000));

    const pollResponse = await fetch(`http://localhost:9002/api/ai/progressive?generationId=${genId}`);
    const { data: progress } = await pollResponse.json();

    if (progress.status !== lastStatus) {
      const statusMsg = `[${i}s] ${progress.status} (${progress.progress}%)`;
      statusHistory.push(statusMsg);
      console.log(statusMsg);
      lastStatus = progress.status;
    }

    if (progress.type === 'complete') {
      console.log('\n✅ Complete!');
      console.log('Total days:', progress.itinerary?.itinerary?.length);
      console.log('Destination:', progress.itinerary?.destination);
      console.log('Title:', progress.itinerary?.title);

      // Count days per city
      const cityDays: Record<string, number> = {};
      progress.itinerary?.itinerary?.forEach((day: any) => {
        const city = day.title?.match(/Day \d+ - (.+)/)?.[1] || 'Unknown';
        cityDays[city] = (cityDays[city] || 0) + 1;
      });
      console.log('Days per city:', cityDays);
      console.log('Status progression:', statusHistory.join(' → '));
      break;
    }

    if (progress.type === 'error') {
      console.error('\n❌ Error:', progress.message);
      if (progress.stack) {
        console.error('Stack:', progress.stack.split('\n').slice(0, 3).join('\n'));
      }
      break;
    }
  }
}

testFlow().catch(console.error);