#!/usr/bin/env npx tsx

/**
 * Test only the intent extraction part
 */

import 'dotenv/config';
import { AIController } from '../src/services/ai/ai-controller';

async function testExtraction() {
  const controller = new AIController();

  const testCases = [
    '3 days in London then 2 days in Paris',
    'Weekend trip to Rome and Florence',
    '7 days across Tokyo, Kyoto, and Osaka',
    '6 days split between Barcelona and Madrid'
  ];

  console.log('🧪 Testing Multi-City Intent Extraction\n');

  for (const prompt of testCases) {
    console.log(`📝 Input: "${prompt}"`);

    try {
      const intent = await controller.extractIntent(prompt);
      console.log(`✅ Destination: ${intent.destination || 'not found'}`);
      console.log(`✅ Duration: ${intent.duration || 'not found'} days`);
      console.log('---');
    } catch (error) {
      console.log(`❌ Error: ${error}`);
      console.log('---');
    }
  }
}

testExtraction().catch(console.error);