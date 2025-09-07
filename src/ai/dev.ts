
import { config } from 'dotenv';
config();

console.log('='.repeat(80));
console.log('🚀 [GENKIT SERVER] Starting...');
console.log('✅ [GENKIT SERVER] dotenv configured. Environment variables loaded.');
console.log('='.repeat(80));


import '@/ai/flows/refine-itinerary-based-on-feedback.ts';
import '@/ai/flows/generate-personalized-itinerary.ts';


console.log('✅ [GENKIT SERVER] All AI flows imported successfully.');
