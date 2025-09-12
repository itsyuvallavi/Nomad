#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env') });

import Amadeus from 'amadeus';

async function testAmadeus() {
  console.log('\n=== TESTING AMADEUS API DIRECTLY ===\n');
  
  const hasKey = !!process.env.AMADEUS_API_KEY;
  const hasSecret = !!process.env.AMADEUS_API_SECRET;
  
  console.log('Credentials:');
  console.log(`  API Key: ${hasKey ? '✅ Present' : '❌ Missing'}`);
  console.log(`  API Secret: ${hasSecret ? '✅ Present' : '❌ Missing'}`);
  
  if (!hasKey || !hasSecret) {
    console.log('\n❌ Cannot test without credentials');
    return;
  }
  
  try {
    const amadeus = new Amadeus({
      clientId: process.env.AMADEUS_API_KEY,
      clientSecret: process.env.AMADEUS_API_SECRET,
      hostname: 'test' // Use test environment
    });
    
    console.log('\nTesting Location Search (London airports)...');
    const response = await amadeus.referenceData.locations.get({
      keyword: 'LON',
      subType: Amadeus.location.any
    });
    
    if (response.statusCode === 200) {
      console.log('✅ API is WORKING!');
      console.log(`Found ${response.data.length} results`);
      
      if (response.data.length > 0) {
        console.log('\nSample results:');
        response.data.slice(0, 3).forEach(loc => {
          console.log(`  - ${loc.name} (${loc.iataCode || loc.id})`);
        });
      }
    } else {
      console.log(`⚠️  Unexpected status: ${response.statusCode}`);
    }
    
  } catch (error: any) {
    console.log('\n❌ API Error:');
    
    if (error.response) {
      console.log(`  Status: ${error.response.statusCode}`);
      
      if (error.response.statusCode === 401) {
        console.log('  Issue: Authentication failed - credentials may be invalid or expired');
      } else if (error.response.statusCode === 429) {
        console.log('  Issue: Rate limit exceeded');
      } else {
        console.log(`  Message: ${error.description || error.message}`);
      }
      
      if (error.response.body) {
        try {
          const body = JSON.parse(error.response.body);
          if (body.errors) {
            console.log('  Details:', body.errors[0]?.detail || body.errors[0]?.title);
          }
        } catch {}
      }
    } else {
      console.log(`  ${error.message || error}`);
    }
    
    console.log('\n📝 Note: Amadeus test environment has limited data.');
    console.log('  Some features may require production access.');
  }
  
  console.log('\n=== TEST COMPLETE ===\n');
}

testAmadeus().catch(console.error);