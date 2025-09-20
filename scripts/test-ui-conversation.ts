/**
 * Test UI conversation flow - simulates the exact issue
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

async function testUIConversation() {
  console.log('🔍 Testing UI Conversation Flow');
  console.log('================================\n');

  const API_URL = 'http://localhost:9002/api/ai';
  const sessionId = `test-${Date.now()}`;
  let conversationContext: string | undefined;

  // Step 1: Initial request
  console.log('Step 1: "plan a 7 days trip to madrid"');
  console.time('Response time');

  let response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'plan a 7 days trip to madrid',
      sessionId
    })
  });

  console.timeEnd('Response time');
  let result = await response.json();

  console.log('Type:', result.data?.type);
  console.log('Message:', result.data?.message);
  console.log('Awaiting:', result.data?.awaitingInput);
  conversationContext = result.data?.conversationContext;

  if (result.data?.type !== 'question') {
    console.log('❌ Expected question about dates');
    return;
  }

  // Step 2: Reply with "next week"
  console.log('\nStep 2: "next week"');
  console.time('Response time');

  response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'next week',
      sessionId,
      conversationContext
    })
  });

  console.timeEnd('Response time');
  result = await response.json();

  console.log('Type:', result.data?.type);

  if (result.data?.type === 'question') {
    console.log('Still asking:', result.data?.message);
    conversationContext = result.data?.conversationContext;

    // Step 3: Try more specific "On monday next week"
    console.log('\nStep 3: "On monday next week"');
    console.time('Response time');

    response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'On monday next week',
        sessionId,
        conversationContext
      })
    });

    console.timeEnd('Response time');
    result = await response.json();

    console.log('Type:', result.data?.type);
  }

  if (result.data?.type === 'itinerary') {
    console.log('✅ Itinerary generated!');
    console.log('Days:', result.data?.itinerary?.itinerary?.length);
  } else {
    console.log('❌ Failed to generate after providing date');
    console.log('Response:', result.data);
  }

  console.log('\n================================');
  console.log('Test complete');
}

// Check if server is running
fetch('http://localhost:9002/api/ai')
  .then(() => {
    console.log('✅ Server is running\n');
    testUIConversation().catch(console.error);
  })
  .catch(() => {
    console.log('❌ Server not running!');
    console.log('Please start with: npm run dev');
  });