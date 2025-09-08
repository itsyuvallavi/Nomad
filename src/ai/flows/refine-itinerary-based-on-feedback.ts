// refine-itinerary-based-on-feedback.ts
'use server';

/**
 * @fileOverview Refines a given itinerary based on user feedback.
 *
 * - refineItineraryBasedOnFeedback - A function that takes an itinerary and user feedback, and returns a refined itinerary.
 * - RefineItineraryBasedOnFeedbackInput - The input type for the refineItineraryBasedOnFeedback function.
 * - RefineItineraryBasedOnFeedbackOutput - The return type for the refineItineraryBasedOnFeedback function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// We get the schemas from the central schemas file to ensure consistency
import { GeneratePersonalizedItineraryOutputSchema } from '@/ai/schemas';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/schemas';

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
  return refineItineraryBasedOnFeedbackFlow(input);
}

const refineItineraryBasedOnFeedbackPrompt = ai.definePrompt({
  name: 'refineItineraryBasedOnFeedbackPrompt',
  input: {schema: RefineItineraryBasedOnFeedbackInputSchema},
  output: {schema: GeneratePersonalizedItineraryOutputSchema},
  prompt: `You are an expert travel assistant. A user has provided an itinerary and some feedback.

  Original Itinerary:
  {{{json originalItinerary}}}

  User Feedback:
  "{{{userFeedback}}}"

  Based on this feedback, please refine the itinerary. Your response must be only the refined itinerary in the exact same JSON structure as the original.
  
  IMPORTANT for multi-destination trips:
  - When adding a new destination (e.g., "add 7 days in Brussels"), ensure each day has a clear title indicating the location
  - Use format like "Brussels Day 1" or "Day 8: Brussels" for clarity
  - Include travel activities between cities (e.g., "Travel from London to Brussels")
  - Ensure addresses include the city name for location detection
  
  Only change the content of the fields based on the feedback. Ensure all fields for each activity (time, description, category, address) are present.
`,
});

const refineItineraryBasedOnFeedbackFlow = ai.defineFlow(
  {
    name: 'refineItineraryBasedOnFeedbackFlow',
    inputSchema: RefineItineraryBasedOnFeedbackInputSchema,
    outputSchema: GeneratePersonalizedItineraryOutputSchema,
  },
  async input => {
    console.log('🔄 [AI Flow] Refining itinerary based on feedback...');
    console.log('   [AI Flow] Feedback:', input.userFeedback);
    const {output} = await refineItineraryBasedOnFeedbackPrompt(input);
    if (!output) {
        console.error('❌ [AI Flow] Refinement failed, model returned no output.');
        throw new Error("The model failed to generate a refined itinerary.");
    }
    console.log('✅ [AI Flow] Itinerary refined successfully.');
    return output;
  }
);
