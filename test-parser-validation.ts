/**
 * Parser Validation Test
 * Tests that the destination parser correctly extracts cities from complex prompts
 */

import { parseDestinations } from './src/ai/utils/destination-parser';
import { logger } from './src/lib/logger';

const testCases = [
  {
    name: '1. Multi-City Japan (3 weeks)',
    prompt: 'Plan 3 weeks in Japan from Los Angeles. Visit Tokyo, Kyoto, and Osaka. I want to experience culture, food, and technology.',
    expected: {
      origin: 'Los Angeles',
      destinations: ['Tokyo', 'Kyoto', 'Osaka'],
      totalDays: 21
    }
  },
  {
    name: '2. European Multi-Country (2 weeks)',
    prompt: '2 weeks across London, Paris, Rome, and Barcelona from New York. Focus on history and art.',
    expected: {
      origin: 'New York',
      destinations: ['London', 'Paris', 'Rome', 'Barcelona'],
      totalDays: 14
    }
  },
  {
    name: '3. Southeast Asia Adventure (10 days)',
    prompt: 'Plan a 10-day trip from San Francisco to Southeast Asia. Include Bangkok, Singapore, and Bali.',
    expected: {
      origin: 'San Francisco',
      destinations: ['Bangkok', 'Singapore', 'Bali'],
      totalDays: 10
    }
  },
  {
    name: '4. South America Journey (30 days)',
    prompt: '30 days visiting Buenos Aires, Santiago, Lima, Cusco, and Rio de Janeiro from Miami.',
    expected: {
      origin: 'Miami',
      destinations: ['Buenos Aires', 'Santiago', 'Lima', 'Cusco', 'Rio de Janeiro'],
      totalDays: 30
    }
  },
  {
    name: '5. Island Hopping (2 weeks)',
    prompt: 'Two weeks exploring Hawaii, Fiji, and New Zealand from Los Angeles.',
    expected: {
      origin: 'Los Angeles',
      destinations: ['Hawaii', 'Fiji', 'New Zealand'],
      totalDays: 14
    }
  }
];

console.log('================================================================================');
console.log('🧪 PARSER VALIDATION TEST');
console.log('================================================================================\n');

let passed = 0;
let failed = 0;

for (const test of testCases) {
  console.log(`\n🔍 TEST: ${test.name}`);
  console.log(`📝 Prompt: "${test.prompt}"`);
  
  const result = parseDestinations(test.prompt);
  
  // Check origin
  const originMatch = result.origin === test.expected.origin;
  console.log(`✓ Origin: ${result.origin} ${originMatch ? '✅' : `❌ (expected: ${test.expected.origin})`}`);
  
  // Check destinations
  const destNames = result.destinations.map(d => d.name);
  const destMatch = JSON.stringify(destNames) === JSON.stringify(test.expected.destinations);
  console.log(`✓ Destinations: ${destNames.join(', ')} ${destMatch ? '✅' : `❌ (expected: ${test.expected.destinations.join(', ')})`}`);
  
  // Check total days
  const daysMatch = result.totalDays === test.expected.totalDays;
  console.log(`✓ Total Days: ${result.totalDays} ${daysMatch ? '✅' : `❌ (expected: ${test.expected.totalDays})`}`);
  
  // Check days distribution
  const dayDistribution = result.destinations.map(d => `${d.name}: ${d.days} days`).join(', ');
  console.log(`✓ Day Distribution: ${dayDistribution}`);
  
  if (originMatch && destMatch && daysMatch) {
    console.log(`\n✅ TEST PASSED`);
    passed++;
  } else {
    console.log(`\n❌ TEST FAILED`);
    failed++;
  }
}

console.log('\n================================================================================');
console.log(`📊 FINAL RESULTS: ${passed} passed, ${failed} failed`);
console.log('================================================================================');

if (failed > 0) {
  process.exit(1);
}