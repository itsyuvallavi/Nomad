import { config } from 'dotenv';
config();

import '@/ai/flows/refine-itinerary-based-on-feedback.ts';
import '@/ai/flows/suggest-alternative-activities.ts';
import '@/ai/flows/generate-personalized-itinerary.ts';
import '@/ai/flows/analyze-initial-prompt.ts';
