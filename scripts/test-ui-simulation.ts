#!/usr/bin/env npx tsx

/**
 * Simulate UI progressive generation flow
 */

async function simulateUIFlow() {
  console.log('🎭 Simulating UI Progressive Generation Flow');
  console.log('==========================================\n');

  const message = '2 weeks trip to London and Paris, one week in each city, starting March 15, 2024';

  // Step 1: User sends message (UI would POST to /api/ai/progressive)
  console.log('1️⃣ USER ACTION: Sending message');
  console.log(`   Message: "${message}"`);
  console.log('');

  const startRes = await fetch('http://localhost:9002/api/ai/progressive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      sessionId: 'ui-test-' + Date.now()
    })
  });

  const startData = await startRes.json();
  const genId = startData.data.generationId;
  console.log('   ✅ Server response: Generation started');
  console.log(`   Generation ID: ${genId}\n`);

  // Step 2: UI starts polling
  console.log('2️⃣ UI POLLING: Starting to poll for updates');
  console.log('   (UI would poll every 1-2 seconds)\n');

  let pollCount = 0;
  let complete = false;
  const maxPolls = 100; // Increase to handle longer generation times
  let uiState = {
    showMetadata: false,
    showLondonDays: 0,
    showParisDays: 0,
    totalDaysShown: 0
  };

  // Track what the UI would display at each stage
  const uiUpdates: string[] = [];

  while (!complete && pollCount < maxPolls) {
    pollCount++;

    // Wait before polling (simulating UI polling interval)
    if (pollCount > 1) {
      await new Promise(r => setTimeout(r, 1500));
    }

    const pollRes = await fetch(`http://localhost:9002/api/ai/progressive?generationId=${genId}`);
    const pollData = await pollRes.json();
    const progress = pollData.data;

    // Simulate what UI would do with each response
    if (progress.status === 'metadata_ready' && !uiState.showMetadata) {
      uiState.showMetadata = true;
      const update = `   📱 UI UPDATE #${pollCount}: Show trip title "${progress.metadata.title}"`;
      console.log(update);
      console.log(`      → Destinations: ${progress.metadata.destinations.join(', ')}`);
      console.log(`      → Duration: ${progress.metadata.daysPerCity.join(' + ')} days`);
      uiUpdates.push('Metadata displayed');
    }

    if (progress.status === 'city_complete' && progress.allCities) {
      // Check for new cities
      const londonData = progress.allCities.find(c => c.city === 'London');
      const parisData = progress.allCities.find(c => c.city === 'Paris');

      if (londonData && uiState.showLondonDays === 0) {
        uiState.showLondonDays = londonData.data.days.length;
        const update = `   📱 UI UPDATE #${pollCount}: Add London itinerary (${uiState.showLondonDays} days)`;
        console.log(update);
        console.log(`      → Days 1-${uiState.showLondonDays} now visible`);
        uiUpdates.push('London days added');
      }

      if (parisData && uiState.showParisDays === 0) {
        uiState.showParisDays = parisData.data.days.length;
        const update = `   📱 UI UPDATE #${pollCount}: Add Paris itinerary (${uiState.showParisDays} days)`;
        console.log(update);
        console.log(`      → Days ${uiState.showLondonDays + 1}-${uiState.showLondonDays + uiState.showParisDays} now visible`);
        uiUpdates.push('Paris days added');
      }
    }

    if (progress.status === 'success' && progress.itinerary) {
      // Check if we have Paris data we haven't shown yet
      if (progress.allCities) {
        const parisInFinal = progress.allCities.find(c => c.city === 'Paris');
        if (parisInFinal && uiState.showParisDays === 0) {
          uiState.showParisDays = parisInFinal.data.days.length;
          console.log(`   📱 UI UPDATE #${pollCount}: Add Paris itinerary (${uiState.showParisDays} days)`);
          console.log(`      → Days ${uiState.showLondonDays + 1}-${uiState.showLondonDays + uiState.showParisDays} now visible`);
          uiUpdates.push('Paris days added');
        }
      }

      complete = true;
      uiState.totalDaysShown = progress.itinerary.itinerary.length;
      console.log(`\n   📱 UI UPDATE #${pollCount}: Generation complete!`);
      console.log(`      → Total days displayed: ${uiState.totalDaysShown}`);
      uiUpdates.push('Complete itinerary shown');
    }

    // Show polling status every 10 polls
    if (pollCount % 10 === 0 && !complete) {
      console.log(`   ⏳ Poll #${pollCount}: Still generating... (${progress.status})`);
    }
  }

  // Step 3: Final UI State
  console.log('\n3️⃣ FINAL UI STATE:');
  console.log('   ================');
  console.log(`   ✅ Trip Title: ${uiState.showMetadata ? 'Displayed' : 'Not shown'}`);
  console.log(`   ✅ London Days: ${uiState.showLondonDays} days shown`);
  console.log(`   ✅ Paris Days: ${uiState.showParisDays} days shown`);
  console.log(`   ✅ Total Days: ${uiState.totalDaysShown} days in final itinerary`);

  console.log('\n4️⃣ UI UPDATE SEQUENCE:');
  console.log('   ===================');
  uiUpdates.forEach((update, i) => {
    console.log(`   ${i + 1}. ${update}`);
  });

  // Verify progressive behavior
  console.log('\n5️⃣ PROGRESSIVE BEHAVIOR VERIFICATION:');
  console.log('   ==================================');

  const isProgressive = uiUpdates.includes('Metadata displayed') &&
                        uiUpdates.includes('London days added') &&
                        uiUpdates.includes('Paris days added');

  if (isProgressive) {
    console.log('   ✅ CONFIRMED: UI updates progressively!');
    console.log('      - Metadata shown first');
    console.log('      - London added when ready');
    console.log('      - Paris added when ready');
  } else {
    console.log('   ⚠️ WARNING: Progressive updates not fully detected');
  }

  // Check correctness
  if (uiState.showLondonDays === 7 && uiState.showParisDays === 7 && uiState.totalDaysShown === 14) {
    console.log('\n   🎉🎉🎉 SUCCESS: All day counts are correct!');
  } else {
    console.log('\n   ❌ ERROR: Day counts are incorrect');
  }

  console.log('\n📊 Test Summary:');
  console.log(`   Total polls: ${pollCount}`);
  console.log(`   Time taken: ~${pollCount * 1.5} seconds`);
  console.log(`   Progressive updates: ${isProgressive ? 'Yes' : 'No'}`);
  console.log(`   Correct day counts: ${uiState.totalDaysShown === 14 ? 'Yes' : 'No'}`);
}

simulateUIFlow().catch(console.error);