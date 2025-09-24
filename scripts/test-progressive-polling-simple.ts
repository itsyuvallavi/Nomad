#!/usr/bin/env npx tsx

/**
 * Simple test for progressive polling
 */

import 'dotenv/config';

async function test() {
  // Direct test with simple message
  const message = '2 weeks to London and Brussels';

  console.log('Starting generation...');
  const start = await fetch('http://localhost:9002/api/ai/progressive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      sessionId: 'test-' + Date.now()
    })
  });

  const { data } = await start.json();
  console.log('Generation ID:', data.generationId);

  // Poll 10 times
  for (let i = 0; i < 10; i++) {
    await new Promise(r => setTimeout(r, 3000));

    const poll = await fetch(`http://localhost:9002/api/ai/progressive?generationId=${data.generationId}`);
    const { data: progress } = await poll.json();

    console.log(`Poll ${i + 1}: status=${progress.status}, type=${progress.type}, progress=${progress.progress}%`);

    if (progress.type === 'complete' || progress.type === 'error') {
      console.log('Done!');
      break;
    }
  }
}

test().catch(console.error);