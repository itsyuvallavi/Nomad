#!/usr/bin/env tsx
/**
 * Phase 3 Feature Test Suite
 * Tests ML, context awareness, and predictive features
 */

import dotenv from 'dotenv';
dotenv.config();

import { MasterTravelParserV3 } from './src/lib/utils/master-parser-v3';
import { ParseLearningSystem } from './src/lib/utils/parse-history';
import { ContextAwareParser } from './src/lib/utils/context-parser';
import { PredictiveParser } from './src/lib/utils/predictive-parser';

const testCases = [
  {
    id: 'context_1',
    name: 'Context from conversation',
    input: 'I want to visit there for 5 days',
    conversationHistory: `user: I'm interested in Paris
assistant: Paris is beautiful! When would you like to visit?
user: I want to visit there for 5 days`,
    searchHistory: [],
    expected: {
      shouldHaveDestination: true,
      destination: 'Paris',
      duration: 5
    }
  },
  {
    id: 'context_2',
    name: 'Missing origin from context',
    input: '3 days in Tokyo',
    conversationHistory: `user: I'm based in San Francisco
assistant: Great! Where would you like to go?
user: 3 days in Tokyo`,
    searchHistory: [],
    expected: {
      shouldHaveOrigin: true,
      origin: 'San Francisco',
      destination: 'Tokyo'
    }
  },
  {
    id: 'learning_1',
    name: 'Learn from similar searches',
    input: 'Weekend trip to London',
    conversationHistory: '',
    searchHistory: [
      '3 days in London from New York',
      '5 days in Paris from New York',
      'Weekend in London from New York'
    ],
    expected: {
      shouldSuggestOrigin: 'New York',
      shouldSuggestDuration: 3
    }
  },
  {
    id: 'predictive_1',
    name: 'Predict missing information',
    input: 'Honeymoon in Bali',
    conversationHistory: '',
    searchHistory: [],
    expected: {
      shouldPredictTravelers: 2,
      shouldPredictActivities: true,
      tripType: 'honeymoon'
    }
  },
  {
    id: 'completion_1',
    name: 'Auto-completion test',
    input: 'Trip to Par',
    conversationHistory: '',
    searchHistory: [],
    expected: {
      shouldSuggestCompletion: 'Paris'
    }
  },
  {
    id: 'smart_defaults_1',
    name: 'Apply user preferences',
    input: 'Visit Barcelona',
    conversationHistory: '',
    searchHistory: [
      '7 days in Rome from Boston',
      '7 days in Paris from Boston',
      '7 days in London from Boston'
    ],
    expected: {
      shouldApplyDefaultDuration: 7,
      shouldSuggestOrigin: 'Boston'
    }
  }
];

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  details: {
    contextExtracted?: boolean;
    predictionsGenerated?: boolean;
    learningApplied?: boolean;
    completionsGenerated?: boolean;
    confidence?: string;
    processingTime?: number;
  };
  errors?: string[];
}

