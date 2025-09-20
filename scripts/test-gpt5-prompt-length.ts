/**
 * Test if prompt length affects GPT-5 response time
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import OpenAI from 'openai';

async function testPromptLength() {
  console.log('Testing GPT-5 response time vs prompt length...\n');

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY!
  });

  // Test different prompt lengths
  const tests = [
    {
      name: 'Short (100 chars)',
      prompt: 'Create a 2-day Paris trip. Return JSON: {"destination":"Paris","days":2,"activities":["a","b"]}'
    },
    {
      name: 'Medium (500 chars)',
      prompt: `Create a 3-day Paris itinerary starting 2025-10-15.
Requirements:
- Include breakfast, lunch, dinner
- Visit major attractions
- Stay in central areas
- Walking distance between activities

Return JSON:
{
  "destination": "Paris",
  "duration": 3,
  "itinerary": [
    {
      "day": 1,
      "activities": [
        {"time": "9:00", "description": "activity"},
        {"time": "12:00", "description": "activity"}
      ]
    }
  ]
}`
    },
    {
      name: 'Long (1500+ chars)',
      prompt: `Create a 5-day Paris itinerary starting 2025-10-15.

Zone Guidelines:
- Day 1: Central Paris (Louvre area)
- Day 2: Latin Quarter
- Day 3: Marais
- Day 4: Champs-Élysées
- Day 5: Montmartre

Requirements:
1. Each day MUST stay in one zone
2. Include specific venue names
3. Walking distance between activities
4. Consider opening hours
5. Logical flow: breakfast → attractions → lunch → activities → dinner

Daily Structure:
- 9:00 AM: Breakfast
- 10:00 AM: Morning activity
- 12:00 PM: Lunch
- 2:00 PM: Afternoon activity
- 6:00 PM: Evening activity
- 8:00 PM: Dinner

Return ONLY this JSON structure:
{
  "destination": "Paris",
  "duration": 5,
  "startDate": "2025-10-15",
  "itinerary": [
    {
      "day": 1,
      "date": "2025-10-15",
      "theme": "Central Paris",
      "activities": [
        {
          "time": "9:00 AM",
          "description": "Breakfast at Café de Flore",
          "venue_name": "Café de Flore",
          "category": "breakfast"
        }
      ]
    }
  ]
}

Include 6-8 activities per day with specific venues.`
    }
  ];

  for (const test of tests) {
    console.log(`\nTesting: ${test.name}`);
    console.log(`Prompt length: ${test.prompt.length} characters`);

    try {
      console.time('Response time');
      const response = await openai.responses.create({
        model: 'gpt-5',
        input: test.prompt
      });
      console.timeEnd('Response time');

      const outputLength = response.output_text?.length || 0;
      console.log(`Output length: ${outputLength} characters`);
    } catch (error: any) {
      console.error('Failed:', error.message);
    }
  }
}

testPromptLength().catch(console.error);