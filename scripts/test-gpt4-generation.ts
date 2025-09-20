/**
 * Test GPT-4 for itinerary generation
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import OpenAI from 'openai';
import { PROMPTS } from '../src/services/ai/prompts';

async function testGPT4Generation() {
  console.log('Testing GPT-4 for itinerary generation...\n');

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!
  });

  const prompt = PROMPTS.generation.buildItineraryPrompt({
    destination: 'Paris',
    duration: 5,
    startDate: '2025-10-15',
    travelers: { adults: 1, children: 0 },
    preferences: {},
    zoneGuidance: 'Focus on one area per day'
  });

  console.log('Using GPT-4-turbo with chat.completions API');
  console.log('Prompt length:', prompt.length, 'characters\n');

  try {
    console.time('GPT-4 generation');

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: PROMPTS.generation.systemPrompt
        },
        {
          role: 'user',
          content: prompt + '\n\nREMINDER: Return ONLY valid JSON, no other text.'
        }
      ],
      temperature: 0.7,
      max_tokens: 4000
    });

    console.timeEnd('GPT-4 generation');

    const content = response.choices[0].message.content;
    const outputLength = content?.length || 0;
    console.log('\nOutput length:', outputLength, 'characters');

    // Try to parse
    try {
      const json = JSON.parse(content || '{}');
      console.log('✅ Valid JSON generated');
      console.log(`- Days: ${json.itinerary?.length || 0}`);
      console.log(`- Total activities: ${json.itinerary?.reduce((sum: number, day: any) => sum + (day.activities?.length || 0), 0) || 0}`);
    } catch {
      console.log('⚠️ Invalid JSON, but response received');
    }

    console.log('\nCompare to GPT-5:');
    console.log('- GPT-5 responses.create: 60+ seconds (timeout)');
    console.log('- GPT-4 chat.completions: see above');

  } catch (error: any) {
    console.error('❌ Failed:', error.message);
  }
}

testGPT4Generation().catch(console.error);