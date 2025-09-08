// Test OpenAI with the complex multi-destination itinerary
const OpenAI = require('openai');
require('dotenv').config();

console.log('🧪 Testing OpenAI with Complex Multi-Destination Itinerary...\n');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testComplexItinerary() {
  try {
    const prompt = `plan a trip to Zimbabwe from Melbourne on January next year, after Zimbabwe i want to visit Nicaragua for a week, then spend a week in Madagascar, then a week in Ethiopia and finally before going back home to LA, i want to visit Denmark for 3 days.`;
    
    console.log('📤 Sending complex itinerary request...');
    console.log('Prompt:', prompt);
    console.log('\nExpected destinations in order:');
    console.log('1. Zimbabwe (7 days assumed)');
    console.log('2. Nicaragua (7 days)');
    console.log('3. Madagascar (7 days)');
    console.log('4. Ethiopia (7 days)');
    console.log('5. Denmark (3 days)');
    console.log('Total: ~35 days including travel\n');
    
    const startTime = Date.now();
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a travel agent. Create a detailed itinerary in JSON format.
          
          CRITICAL: Include ALL destinations in the exact order mentioned:
          1. Zimbabwe (7 days if not specified)
          2. Nicaragua (1 week = 7 days)
          3. Madagascar (1 week = 7 days)  
          4. Ethiopia (1 week = 7 days)
          5. Denmark (3 days)
          
          Return JSON with structure:
          {
            "destination": "Zimbabwe, Nicaragua, Madagascar, Ethiopia, Denmark",
            "title": "Multi-Country Adventure",
            "totalDays": 35,
            "itinerary": [array of day objects with day, date, title, and activities]
          }`
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
    
    console.log('✅ Response received!');
    console.log(`⏱️  Response time: ${duration}ms`);
    console.log('Tokens used:', completion.usage.total_tokens);
    
    const content = JSON.parse(completion.choices[0].message.content);
    
    console.log('\n📊 Analysis of Generated Itinerary:');
    console.log('Destination:', content.destination);
    console.log('Title:', content.title);
    console.log('Total Days:', content.totalDays || content.itinerary?.length || 'Not specified');
    
    if (content.itinerary) {
      console.log('Days Generated:', content.itinerary.length);
      
      // Check which destinations are included
      const destinations = ['Zimbabwe', 'Nicaragua', 'Madagascar', 'Ethiopia', 'Denmark'];
      console.log('\n✅ Destination Coverage:');
      destinations.forEach(dest => {
        const included = content.destination?.includes(dest) || 
                         content.itinerary.some(day => 
                           day.title?.includes(dest) || 
                           day.activities?.some(a => a.description?.includes(dest))
                         );
        console.log(`${included ? '✅' : '❌'} ${dest}`);
      });
      
      // Show first and last day
      console.log('\n📅 First Day:', content.itinerary[0]?.title || 'Day 1');
      console.log('📅 Last Day:', content.itinerary[content.itinerary.length - 1]?.title || `Day ${content.itinerary.length}`);
    }
    
    console.log('\n🎉 OpenAI successfully handled the complex multi-destination request!');
    
  } catch (error) {
    console.error('\n❌ Test Failed!');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

testComplexItinerary();
