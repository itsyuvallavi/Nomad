#!/usr/bin/env tsx
/**
 * Test Context Combination Fixes
 * Quick test to verify multi-turn conversation context handling
 */

import { handleChatMessage, clearConversationState } from '@/ai/flows/chat-conversation';

async function testContextFixes() {
  console.log('🔧 Testing Context Combination Fixes\n');
  
  const sessionId = `context-test-${Date.now()}`;
  
  try {
    // Turn 1: Incomplete input (missing duration)
    console.log('Turn 1: "2 weeks in Barcelona"');
    const response1 = await handleChatMessage({
      message: '2 weeks in Barcelona',
      sessionId,
      userId: 'context-test'
    });
    
    console.log(`Response 1: ${response1.response.type} (${!!response1.itinerary ? 'has itinerary' : 'no itinerary'})`);
    
    // Turn 2: Clarification (add origin)
    console.log('\nTurn 2: "from Los Angeles"');
    const response2 = await handleChatMessage({
      message: 'from Los Angeles',
      sessionId,
      userId: 'context-test'
    });
    
    console.log(`Response 2: ${response2.response.type} (${!!response2.itinerary ? 'has itinerary' : 'no itinerary'})`);
    
    if (response2.itinerary) {
      console.log(`✅ SUCCESS: Generated itinerary for ${response2.itinerary.destination}`);
      console.log(`   Days: ${response2.itinerary.itinerary?.length || 0}`);
      console.log(`   Title: ${response2.itinerary.title}`);
    } else {
      console.log(`❌ FAILED: No itinerary generated after clarification`);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    clearConversationState(sessionId);
  }
}

testContextFixes();