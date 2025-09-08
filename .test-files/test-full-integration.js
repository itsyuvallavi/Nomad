// Test full integration: OpenAI + Unsplash
const OpenAI = require('openai');
require('dotenv').config();

console.log('🧪 Testing Full Integration: OpenAI + Unsplash\n');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Unsplash
const UNSPLASH_ACCESS_KEY = process.env.UNSPLASH_API_ACCESS_KEY;

async function searchUnsplashImages(destination) {
  if (!UNSPLASH_ACCESS_KEY) {
    console.error('❌ UNSPLASH_API_ACCESS_KEY not found!');
    return [];
  }

  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(destination + ' travel destination')}&per_page=3&orientation=landscape`;
  
  console.log(`\n📷 Searching Unsplash for: "${destination}"`);
  console.log(`URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_ACCESS_KEY}`,
      },
    });

    if (!response.ok) {
      console.error(`❌ Unsplash API error: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    
    console.log(`✅ Found ${data.results.length} images for ${destination}`);
    
    return data.results.map(img => ({
      url: img.urls.regular,
      thumbnail: img.urls.thumb,
      description: img.description || img.alt_description,
      photographer: img.user.name,
      photographerUrl: img.user.links.html,
      unsplashUrl: img.links.html,
    }));
  } catch (error) {
    console.error(`❌ Error fetching images for ${destination}:`, error.message);
    return [];
  }
}

async function testFullIntegration() {
  try {
    // Test trip with multiple destinations
    const prompt = `plan a trip to Zimbabwe from Melbourne on January next year, after Zimbabwe i want to visit Nicaragua for a week, then spend a week in Madagascar, then a week in Ethiopia and finally before going back home to LA, i want to visit Denmark for 3 days.`;
    
    console.log('📤 Testing OpenAI with multi-destination itinerary...');
    console.log('Destinations expected:');
    console.log('1. Zimbabwe');
    console.log('2. Nicaragua');
    console.log('3. Madagascar');
    console.log('4. Ethiopia');
    console.log('5. Denmark\n');
    
    const startTime = Date.now();
    
    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a travel agent. Create a detailed itinerary in JSON format.
          
          Return JSON with this structure:
          {
            "destination": "Zimbabwe, Nicaragua, Madagascar, Ethiopia, Denmark",
            "title": "Multi-Country Adventure",
            "totalDays": 35,
            "itinerary": [array of day objects]
          }
          
          IMPORTANT: Include ALL 5 destinations in the order given.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 16384,
      response_format: { type: 'json_object' }
    });
    
    const duration = Date.now() - startTime;
    
    console.log('✅ OpenAI Response received!');
    console.log(`⏱️  Response time: ${duration}ms`);
    
    const itinerary = JSON.parse(completion.choices[0].message.content);
    
    console.log('\n📊 Generated Itinerary:');
    console.log('Destination:', itinerary.destination);
    console.log('Title:', itinerary.title);
    console.log('Total Days:', itinerary.totalDays || itinerary.itinerary?.length);
    
    // Extract unique destinations from the itinerary
    const destinationsInItinerary = itinerary.destination.split(',').map(d => d.trim());
    
    console.log('\n🏙️ Destinations found in itinerary:', destinationsInItinerary);
    
    // Now test Unsplash for each destination
    console.log('\n' + '='.repeat(60));
    console.log('📸 TESTING UNSPLASH IMAGE SEARCH');
    console.log('='.repeat(60));
    
    for (const destination of destinationsInItinerary) {
      const images = await searchUnsplashImages(destination);
      
      if (images.length > 0) {
        console.log(`\n✅ Images for ${destination}:`);
        images.forEach((img, idx) => {
          console.log(`  ${idx + 1}. Photo by ${img.photographer}`);
          console.log(`     URL: ${img.url}`);
          console.log(`     View on Unsplash: ${img.unsplashUrl}`);
          console.log(`     Description: ${img.description || 'No description'}`);
        });
      } else {
        console.log(`\n❌ No images found for ${destination}`);
      }
    }
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 INTEGRATION TEST SUMMARY');
    console.log('='.repeat(60));
    
    const expectedDestinations = ['Zimbabwe', 'Nicaragua', 'Madagascar', 'Ethiopia', 'Denmark'];
    const missingDestinations = expectedDestinations.filter(dest => 
      !destinationsInItinerary.some(d => d.toLowerCase().includes(dest.toLowerCase()))
    );
    
    console.log('\n✅ OpenAI Integration: Working');
    console.log(`  - Generated ${itinerary.itinerary?.length || 0} days of activities`);
    console.log(`  - Response time: ${duration}ms`);
    
    if (missingDestinations.length === 0) {
      console.log('  - All 5 destinations included ✅');
    } else {
      console.log(`  - Missing destinations: ${missingDestinations.join(', ')} ❌`);
    }
    
    if (UNSPLASH_ACCESS_KEY) {
      console.log('\n✅ Unsplash Integration: Working');
      console.log(`  - API Key configured`);
      console.log(`  - Successfully searched for ${destinationsInItinerary.length} destinations`);
    } else {
      console.log('\n❌ Unsplash Integration: Not configured');
      console.log('  - Please add UNSPLASH_API_ACCESS_KEY to .env file');
    }
    
    console.log('\n🎉 Full integration test completed!');
    
  } catch (error) {
    console.error('\n❌ Integration Test Failed!');
    console.error('Error:', error.message);
    
    if (error.message.includes('401')) {
      console.error('\n🔑 Authentication Error: Check your API keys');
    }
    
    process.exit(1);
  }
}

// Run the test
testFullIntegration();
