#!/usr/bin/env tsx
/**
 * Full Enhanced Dialog System Test - Challenge Mode
 * Tests the complete enhanced dialog architecture end-to-end
 * Including: Hybrid Parser, AI Integration, Conversation Flows, Modifications
 */

import { handleChatMessage, clearConversationState } from '@/ai/flows/chat-conversation';
import { HybridParser } from '@/ai/utils/hybrid-parser';

interface SystemTestCase {
  id: string;
  name: string;
  description: string;
  inputs: Array<{
    message: string;
    expectedResponseType?: 'itinerary' | 'clarification' | 'confirmation' | 'information' | 'error';
    expectedDestinations?: string[];
    expectedDays?: number;
    expectedClassification?: string;
    shouldSucceed?: boolean;
  }>;
  complexity: 'simple' | 'medium' | 'complex' | 'extreme';
}

interface SystemTestResult {
  testId: string;
  passed: boolean;
  errors: string[];
  details: {
    totalTime: number;
    turns: number;
    finalState?: any;
  };
}

class FullSystemTester {
  private hybridParser: HybridParser;
  
  constructor() {
    this.hybridParser = new HybridParser();
  }

  private testCases: SystemTestCase[] = [
    // === BASIC FUNCTIONALITY TESTS ===
    {
      id: 'basic_structured',
      name: 'Basic Structured Input',
      description: 'Test traditional parser through hybrid system',
      inputs: [{
        message: '5 days in London from NYC',
        expectedResponseType: 'itinerary',
        expectedDestinations: ['London'],
        expectedDays: 5,
        expectedClassification: 'structured'
      }],
      complexity: 'simple'
    },

    // === ORIGINAL PROBLEM CASES ===
    {
      id: 'lisbon_granada_hybrid',
      name: 'Lisbon/Granada via Hybrid System',
      description: 'Original problem case through complete system',
      inputs: [{
        message: '2 weeks in Lisbon and Granada, 10 days lisbon, 4 granada',
        expectedResponseType: 'itinerary',
        expectedDestinations: ['Lisbon', 'Granada'],
        expectedDays: 14,
        expectedClassification: 'structured'
      }],
      complexity: 'medium'
    },

    // === CONVERSATIONAL AI TESTS ===
    {
      id: 'conversational_romantic',
      name: 'Conversational Request',
      description: 'AI should handle vague romantic request',
      inputs: [{
        message: 'I want somewhere romantic in Europe',
        expectedResponseType: 'clarification',
        expectedClassification: 'conversational'
      }],
      complexity: 'medium'
    },

    {
      id: 'make_it_romantic',
      name: 'Make It More Romantic',
      description: 'Test the original "make it more romantic" problem',
      inputs: [
        {
          message: '5 days in Paris from NYC',
          expectedResponseType: 'itinerary',
          expectedDestinations: ['Paris']
        },
        {
          message: 'make it more romantic',
          expectedResponseType: 'confirmation',
          expectedClassification: 'modification'
        }
      ],
      complexity: 'medium'
    },

    // === MULTI-TURN CONVERSATION TESTS ===
    {
      id: 'progressive_planning',
      name: 'Progressive Trip Planning',
      description: 'Build trip through multiple conversation turns',
      inputs: [
        {
          message: 'I want to plan a European vacation',
          expectedResponseType: 'clarification',
          expectedClassification: 'conversational'
        },
        {
          message: 'somewhere with good museums and culture',
          expectedResponseType: 'clarification',
          expectedClassification: 'conversational'
        },
        {
          message: 'London sounds perfect',
          expectedResponseType: 'clarification',
          expectedDestinations: ['London']
        },
        {
          message: '7 days would be good',
          expectedResponseType: 'clarification'
        },
        {
          message: 'departing from Boston',
          expectedResponseType: 'itinerary',
          expectedDestinations: ['London'],
          expectedDays: 7
        }
      ],
      complexity: 'complex'
    },

    // === MODIFICATION TESTS ===
    {
      id: 'complex_modifications',
      name: 'Complex Itinerary Modifications',
      description: 'Test various modification types',
      inputs: [
        {
          message: '1 week in Rome from Chicago',
          expectedResponseType: 'itinerary',
          expectedDestinations: ['Rome'],
          expectedDays: 7
        },
        {
          message: 'add 3 days in Florence',
          expectedResponseType: 'confirmation',
          expectedClassification: 'modification'
        },
        {
          message: 'yes, looks good',
          expectedDestinations: ['Rome', 'Florence'],
          expectedDays: 10
        },
        {
          message: 'make Rome more cultural and less touristy',
          expectedResponseType: 'confirmation',
          expectedClassification: 'modification'
        }
      ],
      complexity: 'complex'
    },

    // === EDGE CASES AND CHALLENGES ===
    {
      id: 'ambiguous_inputs',
      name: 'Ambiguous and Unclear Inputs',
      description: 'Challenge system with unclear requests',
      inputs: [
        {
          message: 'Europe',
          expectedResponseType: 'clarification',
          expectedClassification: 'ambiguous'
        },
        {
          message: 'maybe',
          expectedResponseType: 'clarification',
          expectedClassification: 'ambiguous'
        },
        {
          message: 'I don\'t know, something nice',
          expectedResponseType: 'clarification',
          expectedClassification: 'ambiguous'
        }
      ],
      complexity: 'complex'
    },

    {
      id: 'rapid_changes',
      name: 'Rapid Mind Changes',
      description: 'User constantly changing their mind',
      inputs: [
        {
          message: '5 days in Paris',
          expectedResponseType: 'itinerary',
          expectedDestinations: ['Paris']
        },
        {
          message: 'actually, make it London instead',
          expectedResponseType: 'confirmation',
          expectedDestinations: ['London']
        },
        {
          message: 'no wait, Barcelona would be better',
          expectedResponseType: 'confirmation', 
          expectedDestinations: ['Barcelona']
        },
        {
          message: 'let\'s go with Rome after all',
          expectedResponseType: 'confirmation',
          expectedDestinations: ['Rome']
        }
      ],
      complexity: 'complex'
    },

    // === EXTREME CHALLENGE TESTS ===
    {
      id: 'complex_multi_destination',
      name: 'Complex Multi-Destination',
      description: 'Very complex trip with multiple cities and constraints',
      inputs: [{
        message: 'Plan 3 weeks across London, Paris, Rome, Barcelona, and Amsterdam from NYC, spending more time in cultural cities and less in party cities, with a budget under $5000',
        expectedResponseType: 'itinerary',
        expectedDestinations: ['London', 'Paris', 'Rome', 'Barcelona', 'Amsterdam'],
        expectedDays: 21,
        expectedClassification: 'structured'
      }],
      complexity: 'extreme'
    },

    {
      id: 'conversational_with_constraints',
      name: 'Conversational with Complex Constraints',
      description: 'Natural language with multiple complex requirements',
      inputs: [{
        message: 'I need a relaxing vacation somewhere warm with beaches but not too touristy, good for solo travel, vegetarian-friendly, under 2 weeks, accessible from San Francisco, preferably in a different time zone to help with jet lag recovery',
        expectedResponseType: 'clarification',
        expectedClassification: 'conversational'
      }],
      complexity: 'extreme'
    },

    // === ERROR HANDLING TESTS ===
    {
      id: 'invalid_requests',
      name: 'Invalid and Impossible Requests',
      description: 'Test system resilience with impossible requests',
      inputs: [
        {
          message: '100 days in every city in the world',
          expectedResponseType: 'error',
          shouldSucceed: false
        },
        {
          message: '0 days in nowhere',
          expectedResponseType: 'error', 
          shouldSucceed: false
        },
        {
          message: 'Take me to Mars for a week',
          expectedResponseType: 'error',
          shouldSucceed: false
        }
      ],
      complexity: 'extreme'
    },

    // === PERFORMANCE STRESS TESTS ===
    {
      id: 'long_conversation',
      name: 'Long Conversation Memory',
      description: 'Test system memory over long conversation',
      inputs: Array.from({ length: 15 }, (_, i) => ({
        message: i === 0 ? 'I want to plan a trip' : 
                i === 1 ? 'somewhere in Europe' :
                i === 2 ? 'maybe Paris' :
                i === 3 ? 'for about a week' :
                i === 4 ? 'from New York' :
                i < 10 ? `modify request ${i}` :
                i === 10 ? 'add Rome to the trip' :
                i === 11 ? 'make it more cultural' :
                i === 12 ? 'what\'s my current itinerary?' :
                i === 13 ? 'looks good' : 'finalize the trip',
        expectedResponseType: i < 5 ? 'clarification' : 
                            i < 10 ? 'confirmation' : 'itinerary'
      })),
      complexity: 'extreme'
    }
  ];

  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Full Enhanced Dialog System Tests...\n');
    console.log('Testing: Hybrid Parser + AI Integration + Dialog Flows + Modifications\n');

