// Test Pexels API
const fetch = require('node-fetch');
require('dotenv').config();

const PEXELS_API_KEY = process.env.PEXELS_API_KEY || 'JDkOJu5vNAQmnwxkw9mGixEZsvuAmzNBPSOjuwtmyQiKpUdlG3fdwpKF';

console.log('🧪 Testing Pexels API...\n');
console.log('API Key:', PEXELS_API_KEY.substring(0, 20) + '...');

async function testPexels() {
  const destinations = ['Zimbabwe', 'Nicaragua', 'Madagascar', 'Ethiopia', 'Denmark'];
  
  for (const destination of destinations) {
    try {
      const query = `${destination} travel destination landscape`;
      const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`;
      
      console.log(`\n📷 Searching for: ${destination}`);
      console.log(`URL: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': PEXELS_API_KEY,
        },
      });

      if (!response.ok) {
        console.error(`❌ Error: ${response.status} ${response.statusText}`);
        const text = await response.text();
        console.error('Response:', text);
        continue;
      }

      const data = await response.json();
      console.log(`✅ Found ${data.photos?.length || 0} images`);
      
      if (data.photos && data.photos.length > 0) {
        data.photos.forEach((photo, idx) => {
          console.log(`  ${idx + 1}. Photo by ${photo.photographer}`);
          console.log(`     URL: ${photo.src.large}`);
          console.log(`     Alt: ${photo.alt || 'No description'}`);
        });
      }
    } catch (error) {
      console.error(`❌ Error fetching ${destination}:`, error.message);
    }
  }
  
  console.log('\n🎉 Pexels API test completed!');
}

testPexels();
