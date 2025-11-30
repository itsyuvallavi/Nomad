/**
 * Quick test to verify Pexels API is working
 */
require('dotenv').config({ path: '.env.local' });

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const PEXELS_API_URL = 'https://api.pexels.com/v1';

console.log('🔑 Testing Pexels API...');
console.log('API Key found:', !!PEXELS_API_KEY);
console.log('API Key length:', PEXELS_API_KEY?.length || 0);
console.log('API Key prefix:', PEXELS_API_KEY?.substring(0, 5) || 'missing');

async function testPexelsAPI() {
  if (!PEXELS_API_KEY) {
    console.error('❌ No API key found in .env.local');
    return;
  }

  const query = 'Tokyo travel destination landscape';
  const url = `${PEXELS_API_URL}/search?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`;

  console.log('\n📡 Making request to Pexels...');
  console.log('URL:', url);

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': PEXELS_API_KEY,
      },
    });

    console.log('\n📊 Response status:', response.status);
    console.log('Response OK:', response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error response:', errorText);
      return;
    }

    const data = await response.json();
    console.log('\n✅ Success!');
    console.log('Photos found:', data.photos?.length || 0);

    if (data.photos && data.photos.length > 0) {
      console.log('\nFirst photo:');
      console.log('  - ID:', data.photos[0].id);
      console.log('  - Photographer:', data.photos[0].photographer);
      console.log('  - URL:', data.photos[0].src.large);
    }

    return data;
  } catch (error) {
    console.error('❌ Fetch error:', error.message);
  }
}

testPexelsAPI();
