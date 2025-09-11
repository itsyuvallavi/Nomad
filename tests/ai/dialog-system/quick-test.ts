#!/usr/bin/env tsx
/**
 * Quick test to debug hybrid parser and dialog system issues
 */

import { HybridParser } from '@/ai/utils/hybrid-parser';
import { handleChatMessage, clearConversationState } from '@/ai/flows/chat-conversation';

async function quickTest() {
  console.log('🔬 Quick Diagnostic Test\n');
  
  // Test 1: Simple structured input
  console.log('Test 1: Simple structured input');
  console.log('Input: "5 days in London from NYC"');
  
  // Test hybrid parser directly
  const hybridParser = new HybridParser();
  const parseResult = await hybridParser.parse('5 days in London from NYC');
  console.log('Hybrid parser result:');
  console.log('  Classification:', parseResult.metadata.classification?.type, '(confidence:', parseResult.metadata.classification?.confidence + ')');
  console.log('  Parse success:', parseResult.success ? 'Yes' : 'No');
  if (parseResult.parsedTrip) {
    console.log('  Destinations:', parseResult.parsedTrip.destinations?.length || 0);
  }
  
  // Test dialog system
  const sessionId = 'quick-test-' + Date.now();
  try {
    const response = await handleChatMessage({
      message: '5 days in London from NYC',
      sessionId,
      userId: 'test'
    });
    
    console.log('\nDialog system result:');
    console.log('  Success:', response.success);
    console.log('  Response type:', response.response.type);
    console.log('  Has itinerary:', !!response.itinerary);
    if (response.itinerary) {
      console.log('  Trip title:', response.itinerary.title);
      console.log('  Destination:', response.itinerary.destination);
      console.log('  Days in itinerary:', response.itinerary.itinerary?.length || 0);
      console.log('  Has quick tips:', !!response.itinerary.quickTips);
      console.log('  Has cost estimate:', !!response.itinerary._costEstimate);
    }
  } finally {
    clearConversationState(sessionId);
  }
  
  console.log('\n🔬 Test complete');
}

quickTest().catch(console.error);