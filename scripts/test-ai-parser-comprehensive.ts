#!/usr/bin/env npx tsx
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

console.log('🧪 AI Parser Comprehensive Test Suite');
console.log('=' .repeat(70));
console.log('Testing AI parser with Simple, Normal, and Complex scenarios');
console.log('Including misleading prompts and edge cases\n');

interface TestScenario {
  id: string;
  level: 'SIMPLE' | 'NORMAL' | 'COMPLEX';
  description: string;
  messages: string[]; // Array of messages for multi-turn conversations
  expected: {
    destination?: string | string[]; // Can be string or array for multi-city
    destinations?: string[]; // For multi-city trips
    duration?: number;
    startDate?: string | 'any'; // 'any' means we accept any valid date
    shouldAskForInfo?: string[]; // What info should AI ask for?
  };
  notes?: string; // Why this test is important
}

interface TestResult {
  id: string;
  level: string;
  description: string;
  status: 'PASS' | 'FAIL' | 'PARTIAL';
  time: number;
  extracted: any;
  expected: any;
  errors: string[];
  warnings: string[];
}

// Test Scenarios
const scenarios: TestScenario[] = [
  // ============= SIMPLE TESTS (5) =============
  {
    id: 'S1',
    level: 'SIMPLE',
    description: '3 days in London',
    messages: ['3 days in London'],
    expected: {
      destination: 'London',
      duration: 3
    },
    notes: 'Basic destination + duration'
  },
  {
    id: 'S2',
    level: 'SIMPLE',
    description: 'Weekend trip to Paris',
    messages: ['Plan a weekend trip to Paris'],
    expected: {
      destination: 'Paris',
      duration: 2 // Weekend = 2-3 days
    },
    notes: 'Common phrasing with implicit duration'
  },
  {
    id: 'S3',
    level: 'SIMPLE',
    description: 'Tokyo 5 days starting tomorrow',
    messages: ['Visit Tokyo for 5 days starting tomorrow'],
    expected: {
      destination: 'Tokyo',
      duration: 5,
      startDate: 'any' // Should extract tomorrow's date
    },
    notes: 'Complete information in one message'
  },
  {
    id: 'S4',
    level: 'SIMPLE',
    description: 'Barcelona next Monday for 4 days',
    messages: ['I want to go to Barcelona next Monday for 4 days'],
    expected: {
      destination: 'Barcelona',
      duration: 4,
      startDate: 'any'
    },
    notes: 'Natural language with all info'
  },
  {
    id: 'S5',
    level: 'SIMPLE',
    description: 'Rome, 3 days, October 15',
    messages: ['Rome, 3 days, starting October 15'],
    expected: {
      destination: 'Rome',
      duration: 3,
      startDate: 'any'
    },
    notes: 'Concise comma-separated format'
  },

  // ============= NORMAL TESTS (5) =============
  {
    id: 'N1',
    level: 'NORMAL',
    description: 'Lisbon for tomorrow (MISLEADING - missing duration)',
    messages: ['Plan a trip to Lisbon for tomorrow'],
    expected: {
      destination: 'Lisbon',
      startDate: 'any',
      shouldAskForInfo: ['duration']
    },
    notes: 'Should ask for trip duration'
  },
  {
    id: 'N2',
    level: 'NORMAL',
    description: 'London and Paris next week (MISLEADING - multi-city, no duration)',
    messages: ['I\'m thinking about visiting London and Paris next week'],
    expected: {
      destinations: ['London', 'Paris'],
      startDate: 'any',
      shouldAskForInfo: ['duration']
    },
    notes: 'Multi-city trip, should ask for duration'
  },
  {
    id: 'N3',
    level: 'NORMAL',
    description: 'Bali, week off starting March 15',
    messages: ['Take me to Bali starting March 15, I have a week off'],
    expected: {
      destination: 'Bali',
      duration: 7,
      startDate: 'any'
    },
    notes: 'Indirect duration reference ("week off" = 7 days)'
  },
  {
    id: 'N4',
    level: 'NORMAL',
    description: 'Cultural trip to Kyoto (missing dates)',
    messages: ['Plan a cultural trip to Kyoto with temples and food'],
    expected: {
      destination: 'Kyoto',
      shouldAskForInfo: ['duration', 'startDate']
    },
    notes: 'Has preferences but missing dates and duration'
  },
  {
    id: 'N5',
    level: 'NORMAL',
    description: 'Budget trip to Thailand (MISLEADING - vague)',
    messages: ['Budget trip to Thailand, leaving soon'],
    expected: {
      destination: 'Thailand',
      shouldAskForInfo: ['duration', 'startDate']
    },
    notes: 'Country not city, vague date ("soon"), missing duration'
  },

  // ============= COMPLEX TESTS (5) =============
  {
    id: 'C1',
    level: 'COMPLEX',
    description: 'Multi-turn conversation (VERY MISLEADING)',
    messages: [
      'I want to travel',
      'To Europe',
      'London',
      '5 days',
      'Next month'
    ],
    expected: {
      destination: 'London',
      duration: 5,
      startDate: 'any'
    },
    notes: 'Info spread across 5 messages, tests context maintenance'
  },
  {
    id: 'C2',
    level: 'COMPLEX',
    description: 'Honeymoon (VERY MISLEADING - no info)',
    messages: ['Plan my honeymoon'],
    expected: {
      shouldAskForInfo: ['destination', 'duration', 'startDate']
    },
    notes: 'Should ask for ALL information'
  },
  {
    id: 'C3',
    level: 'COMPLEX',
    description: 'Complex with budget and preferences',
    messages: ['I have 10 days off in December and want to visit someplace warm with beaches and good food for under $2000'],
    expected: {
      duration: 10,
      startDate: 'any', // December
      shouldAskForInfo: ['destination']
    },
    notes: 'Has duration and month, but needs specific destination'
  },
  {
    id: 'C4',
    level: 'COMPLEX',
    description: 'Lisbon For tomorrow (EDGE CASE - temporal word in city)',
    messages: ['Take me to Lisbon For tomorrow'],
    expected: {
      destination: 'Lisbon', // NOT "Lisbon For"!
      startDate: 'any'
    },
    notes: 'CRITICAL: Tests that "For" is not included in destination name'
  },
  {
    id: 'C5',
    level: 'COMPLEX',
    description: 'Multiple options (MISLEADING)',
    messages: ['I\'m free next week Monday to Friday, thinking maybe Italy or Spain, depends on budget'],
    expected: {
      duration: 5, // Monday to Friday
      startDate: 'any',
      shouldAskForInfo: ['destination']
    },
    notes: 'Multiple destination options, AI should ask user to choose'
  }
];

