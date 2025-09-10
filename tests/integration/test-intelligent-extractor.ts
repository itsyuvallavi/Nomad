import 'dotenv/config';
import { extractTripInfo, createStructuredPrompt } from './src/ai/utils/intelligent-trip-extractor';

async function testExtractor() {
  const complexPrompt = "plan a trip to Zimbabwe from Melbourne on January next year, after Zimbabwe i want to visit Nicaragua for a week, then spend a week in Madagascar, then a week in Ethiopia and finally before going back home to LA, i want to visit Denmark for 3 days.";
  
  console.log('Testing Intelligent Trip Extractor\n');
  console.log('Original prompt:');
  console.log(complexPrompt);
  console.log('\n' + '='.repeat(80) + '\n');
  
  try {
    // Extract structured info
    console.log('Extracting structured information...\n');
    const extracted = await extractTripInfo(complexPrompt, true);
    
    console.log('Extracted Trip Info:');
    console.log(JSON.stringify(extracted, null, 2));
    
    console.log('\n' + '='.repeat(80) + '\n');
    
    // Create structured prompt
    const structuredPrompt = createStructuredPrompt(extracted);
    console.log('Structured Prompt for AI:');
    console.log(structuredPrompt);
    
    console.log('\n' + '='.repeat(80) + '\n');
    console.log('✅ Extraction successful!');
    console.log(`Found ${extracted.destinations.length} destinations`);
    console.log(`Total trip duration: ${extracted.totalDays} days`);
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

testExtractor();