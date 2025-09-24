#!/usr/bin/env npx tsx

/**
 * Test UI progressive generation via API
 */

import 'dotenv/config';

async function testUIProgressive() {
  console.log('🧪 Testing UI Progressive Generation\n');

  const message = '2 weeks trip to London and Brussels, one week in each city';
  const sessionId = `test-${Date.now()}`;

  // Start generation
  console.log('📡 Starting progressive generation...');
  console.log(`   Message: "${message}"`);

  const startResponse = await fetch('http://localhost:9002/api/ai/progressive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId })
  });

  if (!startResponse.ok) {
    console.error('❌ Failed to start generation:', await startResponse.text());
    return;
  }

  const { data } = await startResponse.json();
  const generationId = data.generationId;
  console.log(`✅ Generation started: ${generationId}\n`);

  // Poll for progress
  let attempts = 0;
  const maxAttempts = 60; // 5 minutes
  let lastStatus = '';

  while (attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 3000)); // Poll every 3 seconds

    const progressResponse = await fetch(`http://localhost:9002/api/ai/progressive?generationId=${generationId}`);
    if (!progressResponse.ok) {
      console.error('❌ Failed to get progress');
      break;
    }

    const { data: progress } = await progressResponse.json();

    // Only log if status changed
    if (progress.status !== lastStatus) {
      console.log(`📊 Progress Update:`);
      console.log(`   Status: ${progress.status}`);
      console.log(`   Progress: ${progress.progress}%`);
      console.log(`   Message: ${progress.message}`);

      if (progress.status === 'metadata_ready') {
        console.log(`   ✨ Metadata:`, {
          title: progress.metadata?.title,
          destinations: progress.metadata?.destinations,
          duration: progress.metadata?.duration,
          cost: progress.metadata?.estimatedCost
        });
      } else if (progress.status === 'city_complete') {
        console.log(`   🏙️ City Complete: ${progress.city}`);
        console.log(`   Days Generated: ${progress.cityData?.days?.length || 0}`);
      }

      console.log('');
      lastStatus = progress.status;
    }

    // Check if complete
    if (progress.type === 'complete') {
      console.log('✅ Generation Complete!');
      console.log(`   Total Days: ${progress.itinerary?.itinerary?.length || 0}`);
      console.log(`   Destinations: ${progress.itinerary?.destination}`);

      // Show day breakdown
      const daysByCity = new Map<string, number>();
      progress.itinerary?.itinerary?.forEach((day: any) => {
        const cityMatch = day.title?.match(/Day \d+ - (.+)/);
        if (cityMatch) {
          const city = cityMatch[1];
          daysByCity.set(city, (daysByCity.get(city) || 0) + 1);
        }
      });

      console.log('\n📅 Days per City:');
      for (const [city, days] of daysByCity) {
        console.log(`   ${city}: ${days} days`);
      }
      break;
    } else if (progress.type === 'error') {
      console.error('❌ Generation failed:', progress.message);
      break;
    }

    attempts++;
  }

  if (attempts >= maxAttempts) {
    console.error('⏰ Timed out waiting for generation');
  }
}

testUIProgressive().catch(console.error);