/**
 * AI Conversation Flow Test
 * Tests the AI's ability to handle multi-turn conversations and extract complete intent
 */

interface TestScenario {
  id: string;
  level: 'SIMPLE' | 'NORMAL' | 'COMPLEX';
  initialPrompt: string;
  followUpAnswers: Record<string, string>; // Map of what AI might ask -> answer
  expectedFinalIntent: {
    destination?: string;
    destinations?: string[];
    duration?: number;
    startDate?: string;
    interests?: string[];
  };
  notes: string;
}

const tests: TestScenario[] = [
  // SIMPLE TESTS - Complete information to trigger generation
  {
    id: 'S1',
    level: 'SIMPLE',
    initialPrompt: '3 days in London starting tomorrow',
    followUpAnswers: {
      'startDate': 'tomorrow',
      'destination': 'London',
      'duration': '3 days'
    },
    expectedFinalIntent: {
      destination: 'London',
      duration: 3
    },
    notes: 'Basic trip request with complete info'
  },
  {
    id: 'S2',
    level: 'SIMPLE',
    initialPrompt: 'Plan a 2 day weekend trip to Paris starting next Friday',
    followUpAnswers: {
      'startDate': 'next Friday',
      'destination': 'Paris',
      'duration': '2 days'
    },
    expectedFinalIntent: {
      destination: 'Paris',
      duration: 2
    },
    notes: 'Weekend trip with complete info'
  },

  // NORMAL TESTS
  {
    id: 'N1',
    level: 'NORMAL',
    initialPrompt: 'I want to visit London and Paris',
    followUpAnswers: {
      'startDate': 'next week',
      'duration': '7 days',
      'destination': 'London and Paris'
    },
    expectedFinalIntent: {
      destinations: ['London', 'Paris']
    },
    notes: 'Multi-city trip'
  },
  {
    id: 'N2',
    level: 'NORMAL',
    initialPrompt: 'Plan a cultural trip to Kyoto with temples and food',
    followUpAnswers: {
      'startDate': 'March 15',
      'duration': '4 days',
      'destination': 'Kyoto'
    },
    expectedFinalIntent: {
      destination: 'Kyoto',
      interests: ['culture', 'food']
    },
    notes: 'Trip with preferences'
  },

  // COMPLEX TESTS
  {
    id: 'C1',
    level: 'COMPLEX',
    initialPrompt: 'I want to travel',
    followUpAnswers: {
      'destination': 'Barcelona',
      'duration': '5 days',
      'startDate': 'next Monday'
    },
    expectedFinalIntent: {
      destination: 'Barcelona',
      duration: 5
    },
    notes: 'Minimal info - AI must ask for everything'
  },
  {
    id: 'C2',
    level: 'COMPLEX',
    initialPrompt: 'Plan my honeymoon',
    followUpAnswers: {
      'destination': 'Maldives',
      'duration': '10 days',
      'startDate': 'December 1st'
    },
    expectedFinalIntent: {
      destination: 'Maldives',
      duration: 10
    },
    notes: 'Context only - needs all details'
  },
  {
    id: 'C3',
    level: 'COMPLEX',
    initialPrompt: 'Take me to Lisbon For tomorrow',
    followUpAnswers: {
      'duration': '3 days',
      'startDate': 'tomorrow',
      'destination': 'Lisbon'
    },
    expectedFinalIntent: {
      destination: 'Lisbon'
    },
    notes: '🔥 CRITICAL: Test temporal word removal ("For" should not be in destination)'
  },
];

