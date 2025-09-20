import { TripGenerator } from '../src/services/ai/trip-generator';

async function testPerformance() {
  try {
    const generator = new TripGenerator();
    const params = {
      destination: 'Paris',
      startDate: '2025-10-15',
      duration: 5,
      travelers: { adults: 2, children: 0 },
      preferences: { budget: 'mid' }
    };

    console.time('Total Generation Time');
    const result = await generator.generateItinerary(params);
    console.timeEnd('Total Generation Time');

    console.log('Days:', result.itinerary.length);
    console.log('Total activities:', result.itinerary.reduce((sum, day) => sum + day.activities.length, 0));
    console.log('Activities per day:', result.itinerary.map(day => day.activities.length));

    // Show first day activities for analysis
    console.log('First day activities:');
    result.itinerary[0].activities.forEach((activity, i) => {
      console.log(`  ${i+1}. ${activity.description}`);
    });

  } catch (error) {
    console.error('Error:', error);
  }
}

testPerformance();