const results: TestResult[] = [];

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testScenario(scenario: TestScenario): Promise<TestResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];
  let status: 'PASS' | 'FAIL' | 'PARTIAL' = 'PASS';
  let extracted: any = {};
  let generationId: string | null = null;

  console.log(`\n${'─'.repeat(70)}`);
  console.log(`🧪 Test ${scenario.id}: ${scenario.description}`);
  console.log(`   Level: ${scenario.level}`);
  if (scenario.notes) {
    console.log(`   📝 ${scenario.notes}`);
  }

  try {
    // Process each message in the conversation
    for (let i = 0; i < scenario.messages.length; i++) {
      const message = scenario.messages[i];
      console.log(`\n   📤 Message ${i + 1}/${scenario.messages.length}: "${message}"`);

      const response = await fetch('http://localhost:9002/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          generationId: generationId || undefined,
          conversationHistory: []
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(`API returned error: ${data.error || 'Unknown error'}`);
      }

      // Store generation ID for follow-up messages
      if (data.data.generationId) {
        generationId = data.data.generationId;
      }

      // Wait for processing
      await delay(2000);

      // Poll for the latest state
      if (generationId) {
        const pollResponse = await fetch(`http://localhost:9002/api/ai?generationId=${generationId}`);
        const pollData = await pollResponse.json();

        if (pollData.data) {
          // Extract intent information
          if (pollData.data.intent) {
            extracted = {
              ...extracted,
              ...pollData.data.intent
            };
          }

          // Check what AI is asking for
          if (pollData.data.awaitingInput) {
            extracted.aiAskedFor = extracted.aiAskedFor || [];
            extracted.aiAskedFor.push(pollData.data.awaitingInput);
          }

          console.log(`   📥 AI Response: ${pollData.data.message?.substring(0, 80)}...`);
          if (pollData.data.awaitingInput) {
            console.log(`   ❓ AI is asking for: ${pollData.data.awaitingInput}`);
          }
        }
      }
    }

    // Validate results
    console.log(`\n   🔍 Validating results...`);

    // Check destination
    if (scenario.expected.destination) {
      const expectedDest = scenario.expected.destination;
      const actualDest = extracted.destination || extracted.destinations?.[0];

      if (actualDest) {
        // CRITICAL: Check for temporal words in destination
        const temporalWords = ['for', 'starting', 'beginning', 'ending', 'tomorrow', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const destLower = actualDest.toLowerCase();
        const hasTemporalWord = temporalWords.some(word => destLower.includes(` ${word}`));

        if (hasTemporalWord) {
          errors.push(`Destination contains temporal word: "${actualDest}"`);
          status = 'FAIL';
        } else if (actualDest.toLowerCase().includes(expectedDest.toLowerCase())) {
          console.log(`   ✅ Destination: ${actualDest}`);
        } else {
          errors.push(`Expected destination "${expectedDest}", got "${actualDest}"`);
          status = 'FAIL';
        }
      } else if (!scenario.expected.shouldAskForInfo?.includes('destination')) {
        errors.push(`Missing destination (expected "${expectedDest}")`);
        status = 'FAIL';
      }
    }

    // Check multi-city destinations
    if (scenario.expected.destinations) {
      const actualDests = extracted.destinations || [];
      const expectedDests = scenario.expected.destinations;

      if (actualDests.length === expectedDests.length) {
        const allMatch = expectedDests.every(expected =>
          actualDests.some((actual: string) => actual.toLowerCase().includes(expected.toLowerCase()))
        );
        if (allMatch) {
          console.log(`   ✅ Destinations: ${actualDests.join(', ')}`);
        } else {
          errors.push(`Expected destinations ${expectedDests.join(', ')}, got ${actualDests.join(', ')}`);
          status = 'PARTIAL';
        }
      } else if (!scenario.expected.shouldAskForInfo?.includes('destination')) {
        errors.push(`Expected ${expectedDests.length} destinations, got ${actualDests.length}`);
        status = 'PARTIAL';
      }
    }

    // Check duration
    if (scenario.expected.duration) {
      if (extracted.duration) {
        const durationMatch = Math.abs(extracted.duration - scenario.expected.duration) <= 1; // Allow 1 day tolerance
        if (durationMatch) {
          console.log(`   ✅ Duration: ${extracted.duration} days`);
        } else {
          warnings.push(`Expected ~${scenario.expected.duration} days, got ${extracted.duration} days`);
          if (status === 'PASS') status = 'PARTIAL';
        }
      } else if (!scenario.expected.shouldAskForInfo?.includes('duration')) {
        errors.push(`Missing duration (expected ${scenario.expected.duration} days)`);
        if (status === 'PASS') status = 'PARTIAL';
      }
    }

    // Check if AI asked for missing info
    if (scenario.expected.shouldAskForInfo && scenario.expected.shouldAskForInfo.length > 0) {
      const askedFor = extracted.aiAskedFor || [];
      const shouldAsk = scenario.expected.shouldAskForInfo;

      if (askedFor.length > 0) {
        console.log(`   ✅ AI asked for: ${askedFor.join(', ')}`);
      } else {
        warnings.push(`AI should have asked for: ${shouldAsk.join(', ')}`);
        if (status === 'PASS') status = 'PARTIAL';
      }
    }

    // Check start date
    if (scenario.expected.startDate === 'any' && extracted.startDate) {
      console.log(`   ✅ Start date: ${extracted.startDate}`);
    } else if (scenario.expected.startDate && !extracted.startDate && !scenario.expected.shouldAskForInfo?.includes('startDate')) {
      warnings.push('Missing start date');
      if (status === 'PASS') status = 'PARTIAL';
    }

  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
    errors.push(error.message);
    status = 'FAIL';
  }

  const time = Date.now() - startTime;

  // Print result
  const statusIcon = status === 'PASS' ? '✅' : status === 'PARTIAL' ? '⚠️' : '❌';
  console.log(`\n   ${statusIcon} ${status} (${time}ms)`);

  if (errors.length > 0) {
    errors.forEach(err => console.log(`   ❌ ${err}`));
  }
  if (warnings.length > 0) {
    warnings.forEach(warn => console.log(`   ⚠️  ${warn}`));
  }

  return {
    id: scenario.id,
    level: scenario.level,
    description: scenario.description,
    status,
    time,
    extracted,
    expected: scenario.expected,
    errors,
    warnings
  };
}

