/**
 * Test GPT-3.5-turbo for basic generation
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import OpenAI from 'openai';

async function testGPT35() {
  console.log('Testing GPT-3.5-turbo (should be fast)...\n');

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!
  });

  // Simple test first
  console.log('Test 1: Simple request');
  try {
    console.time('Simple GPT-3.5');
    const response1 = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'user', content: 'Say "hello"' }
      ]
    });
    console.timeEnd('Simple GPT-3.5');
    console.log('Response:', response1.choices[0].message.content);
  } catch (error: any) {
    console.error('Failed:', error.message);
  }

  // Itinerary test
  console.log('\nTest 2: Basic itinerary');
  try {
    console.time('Itinerary GPT-3.5');
    const response2 = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'user',
          content: `Create a 3-day Paris itinerary. Return only this JSON:
{
  "destination": "Paris",
  "days": 3,
  "itinerary": [
    {"day": 1, "activities": ["Eiffel Tower", "Louvre"]}
  ]
}`
        }
      ],
      temperature: 0.5
    });
    console.timeEnd('Itinerary GPT-3.5');
    console.log('Success! Length:', response2.choices[0].message.content?.length);
  } catch (error: any) {
    console.error('Failed:', error.message);
  }
}

testGPT35().catch(console.error);