import { generatePersonalizedItinerary } from '../../src/services/ai/flows/generate-personalized-itinerary';

async function testSimpleItinerary() {
  console.log('\n🚀 Testing simple request: "2 days in Tokyo"\n');
  console.log('This test will show how the AI generates itineraries and what data it uses.\n');

  try {
    const result = await generatePersonalizedItinerary({
      prompt: '2 days in Tokyo',
      attachedFile: undefined,
      conversationHistory: undefined
    });

    console.log('✅ Success! Generated itinerary for:', result.destination);
    console.log('Total days:', result.itinerary.length);
    console.log('\n' + '='.repeat(60));

    result.itinerary.forEach((day, index) => {
      console.log(`\n📅 Day ${day.day}: ${day.title}`);
      console.log('   Date:', day.date || 'Not specified');
      console.log('\n   Activities:');

      day.activities.forEach(act => {
        console.log(`\n   ⏰ ${act.time}`);
        console.log(`      ${act.description}`);
        console.log(`      📍 Address: ${act.address}`);
        if (act.venue_name) {
          console.log(`      🏢 Venue: ${act.venue_name}`);
        }
        if (act.rating) {
          console.log(`      ⭐ Rating: ${act.rating}`);
        }
      });
    });

    console.log('\n' + '='.repeat(60));
    console.log('\n💡 Quick Tips:');
    result.quickTips?.forEach((tip, i) => {
      console.log(`   ${i + 1}. ${tip}`);
    });

    // Check for N/A addresses
    const naAddresses = result.itinerary.flatMap(day =>
      day.activities.filter(act => act.address?.includes('N/A'))
    );

    if (naAddresses.length > 0) {
      console.log(`\n⚠️  Note: ${naAddresses.length} activities have N/A addresses (LocationIQ data unavailable)`);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

// Run the test
testSimpleItinerary();