async function runAllTests() {
  console.log('\n🚀 Starting AI Parser Test Suite...\n');

  // Check if server is running
  try {
    await fetch('http://localhost:9002');
  } catch (error) {
    console.error('❌ Server not running on port 9002');
    console.error('   Run: npm run dev');
    process.exit(1);
  }

  // Group tests by level
  const simpleTests = scenarios.filter(s => s.level === 'SIMPLE');
  const normalTests = scenarios.filter(s => s.level === 'NORMAL');
  const complexTests = scenarios.filter(s => s.level === 'COMPLEX');

  console.log('📊 Test Plan:');
  console.log(`   - ${simpleTests.length} SIMPLE tests`);
  console.log(`   - ${normalTests.length} NORMAL tests`);
  console.log(`   - ${complexTests.length} COMPLEX tests`);
  console.log(`   Total: ${scenarios.length} tests\n`);

  // Run all tests
  for (const scenario of scenarios) {
    const result = await testScenario(scenario);
    results.push(result);

    // Small delay between tests
    await delay(1000);
  }

  // Generate summary
  console.log(`\n\n${'='.repeat(70)}`);
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));

  const passed = results.filter(r => r.status === 'PASS').length;
  const partial = results.filter(r => r.status === 'PARTIAL').length;
  const failed = results.filter(r => r.status === 'FAIL').length;

  // Summary by level
  console.log('\n📈 Results by Level:');
  ['SIMPLE', 'NORMAL', 'COMPLEX'].forEach(level => {
    const levelResults = results.filter(r => r.level === level);
    const levelPass = levelResults.filter(r => r.status === 'PASS').length;
    const levelPartial = levelResults.filter(r => r.status === 'PARTIAL').length;
    const levelFail = levelResults.filter(r => r.status === 'FAIL').length;

    console.log(`\n   ${level}:`);
    console.log(`   ✅ Pass: ${levelPass}/${levelResults.length}`);
    if (levelPartial > 0) console.log(`   ⚠️  Partial: ${levelPartial}/${levelResults.length}`);
    if (levelFail > 0) console.log(`   ❌ Fail: ${levelFail}/${levelResults.length}`);
  });

  // Detailed results
  console.log(`\n${'─'.repeat(70)}`);
  console.log('📋 Detailed Results:\n');

  results.forEach(result => {
    const icon = result.status === 'PASS' ? '✅' : result.status === 'PARTIAL' ? '⚠️' : '❌';
    console.log(`${icon} [${result.id}] ${result.description} (${result.time}ms)`);

    if (result.errors.length > 0) {
      result.errors.forEach(err => console.log(`        ❌ ${err}`));
    }
    if (result.warnings.length > 0) {
      result.warnings.forEach(warn => console.log(`        ⚠️  ${warn}`));
    }
  });

  // Overall summary
  console.log(`\n${'='.repeat(70)}`);
  console.log(`✅ PASS: ${passed}/${results.length}`);
  if (partial > 0) console.log(`⚠️  PARTIAL: ${partial}/${results.length}`);
  if (failed > 0) console.log(`❌ FAIL: ${failed}/${results.length}`);
  console.log('='.repeat(70));

  const successRate = ((passed + partial * 0.5) / results.length * 100).toFixed(1);
  console.log(`\n📊 Success Rate: ${successRate}%`);

  if (failed === 0 && partial === 0) {
    console.log('\n🎉 Perfect! All tests passed!');
  } else if (failed === 0) {
    console.log('\n✅ Good! All tests passed or partially passed.');
  } else {
    console.log(`\n⚠️  ${failed} tests failed. Review errors above.`);
  }

  // Save results
  const timestamp = Date.now();
  const fs = await import('fs');
  const reportPath = `scripts/test-ai-parser-results-${timestamp}.json`;

  fs.writeFileSync(
    reportPath,
    JSON.stringify({
      timestamp,
      summary: {
        total: results.length,
        passed,
        partial,
        failed,
        successRate: parseFloat(successRate)
      },
      results
    }, null, 2)
  );

  console.log(`\n📁 Detailed results saved to: ${reportPath}`);

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(console.error);
