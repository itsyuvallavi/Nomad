#!/usr/bin/env npx tsx
import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env.local') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

console.log('🧪 AI Parser Quick Test Suite');
console.log('=' .repeat(70));
console.log('Testing AI intent extraction (parser only, not full generation)\n');

interface TestScenario {
  id: string;
  level: 'SIMPLE' | 'NORMAL' | 'COMPLEX';
  prompt: string;
  expected: {
    destination?: string;
    destinations?: string[];
    duration?: number;
    shouldAskFor?: string[];
  };
  notes: string;
}

const tests: TestScenario[] = [
  // SIMPLE (5)
  { id: 'S1', level: 'SIMPLE', prompt: '3 days in London', expected: { destination: 'London', duration: 3 }, notes: 'Basic' },
  { id: 'S2', level: 'SIMPLE', prompt: 'Plan a weekend trip to Paris', expected: { destination: 'Paris' }, notes: 'Weekend' },
  { id: 'S3', level: 'SIMPLE', prompt: 'Visit Tokyo for 5 days starting tomorrow', expected: { destination: 'Tokyo', duration: 5 }, notes: 'Complete' },
  { id: 'S4', level: 'SIMPLE', prompt: 'I want to go to Barcelona next Monday for 4 days', expected: { destination: 'Barcelona', duration: 4 }, notes: 'Natural' },
  { id: 'S5', level: 'SIMPLE', prompt: 'Rome, 3 days, starting October 15', expected: { destination: 'Rome', duration: 3 }, notes: 'Concise' },

  // NORMAL (5)
  { id: 'N1', level: 'NORMAL', prompt: 'Plan a trip to Lisbon for tomorrow', expected: { destination: 'Lisbon', shouldAskFor: ['duration'] }, notes: 'Missing duration' },
  { id: 'N2', level: 'NORMAL', prompt: 'I\'m thinking about visiting London and Paris next week', expected: { destinations: ['London', 'Paris'] }, notes: 'Multi-city' },
  { id: 'N3', level: 'NORMAL', prompt: 'Take me to Bali starting March 15, I have a week off', expected: { destination: 'Bali', duration: 7 }, notes: 'Indirect duration' },
  { id: 'N4', level: 'NORMAL', prompt: 'Plan a cultural trip to Kyoto with temples and food', expected: { destination: 'Kyoto' }, notes: 'Preferences' },
  { id: 'N5', level: 'NORMAL', prompt: 'Budget trip to Thailand, leaving soon', expected: { destination: 'Thailand' }, notes: 'Vague' },

  // COMPLEX (5)
  { id: 'C1', level: 'COMPLEX', prompt: 'I want to travel', expected: { shouldAskFor: ['destination', 'duration'] }, notes: 'No info' },
  { id: 'C2', level: 'COMPLEX', prompt: 'Plan my honeymoon', expected: { shouldAskFor: ['destination'] }, notes: 'Context only' },
  { id: 'C3', level: 'COMPLEX', prompt: 'I have 10 days off in December and want to visit someplace warm with beaches', expected: { duration: 10 }, notes: 'Complex preferences' },
  { id: 'C4', level: 'COMPLEX', prompt: 'Take me to Lisbon For tomorrow', expected: { destination: 'Lisbon' }, notes: '🔥 CRITICAL: Tests "For" removal' },
  { id: 'C5', level: 'COMPLEX', prompt: 'I\'m free next week Monday to Friday, maybe Italy or Spain', expected: { duration: 5 }, notes: 'Multiple options' },
];

