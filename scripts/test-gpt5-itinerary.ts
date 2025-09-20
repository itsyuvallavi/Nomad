/**
 * Test GPT-5 with actual itinerary generation prompt
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import OpenAI from 'openai';

async function testGPT5Itinerary() {
  console.log('Testing GPT-5 with itinerary prompt...\n');

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!
  });

  // Simplified itinerary prompt
  const prompt = `Create a 3-day Paris itinerary starting 2025-10-15.

Return ONLY this JSON structure:
{
  "title": "3 Days in Paris",
  "destination": "Paris",
  "duration": 3,
  "startDate": "2025-10-15",
  "itinerary": [
    {
      "day": 1,
      "date": "2025-10-15",
      "theme": "Central Paris",
      "activities": [
        {
          "time": "9:00 AM",
          "description": "Breakfast at a cafe",
          "category": "breakfast"
        },
        {
          "time": "10:00 AM",
          "description": "Visit the Louvre",
          "category": "attraction"
        }
      ]
    }
  ]
}

Include 5-6 activities per day.`;

  try {
    console.time('GPT-5 itinerary request');

    const response = await openai.responses.create({
      model: 'gpt-5',
      input: prompt
    });

    console.timeEnd('GPT-5 itinerary request');

    // Try to parse the response
    const json = JSON.parse(response.output_text || '{}');

    console.log('\n✅ Success!');
    console.log(`- Days: ${json.itinerary?.length || 0}`);
    console.log(`- Total activities: ${json.itinerary?.reduce((sum: number, day: any) => sum + (day.activities?.length || 0), 0) || 0}`);

  } catch (error: any) {
    console.error('❌ Failed:', error.message);
  }
}

testGPT5Itinerary().catch(console.error);