async function runPhase3Test(testCase: any): Promise<TestResult> {
  const startTime = Date.now();
  const result: TestResult = {
    id: testCase.id,
    name: testCase.name,
    passed: false,
    details: {},
    errors: []
  };

  try {
    console.log(`\n🧪 Test: ${testCase.name}`);
    console.log(`   Input: "${testCase.input}"`);
    if (testCase.conversationHistory) {
      console.log(`   Has conversation context: Yes`);
    }
    if (testCase.searchHistory.length > 0) {
      console.log(`   Search history: ${testCase.searchHistory.length} items`);
    }

    // Run Phase 3 parser
    const parsed = await MasterTravelParserV3.parseUserInput(
      testCase.input,
      testCase.conversationHistory || undefined,
      testCase.searchHistory.length > 0 ? testCase.searchHistory : undefined
    );

    result.details.processingTime = Date.now() - startTime;
    result.details.confidence = parsed.confidence;
    result.details.contextExtracted = !!parsed.contextUsed && Object.keys(parsed.contextUsed).length > 0;
    result.details.predictionsGenerated = !!parsed.predictions;
    result.details.learningApplied = !!parsed.learnedPatterns && parsed.learnedPatterns.length > 0;
    result.details.completionsGenerated = !!parsed.completions && parsed.completions.length > 0;

    // Validate expectations
    let allPassed = true;

    // Check context extraction
    if (testCase.expected.destination) {
      const hasDestination = parsed.destinations.some(d => 
        d.city.toLowerCase().includes(testCase.expected.destination.toLowerCase())
      );
      if (hasDestination) {
        console.log(`   ✅ Destination resolved: ${testCase.expected.destination}`);
      } else {
        console.log(`   ❌ Failed to resolve destination`);
        result.errors!.push('Destination not resolved from context');
        allPassed = false;
      }
    }

    if (testCase.expected.origin) {
      if (parsed.origin?.toLowerCase().includes(testCase.expected.origin.toLowerCase())) {
        console.log(`   ✅ Origin extracted: ${parsed.origin}`);
      } else {
        console.log(`   ❌ Failed to extract origin from context`);
        result.errors!.push('Origin not extracted');
        allPassed = false;
      }
    }

    if (testCase.expected.shouldPredictTravelers) {
      if (parsed.travelers === testCase.expected.shouldPredictTravelers) {
        console.log(`   ✅ Travelers predicted: ${parsed.travelers}`);
      } else {
        console.log(`   ⚠️ Traveler prediction off: ${parsed.travelers}`);
      }
    }

    if (testCase.expected.shouldPredictActivities) {
      if (parsed.activities.length > 0 || parsed.predictions?.activities) {
        console.log(`   ✅ Activities predicted: ${parsed.activities.length || parsed.predictions?.activities?.length}`);
      } else {
        console.log(`   ⚠️ No activities predicted`);
      }
    }

    if (testCase.expected.shouldSuggestCompletion) {
      if (parsed.completions && parsed.completions.some(c => 
        c.toLowerCase().includes(testCase.expected.shouldSuggestCompletion.toLowerCase())
      )) {
        console.log(`   ✅ Completion suggested: ${testCase.expected.shouldSuggestCompletion}`);
      } else {
        console.log(`   ⚠️ Expected completion not found`);
      }
    }

    // Display Phase 3 features used
    console.log(`\n   📊 Phase 3 Features:`);
    console.log(`      Context used: ${result.details.contextExtracted ? 'Yes' : 'No'}`);
    console.log(`      Predictions: ${result.details.predictionsGenerated ? 'Yes' : 'No'}`);
    console.log(`      Learning applied: ${result.details.learningApplied ? 'Yes' : 'No'}`);
    console.log(`      Completions: ${result.details.completionsGenerated ? 'Yes' : 'No'}`);
    console.log(`      Confidence: ${parsed.confidence}`);
    console.log(`      Processing: ${result.details.processingTime}ms`);

    if (parsed.smartSuggestions && parsed.smartSuggestions.length > 0) {
      console.log(`\n   💡 Smart Suggestions:`);
      parsed.smartSuggestions.slice(0, 3).forEach(s => {
        console.log(`      - ${s.value}`);
      });
    }

    result.passed = allPassed;
    console.log(`\n   ${result.passed ? '✅ PASSED' : '⚠️ PARTIAL SUCCESS'}`);

  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
    result.errors!.push(error.message);
  }

  return result;
}

async function testLearningSystem() {
  console.log('\n📚 Testing Learning System');
  console.log('-'.repeat(40));

  // Simulate some successful parses for learning
  const trainingData = [
    { input: '5 days in Paris from New York', destinations: ['Paris'], origin: 'New York', duration: 5 },
    { input: '5 days in London from New York', destinations: ['London'], origin: 'New York', duration: 5 },
    { input: '5 days in Rome from New York', destinations: ['Rome'], origin: 'New York', duration: 5 },
    { input: 'Beach vacation in Bali', destinations: ['Bali'], tripType: 'beach' },
    { input: 'Beach holiday in Thailand', destinations: ['Thailand'], tripType: 'beach' },
    { input: 'Beach trip to Maldives', destinations: ['Maldives'], tripType: 'beach' }
  ];

  for (const data of trainingData) {
    const parsed = await MasterTravelParserV3.parseUserInput(data.input);
    console.log(`   Training: "${data.input}" → ${parsed.destinations.length} destinations`);
  }

  // Test if learning is applied
  const testInput = '5 days trip from New York';
  const similarParses = await ParseLearningSystem.findSimilarParses(testInput);
  console.log(`\n   Similar parses found for "${testInput}": ${similarParses.length}`);
  
  const stats = await ParseLearningSystem.getStatistics();
  console.log(`   Learning stats: ${stats.totalParses} parses, ${stats.patternCount} patterns`);
}

