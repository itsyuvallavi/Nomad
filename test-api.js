const prompt = `I want to go from New Zealand to Japan, China for a week, South Korea for a week, Vietnam for a week, and spend 3 days in Denmark Copenhagen. Then fly back to LA.`;

console.log('🚀 Testing multi-destination itinerary generation...');
console.log('📍 Destinations: Japan, China, South Korea, Vietnam, Denmark');
console.log('📅 Expected: 31 days total (7+7+7+7+3)');

// Send request to the API
fetch('http://localhost:9002/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ prompt })
})
.then(res => res.json())
.then(data => {
  console.log('\n✅ Response received!');
  console.log('📊 Title:', data.title);
  console.log('🌍 Destinations:', data.destination);
  console.log('📅 Total days generated:', data.itinerary.length);
  
  // Check destinations from metadata
  const destinations = new Set();
  data.itinerary.forEach(day => {
    if (day._destination) {
      destinations.add(day._destination);
    }
  });
  
  console.log('🗺️ Unique destinations found:', Array.from(destinations));
  console.log('📍 Location count:', destinations.size);
  
  // Verify day distribution
  const destGroups = {};
  data.itinerary.forEach(day => {
    const dest = day._destination || 'Unknown';
    if (!destGroups[dest]) {
      destGroups[dest] = [];
    }
    destGroups[dest].push(day.day);
  });
  
  console.log('\n📊 Day distribution by destination:');
  Object.entries(destGroups).forEach(([dest, days]) => {
    console.log(`  ${dest}: Days ${Math.min(...days)}-${Math.max(...days)} (${days.length} days)`);
  });
  
  // Check if all expected destinations are present
  const expected = ['Japan', 'China', 'South Korea', 'Vietnam', 'Denmark'];
  const missing = expected.filter(d => !Array.from(destinations).some(dest => 
    dest.toLowerCase().includes(d.toLowerCase())
  ));
  
  if (missing.length > 0) {
    console.log('⚠️ Missing destinations:', missing);
  } else {
    console.log('✅ All expected destinations present!');
  }
  
  console.log('\n🎯 Test complete!');
})
.catch(err => {
  console.error('❌ Error:', err.message);
});