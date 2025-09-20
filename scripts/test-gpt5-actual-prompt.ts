/**
 * Test GPT-5 with the ACTUAL prompt from trip-generator
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import OpenAI from 'openai';
import { PROMPTS } from '../src/services/ai/prompts';

async function testActualPrompt() {
  console.log('Testing GPT-5 with ACTUAL generation prompt...\n');

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!
  });

  // Use the EXACT same prompt as trip-generator.ts
  const prompt = PROMPTS.generation.buildItineraryPrompt({
    destination: 'Paris',
    duration: 5,
    startDate: '2025-10-15',
    travelers: { adults: 1, children: 0 },
    preferences: {},
    zoneGuidance: 'Focus on one area per day'
  });

  console.log('Prompt length:', prompt.length, 'characters');
  console.log('First 200 chars:', prompt.substring(0, 200), '...\n');

  try {
    console.time('GPT-5 actual prompt');

    const response = await openai.responses.create({
      model: 'gpt-5',
      input: `${PROMPTS.generation.systemPrompt}\n\n${prompt}\n\nREMINDER: Return ONLY valid JSON, no other text.`
    });

    console.timeEnd('GPT-5 actual prompt');

    // Check response
    const responseLength = response.output_text?.length || 0;
    console.log('\nResponse length:', responseLength, 'characters');

    try {
      const json = JSON.parse(response.output_text || '{}');
      console.log('✅ Valid JSON generated');
      console.log(`- Days: ${json.itinerary?.length || 0}`);
      console.log(`- Activities: ${json.itinerary?.reduce((sum: number, day: any) => sum + (day.activities?.length || 0), 0) || 0}`);
    } catch {
      console.log('⚠️ Invalid JSON in response');
    }

  } catch (error: any) {
    console.error('❌ Failed:', error.message);
    if (error.code === 'ECONNABORTED') {
      console.error('Request timed out');
    }
  }
}

testActualPrompt().catch(console.error);