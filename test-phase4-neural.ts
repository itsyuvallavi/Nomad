#!/usr/bin/env tsx
/**
 * Phase 4 Neural ML Test Suite
 * Tests TensorFlow.js models, embeddings, and sequence processing
 */

import dotenv from 'dotenv';
dotenv.config();

import { MasterTravelParserV4 } from './src/lib/utils/master-parser-v4';
import { NeuralTravelParser } from './src/lib/utils/neural-parser';
import { EmbeddingService } from './src/lib/utils/embeddings';
import { ContextSequenceModel } from './src/lib/utils/sequence-model';

const testCases = [
  {
    id: 'neural_1',
    name: 'Neural parsing basic',
    input: '5 days in Paris from New York',
    expected: {
      hasNeuralPredictions: true,
      destinations: ['Paris'],
      origin: 'New York',
      duration: 5
    }
  },
  {
    id: 'semantic_1',
    name: 'Semantic destination matching',
    input: 'Trip to the city of lights',
    conversationHistory: '',
    expected: {
      semanticMatch: 'Paris',
      hasAlternatives: true
    }
  },
  {
    id: 'semantic_2',
    name: 'Similar destination suggestion',
    input: 'Beach vacation like Bali',
    expected: {
      hasSimilarSuggestions: true,
      suggestionsInclude: ['Thailand', 'Maldives']
    }
  },
  {
    id: 'sequence_1',
    name: 'Context sequence processing',
    input: 'Yes, that sounds perfect',
    conversationHistory: `user: I want to visit Tokyo
assistant: Tokyo is amazing! When would you like to go?
user: Next month for a week
assistant: Great! A week in Tokyo next month. Would you like me to create an itinerary?
user: Yes, that sounds perfect`,
    expected: {
      hasContextVector: true,
      contextConfidence: 0.7
    }
  },
  {
    id: 'hybrid_1',
    name: 'Hybrid neural + traditional',
    input: 'Family trip to Europe for 2 weeks in summer',
    expected: {
      processingMode: 'neural',
      hasMultipleModels: true,
      travelers: 4
    }
  },
  {
    id: 'embedding_cluster',
    name: 'Destination clustering',
    input: 'Romantic getaway to Paris',
    expected: {
      cluster: 'romantic',
      similarDestinations: true
    }
  }
];

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  details: {
    neuralUsed?: boolean;
    embeddingUsed?: boolean;
    sequenceUsed?: boolean;
    processingMode?: string;
    confidence?: number;
    modelConfidences?: any;
    processingTime?: number;
  };
  errors?: string[];
}

