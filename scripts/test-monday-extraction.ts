/**
 * Test extraction for "starting monday"
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { AIController } from '../src/services/ai/ai-controller';

async function testMondayExtraction() {
  console.log('📅 Testing Monday Extraction');
  console.log('============================\n');

  const controller = new AIController();

  const testCases = [
    'plan a trip to lisbon for 5 days starting monday',
    'trip to paris starting monday',
    'starting on monday',
    'from monday',
    'monday'
  ];

  const today = new Date();
  console.log('Today is:', today.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  }));
  console.log();

  for (const test of testCases) {
    console.log(`Test: "${test}"`);

    const result = await controller.extractIntent(test);

    if (result.startDate) {
      const date = new Date(result.startDate);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      console.log(`✅ Extracted: ${result.startDate} (${dayName})`);

      // Check if it's actually Monday
      if (dayName !== 'Monday') {
        console.log(`❌ ERROR: Not a Monday!`);
      }
    } else {
      console.log(`❌ No date extracted`);
    }
    console.log();
  }
}

testMondayExtraction().catch(console.error);