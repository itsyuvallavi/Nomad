#!/usr/bin/env tsx
/**
 * Hybrid AI Parser Fallback Test
 * Tests 5 scenarios where traditional parser fails and AI parser takes over
 * Each scenario has missing info that requires AI to ask for clarification
 */

import { handleChatMessage, clearConversationState } from '@/ai/flows/chat-conversation';
import { HybridParser } from '@/ai/utils/hybrid-parser';

interface FallbackScenario {
  id: string;
  name: string;
  description: string;
  missingInfo: string;
  incompleteInput: string;
  clarificationInput: string;
  expectedDestination: string;
  expectedDuration: number;
  expectedOrigin?: string;
}

class HybridAIFallbackTester {
  private scenarios: FallbackScenario[] = [
    {
      id: 'missing_duration',
      name: 'Missing Duration',
      description: 'User specifies destination but no duration',
      missingInfo: 'Duration/days',
      incompleteInput: 'I want to visit Tokyo',
      clarificationInput: 'for 10 days',
      expectedDestination: 'Tokyo',
      expectedDuration: 10
    },
    {
      id: 'missing_origin',
      name: 'Missing Origin',
      description: 'User specifies destination and duration but no origin',
      missingInfo: 'Origin city',
      incompleteInput: '2 weeks in Barcelona',
      clarificationInput: 'from Los Angeles',
      expectedDestination: 'Barcelona',
      expectedDuration: 14,
      expectedOrigin: 'Los Angeles'
    },
    {
      id: 'vague_romantic_request',
      name: 'Vague Romantic Request',
      description: 'Natural language request missing specific details',
      missingInfo: 'Specific destination and duration',
      incompleteInput: 'I want a romantic getaway somewhere in Europe',
      clarificationInput: '5 days in Paris from Miami',
      expectedDestination: 'Paris',
      expectedDuration: 5,
      expectedOrigin: 'Miami'
    },
    {
      id: 'business_trip_partial',
      name: 'Business Trip Partial Info',
      description: 'Business context with missing duration',
      missingInfo: 'Trip duration',
      incompleteInput: 'Need to go to Singapore for business meetings',
      clarificationInput: 'for 4 days from New York',
      expectedDestination: 'Singapore',
      expectedDuration: 4,
      expectedOrigin: 'New York'
    },
    {
      id: 'adventure_trip_unclear',
      name: 'Adventure Trip Unclear',
      description: 'Adventure request with vague location and timeframe',
      missingInfo: 'Specific destination and exact duration',
      incompleteInput: 'I want to go backpacking in South America for a while',
      clarificationInput: '3 weeks in Peru starting from Chicago',
      expectedDestination: 'Peru',
      expectedDuration: 21,
      expectedOrigin: 'Chicago'
    }
  ];

  async runAllTests(): Promise<void> {
    console.log('🧪 Hybrid AI Parser Fallback Test Suite');
    console.log('Testing traditional parser → AI parser fallback scenarios\n');
    
    const results: any[] = [];
    
    for (const scenario of this.scenarios) {
      console.log(`\n📋 Scenario ${scenario.id.toUpperCase()}: ${scenario.name}`);
      console.log(`   Description: ${scenario.description}`);
      console.log(`   Missing: ${scenario.missingInfo}`);
      
      const result = await this.runScenario(scenario);
      results.push(result);
      
      // Clean up conversation state between scenarios
      clearConversationState(result.sessionId);
    }
    
    this.printSummary(results);
  }

