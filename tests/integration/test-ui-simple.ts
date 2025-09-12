#!/usr/bin/env npx tsx

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function testSimpleItinerary() {
  console.log('\n🧪 === TESTING SIMPLE UI ITINERARY GENERATION ===\n');
  
  try {
    // Test the API endpoint directly
    const response = await fetch('http://localhost:9002/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: '3 days in London'
      })
    });
    
    if (!response.ok) {
      console.error('❌ API request failed:', response.status, response.statusText);
      return false;
    }
    
    // Read the streaming response
    const reader = response.body?.getReader();
    if (!reader) {
      console.error('❌ No response body');
      return false;
    }
    
    let fullResponse = '';
    const decoder = new TextDecoder();
    let chunkCount = 0;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      fullResponse += chunk;
      chunkCount++;
      
      // Log first few chunks to see what's happening
      if (chunkCount <= 3) {
        console.log(`Chunk ${chunkCount} (${chunk.length} bytes):`, chunk.substring(0, 100));
      }
    }
    
    console.log(`\n✅ Response received (${chunkCount} chunks, ${fullResponse.length} total bytes)`);
    
    // Try to parse the response
    try {
      // The response might be in chunks with "data:" prefix
      const lines = fullResponse.split('\n');
      let parsedData = null;
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const jsonStr = line.slice(6);
          if (jsonStr && jsonStr !== '[DONE]') {
            try {
              const data = JSON.parse(jsonStr);
              if (data.type === 'complete') {
                parsedData = data.data;
                break;
              }
            } catch (e) {
              // Continue to next line
            }
          }
        }
      }
      
      if (parsedData) {
        console.log('\n📊 Itinerary Summary:');
        console.log('  Title:', parsedData.title);
        console.log('  Destinations:', parsedData.destinations?.map((d: any) => d.city).join(', '));
        console.log('  Total Days:', parsedData.destinations?.reduce((sum: number, d: any) => sum + d.days, 0));
        console.log('  Activities Count:', parsedData.destinations?.reduce((sum: number, d: any) => 
          sum + (d.dailyItineraries?.reduce((s: number, di: any) => s + (di.activities?.length || 0), 0) || 0), 0));
        
        // Check if APIs are being used
        const hasRealPlaces = parsedData.destinations?.some((d: any) => 
          d.dailyItineraries?.some((di: any) => 
            di.activities?.some((a: any) => a.venue && a.address)
          )
        );
        
        const hasWeatherData = parsedData.destinations?.some((d: any) => d.weather);
        const hasCostEstimates = parsedData.destinations?.some((d: any) => d.estimatedCost);
        
        console.log('\n🔌 API Integration Status:');
        console.log('  Real Places:', hasRealPlaces ? '✅ Working' : '⚠️ Not detected');
        console.log('  Weather Data:', hasWeatherData ? '✅ Working' : '⚠️ Not detected');
        console.log('  Cost Estimates:', hasCostEstimates ? '✅ Working' : '⚠️ Not detected');
        
        return true;
      } else {
        console.error('❌ Could not parse itinerary data from response');
        console.log('Raw response sample:', fullResponse.substring(0, 500));
        return false;
      }
    } catch (parseError: any) {
      console.error('❌ Error parsing response:', parseError.message);
      console.log('Raw response sample:', fullResponse.substring(0, 500));
      return false;
    }
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    return false;
  }
}

// Run the test
testSimpleItinerary()
  .then((success) => {
    if (success) {
      console.log('\n✅ Simple UI test passed!\n');
      process.exit(0);
    } else {
      console.log('\n❌ Simple UI test failed!\n');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n❌ Test error:', error);
    process.exit(1);
  });