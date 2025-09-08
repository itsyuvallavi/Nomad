// Test OpenAI API connection
const OpenAI = require('openai');
require('dotenv').config();

console.log('🧪 Testing OpenAI API Connection...\n');

// Check if API key exists
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not found in .env file!');
  process.exit(1);
}

console.log('✅ API Key found:', process.env.OPENAI_API_KEY.substring(0, 20) + '...');

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Test with a simple completion
async function testOpenAI() {
  try {
    console.log('\n📤 Sending test request to OpenAI GPT-4o-mini...');
    
    const startTime = Date.now();
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a travel assistant. Respond with a JSON object.'
        },
        {
          role: 'user',
          content: 'Give me a simple 2-day Paris itinerary in JSON format with destination, title, and days array.'
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
      response_format: { type: 'json_object' }
    });
    
    const duration = Date.now() - startTime;
    
    console.log('\n✅ SUCCESS! OpenAI API is working!');
    console.log(`⏱️  Response time: ${duration}ms`);
    console.log('\n📥 Response from OpenAI:');
    console.log('Model:', completion.model);
    console.log('Usage:', completion.usage);
    console.log('\n📝 Generated Content:');
    
    const content = JSON.parse(completion.choices[0].message.content);
    console.log(JSON.stringify(content, null, 2));
    
    console.log('\n🎉 OpenAI API test completed successfully!');
    console.log('The API key is valid and GPT-4o-mini is responding correctly.');
    
  } catch (error) {
    console.error('\n❌ OpenAI API Test Failed!');
    console.error('Error Type:', error.constructor.name);
    console.error('Error Message:', error.message);
    
    if (error.response) {
      console.error('Response Status:', error.response.status);
      console.error('Response Data:', error.response.data);
    }
    
    if (error.message.includes('401')) {
      console.error('\n🔑 Authentication Error: Your API key is invalid or expired.');
      console.error('Please check your OPENAI_API_KEY in the .env file.');
    } else if (error.message.includes('429')) {
      console.error('\n⚠️ Rate Limit Error: Too many requests.');
      console.error('Please wait a moment and try again.');
    } else if (error.message.includes('insufficient_quota')) {
      console.error('\n💳 Quota Error: Your OpenAI account has insufficient credits.');
      console.error('Please add credits to your OpenAI account.');
    }
    
    process.exit(1);
  }
}

// Run the test
testOpenAI();