    const results: SystemTestResult[] = [];
    
    for (const testCase of this.testCases) {
      console.log(`\n📋 ${testCase.name} (${testCase.complexity.toUpperCase()})`);
      console.log(`   ${testCase.description}`);
      
      const result = await this.runSystemTest(testCase);
      results.push(result);
      
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      const timeInfo = `${result.details.totalTime}ms (${result.details.turns} turns)`;
      console.log(`${status} - ${timeInfo}`);
      
      if (!result.passed) {
        console.log(`❌ Errors: ${result.errors.join(', ')}`);
      }
      
      // Small delay between tests to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.printDetailedSummary(results);
  }

  async runSystemTest(testCase: SystemTestCase): Promise<SystemTestResult> {
    const sessionId = `full-system-test-${testCase.id}-${Date.now()}`;
    const startTime = Date.now();
    const errors: string[] = [];
    let finalState: any = null;

    try {
      for (let i = 0; i < testCase.inputs.length; i++) {
        const input = testCase.inputs[i];
        const turnStart = Date.now();
        
        console.log(`   Turn ${i + 1}: "${input.message}"`);

        // Test hybrid parser classification first
        if (input.expectedClassification) {
          const parseResult = await this.hybridParser.parse(input.message);
          const actualClassification = parseResult.classification?.type;
          if (actualClassification !== input.expectedClassification) {
            errors.push(`Turn ${i + 1}: Expected classification '${input.expectedClassification}', got '${actualClassification}'`);
          }
          console.log(`      Classification: ${actualClassification} (confidence: ${parseResult.classification?.confidence})`);
        }

        // Test full dialog system
        const response = await handleChatMessage({
          message: input.message,
          sessionId,
          userId: 'full-system-test'
        });

        const turnTime = Date.now() - turnStart;
        console.log(`      Response: ${response.response.type} (${turnTime}ms)`);

        // Validate response
        if (input.shouldSucceed === false) {
          if (response.success) {
            errors.push(`Turn ${i + 1}: Expected failure but got success`);
          }
        } else {
          if (!response.success) {
            errors.push(`Turn ${i + 1}: Expected success but got failure: ${response.error}`);
            break;
          }

          // Check response type
          if (input.expectedResponseType && response.response.type !== input.expectedResponseType) {
            errors.push(`Turn ${i + 1}: Expected response type '${input.expectedResponseType}', got '${response.response.type}'`);
          }

          // Check destinations
          if (input.expectedDestinations && response.itinerary) {
            const actualDestinations = response.itinerary.destinations.map(d => d.city || d.name);
            for (const expectedDest of input.expectedDestinations) {
              if (!actualDestinations.some(actual => 
                actual.toLowerCase().includes(expectedDest.toLowerCase()) ||
                expectedDest.toLowerCase().includes(actual.toLowerCase())
              )) {
                errors.push(`Turn ${i + 1}: Missing expected destination '${expectedDest}'`);
              }
            }
          }

          // Check total days
          if (input.expectedDays && response.itinerary) {
            if (response.itinerary.totalDays !== input.expectedDays) {
              errors.push(`Turn ${i + 1}: Expected ${input.expectedDays} days, got ${response.itinerary.totalDays}`);
            }
          }

          finalState = response.conversationState;
        }
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      errors.push(`System error: ${errorMessage}`);
    } finally {
      clearConversationState(sessionId);
    }

    const totalTime = Date.now() - startTime;

    return {
      testId: testCase.id,
      passed: errors.length === 0,
      errors,
      details: {
        totalTime,
        turns: testCase.inputs.length,
        finalState
      }
    };
  }

  private printDetailedSummary(results: SystemTestResult[]): void {
    const total = results.length;
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed);
    
    const byComplexity = {
      simple: results.filter(r => this.testCases.find(tc => tc.id === r.testId)?.complexity === 'simple'),
      medium: results.filter(r => this.testCases.find(tc => tc.id === r.testId)?.complexity === 'medium'), 
      complex: results.filter(r => this.testCases.find(tc => tc.id === r.testId)?.complexity === 'complex'),
      extreme: results.filter(r => this.testCases.find(tc => tc.id === r.testId)?.complexity === 'extreme')
    };

    const avgTime = Math.round(results.reduce((sum, r) => sum + r.details.totalTime, 0) / total);
    const totalTurns = results.reduce((sum, r) => sum + r.details.turns, 0);

    console.log('\n🏆 FULL ENHANCED DIALOG SYSTEM TEST RESULTS');
    console.log('=============================================');
    console.log(`Overall Pass Rate: ${passed}/${total} (${(passed/total*100).toFixed(1)}%)`);
    console.log(`Average Response Time: ${avgTime}ms`);
    console.log(`Total Conversation Turns: ${totalTurns}`);
    
    console.log('\n📊 Results by Complexity:');
    Object.entries(byComplexity).forEach(([complexity, tests]) => {
      const complexityPassed = tests.filter(t => t.passed).length;
      const rate = tests.length > 0 ? (complexityPassed/tests.length*100).toFixed(1) : '0';
      console.log(`  ${complexity.toUpperCase()}: ${complexityPassed}/${tests.length} (${rate}%)`);
    });

    if (failed.length > 0) {
      console.log('\n❌ FAILED TESTS:');
      failed.forEach(result => {
        const testCase = this.testCases.find(tc => tc.id === result.testId);
        console.log(`\n🔴 ${testCase?.name} (${testCase?.complexity})`);
        result.errors.forEach(error => console.log(`   • ${error}`));
      });
    }

    // Performance warnings
    const slowTests = results.filter(r => r.details.totalTime > 5000);
    if (slowTests.length > 0) {
      console.log('\n⚠️  PERFORMANCE WARNINGS (>5s):');
      slowTests.forEach(result => {
        const testCase = this.testCases.find(tc => tc.id === result.testId);
        console.log(`   • ${testCase?.name}: ${result.details.totalTime}ms`);
      });
    }

    // Success assessment
    console.log('\n🎯 SYSTEM ASSESSMENT:');
    if (passed === total) {
      console.log('🎉 PERFECT! Enhanced Dialog Architecture is 100% functional!');
    } else if (passed / total >= 0.9) {
      console.log('🟢 EXCELLENT! System is highly functional with minor issues');
    } else if (passed / total >= 0.7) {
      console.log('🟡 GOOD! System works well but needs improvements'); 
    } else {
      console.log('🔴 NEEDS WORK! Significant issues found that need addressing');
    }

    if (byComplexity.extreme.filter(t => t.passed).length === byComplexity.extreme.length) {
      console.log('💪 IMPRESSIVE! Even extreme test cases are handled perfectly!');
    }
  }
}

// Run the tests
async function main() {
  try {
    console.log('🔍 Checking environment for full system test...');
    
    // Load environment variables
    const dotenv = await import('dotenv');
    dotenv.config();
    
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ ERROR: OPENAI_API_KEY not found in environment');
      console.error('Full system tests require OpenAI API access');
      process.exit(1);
    } else {
      console.log('✅ OpenAI API key found');
    }
    
    console.log('🚀 Initializing Full System Tester...\n');
    const tester = new FullSystemTester();
    await tester.runAllTests();
  } catch (error) {
    console.error('💥 Fatal error running full system tests:', error);
    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Only run if this is the main module
if (require.main === module) {
  main();
}

export { FullSystemTester };