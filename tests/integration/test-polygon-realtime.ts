#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Import after loading env vars
import { getCurrencyExchangeRate } from '../src/lib/api/polygon';

async function testRealTime() {
  console.log('\n=== TESTING REAL-TIME POLYGON.IO DATA ===\n');
  
  const testPairs = [
    { from: 'USD', to: 'EUR', expected: 'EURUSD' },
    { from: 'USD', to: 'GBP', expected: 'GBPUSD' },
    { from: 'USD', to: 'JPY', expected: 'JPYUSD' },
  ];
  
  console.log('Environment check:');
  console.log('  POLIGONIO_API_KEY:', process.env.POLIGONIO_API_KEY ? '✅ Set' : '❌ Not set');
  console.log('  Key length:', process.env.POLIGONIO_API_KEY?.length || 0);
  
  console.log('\nTesting currency pairs:');
  
  for (const pair of testPairs) {
    console.log(`\n${pair.from} → ${pair.to}:`);
    
    const startTime = Date.now();
    const rate = await getCurrencyExchangeRate(pair.from, pair.to);
    const duration = Date.now() - startTime;
    
    if (rate) {
      console.log(`  ✅ Rate: ${rate.rate}`);
      console.log(`  ⏱️  Time: ${duration}ms`);
      
      // Check if it's real-time data (should have recent timestamp)
      const ageHours = (Date.now() - rate.timestamp) / (1000 * 60 * 60);
      if (ageHours < 48) {
        console.log(`  📊 Data age: ${ageHours.toFixed(1)} hours (REAL-TIME)`);
      } else {
        console.log(`  ⚠️  Data age: ${ageHours.toFixed(1)} hours (possibly mock)`);
      }
    } else {
      console.log(`  ❌ Failed to get rate`);
    }
  }
  
  console.log('\n=== SUMMARY ===');
  console.log('If you see recent timestamps and reasonable response times (~100-500ms),');
  console.log('the Polygon.io API is working correctly with real-time forex data.\n');
}

testRealTime().catch(console.error);