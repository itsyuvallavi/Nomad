/**
 * Test multi-language support in AI intent understanding
 */

import { understandTripIntent } from '@/services/ai/utils/intent-understanding';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

const testCases = [
  {
    language: 'Spanish',
    input: 'Viaje a París pour trois días',
    expected: { location: 'París', duration: 3 }
  },
  {
    language: 'French',
    input: 'Voyage à Londres pour 5 jours',
    expected: { location: 'Londres', duration: 5 }
  },
  {
    language: 'German',
    input: 'Reise nach Berlin für eine Woche',
    expected: { location: 'Berlin', duration: 7 }
  },
  {
    language: 'Italian',
    input: 'Viaggio a Roma per 4 giorni',
    expected: { location: 'Roma', duration: 4 }
  },
  {
    language: 'Portuguese',
    input: 'Viagem para Lisboa por 3 dias',
    expected: { location: 'Lisboa', duration: 3 }
  },
  {
    language: 'Mixed',
    input: 'Weekend trip to Tokyo', // English
    expected: { location: 'Tokyo', duration: 2 }
  }
];

async function testMultiLanguage() {
  console.log('\n' + '='.repeat(60));
  console.log('🌍 Multi-Language AI Support Test');
  console.log('='.repeat(60));

  let passed = 0;
  let failed = 0;

  for (const test of testCases) {
    console.log(`\n${colors.cyan}Testing ${test.language}: "${test.input}"${colors.reset}`);

    try {
      const intent = await understandTripIntent(test.input);

      console.log(`  Raw result:`, {
        location: intent.location,
        duration: intent.duration,
        isVague: intent.isVague,
        missingRequirements: intent.missingRequirements
      });

      const locationMatch = intent.location?.toLowerCase()?.includes(test.expected.location.toLowerCase());
      const durationMatch = intent.duration === test.expected.duration ||
                          (test.expected.duration === 7 && intent.duration === 7) || // week
                          (test.expected.duration === 2 && intent.duration === 2); // weekend

      if (locationMatch && durationMatch) {
        console.log(`${colors.green}✓ Success!${colors.reset}`);
        console.log(`  Location: ${intent.location}`);
        console.log(`  Duration: ${intent.duration} days`);
        console.log(`  AI Response: ${intent.aiResponse.substring(0, 80)}...`);
        passed++;
      } else {
        console.log(`${colors.red}✗ Failed${colors.reset}`);
        console.log(`  Expected: ${test.expected.location}, ${test.expected.duration} days`);
        console.log(`  Got: ${intent.location}, ${intent.duration} days`);
        failed++;
      }
    } catch (error) {
      console.log(`${colors.red}✗ Error: ${error}${colors.reset}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test Results:');
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  console.log('='.repeat(60));
}

// Run the test
testMultiLanguage().catch(console.error);