/**
 * Test single extraction to debug the issue
 */

import { config } from 'dotenv';
import { AIController } from '../src/services/ai/ai-controller';

config({ path: '.env.local' });

async function testExtraction() {
  const controller = new AIController();

  const testCases = [
    "plan a 5 day trip to paris starting october 15",
    "trip to Rome from December 20 to December 27",
    "I want to visit Barcelona for a week in March"
  ];

  for (const test of testCases) {
    console.log('\n========================================');
    console.log(`Testing: "${test}"`);
    console.log('========================================');

    try {
      // @ts-ignore - accessing private method for testing
      const result = await controller.analyzeUserInput(test, undefined);

      console.log('Result:', JSON.stringify(result, null, 2));

      if (!result.startDate && !result.endDate) {
        console.log('❌ No dates extracted!');
      } else {
        console.log('✅ Dates extracted successfully');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }
}

testExtraction().catch(console.error);