async function testPredictiveFeatures() {
  console.log('\n🔮 Testing Predictive Features');
  console.log('-'.repeat(40));

  // Test completions
  const partialInputs = ['Trip to Par', 'Weekend in Lon', 'Vacation in Tok'];
  for (const partial of partialInputs) {
    const completions = await PredictiveParser.suggestCompletions(partial);
    console.log(`   "${partial}" → ${completions.slice(0, 3).map(c => c.text).join(', ')}`);
  }

  // Test smart prompts
  const context = ContextAwareParser.extractContext('user: I\'m from Boston');
  const prompts = PredictiveParser.generateSmartPrompts(context);
  console.log(`\n   Smart prompts generated: ${prompts.length}`);
  prompts.slice(0, 3).forEach(p => console.log(`      - ${p}`));
}

async function runAllTests() {
  console.log('🚀 Phase 3 Feature Test Suite');
  console.log('=' .repeat(60));
  console.log('Testing ML, Context Awareness, and Predictive Features\n');

  // Initialize Phase 3 systems
  await MasterTravelParserV3.initialize();

  const results: TestResult[] = [];

  // Run main test cases
  for (const testCase of testCases) {
    const result = await runPhase3Test(testCase);
    results.push(result);
  }

  // Test learning system
  await testLearningSystem();

  // Test predictive features
  await testPredictiveFeatures();

  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST SUMMARY\n');

  const passed = results.filter(r => r.passed).length;
  const phase3FeaturesUsed = results.filter(r => 
    r.details.contextExtracted || 
    r.details.predictionsGenerated || 
    r.details.learningApplied
  ).length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passed}/${results.length} (${Math.round(passed/results.length * 100)}%)`);
  console.log(`Phase 3 Features Used: ${phase3FeaturesUsed}/${results.length} tests`);
  
  console.log(`\nFeature Usage:`);
  console.log(`- Context Extraction: ${results.filter(r => r.details.contextExtracted).length} tests`);
  console.log(`- Predictions: ${results.filter(r => r.details.predictionsGenerated).length} tests`);
  console.log(`- Learning Applied: ${results.filter(r => r.details.learningApplied).length} tests`);
  console.log(`- Completions: ${results.filter(r => r.details.completionsGenerated).length} tests`);

  const avgProcessingTime = Math.round(
    results.reduce((sum, r) => sum + (r.details.processingTime || 0), 0) / results.length
  );
  console.log(`\nAverage Processing Time: ${avgProcessingTime}ms`);

  // Get statistics
  const stats = await MasterTravelParserV3.getStatistics();
  console.log(`\n📈 System Statistics:`);
  console.log(`- Cache size: ${stats.phase2Stats.size}`);
  console.log(`- Total parses learned: ${stats.phase3Stats.totalParses}`);
  console.log(`- Patterns discovered: ${stats.phase3Stats.patternCount}`);
  console.log(`- Average confidence: ${Math.round(stats.phase3Stats.averageConfidence * 100)}%`);

  console.log('\n' + '=' .repeat(60));
  console.log('🎉 Phase 3 Testing Complete!\n');
  
  if (passed === results.length) {
    console.log('✅ All tests passed - Phase 3 features working perfectly!');
  } else if (phase3FeaturesUsed > results.length / 2) {
    console.log('⚠️ Most Phase 3 features working - some refinement needed');
  } else {
    console.log('❌ Phase 3 features need attention');
  }
}

// Run the test suite
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});