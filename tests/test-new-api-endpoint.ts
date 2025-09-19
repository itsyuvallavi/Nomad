/**
 * Test the new simplified API endpoint
 * Verifies that /api/ai works correctly after reorganization
 */

import { AIController } from '@/services/ai/ai-controller';
import { TripGenerator } from '@/services/ai/trip-generator';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

console.log('🧪 TESTING NEW API ENDPOINT\n');
console.log('=' . repeat(50));

async function testDirectServices() {
  console.log('\n1️⃣ Testing Direct Service Calls');
  console.log('-'.repeat(40));

  if (!process.env.OPENAI_API_KEY) {
    console.log('⚠️  No OpenAI API key - skipping direct service test');
    return false;
  }

  try {
    const aiController = new AIController();
    const tripGenerator = new TripGenerator();

    // Test 1: Simple message
    console.log('\n📝 Test: "3 days in Paris"');
    const response = await aiController.processMessage('3 days in Paris');
    console.log(`   Response type: ${response.type}`);
    console.log(`   Message: ${response.message.substring(0, 50)}...`);
    console.log(`   Can generate: ${response.canGenerate}`);

    if (response.type === 'question') {
      console.log('   ✅ Correctly asking for more information');
    }

    // Test 2: Answer the question
    console.log('\n📝 Test: Providing date "March 1, 2025"');
    const response2 = await aiController.processMessage('March 1, 2025', response.context);
    console.log(`   Response type: ${response2.type}`);
    console.log(`   Can generate: ${response2.canGenerate}`);

    if (response2.type === 'ready' && response2.canGenerate) {
      console.log('   ✅ Ready to generate!');

      // Test 3: Generate itinerary
      console.log('\n📝 Test: Generating itinerary');
      const params = aiController.getTripParameters(response2.intent!);
      console.log(`   Destination: ${params.destination}`);
      console.log(`   Duration: ${params.duration} days`);
      console.log(`   Start date: ${params.startDate}`);

      const itinerary = await tripGenerator.generateItinerary(params);
      console.log(`   ✅ Generated: ${itinerary.title}`);
      console.log(`   Days: ${itinerary.itinerary?.length}`);

      // Check OSM enrichment
      const activities = itinerary.itinerary?.flatMap(d => d.activities || []) || [];
      const withVenues = activities.filter(a => a.venue_name).length;
      console.log(`   OSM Enrichment: ${withVenues}/${activities.length} activities`);

      return true;
    } else {
      console.log('   ⚠️  Still needs more information');
      return true; // This is OK, just means it needs more questions
    }

  } catch (error) {
    console.error('❌ Service test failed:', error);
    return false;
  }
}

async function testAPIEndpoint() {
  console.log('\n2️⃣ Testing API Endpoint');
  console.log('-'.repeat(40));

  try {
    // First, check if the app is running
    console.log('\n🌐 Checking if app is running on port 9002...');
    const healthCheck = await fetch('http://localhost:9002/api/ai', {
      method: 'GET'
    }).catch(() => null);

    if (!healthCheck) {
      console.log('⚠️  App not running. Start it with: npm run dev');
      console.log('   Then run this test again.');
      return false;
    }

    console.log('✅ App is running!');

    // Test the API endpoint
    console.log('\n📝 Testing POST /api/ai');
    const response = await fetch('http://localhost:9002/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: '3 days in London',
        conversationContext: '',
        sessionId: 'test-' + Date.now()
      })
    });

    if (!response.ok) {
      console.log(`❌ API returned ${response.status}`);
      const error = await response.text();
      console.log(`   Error: ${error}`);
      return false;
    }

    const data = await response.json();
    console.log(`   Response success: ${data.success}`);
    console.log(`   Response type: ${data.data?.type}`);
    console.log(`   Message: ${data.data?.message?.substring(0, 50)}...`);

    if (data.success && data.data?.type === 'question') {
      console.log('   ✅ API endpoint working correctly!');
      return true;
    }

    return false;

  } catch (error) {
    console.error('❌ API test failed:', error);
    return false;
  }
}

async function runAllTests() {
  console.log('\n🚀 Running all tests...\n');

  const results = {
    services: false,
    api: false
  };

  // Test 1: Direct services
  results.services = await testDirectServices();

  // Test 2: API endpoint
  results.api = await testAPIEndpoint();

  // Summary
  console.log('\n' + '=' . repeat(50));
  console.log('📊 TEST SUMMARY\n');
  console.log(`Direct Services: ${results.services ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`API Endpoint: ${results.api ? '✅ PASS' : '❌ FAIL'}`);

  if (results.services && !results.api) {
    console.log('\n💡 Services work but API doesn\'t - make sure app is running');
  }

  if (results.services && results.api) {
    console.log('\n🎉 All tests passed! The new API structure is working correctly.');
    console.log('\nNext steps:');
    console.log('1. Test in the UI by entering "3 days in London"');
    console.log('2. Verify OSM venues appear in the generated itinerary');
    console.log('3. Update README files with the new structure');
  }

  return results.services && results.api;
}

// Run tests
runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});