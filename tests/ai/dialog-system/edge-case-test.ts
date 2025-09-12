#!/usr/bin/env tsx
/**
 * Edge Case Testing for Enhanced Dialog System
 * Tests unusual inputs, boundary conditions, and error handling
 */

import { handleChatMessage, clearConversationState } from '@/ai/flows/chat-conversation';

interface EdgeCaseTest {
  id: string;
  name: string;
  inputs: string[];
  expectedOutcome: 'success' | 'clarification' | 'error' | 'graceful_failure';
  description: string;
}

class EdgeCaseTester {
  private edgeCases: EdgeCaseTest[] = [
    {
      id: 'very_long_input',
      name: 'Very Long Input',
      inputs: ['I want to plan a really amazing and fantastic trip that will be absolutely incredible and memorable for my entire family including my spouse and two children aged 8 and 12 to somewhere in Europe maybe France or Italy or Spain for about two weeks during summer vacation sometime in July or August when the weather is nice and warm'],
      expectedOutcome: 'clarification',
      description: 'Handle extremely long, rambling inputs'
    },
    {
      id: 'very_short_inputs',
      name: 'Very Short Inputs',
      inputs: ['Paris', '5'],
      expectedOutcome: 'success',
      description: 'Handle very short clarifications'
    },
    {
      id: 'contradictory_info',
      name: 'Contradictory Information',
      inputs: ['3 days in Tokyo', '2 weeks in Tokyo'],
      expectedOutcome: 'success',
      description: 'Handle contradictory duration info - should use latest'
    },
    {
      id: 'invalid_destinations',
      name: 'Invalid Destinations',
      inputs: ['5 days in Atlantis', 'from Mars'],
      expectedOutcome: 'graceful_failure',
      description: 'Handle fictional/invalid locations gracefully'
    },
    {
      id: 'extreme_durations',
      name: 'Extreme Durations',
      inputs: ['365 days in Tokyo', 'from NYC'],
      expectedOutcome: 'success',
      description: 'Handle very long trip durations'
    },
    {
      id: 'zero_duration',
      name: 'Zero Duration',
      inputs: ['0 days in Paris', 'from London'],
      expectedOutcome: 'clarification',
      description: 'Handle invalid zero duration'
    },
    {
      id: 'multiple_origins',
      name: 'Multiple Origins',
      inputs: ['5 days in Paris from NYC', 'from London'],
      expectedOutcome: 'success',
      description: 'Handle conflicting origin information - should use latest'
    },
    {
      id: 'special_characters',
      name: 'Special Characters',
      inputs: ['3 days in São Paulo', 'from München'],
      expectedOutcome: 'success',
      description: 'Handle international city names with accents'
    },
    {
      id: 'numbers_as_words',
      name: 'Numbers as Words',
      inputs: ['three days in London', 'from New York'],
      expectedOutcome: 'success',
      description: 'Handle duration written as words'
    },
    {
      id: 'mixed_languages',
      name: 'Mixed Languages',
      inputs: ['5 días en Barcelona', 'from Los Angeles'],
      expectedOutcome: 'clarification',
      description: 'Handle mixed language inputs'
    }
  ];

  async runAllTests(): Promise<void> {
    console.log('🔍 Edge Case Testing Suite\n');
    
    const results: any[] = [];
    
    for (const testCase of this.edgeCases) {
      console.log(`\n📋 ${testCase.name}: ${testCase.description}`);
      
      const result = await this.runEdgeCaseTest(testCase);
      results.push(result);
      
      // Clean up
      clearConversationState(result.sessionId);
    }
    
    this.printSummary(results);
  }

  async runEdgeCaseTest(testCase: EdgeCaseTest): Promise<any> {
    const sessionId = `edge-case-${testCase.id}-${Date.now()}`;
    const startTime = Date.now();
    
    try {
      let lastResponse: any = null;
      
      for (let i = 0; i < testCase.inputs.length; i++) {
        const input = testCase.inputs[i];
        console.log(`   Turn ${i + 1}: "${input.substring(0, 50)}${input.length > 50 ? '...' : ''}"`);
        
        const response = await handleChatMessage({
          message: input,
          sessionId,
          userId: 'edge-test'
        });
        
        console.log(`   Response: ${response.response.type} (${!!response.itinerary ? 'has itinerary' : 'no itinerary'})`);
        lastResponse = response;
      }
      
      const outcome = this.determineOutcome(lastResponse);
      const passed = this.evaluateTest(outcome, testCase.expectedOutcome);
      
      console.log(`   ${passed ? '✅ PASS' : '❌ FAIL'} - Expected: ${testCase.expectedOutcome}, Got: ${outcome}`);
      
      return {
        testId: testCase.id,
        sessionId,
        passed,
        outcome,
        expected: testCase.expectedOutcome,
        totalTime: Date.now() - startTime,
        finalResponse: lastResponse
      };
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`   ❌ ERROR: ${errorMessage}`);
      
      return {
        testId: testCase.id,
        sessionId,
        passed: testCase.expectedOutcome === 'error',
        outcome: 'error',
        expected: testCase.expectedOutcome,
        totalTime: Date.now() - startTime,
        error: errorMessage
      };
    }
  }

  private determineOutcome(response: any): string {
    if (!response) return 'error';
    if (response.itinerary) return 'success';
    if (response.response.type === 'clarification') return 'clarification';
    if (response.response.type === 'error') return 'graceful_failure';
    return 'unknown';
  }

  private evaluateTest(actual: string, expected: string): boolean {
    if (expected === 'success') return actual === 'success';
    if (expected === 'clarification') return actual === 'clarification';
    if (expected === 'error') return actual === 'error';
    if (expected === 'graceful_failure') return actual === 'graceful_failure' || actual === 'clarification';
    return false;
  }

  private printSummary(results: any[]): void {
    const passed = results.filter(r => r.passed).length;
    const total = results.length;
    const passRate = ((passed / total) * 100).toFixed(1);
    
    console.log('\n\n🎯 EDGE CASE TEST SUMMARY');
    console.log('=========================');
    console.log(`Pass Rate: ${passed}/${total} (${passRate}%)`);
    
    console.log('\n📊 Results:');
    results.forEach(result => {
      const status = result.passed ? '✅' : '❌';
      console.log(`${status} ${result.testId}: ${result.outcome} (expected: ${result.expected})`);
    });
    
    const failed = results.filter(r => !r.passed);
    if (failed.length > 0) {
      console.log('\n❌ Failed Tests:');
      failed.forEach(result => {
        console.log(`- ${result.testId}: Got ${result.outcome}, expected ${result.expected}`);
      });
    }
  }
}

async function main() {
  try {
    const tester = new EdgeCaseTester();
    await tester.runAllTests();
  } catch (error) {
    console.error('Fatal error running edge case tests:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { EdgeCaseTester };