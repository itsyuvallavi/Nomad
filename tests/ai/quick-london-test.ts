/**
 * Quick test for "3 days in London"
 * Should generate immediately or ask max 1 question
 */

import { AIConversationController } from '../../src/services/ai/conversation/ai-conversation-controller';

async function testLondonTrip() {
  console.log('Testing: "3 days in London"');

  const controller = new AIConversationController('test-london');
  const response = await controller.processMessage("3 days in London");

  const context = JSON.parse(response.conversationContext || '{}');

  console.log('\n📊 Extracted Data:');
  console.log('  Destination:', context.data?.destination);
  console.log('  Duration:', context.data?.duration);
  console.log('  Response type:', response.type);

  if (response.type === 'question') {
    console.log('  Question asked:', response.message?.substring(0, 50) + '...');
    console.log('  Awaiting:', response.awaitingInput);

    // If it asks a question, say "go ahead"
    console.log('\nResponding with: "go ahead and make the itinerary"');
    const response2 = await controller.processMessage("go ahead and make the itinerary");

    console.log('  Second response type:', response2.type);
    if (response2.type === 'error') {
      console.log('  ❌ ERROR:', response2.message);
      return false;
    }

    return response2.type === 'itinerary' || response2.type === 'question';
  }

  return response.type === 'itinerary';
}

testLondonTrip()
  .then(success => {
    console.log('\n' + (success ? '✅ TEST PASSED' : '❌ TEST FAILED'));
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ ERROR:', error.message);
    process.exit(1);
  });