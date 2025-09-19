#!/usr/bin/env node

// Load environment variables
require('dotenv').config({ path: '.env.local' });

// Check if API key is loaded
if (!process.env.OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY not found in environment');
  console.error('Please ensure .env.local contains OPENAI_API_KEY');
  process.exit(1);
}

console.log('✅ OpenAI API key loaded successfully');
console.log('Starting tests...\n');

// Run the tests
require('tsx/cjs');
require('./test-simplified-system.ts');