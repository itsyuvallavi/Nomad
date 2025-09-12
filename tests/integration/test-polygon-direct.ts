#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testDirect() {
  console.log('Testing Polygon.io API directly...');
  console.log('API Key present:', !!process.env.POLIGONIO_API_KEY);
  
  const apiKey = process.env.POLIGONIO_API_KEY;
  
  if (!apiKey) {
    console.log('No API key found');
    return;
  }
  
  // Test the forex endpoint directly
  console.log('\nFetching EUR/USD rate...');
  const response = await fetch(
    `https://api.polygon.io/v2/aggs/ticker/C:EURUSD/prev?apiKey=${apiKey}`
  );
  
  const data = await response.json();
  console.log('Response status:', data.status);
  
  if (data.status === 'OK' && data.results?.length > 0) {
    const result = data.results[0];
    console.log('EUR/USD close price:', result.c);
    console.log('USD/EUR rate:', (1 / result.c).toFixed(4));
    console.log('✅ Polygon.io API is working with real data!');
  } else {
    console.log('❌ API response:', JSON.stringify(data, null, 2));
  }
}

testDirect().catch(console.error);