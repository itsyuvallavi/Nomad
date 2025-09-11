#!/usr/bin/env tsx
/**
 * Quick Validation Test - Essential Checks
 * Run this before any deployment or major changes
 */

import { handleChatMessage, clearConversationState } from '@/ai/flows/chat-conversation';

interface QuickTest {
  id: string;
  name: string;
  turns: string[];
  expectedFinalState: 'has_itinerary' | 'needs_clarification' | 'error';
}

async function quickValidation(): Promise<void> {
  console.log('⚡ Quick Validation - Essential System Checks\n');
  
  const tests: QuickTest[] = [
    {
      id: 'basic_context',
      name: 'Basic Context Combination',
      turns: ['5 days in London', 'from NYC'],
      expectedFinalState: 'has_itinerary'
    },
    {
      id: 'complete_input',
      name: 'Complete Input Processing',
      turns: ['2 weeks in Barcelona from Los Angeles'],
      expectedFinalState: 'has_itinerary'
    },
    {
      id: 'multi_turn',
      name: 'Multi-Turn Conversation',
      turns: ['I want to visit Tokyo', 'for 7 days', 'from San Francisco'],
      expectedFinalState: 'has_itinerary'
    }
  ];
  
  let passed = 0;
  const total = tests.length;
  
  for (const test of tests) {
    console.log(`🧪 ${test.name}`);
    
    const sessionId = `validation-${test.id}-${Date.now()}`;
    let finalResponse: any = null;
    
    try {
      for (let i = 0; i < test.turns.length; i++) {
        const turn = test.turns[i];
        console.log(`   Turn ${i + 1}: "${turn}"`);
        
        finalResponse = await handleChatMessage({
          message: turn,
          sessionId,
          userId: 'validation-test'
        });
        
        console.log(`   → ${finalResponse.response.type} (${!!finalResponse.itinerary ? 'has itinerary' : 'no itinerary'})`);
      }
      
      // Check final state
      const actualState = finalResponse.itinerary ? 'has_itinerary' : 
                         finalResponse.response.type === 'clarification' ? 'needs_clarification' : 'error';
      
      const success = actualState === test.expectedFinalState;
      console.log(`   ${success ? '✅ PASS' : '❌ FAIL'} - Expected: ${test.expectedFinalState}, Got: ${actualState}\n`);
      
      if (success) passed++;
      
    } catch (error) {
      console.log(`   ❌ ERROR: ${error instanceof Error ? error.message : 'Unknown error'}\n`);
    } finally {
      clearConversationState(sessionId);
    }
  }
  
  const passRate = ((passed / total) * 100).toFixed(0);
  
  console.log('📊 VALIDATION SUMMARY');
  console.log('====================');
  console.log(`Pass Rate: ${passed}/${total} (${passRate}%)`);
  
  if (passed === total) {
    console.log('🎉 ✅ ALL TESTS PASSED - System is ready!');
    console.log('✅ Context combination working');
    console.log('✅ Multi-turn conversations working'); 
    console.log('✅ Itinerary generation working');
    console.log('\n🚀 System is production-ready for core functionality');
  } else {
    console.log('⚠️  Some core functionality issues detected');
    console.log('🔧 Fix failing tests before deployment');
    console.log('📝 Run full test suite for detailed analysis');
  }
}

quickValidation().catch(console.error);