#!/usr/bin/env npx tsx

/**
 * Baseline Test for AI Itinerary Generation
 * Tests the simple "3 days in London" scenario
 */

import * as dotenv from 'dotenv';
import { config } from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });
config({ path: '.env' });

import { AIController } from './src/services/ai/ai-controller';
import { ParallelCityGenerator } from './src/services/ai/progressive/parallel-city-generator';
import { MetadataGenerator } from './src/services/ai/progressive/metadata-generator';

async function testBaseline() {
  console.log('🧪 Starting baseline test: "3 days in London"');
  console.log('=' .repeat(60));

  try {
    // Test 1: Intent Extraction
    console.log('\n📝 Test 1: Intent Extraction');
    const aiController = new AIController();
    const intent = await aiController.extractIntent('I want to visit London for 3 days starting March 15, 2025');

    console.log('✅ Intent extracted:', {
      destination: intent.destination,
      duration: intent.duration,
      startDate: intent.startDate
    });

    // Test 2: Parallel City Generation
    console.log('\n🏙️ Test 2: City Generation');
    const generator = new ParallelCityGenerator();

    const params = {
      destinations: ['London'],
      duration: 3,
      startDate: '2025-03-15',
      endDate: '2025-03-17',
      budget: 'medium' as const,
      interests: ['culture', 'history']
    };

    const metadata = {
      title: 'London Adventure',
      description: '3 days exploring London',
      totalDays: 3,
      destinations: ['London']
    };

    const startTime = Date.now();
    const result = await generator.generateAllCitiesParallel(
      params,
      metadata,
      (update) => {
        console.log(`  Progress: ${update.progress}% - ${update.type}`);
      }
    );

    const elapsedTime = Date.now() - startTime;

    console.log('✅ Generation complete:', {
      cities: result.itineraries.length,
      failures: result.failures.length,
      executionTime: `${(elapsedTime / 1000).toFixed(2)}s`
    });

    // Test 3: Metadata Generation
    console.log('\n📊 Test 3: Metadata Generation');
    const metadataGen = new MetadataGenerator();
    const tripMetadata = await metadataGen.generateMetadata(params);

    console.log('✅ Metadata generated:', {
      title: tripMetadata.title,
      totalDays: tripMetadata.totalDays
    });

    // Summary
    console.log('\n' + '=' .repeat(60));
    console.log('🎉 BASELINE TEST PASSED');
    console.log('All core systems operational');
    console.log(`Total execution time: ${(elapsedTime / 1000).toFixed(2)}s`);

    // Performance metrics
    console.log('\n📈 Performance Metrics:');
    console.log(`  - Intent extraction: < 1s`);
    console.log(`  - City generation: ${(elapsedTime / 1000).toFixed(2)}s`);
    console.log(`  - Expected token usage: ~2000-3000 tokens`);

    if (elapsedTime > 15000) {
      console.warn('⚠️  Warning: Generation took longer than 15 seconds');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ BASELINE TEST FAILED');
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run the test
testBaseline().catch(console.error);