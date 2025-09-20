/**
 * Test relative date extraction
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { AIController } from '../src/services/ai/ai-controller';

async function testRelativeDates() {
  console.log('📅 Testing Relative Date Extraction');
  console.log('====================================\n');

  const controller = new AIController();

  const testCases = [
    'next week',
    'monday next week',
    'on monday next week',
    'tuesday next week',
    'this weekend',
    'tomorrow',
    'next month',
    'in 2 weeks',
    'in 3 days'
  ];

  for (const test of testCases) {
    const prompt = `plan a trip to paris ${test}`;
    console.log(`\nTest: "${test}"`);
    console.log(`Full prompt: "${prompt}"`);

    const result = await controller.extractIntent(prompt);

    if (result.startDate) {
      console.log(`✅ Extracted date: ${result.startDate}`);

      // Show what day that is
      const date = new Date(result.startDate);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      console.log(`   (${dayName}, ${date.toLocaleDateString()})`);
    } else {
      console.log(`❌ Failed to extract date`);
    }
  }

  console.log('\n====================================');
  console.log('Today is:', new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }));
}

testRelativeDates().catch(console.error);