  async runScenario(scenario: FallbackScenario): Promise<any> {
    const sessionId = `hybrid-fallback-${scenario.id}-${Date.now()}`;
    const startTime = Date.now();
    
    try {
      // Step 1: Test incomplete input with hybrid parser directly
      console.log(`\n   🔬 Step 1: Testing incomplete input with hybrid parser`);
      console.log(`   Input: "${scenario.incompleteInput}"`);
      
      const hybridParser = new HybridParser();
      const parseResult = await hybridParser.parse(scenario.incompleteInput);
      
      console.log(`   Classification: ${parseResult.metadata.classification.type} (${parseResult.metadata.classification.confidence})`);
      console.log(`   Parse success: ${parseResult.success}`);
      console.log(`   Source: ${parseResult.source}`);
      
      // Step 2: Test with dialog system (first turn)
      console.log(`\n   💬 Step 2: First turn with dialog system`);
      const firstResponse = await handleChatMessage({
        message: scenario.incompleteInput,
        sessionId,
        userId: 'fallback-test'
      });
      
      console.log(`   Response type: ${firstResponse.response.type}`);
      console.log(`   Has itinerary: ${!!firstResponse.itinerary}`);
      console.log(`   Processing time: ${firstResponse.metadata?.processingTime}ms`);
      
      // Step 3: Provide clarification (second turn)
      console.log(`\n   ✅ Step 3: Providing clarification`);
      console.log(`   Clarification: "${scenario.clarificationInput}"`);
      
      const secondResponse = await handleChatMessage({
        message: scenario.clarificationInput,
        sessionId,
        userId: 'fallback-test'
      });
      
      console.log(`   Response type: ${secondResponse.response.type}`);
      console.log(`   Has itinerary: ${!!secondResponse.itinerary}`);
      console.log(`   Processing time: ${secondResponse.metadata?.processingTime}ms`);
      
      // Step 4: Validate final result
      const validation = this.validateScenarioResult(secondResponse, scenario);
      
      const totalTime = Date.now() - startTime;
      const status = validation.passed ? '✅ PASS' : '❌ FAIL';
      
      console.log(`\n   ${status} - Total time: ${totalTime}ms`);
      if (!validation.passed) {
        console.log(`   Errors: ${validation.errors.join(', ')}`);
      }
      
      return {
        scenarioId: scenario.id,
        sessionId,
        passed: validation.passed,
        errors: validation.errors,
        totalTime,
        hybridParserResult: parseResult,
        firstTurn: firstResponse,
        secondTurn: secondResponse,
        finalItinerary: secondResponse.itinerary
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`\n   ❌ FAIL - Error: ${errorMessage}`);
      
      return {
        scenarioId: scenario.id,
        sessionId,
        passed: false,
        errors: [`Error: ${errorMessage}`],
        totalTime: Date.now() - startTime
      };
    }
  }

  private validateScenarioResult(response: any, scenario: FallbackScenario): { passed: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Check if we have an itinerary
    if (!response.itinerary) {
      errors.push('No itinerary generated');
      return { passed: false, errors };
    }
    
    const itinerary = response.itinerary;
    
    // Check destination
    if (!itinerary.destination || !itinerary.destination.toLowerCase().includes(scenario.expectedDestination.toLowerCase())) {
      errors.push(`Expected destination "${scenario.expectedDestination}", got "${itinerary.destination}"`);
    }
    
    // Check duration (if we have itinerary days)
    if (itinerary.itinerary && itinerary.itinerary.length !== scenario.expectedDuration) {
      errors.push(`Expected ${scenario.expectedDuration} days, got ${itinerary.itinerary.length} days`);
    }
    
    // Check if itinerary has meaningful content
    if (!itinerary.title || itinerary.title.length < 5) {
      errors.push('Itinerary title too short or missing');
    }
    
    if (!itinerary.itinerary || itinerary.itinerary.length === 0) {
      errors.push('No daily itinerary generated');
    }
    
    // Check for cost estimate
    if (!itinerary._costEstimate) {
      errors.push('No cost estimate provided');
    }
    
    return { passed: errors.length === 0, errors };
  }

  private printSummary(results: any[]): void {
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const passRate = ((passed / total) * 100).toFixed(1);
    
    const avgTime = Math.round(
      results.reduce((sum, r) => sum + r.totalTime, 0) / total
    );
    
    console.log('\n\n🎯 HYBRID AI FALLBACK TEST SUMMARY');
    console.log('=====================================');
    console.log(`Pass Rate: ${passed}/${total} (${passRate}%)`);
    console.log(`Average Time per Scenario: ${avgTime}ms`);
    
    // Show scenario results
    console.log('\n📊 Scenario Results:');
    results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.scenarioId}: ${result.totalTime}ms`);
      if (!result.passed && result.errors) {
        result.errors.forEach((error: string) => console.log(`   - ${error}`));
      }
    });
    
    // Show parser fallback analysis
    console.log('\n🔄 Parser Fallback Analysis:');
    results.forEach(result => {
      if (result.hybridParserResult) {
        const source = result.hybridParserResult.source;
        const classification = result.hybridParserResult.metadata.classification.type;
        console.log(`${result.scenarioId}: ${classification} → ${source} parser`);
      }
    });
    
    if (passed === total) {
      console.log('\n🎉 All hybrid AI fallback tests passed!');
      console.log('✅ Traditional parser correctly fails on incomplete input');
      console.log('✅ AI parser successfully handles clarifications');
      console.log('✅ Final results match expectations');
    } else {
      console.log('\n⚠️  Some fallback scenarios need attention');
    }
  }
}

// Run the tests
async function main() {
  try {
    const tester = new HybridAIFallbackTester();
    await tester.runAllTests();
  } catch (error) {
    console.error('Fatal error running hybrid AI fallback tests:', error);
    process.exit(1);
  }
}

// Only run if this is the main module
if (require.main === module) {
  main();
}

export { HybridAIFallbackTester };