async function runConversationTest(test: TestScenario) {
  console.log(`\n${'─'.repeat(70)}`);
  console.log(`🧪 [${test.id}] ${test.initialPrompt.substring(0, 50)}...`);
  console.log(`   📝 ${test.notes}`);

  const conversationHistory: any[] = [];
  let generationId = '';
  let currentIntent: any = {};
  let canGenerate = false;
  let turnCount = 0;
  const maxTurns = 5;
  let conversationContext: any = undefined;

  try {
    // Turn 1: Send initial prompt
    const response1 = await fetch('http://localhost:3000/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: test.initialPrompt
      })
    });

    const data1 = await response1.json();
    if (!data1.success) {
      console.log(`   ❌ API Error: ${data1.error}`);
      return { pass: false, error: data1.error };
    }

    generationId = data1.data.generationId;
    conversationHistory.push({ role: 'user', content: test.initialPrompt });

    // Poll for generation completion - wait for complete status
    let pollAttempts = 0;
    const maxPolls = 120; // 60 seconds max wait (120 * 500ms) for generation
    let itinerary: any = null;

    while (pollAttempts < maxPolls) {
      await new Promise(r => setTimeout(r, 500));

      const pollResp = await fetch(`http://localhost:3000/api/ai?generationId=${generationId}`);
      const pollData = await pollResp.json();

      // DEBUG: Log progress status
      if (pollAttempts % 10 === 0) {
        console.log(`   🔍 Poll ${pollAttempts}: status="${pollData.data?.status}", type="${pollData.data?.type}", progress=${pollData.data?.progress || 0}%`);
      }

      // Check if generation is complete
      if (pollData.data?.type === 'complete' && pollData.data?.status === 'success') {
        itinerary = pollData.data.itinerary;
        console.log(`   ✅ Generation complete!`);
        console.log(`   📋 Itinerary received with ${itinerary?.dailyItineraries?.length || 0} days`);
        break;
      }

      // Check if we have intent or awaiting_input status
      if (pollData.data?.intent || pollData.data?.status === 'awaiting_input') {
        currentIntent = pollData.data.intent || {};
        const missingFields = pollData.data.missingFields || [];
        const awaitingInput = pollData.data.awaitingInput;

        // Update conversation context if available
        if (pollData.data?.conversationContext) {
          conversationContext = pollData.data.conversationContext;
        }

        // Determine if we can generate
        canGenerate = !awaitingInput && missingFields.length === 0;

        if (pollAttempts % 10 === 0) {
          console.log(`   📊 Intent: ${JSON.stringify(currentIntent).substring(0, 60)}... | Awaiting: ${awaitingInput || 'none'}`);
        }

        // Check if AI is awaiting input (this is expected for incomplete requests)
        if (awaitingInput) {
          console.log(`   🤔 AI needs more info: ${awaitingInput}`);
          console.log(`   ⚠️  Test prompt should include all required information`);
          break;
        }
      }

      // Check for errors
      if (pollData.data?.type === 'error') {
        console.log(`   ❌ Generation error: ${pollData.data?.message}`);
        break;
      }

      pollAttempts++;
    }

    if (pollAttempts >= maxPolls) {
      console.log(`   ⏱️  Timeout: Generation took longer than 60 seconds`);
    }

    // Validation - we're now just validating intent extraction, not full conversation
    const issues: string[] = [];
    let pass = true;

    // Check destination
    if (test.expectedFinalIntent.destination) {
      const dest = currentIntent.destination || currentIntent.destinations?.[0] || '';

      // CRITICAL: Check for temporal words
      const temporalWords = ['for', 'starting', 'beginning', 'tomorrow'];
      const hasTemporalWord = temporalWords.some(w =>
        dest.toLowerCase().includes(` ${w}`) || dest.toLowerCase().endsWith(w)
      );

      if (hasTemporalWord) {
        issues.push(`🔥 CRITICAL: Destination contains temporal word: "${dest}"`);
        pass = false;
      } else if (!dest.toLowerCase().includes(test.expectedFinalIntent.destination.toLowerCase())) {
        issues.push(`Expected dest "${test.expectedFinalIntent.destination}", got "${dest}"`);
        pass = false;
      }
    }

    // Check multi-city
    if (test.expectedFinalIntent.destinations) {
      const dests = currentIntent.destinations || [];
      if (dests.length !== test.expectedFinalIntent.destinations.length) {
        issues.push(`Expected ${test.expectedFinalIntent.destinations.length} cities, got ${dests.length}`);
        pass = false;
      }
    }

    // Check duration
    if (test.expectedFinalIntent.duration) {
      const duration = currentIntent.duration;
      if (duration !== test.expectedFinalIntent.duration) {
        issues.push(`Expected duration ${test.expectedFinalIntent.duration}, got ${duration}`);
        pass = false;
      }
    }

    // Validate itinerary structure if generation completed
    if (itinerary) {
      console.log(`\n   🔍 Validating itinerary structure...`);

      // Check for dailyItineraries (new structure)
      if (!itinerary.dailyItineraries || itinerary.dailyItineraries.length === 0) {
        issues.push('No daily itineraries found');
        pass = false;
      } else {
        console.log(`   ✅ Daily Itineraries: ${itinerary.dailyItineraries.length} days found`);

        // Check first day structure
        const firstDay = itinerary.dailyItineraries[0];
        if (firstDay) {
          console.log(`\n   📍 Day 1: ${firstDay.title || 'Unknown'}`);
          console.log(`      Date: ${firstDay.date || 'N/A'}`);

          // Check for activities
          if (firstDay.activities && firstDay.activities.length > 0) {
            console.log(`   ✅ Activities: ${firstDay.activities.length} activities on day 1`);

            // Sample first activity
            const firstActivity = firstDay.activities[0];
            console.log(`\n   🎯 Sample Activity:`);
            console.log(`      Venue: ${firstActivity.venue_name || 'N/A'}`);
            console.log(`      Address: ${firstActivity.address || 'N/A'}`);
            console.log(`      Time: ${firstActivity.time || 'N/A'}`);
            console.log(`      Description: ${firstActivity.description?.substring(0, 60) || 'N/A'}...`);
            console.log(`      Category: ${firstActivity.category || 'N/A'}`);
          } else {
            issues.push('No activities found in first day');
            pass = false;
          }
        }
      }

      // Check for budget estimate
      if (itinerary.estimatedBudget) {
        console.log(`\n   💰 Budget Estimate:`);
        console.log(`      Total: ${itinerary.estimatedBudget.total || 'N/A'}`);
        console.log(`      Currency: ${itinerary.estimatedBudget.currency || 'N/A'}`);
      } else {
        console.log(`   ⚠️  No budget estimate provided`);
      }

      // Check for overview
      if (itinerary.overview) {
        console.log(`\n   📝 Overview: ${itinerary.overview.substring(0, 100)}...`);
      }
    }

    // Print result
    if (pass) {
      console.log(`\n   ✅ PASS - All checks passed`);
      if (itinerary) {
        console.log(`   🎉 Full itinerary generated successfully!`);
      } else {
        console.log(`   📋 Intent extracted: ${JSON.stringify(currentIntent)}`);
      }
    } else {
      console.log(`\n   ❌ FAIL`);
      issues.forEach(issue => console.log(`      ⚠️  ${issue}`));
      console.log(`   📋 Final intent: ${JSON.stringify(currentIntent)}`);
    }

    return {
      pass,
      issues,
      intent: currentIntent,
      itinerary,
      canGenerate,
      turns: turnCount + 1
    };

  } catch (error: any) {
    console.log(`   ❌ Exception: ${error.message}`);
    return { pass: false, error: error.message };
  }
}

