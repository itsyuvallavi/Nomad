#!/usr/bin/env npx tsx

import { ProgressiveGenerator } from '../src/services/ai/progressive-generator';

async function testMetadata() {
  console.log('Testing metadata generation...\n');

  const gen = new ProgressiveGenerator();

  const metadata = await gen.generateMetadata({
    destinations: ['London', 'Brussels'],
    duration: 14,
    startDate: '2025-09-25'
  });

  console.log('✅ Metadata Generated:');
  console.log(JSON.stringify(metadata, null, 2));
}

testMetadata().catch(console.error);