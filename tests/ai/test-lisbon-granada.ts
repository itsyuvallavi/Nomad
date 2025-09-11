#!/usr/bin/env tsx
/**
 * Test the Lisbon and Granada parsing issue
 */

import { parseDestinations } from '../../src/ai/utils/destination-parser';
import { EnhancedDestinationParser } from '../../src/ai/utils/enhanced-destination-parser';
import { MasterTravelParser } from '../../src/lib/utils/master-parser';

const testPrompt = "Plan a 2 weeks trip in Lisbon and Granada, i want to be 10 days in lisbon and 4 in granada.";

console.log('Testing destination parsing for:', testPrompt);
console.log('=' .repeat(60));

// Test basic parser
console.log('\n1. Basic parseDestinations:');
const basicResult = parseDestinations(testPrompt);
console.log('  Origin:', basicResult.origin || 'NONE');
console.log('  Destinations:', basicResult.destinations);
console.log('  Total days:', basicResult.totalDays);

// Test enhanced parser
console.log('\n2. EnhancedDestinationParser:');
const enhancedResult = EnhancedDestinationParser.parse(testPrompt);
console.log('  Origin:', enhancedResult.origin || 'NONE');
console.log('  Destinations:', enhancedResult.destinations);
console.log('  Total days:', enhancedResult.totalDays);

// Test master parser
console.log('\n3. MasterTravelParser:');
MasterTravelParser.parseUserInput(testPrompt).then(masterResult => {
  console.log('  Origin:', masterResult.origin || 'NONE');
  console.log('  Destinations:', masterResult.destinations);
  console.log('  Duration:', masterResult.duration);
  console.log('  Start date:', masterResult.startDate);
  
  console.log('\n' + '=' .repeat(60));
  console.log('ANALYSIS:');
  
  const foundLisbon = masterResult.destinations.some(d => 
    d.city.toLowerCase().includes('lisbon')
  );
  const foundGranada = masterResult.destinations.some(d => 
    d.city.toLowerCase().includes('granada')
  );
  
  if (!foundLisbon || !foundGranada) {
    console.log('❌ FAILED: Missing destinations');
    console.log('  - Lisbon found:', foundLisbon);
    console.log('  - Granada found:', foundGranada);
  } else {
    console.log('✅ Both destinations found');
  }
  
  if (!masterResult.origin) {
    console.log('⚠️  WARNING: No origin detected - this will cause "Unknown → destination" in output');
  }
});