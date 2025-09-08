// refine-itinerary-based-on-feedback.ts
'use server';

/**
 * @fileOverview Refines a given itinerary based on user feedback using direct OpenAI calls.
 *
 * - refineItineraryBasedOnFeedback - A function that takes an itinerary and user feedback, and returns a refined itinerary.
 * - RefineItineraryBasedOnFeedbackInput - The input type for the refineItineraryBasedOnFeedback function.
 * - RefineItineraryBasedOnFeedbackOutput - The return type for the refineItineraryBasedOnFeedback function.
 */
import {z} from 'genkit';
import { logger } from '@/lib/logger';
import { openai, MODEL_CONFIG } from '@/ai/openai-config';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/schemas';
import { GeneratePersonalizedItineraryOutputSchema } from '@/ai/schemas';


const RefineItineraryBasedOnFeedbackInputSchema = z.object({
  originalItinerary: GeneratePersonalizedItineraryOutputSchema.describe("The original itinerary in JSON format."),
  userFeedback: z
    .string()
    .describe('The user feedback to be used for refining the itinerary.'),
});
export type RefineItineraryBasedOnFeedbackInput = z.infer<
  typeof RefineItineraryBasedOnFeedbackInputSchema
>;

// The output should be the same as the generation output
export type RefineItineraryBasedOnFeedbackOutput = GeneratePersonalizedItineraryOutput;

export async function refineItineraryBasedOnFeedback(
  input: RefineItineraryBasedOnFeedbackInput
): Promise<RefineItineraryBasedOnFeedbackOutput> {
  const { originalItinerary, userFeedback } = input;
  
  logger.info('AI', 'Refining itinerary with direct OpenAI call', { feedback: userFeedback });

  const systemPrompt = `You are an expert travel assistant. A user has provided an itinerary and some feedback.

Based on this feedback, please refine the itinerary. Your response must be only the refined itinerary in the exact same JSON structure as the original.

IMPORTANT for multi-destination trips:
- When adding a new destination (e.g., "add 7 days in Brussels"), ensure each day has a clear title indicating the location.
- Use format like "Brussels Day 1" or "Day 8: Brussels" for clarity.
- Include travel activities between cities (e.g., "Travel from London to Brussels").
- Ensure addresses include the city name for location detection.
- ONLY change the content of the fields based on the feedback. Ensure all fields for each activity (time, description, category, address) are present.
- The entire, complete, new itinerary must be returned.
`;

  const userMessage = `
Original Itinerary:
${JSON.stringify(originalItinerary, null, 2)}

User Feedback:
"${userFeedback}"
`;

  try {
    if (!openai) {
        throw new Error('OpenAI client not initialized. Check OPENAI_API_KEY.');
    }
      
    const response = await openai.chat.completions.create({
      model: MODEL_CONFIG.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: MODEL_CONFIG.temperature,
      max_tokens: MODEL_CONFIG.max_tokens,
      response_format: MODEL_CONFIG.response_format,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned an empty response.');
    }
    
    const refinedItinerary = JSON.parse(content) as GeneratePersonalizedItineraryOutput;

    logger.info('AI', '✅ Itinerary refined successfully via OpenAI');
    return refinedItinerary;
      
  } catch (error: any) {
    logger.error('AI', 'Failed to refine itinerary with OpenAI', error);
    throw new Error(`Failed to refine itinerary: ${error.message}`);
  }
}
