import 'dotenv/config';
import { generateUltraFastItinerary } from './src/ai/enhanced-generator-ultra-fast';

async function test() {
  console.log('Testing ultra-fast generation improvements...');
  const start = Date.now();
  
  try {
    const result = await generateUltraFastItinerary('3 days in London from New York');
    const elapsed = Date.now() - start;
    
    console.log('✅ Success in', elapsed, 'ms');
    console.log('Title:', result.title);
    console.log('Days:', result.itinerary.length);
    console.log('Activities per day:', result.itinerary[0]?.activities?.length || 0);
    
    // Check for venue diversity
    const venues = new Set();
    result.itinerary.forEach(day => {
      day.activities.forEach(activity => {
        if (activity.address && activity.address !== 'London city center') {
          venues.add(activity.address);
        }
      });
    });
    console.log('Unique venues:', venues.size);
    
  } catch (error: any) {
    console.log('❌ Error:', error.message);
  }
}

test();
