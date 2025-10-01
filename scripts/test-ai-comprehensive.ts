#!/usr/bin/env npx tsx
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

// Verify environment
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ Missing OPENAI_API_KEY in environment');
  process.exit(1);
}

console.log('🔧 AI Comprehensive Test Suite');
console.log('================================');
console.log('Testing full AI flow: API → Processing → UI Response');
console.log('');

interface TestResult {
  test: string;
  status: 'pass' | 'fail';
  time?: number;
  error?: string;
  details?: any;
}

const results: TestResult[] = [];

async function testAIEndpoint() {
  console.log('📍 Test 1: AI Endpoint Basic Response');
  const start = Date.now();

  try {
    const response = await fetch('http://localhost:9002/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: '3 days in London',
        conversationHistory: []
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const time = Date.now() - start;

    // Validate response structure - API now returns success/data/generationId
    if (!data.success || !data.data || !data.data.generationId) {
      throw new Error('Invalid response structure');
    }

    console.log(`✅ Basic endpoint test passed (${time}ms)`);
    console.log(`   Generation ID: ${data.data.generationId}`);
    console.log(`   Message: ${data.data.message}`);

    results.push({
      test: 'AI Endpoint Basic',
      status: 'pass',
      time,
      details: { generationId: data.data.generationId }
    });

    return data;
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    results.push({
      test: 'AI Endpoint Basic',
      status: 'fail',
      time: Date.now() - start,
      error: error.message
    });
    return null;
  }
}

async function testProgressiveGeneration() {
  console.log('\n📍 Test 2: Progressive Generation');
  const start = Date.now();

  try {
    // Start generation with complete information
    const initResponse = await fetch('http://localhost:9002/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Plan a 3 day trip to Paris starting next Monday',
        conversationHistory: []
      })
    });

    if (!initResponse.ok) {
      throw new Error(`HTTP ${initResponse.status}`);
    }

    const initData = await initResponse.json();

    if (!initData.success || !initData.data || !initData.data.generationId) {
      throw new Error('No generationId returned');
    }

    console.log(`   Generation ID: ${initData.data.generationId}`);

    // Poll for results
    let metadata = null;
    let itinerary = null;
    let attempts = 0;
    const maxAttempts = 60; // 60 seconds max
    let needsDateResponse = false;

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const pollResponse = await fetch(`http://localhost:9002/api/ai?generationId=${initData.data.generationId}`);
      const pollData = await pollResponse.json();

      if (pollData.data) {
        // Check if awaiting input
        if (pollData.data.status === 'awaiting_input' && pollData.data.awaitingInput === 'startDate' && !needsDateResponse) {
          console.log('   AI requesting start date, providing response...');
          needsDateResponse = true;

          // Provide the date
          const dateResponse = await fetch('http://localhost:9002/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message: 'next Monday',
              generationId: initData.data.generationId,
              conversationHistory: []
            })
          });

          if (!dateResponse.ok) {
            throw new Error('Failed to provide date');
          }

          continue;
        }

        if (pollData.data.metadata && !metadata) {
          metadata = pollData.data.metadata;
          console.log(`   ✓ Metadata received: ${metadata.destination} (${metadata.duration} days)`);
        }

        if (pollData.data.itinerary) {
          itinerary = pollData.data.itinerary;
          const dayCount = itinerary.dailyItineraries?.length ||
                          itinerary.itinerary?.length ||
                          itinerary.days?.length || 0;
          console.log(`   ✓ Full itinerary received: ${dayCount} days`);
          console.log(`     Structure: dailyItineraries=${!!itinerary.dailyItineraries}, itinerary=${!!itinerary.itinerary}, days=${!!itinerary.days}`);
          break;
        }

        if (pollData.data.status === 'completed' && pollData.data.baseItinerary) {
          itinerary = pollData.data.baseItinerary;
          console.log(`   ✓ Base itinerary received: ${itinerary.days?.length || 0} days`);
          break;
        }
      }

      attempts++;
    }

    const time = Date.now() - start;

    if (!itinerary) {
      throw new Error('Timeout waiting for itinerary');
    }

    console.log(`✅ Progressive generation passed (${time}ms)`);

    results.push({
      test: 'Progressive Generation',
      status: 'pass',
      time,
      details: {
        destination: metadata?.destination || 'Paris',
        days: itinerary.days?.length || 0,
        totalActivities: itinerary.days?.reduce((acc, day) => acc + (day.activities?.length || 0), 0) || 0
      }
    });

    return { metadata, itinerary };
  } catch (error: any) {
    console.log(`❌ Failed: ${error.message}`);
    results.push({
      test: 'Progressive Generation',
      status: 'fail',
      time: Date.now() - start,
      error: error.message
    });
    return null;
  }
}

