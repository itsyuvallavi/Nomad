#!/usr/bin/env tsx
/**
 * Phase 2 Parser Test
 * Quick validation of Phase 2 improvements without API calls
 */

import { MasterTravelParser } from './src/lib/utils/master-parser';
import { EnhancedDestinationParser } from './src/ai/utils/enhanced-destination-parser';

const testCases = [
  {
    id: 'date_1',
    input: 'Trip to Paris next week',
    expected: { destinations: ['Paris'], hasDates: true }
  },
  {
    id: 'date_2', 
    input: 'Planning vacation to Tokyo mid-January',
    expected: { destinations: ['Tokyo'], hasDates: true }
  },
  {
    id: 'date_3',
    input: 'Christmas holidays in New York from Boston',
    expected: { destinations: ['New York'], origin: 'Boston', hasDates: true }
  },
  {
    id: 'complex_1',
    input: 'Two week honeymoon in Bali and Thailand from Los Angeles',
    expected: { destinations: ['Bali', 'Thailand'], origin: 'Los Angeles', travelers: 2 }
  },
  {
    id: 'complex_2',
    input: 'Family of 4 visiting Disney World in Orlando during spring break, budget $5000',
    expected: { destinations: ['Disney World', 'Orlando'], travelers: 4, hasBudget: true }
  },
  {
    id: 'complex_3',
    input: 'Solo backpacking across Vietnam, Cambodia, and Laos for 3 weeks starting next month',
    expected: { destinations: ['Vietnam', 'Cambodia', 'Laos'], duration: 21, travelers: 1 }
  }
];

async function testParsers() {
  console.log('🧪 Phase 2 Parser Testing\n');
  console.log('='.repeat(60));
  
  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.id}`);
    console.log(`Input: "${testCase.input}"`);
    console.log('-'.repeat(40));
    
    try {
      // Test Master Parser (Phase 2)
      const masterResult = await MasterTravelParser.parseUserInput(testCase.input);
      
      console.log('✅ Master Parser Results:');
      console.log(`  • Destinations: ${masterResult.destinations.map(d => d.city).join(', ') || 'None'}`);
      console.log(`  • Origin: ${masterResult.origin || 'Not detected'}`);
      console.log(`  • Duration: ${masterResult.duration} days`);
      console.log(`  • Travelers: ${masterResult.travelers}`);
      console.log(`  • Trip Type: ${masterResult.tripType}`);
      console.log(`  • Confidence: ${masterResult.confidence}`);
      console.log(`  • Processing: ${masterResult.processingTime}ms`);
      
      if (masterResult.startDate) {
        console.log(`  • Start Date: ${masterResult.startDate.toDateString()}`);
      }
      
      if (masterResult.budget) {
        console.log(`  • Budget: ${masterResult.budget.currency}${masterResult.budget.amount}`);
      }
      
      if (masterResult.activities.length > 0) {
        console.log(`  • Activities: ${masterResult.activities.join(', ')}`);
      }
      
      if (masterResult.entities.places.length > 0) {
        console.log(`  • NLP Places: ${masterResult.entities.places.join(', ')}`);
      }
      
      // Validate against expected
      let passed = true;
      const issues = [];
      
      if (testCase.expected.destinations) {
        const foundAll = testCase.expected.destinations.every(dest => 
          masterResult.destinations.some(d => 
            d.city.toLowerCase().includes(dest.toLowerCase())
          )
        );
        if (!foundAll) {
          passed = false;
          issues.push(`Missing destinations`);
        }
      }
      
      if (testCase.expected.origin && masterResult.origin !== testCase.expected.origin) {
        passed = false;
        issues.push(`Origin mismatch`);
      }
      
      if (testCase.expected.travelers && masterResult.travelers !== testCase.expected.travelers) {
        passed = false;
        issues.push(`Traveler count mismatch`);
      }
      
      if (testCase.expected.duration && Math.abs(masterResult.duration - testCase.expected.duration) > 2) {
        passed = false;
        issues.push(`Duration mismatch`);
      }
      
      if (testCase.expected.hasDates && !masterResult.startDate) {
        passed = false;
        issues.push(`No dates parsed`);
      }
      
      if (testCase.expected.hasBudget && !masterResult.budget) {
        passed = false;
        issues.push(`No budget parsed`);
      }
      
      console.log(`\n  ${passed ? '✅ PASSED' : '❌ FAILED'} ${issues.length > 0 ? `- Issues: ${issues.join(', ')}` : ''}`);
      
    } catch (error: any) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 Test Complete\n');
}

// Run tests
testParsers().catch(console.error);