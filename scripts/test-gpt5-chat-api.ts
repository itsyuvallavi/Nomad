/**
 * Test if chat.completions API works better than responses API
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import OpenAI from 'openai';

async function testBothAPIs() {
  console.log('Testing both GPT-5 APIs...\n');

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!
  });

  const testPrompt = `Create a simple 2-day Paris itinerary. Return only JSON:
{
  "destination": "Paris",
  "days": 2,
  "activities": ["activity1", "activity2"]
}`;

  // Test 1: responses.create (current method)
  console.log('Test 1: responses.create API');
  try {
    console.time('responses.create');
    const response1 = await openai.responses.create({
      model: 'gpt-5',
      input: testPrompt
    });
    console.timeEnd('responses.create');
    console.log('✅ Success\n');
  } catch (error: any) {
    console.error('❌ Failed:', error.message, '\n');
  }

  // Test 2: chat.completions.create (standard API)
  console.log('Test 2: chat.completions.create API');
  try {
    console.time('chat.completions.create');
    const response2 = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',  // Using GPT-4 as GPT-5 might not be available
      messages: [
        { role: 'system', content: 'You are a travel planner. Return only JSON.' },
        { role: 'user', content: testPrompt }
      ],
      temperature: 0.7
    });
    console.timeEnd('chat.completions.create');
    console.log('✅ Success');
    console.log('Response:', response2.choices[0].message.content?.substring(0, 100));
  } catch (error: any) {
    console.error('❌ Failed:', error.message);
  }
}

testBothAPIs().catch(console.error);