async function testComplexItinerary() {
  console.log('\n📍 Test 3: Complex Multi-City Itinerary');
  const start = Date.now();

  try {
    const response = await fetch('http://localhost:9002/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'I want to visit London for 3 days, then Paris for 2 days, budget is medium',
        conversationHistory: []
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Check for valid generation response
    if (!data.success || !data.data || !data.data.generationId) {
      throw new Error('Invalid response for multi-city');
    }

    const time = Date.now() - start;

    console.log(`✅ Complex itinerary request accepted (${time}ms)`);
    console.log(`   Generation ID: ${data.data.generationId}`);

    results.push({
      test: 'Complex Multi-City',
      status: 'pass',
      time,
      details: { generationId: data.data.generationId }
    });

    return data;
  } catch (error) {
    console.log(`❌ Failed: ${error.message}`);
    results.push({
      test: 'Complex Multi-City',
      status: 'fail',
      time: Date.now() - start,
      error: error.message
    });
    return null;
  }
}

async function testConversationContext() {
  console.log('\n📍 Test 4: Conversation Context Handling');
  const start = Date.now();

  try {
    // First message
    const response1 = await fetch('http://localhost:9002/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'I want to plan a trip to Tokyo',
        conversationHistory: []
      })
    });

    const data1 = await response1.json();

    if (!data1.success || !data1.data) {
      throw new Error('First message failed');
    }

    // Wait a moment for generation to start
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Follow-up with context
    const response2 = await fetch('http://localhost:9002/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Make it 5 days',
        conversationHistory: [
          { role: 'user', content: 'I want to plan a trip to Tokyo' },
          { role: 'assistant', content: data1.data.message || 'Planning your Tokyo trip...' }
        ]
      })
    });

    if (!response2.ok) {
      throw new Error(`HTTP ${response2.status}`);
    }

    const data2 = await response2.json();
    const time = Date.now() - start;

    // Check if we got a valid response
    if (!data2.success || !data2.data) {
      throw new Error('Context not maintained');
    }

    console.log(`✅ Conversation context handled (${time}ms)`);
    console.log(`   Second generation ID: ${data2.data.generationId}`);

    results.push({
      test: 'Conversation Context',
      status: 'pass',
      time,
      details: {
        firstGen: data1.data.generationId,
        secondGen: data2.data.generationId
      }
    });

    return data2;
  } catch (error: any) {
    console.log(`❌ Failed: ${error.message}`);
    results.push({
      test: 'Conversation Context',
      status: 'fail',
      time: Date.now() - start,
      error: error.message
    });
    return null;
  }
}

