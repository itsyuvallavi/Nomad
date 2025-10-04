import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { TripGenerator } from '../../src/services/ai/trip-generator';

async function testGenerator() {
  console.log('🧪 Testing New Unified Trip Generator\n');

  const generator = new TripGenerator();

  try {
    // Test 1: Compatibility mode (old interface)
    console.log('📦 Test 1: Using generateItinerary (compatibility mode)...');
    const result1 = await generator.generateItinerary({
      destination: 'London',
      duration: 3,
      startDate: '2025-03-01',
      budget: 'medium'
    });

    console.log('✅ Compatibility mode result:', {
      success: Boolean(result1),
      days: result1?.dailyItineraries?.length,
      destination: result1?.destination,
      hasCosts: Boolean(result1?.estimatedCost)
    });

    // Test 2: Progressive mode with callbacks
    console.log('\n🔄 Test 2: Using generateProgressive with callbacks...');
    const updates: any[] = [];

    const result2 = await generator.generateProgressive({
      destinations: ['Paris'],
      duration: 2,
      startDate: '2025-03-15',
      onProgress: (update) => {
        updates.push(update);
        console.log(`  📡 Progress: ${update.type} (${update.progress}%)`);
      }
    });

    console.log('✅ Progressive mode result:', {
      success: Boolean(result2),
      updates: updates.length,
      updateTypes: updates.map(u => u.type),
      days: result2?.itinerary?.dailyItineraries?.length
    });

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

testGenerator().catch(console.error);