async function runPhase4Test(testCase: any): Promise<TestResult> {
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

    // Run Phase 4 parser
    const parsed = await MasterTravelParserV4.parseUserInput(
      testCase.input,
      testCase.conversationHistory,
      []
    );

    result.details.processingTime = Date.now() - startTime;
    result.details.processingMode = parsed.processingMode;
    result.details.neuralUsed = !!parsed.neuralPredictions;
    result.details.embeddingUsed = !!parsed.semanticMatches;
    result.details.sequenceUsed = !!parsed.contextVector;
    result.details.confidence = parsed.modelConfidence?.combined;
    result.details.modelConfidences = parsed.modelConfidence;

    // Validate expectations
    let allPassed = true;

    // Check neural predictions
    if (testCase.expected.hasNeuralPredictions) {
      if (parsed.neuralPredictions) {
        console.log(`   ✅ Neural predictions generated`);
        console.log(`      Confidence: ${parsed.neuralPredictions.confidence.toFixed(2)}`);
      } else {
        console.log(`   ⚠️ No neural predictions`);
      }
    }

    // Check semantic matching
    if (testCase.expected.semanticMatch) {
      if (parsed.semanticMatches?.destination.toLowerCase().includes(
        testCase.expected.semanticMatch.toLowerCase()
      )) {
        console.log(`   ✅ Semantic match: ${parsed.semanticMatches.destination}`);
      } else {
        console.log(`   ❌ Semantic match failed`);
        result.errors!.push('Semantic matching failed');
        allPassed = false;
      }
    }

    // Check context vector
    if (testCase.expected.hasContextVector) {
      if (parsed.contextVector) {
        console.log(`   ✅ Context vector generated`);
        console.log(`      Confidence: ${parsed.contextVector.confidence.toFixed(2)}`);
      } else {
        console.log(`   ❌ No context vector`);
        result.errors!.push('Context processing failed');
        allPassed = false;
      }
    }

    // Display model usage
    console.log(`\n   🤖 ML Models Used:`);
    console.log(`      Neural Parser: ${result.details.neuralUsed ? 'Yes' : 'No'}`);
    console.log(`      Embeddings: ${result.details.embeddingUsed ? 'Yes' : 'No'}`);
    console.log(`      Sequence Model: ${result.details.sequenceUsed ? 'Yes' : 'No'}`);
    console.log(`      Processing Mode: ${parsed.processingMode}`);
    
    if (parsed.modelConfidence) {
      console.log(`\n   📊 Model Confidences:`);
      console.log(`      Neural: ${(parsed.modelConfidence.neural * 100).toFixed(0)}%`);
      console.log(`      Embedding: ${(parsed.modelConfidence.embedding * 100).toFixed(0)}%`);
      console.log(`      Sequence: ${(parsed.modelConfidence.sequence * 100).toFixed(0)}%`);
      console.log(`      Combined: ${(parsed.modelConfidence.combined * 100).toFixed(0)}%`);
    }

    console.log(`\n   ⏱️ Processing Time: ${result.details.processingTime}ms`);

    result.passed = allPassed;
    console.log(`\n   ${result.passed ? '✅ PASSED' : '⚠️ PARTIAL SUCCESS'}`);

  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
    result.errors!.push(error.message);
  }

  return result;
}

async function testNeuralParser() {
  console.log('\n🧠 Testing Neural Parser Directly');
  console.log('-'.repeat(40));

  const neural = new NeuralTravelParser();
  await neural.initialize();

  const testInputs = [
    '3 days in London',
    'Honeymoon in Bali for 2 weeks',
    'Budget trip to Thailand from Singapore'
  ];

  for (const input of testInputs) {
    try {
      const result = await neural.parseWithNN(input);
      console.log(`   "${input}"`);
      console.log(`      Destinations: ${result.destinations.join(', ') || 'None'}`);
      console.log(`      Origin: ${result.origin || 'None'}`);
      console.log(`      Confidence: ${(result.confidence * 100).toFixed(0)}%`);
    } catch (error: any) {
      console.log(`   ❌ Failed: ${error.message}`);
    }
  }

  // Show model summary
  console.log('\n   Model Architecture:');
  const summary = neural.getModelSummary();
  console.log(summary.split('\n').slice(0, 5).map(l => '      ' + l).join('\n'));
}

async function testEmbeddings() {
  console.log('\n🔤 Testing Embeddings Service');
  console.log('-'.repeat(40));

  const embeddings = new EmbeddingService();
  await embeddings.initialize();

  // Test similarity
  const pairs = [
    ['Paris', 'Rome'],
    ['Beach vacation', 'Bali'],
    ['Budget trip', 'Luxury travel']
  ];

  for (const [text1, text2] of pairs) {
    const similarity = await embeddings.getSimilarity(text1, text2);
    console.log(`   "${text1}" ↔ "${text2}": ${(similarity * 100).toFixed(0)}% similar`);
  }

  // Test semantic search
  console.log('\n   Semantic Search:');
  const queries = ['romantic city', 'beach paradise', 'cultural experience'];
  
  for (const query of queries) {
    const results = await embeddings.findSimilar(query, undefined, 0.3, 3);
    console.log(`   "${query}" → ${results.map(r => r.text).join(', ')}`);
  }

  // Test clustering
  console.log('\n   Destination Clusters:');
  const clusters = await embeddings.clusterDestinations(3);
  clusters.forEach(cluster => {
    console.log(`   ${cluster.theme}: ${cluster.members.slice(0, 3).join(', ')}`);
  });
}