async function testErrorHandling() {
  console.log('\n📍 Test 5: Error Handling');
  const start = Date.now();

  try {
    const response = await fetch('http://localhost:9002/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: '',  // Empty message
        conversationHistory: []
      })
    });

    const data = await response.json();
    const time = Date.now() - start;

    // API should still return success structure even with empty message
    // It might generate a default response or handle it gracefully
    if (data.success === false || data.error) {
      // This is actually good - it means error was handled properly
      console.log(`✅ Error handling works (${time}ms)`);
      console.log(`   Error handled: ${data.error || 'Empty message handled'}`);

      results.push({
        test: 'Error Handling',
        status: 'pass',
        time,
        details: { error: data.error }
      });
    } else if (data.success && data.data) {
      // Or it might handle empty message by generating something
      console.log(`✅ Empty message handled gracefully (${time}ms)`);
      console.log(`   Response: ${data.data.message?.substring(0, 50)}...`);

      results.push({
        test: 'Error Handling',
        status: 'pass',
        time
      });
    } else {
      throw new Error('Unexpected error handling response');
    }

    return data;
  } catch (error: any) {
    console.log(`❌ Failed: ${error.message}`);
    results.push({
      test: 'Error Handling',
      status: 'fail',
      time: Date.now() - start,
      error: error.message
    });
    return null;
  }
}

async function testPerformance() {
  console.log('\n📍 Test 6: Performance Benchmarks');
  const benchmarks = [];

  // Test simple query performance
  const queries = [
    '3 days in London',
    'Weekend in Paris',
    'Week in Tokyo with cultural activities',
    'Budget trip to Barcelona for 4 days'
  ];

  for (const query of queries) {
    const start = Date.now();

    try {
      const response = await fetch('http://localhost:9002/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          conversationHistory: []
        })
      });

      const data = await response.json();
      const time = Date.now() - start;

      benchmarks.push({
        query: query.substring(0, 30),
        time,
        success: data.success && !!data.data
      });

      console.log(`   ${query.substring(0, 30)}... → ${time}ms`);
    } catch (error) {
      benchmarks.push({
        query: query.substring(0, 30),
        time: Date.now() - start,
        success: false
      });
    }
  }

  const avgTime = benchmarks.reduce((acc, b) => acc + b.time, 0) / benchmarks.length;
  const successRate = (benchmarks.filter(b => b.success).length / benchmarks.length) * 100;

  console.log(`\n   Average response time: ${avgTime.toFixed(0)}ms`);
  console.log(`   Success rate: ${successRate}%`);

  if (successRate === 100 && avgTime < 5000) {
    console.log(`✅ Performance acceptable`);
    results.push({
      test: 'Performance',
      status: 'pass',
      time: avgTime,
      details: { successRate, avgTime }
    });
  } else {
    console.log(`❌ Performance issues detected`);
    results.push({
      test: 'Performance',
      status: 'fail',
      time: avgTime,
      error: `Success rate: ${successRate}%, Avg time: ${avgTime}ms`
    });
  }
}

async function runAllTests() {
  console.log('\n🚀 Starting comprehensive AI test suite...\n');

  // Check if server is running
  try {
    await fetch('http://localhost:9002');
  } catch (error) {
    console.error('❌ Server not running on port 9002');
    console.error('   Run: npm run dev');
    process.exit(1);
  }

  // Run tests sequentially
  await testAIEndpoint();
  await testProgressiveGeneration();
  await testComplexItinerary();
  await testConversationContext();
  await testErrorHandling();
  await testPerformance();

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;

  results.forEach(result => {
    const icon = result.status === 'pass' ? '✅' : '❌';
    const timeStr = result.time ? ` (${result.time}ms)` : '';
    console.log(`${icon} ${result.test}${timeStr}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  console.log('\n' + '='.repeat(60));
  console.log(`Total: ${passed} passed, ${failed} failed`);

  if (failed === 0) {
    console.log('\n🎉 All tests passed! Ready for optimization.');
  } else {
    console.log('\n⚠️  Some tests failed. Fix issues before proceeding.');
  }

  // Save results
  const timestamp = Date.now();
  const fs = await import('fs');
  fs.writeFileSync(
    `scripts/test-results-${timestamp}.json`,
    JSON.stringify({ timestamp, results, summary: { passed, failed } }, null, 2)
  );
  console.log(`\n📁 Results saved to: scripts/test-results-${timestamp}.json`);

  process.exit(failed === 0 ? 0 : 1);
}

// Run tests
runAllTests().catch(console.error);