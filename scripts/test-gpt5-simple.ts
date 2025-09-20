/**
 * Test simple GPT-5 call
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import OpenAI from 'openai';

async function testGPT5() {
  console.log('Testing GPT-5 API...\n');

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ OPENAI_API_KEY not found');
    return;
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  try {
    console.time('GPT-5 simple request');

    const response = await openai.responses.create({
      model: 'gpt-5',
      input: 'Return this JSON: {"city": "Paris", "days": 3}'
    });

    console.timeEnd('GPT-5 simple request');
    console.log('\nResponse:', response.output_text);
    console.log('\n✅ GPT-5 API is working!');
  } catch (error: any) {
    console.error('❌ GPT-5 API failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testGPT5().catch(console.error);