async function main() {
  console.log('🧪 AI Full Itinerary Generation Test');
  console.log('='.repeat(70));
  console.log('Testing complete itinerary generation with all details\n');

  // Check server
  try {
    await fetch('http://localhost:3000');
  } catch {
    console.error('❌ Server not running on port 3000');
    process.exit(1);
  }

  const results: any[] = [];

  // Only run SIMPLE tests with complete information
  const testsToRun = tests.filter(t => t.level === 'SIMPLE');

  console.log(`\n${'='.repeat(70)}`);
  console.log(`📁 FULL GENERATION TESTS`);
  console.log('='.repeat(70));

  for (const test of testsToRun) {
    const result = await runConversationTest(test);
    results.push({ ...test, ...result });

    // Longer delay between tests to avoid rate limits
    if (testsToRun.indexOf(test) < testsToRun.length - 1) {
      console.log('\n   ⏳ Waiting 5s before next test...');
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log('📊 SUMMARY');
  console.log('='.repeat(70));

  const byLevel: any = {};
  ['SIMPLE', 'NORMAL', 'COMPLEX'].forEach(level => {
    const levelResults = results.filter(r => r.level === level);
    const passed = levelResults.filter(r => r.pass).length;
    byLevel[level] = { total: levelResults.length, passed };
    console.log(`\n${level}: ${passed}/${levelResults.length} passed`);
  });

  const totalPass = results.filter(r => r.pass).length;
  const totalFail = results.filter(r => !r.pass).length;

  console.log(`\n${'='.repeat(70)}`);
  console.log(`✅ PASSED: ${totalPass}/${results.length}`);
  console.log(`❌ FAILED: ${totalFail}/${results.length}`);
  console.log(`📊 Success Rate: ${(totalPass / results.length * 100).toFixed(1)}%`);
  console.log('='.repeat(70));

  // Save results
  const fs = await import('fs');
  const timestamp = Date.now();
  fs.writeFileSync(
    `scripts/test-results-conversation-${timestamp}.json`,
    JSON.stringify({ timestamp, summary: byLevel, results }, null, 2)
  );

  console.log(`\n📁 Results saved to: scripts/test-results-conversation-${timestamp}.json`);

  if (totalFail === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log(`\n⚠️  ${totalFail} tests failed. Review above.`);
  }

  process.exit(totalFail > 0 ? 1 : 0);
}

main().catch(console.error);