async function runTest(test: TestScenario) {
  const start = Date.now();

  try {
    const response = await fetch('http://localhost:3000/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: test.prompt,
        conversationHistory: []
      })
    });

    const data = await response.json();
    const time = Date.now() - start;

    if (!data.success) {
      console.log(`❌ [${test.id}] API Error: ${data.error}`);
      return { pass: false, time };
    }

    // Poll for intent extraction with retries (AI extraction is async)
    let intent = {};
    let awaitingInput;
    let pollData;

    // Try polling up to 5 times with 1 second between each
    for (let i = 0; i < 5; i++) {
      await new Promise(r => setTimeout(r, 1000));

      const pollResp = await fetch(`http://localhost:3000/api/ai?generationId=${data.data.generationId}`);
      pollData = await pollResp.json();

      intent = pollData.data?.intent || {};
      awaitingInput = pollData.data?.awaitingInput;

      // If we have an intent or awaiting input, we're done
      if (Object.keys(intent).length > 0 || awaitingInput) {
        break;
      }
    }

    // Validation
    let pass = true;
    let issues: string[] = [];

    // Check destination
    if (test.expected.destination) {
      const dest = intent.destination || intent.destinations?.[0] || '';

      // CRITICAL: Check for temporal words
      const temporalWords = ['for', 'starting', 'beginning', 'tomorrow'];
      const hasTemporalWord = temporalWords.some(w => dest.toLowerCase().includes(` ${w}`));

      if (hasTemporalWord) {
        issues.push(`❌ CRITICAL: Destination contains temporal word: "${dest}"`);
        pass = false;
      } else if (!dest.toLowerCase().includes(test.expected.destination.toLowerCase())) {
        issues.push(`Expected dest "${test.expected.destination}", got "${dest}"`);
        pass = false;
      }
    }

    // Check multi-city
    if (test.expected.destinations) {
      const dests = intent.destinations || [];
      if (dests.length < test.expected.destinations.length) {
        issues.push(`Expected ${test.expected.destinations.length} cities, got ${dests.length}`);
        pass = false;
      }
    }

    // Check duration
    if (test.expected.duration) {
      if (!intent.duration || Math.abs(intent.duration - test.expected.duration) > 1) {
        issues.push(`Expected duration ${test.expected.duration}, got ${intent.duration || 'none'}`);
        pass = false;
      }
    }

    // Check if AI should ask for info
    if (test.expected.shouldAskFor && !awaitingInput) {
      issues.push(`Should ask for: ${test.expected.shouldAskFor.join(', ')}`);
      pass = false;
    }

    const icon = pass ? '✅' : '❌';
    const extracted = {
      dest: intent.destination || intent.destinations?.join(', '),
      dur: intent.duration,
      start: intent.startDate,
      asking: awaitingInput
    };

    console.log(`${icon} [${test.id}] ${test.prompt.substring(0, 50)}... (${time}ms)`);
    console.log(`   📝 ${test.notes}`);
    console.log(`   📊 Extracted: ${JSON.stringify(extracted)}`);

    if (issues.length > 0) {
      issues.forEach(i => console.log(`   ⚠️  ${i}`));
    }

    return { pass, time, issues };
  } catch (err: any) {
    console.log(`❌ [${test.id}] Error: ${err.message}`);
    return { pass: false, time: Date.now() - start, issues: [err.message] };
  }
}

async function main() {
  console.log('📊 Running 15 tests...\n');

  // Check server
  try {
    await fetch('http://localhost:3000');
  } catch {
    console.error('❌ Server not running on port 3000');
    process.exit(1);
  }

  const results: any[] = [];

  // Run by level
  for (const level of ['SIMPLE', 'NORMAL', 'COMPLEX']) {
    console.log(`\n${'─'.repeat(70)}`);
    console.log(`📁 ${level} TESTS`);
    console.log('─'.repeat(70));

    const levelTests = tests.filter(t => t.level === level);

    for (const test of levelTests) {
      const result = await runTest(test);
      results.push({ ...test, ...result });
      console.log('');

      // Delay between tests to avoid OpenAI rate limits
      console.log('   ⏳ Waiting 3s to avoid rate limits...');
      await new Promise(r => setTimeout(r, 3000));
    }
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY');
  console.log('='.repeat(70));

  const byLevel: any = {};
  ['SIMPLE', 'NORMAL', 'COMPLEX'].forEach(level => {
    const levelResults = results.filter(r => r.level === level);
    const passed = levelResults.filter(r => r.pass).length;
    byLevel[level] = { total: levelResults.length, passed };
    console.log(`\n${level}: ${passed}/${levelResults.length} passed`);
  });

  const totalPass = results.filter(r => r.pass).length;
  const totalFail = results.filter(r => !r.pass).length;

  console.log(`\n${'='.repeat(70)}`);
  console.log(`✅ PASSED: ${totalPass}/${results.length}`);
  console.log(`❌ FAILED: ${totalFail}/${results.length}`);
  console.log(`📊 Success Rate: ${(totalPass / results.length * 100).toFixed(1)}%`);
  console.log('='.repeat(70));

  // Critical issue check
  const criticalIssues = results.filter(r =>
    r.issues?.some((i: string) => i.includes('CRITICAL'))
  );

  if (criticalIssues.length > 0) {
    console.log('\n🔥 CRITICAL ISSUES FOUND:');
    criticalIssues.forEach(r => {
      console.log(`   ${r.id}: ${r.prompt.substring(0, 50)}`);
      r.issues.forEach((i: string) => {
        if (i.includes('CRITICAL')) console.log(`      ${i}`);
      });
    });
  }

  // Save results
  const fs = await import('fs');
  const timestamp = Date.now();
  fs.writeFileSync(
    `scripts/test-results-${timestamp}.json`,
    JSON.stringify({ timestamp, summary: byLevel, results }, null, 2)
  );

  console.log(`\n📁 Results saved to: scripts/test-results-${timestamp}.json`);

  if (totalFail === 0) {
    console.log('\n🎉 All tests passed!');
  } else {
    console.log(`\n⚠️  ${totalFail} tests failed. Review above.`);
  }

  process.exit(totalFail > 0 ? 1 : 0);
}

main().catch(console.error);
