#!/usr/bin/env tsx

/**
 * AI Testing Script
 * Run with: npm run test:ai
 */

import * as dotenv from 'dotenv';
import { generatePersonalizedItinerary } from '@/ai/flows/generate-personalized-itinerary';

// Load environment variables
dotenv.config();

async function testBaseline() {
  console.log('🧪 Running baseline test: 3 days in London...');
  
  try {
    const startTime = Date.now();
    
    const result = await generatePersonalizedItinerary({
      prompt: '3 days in London',
      attachedFile: undefined
    });

    const duration = Date.now() - startTime;

    if (!result.itinerary || result.itinerary.length === 0) {
      console.error('❌ Baseline test failed: No itinerary generated');
      process.exit(1);
    }

    if (result.itinerary.length !== 3) {
      console.error(`❌ Baseline test failed: Expected 3 days, got ${result.itinerary.length}`);
      process.exit(1);
    }

    console.log(`✅ Baseline test passed (${duration}ms)`);
    console.log(`   - Days: ${result.itinerary.length}`);
    console.log(`   - Destination: ${result.destination}`);
    
  } catch (error) {
    console.error('❌ Baseline test failed with error:', error);
    process.exit(1);
  }
}

async function testComplex() {
  console.log('\n🧪 Running complex test: Multi-city European trip...');
  
  try {
    const startTime = Date.now();
    
    const result = await generatePersonalizedItinerary({
      prompt: 'Plan a 10-day trip through Paris, Amsterdam, and Berlin. I want to experience local culture, try authentic food, and see major attractions. Budget is moderate.',
      attachedFile: undefined
    });

    const duration = Date.now() - startTime;

    if (!result.itinerary || result.itinerary.length === 0) {
      console.error('❌ Complex test failed: No itinerary generated');
      return false;
    }

    console.log(`✅ Complex test passed (${duration}ms)`);
    console.log(`   - Days: ${result.itinerary.length}`);
    console.log(`   - Destination: ${result.destination}`);
    return true;
    
  } catch (error) {
    console.error('⚠️  Complex test failed (non-critical):', error);
    return false;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const baselineOnly = args.includes('--baseline');

  console.log('🚀 Starting AI consistency tests...\n');

  // Always run baseline
  await testBaseline();

  if (!baselineOnly) {
    // Run additional tests
    const complexPassed = await testComplex();
    
    console.log('\n📊 Test Summary:');
    console.log('   ✅ Baseline test: PASSED');
    console.log(`   ${complexPassed ? '✅' : '⚠️ '} Complex test: ${complexPassed ? 'PASSED' : 'FAILED (non-critical)'}`);
  }

  console.log('\n✨ Testing complete!');
}

main().catch(console.error);