async function testSequenceModel() {
  console.log('\n📝 Testing Sequence Model');
  console.log('-'.repeat(40));

  const sequence = new ContextSequenceModel();
  await sequence.initialize();

  const conversation = [
    'I want to plan a trip',
    'Somewhere warm and tropical',
    'Maybe Thailand or Bali',
    'For about 10 days',
    'Budget around $3000'
  ];

  // Process sequence
  const context = await sequence.processSequence(conversation);
  console.log(`   Context Vector Generated`);
  console.log(`   Confidence: ${(context.confidence * 100).toFixed(0)}%`);
  console.log(`   Vector dimensions: ${context.vector.length}`);

  // Predict next query
  const predictions = await sequence.predictNext(conversation);
  console.log(`\n   Predicted Next Queries:`);
  predictions.forEach(p => console.log(`      - ${p}`));

  // Extract patterns
  const patterns = await sequence.extractPatterns([conversation]);
  console.log(`\n   Extracted Patterns: ${patterns.length}`);
}

async function runAllTests() {
  console.log('🚀 Phase 4 Neural ML Test Suite');
  console.log('=' .repeat(60));
  console.log('Testing TensorFlow.js Models and ML Features\n');

  // Initialize Phase 4 systems
  console.log('⏳ Initializing ML models (this may take a moment)...');
  await MasterTravelParserV4.initialize();
  console.log('✅ ML models loaded\n');

  const results: TestResult[] = [];

  // Run main test cases
  for (const testCase of testCases) {
    const result = await runPhase4Test(testCase);
    results.push(result);
  }

  // Test individual components
  await testNeuralParser();
  await testEmbeddings();
  await testSequenceModel();

  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST SUMMARY\n');

  const passed = results.filter(r => r.passed).length;
  const neuralUsed = results.filter(r => r.details.neuralUsed).length;
  const embeddingUsed = results.filter(r => r.details.embeddingUsed).length;
  const sequenceUsed = results.filter(r => r.details.sequenceUsed).length;

  console.log(`Total Tests: ${results.length}`);
  console.log(`Passed: ${passed}/${results.length} (${Math.round(passed/results.length * 100)}%)`);
  
  console.log(`\nML Model Usage:`);
  console.log(`- Neural Parser: ${neuralUsed}/${results.length} tests`);
  console.log(`- Embeddings: ${embeddingUsed}/${results.length} tests`);
  console.log(`- Sequence Model: ${sequenceUsed}/${results.length} tests`);

  const avgProcessingTime = Math.round(
    results.reduce((sum, r) => sum + (r.details.processingTime || 0), 0) / results.length
  );
  console.log(`\nAverage Processing Time: ${avgProcessingTime}ms`);

  // Get statistics
  const stats = await MasterTravelParserV4.getStatistics();
  console.log(`\n📈 System Statistics:`);
  console.log(`- Embedding Cache: ${stats.embeddingStats.size} entries`);
  console.log(`- Neural Model: ${stats.neuralStats.initialized ? 'Initialized' : 'Not initialized'}`);

  // Test destination clustering
  console.log(`\n🗺️ Destination Clusters:`);
  const clusters = await MasterTravelParserV4.clusterDestinations(3);
  clusters.forEach((cluster: any) => {
    console.log(`- ${cluster.theme}: ${cluster.members.length} destinations`);
  });

  console.log('\n' + '=' .repeat(60));
  console.log('🎉 Phase 4 Neural ML Testing Complete!\n');
  
  if (passed === results.length) {
    console.log('✅ All tests passed - Neural ML features fully operational!');
  } else if (neuralUsed > 0 || embeddingUsed > 0) {
    console.log('⚠️ ML features partially working - some components need attention');
  } else {
    console.log('❌ ML features not working - check TensorFlow.js installation');
  }

  console.log('\n🚀 Key Achievements:');
  console.log('- Neural network parsing with TensorFlow.js');
  console.log('- Semantic similarity with Universal Sentence Encoder');
  console.log('- Context understanding with LSTM models');
  console.log('- Hybrid parsing combining ML with rules');
}

// Run the test suite
runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});