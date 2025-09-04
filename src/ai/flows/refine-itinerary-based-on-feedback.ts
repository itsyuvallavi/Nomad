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

// We get the schemas from the generation flow to ensure consistency
import { GeneratePersonalizedItineraryOutput, GeneratePersonalizedItineraryInput } from './generate-personalized-itinerary';

const RefineItineraryBasedOnFeedbackInputSchema = z.object({
  originalItinerary: z
    .string()
    .describe('The original itinerary in JSON format.'),
  userFeedback: z
    .string()
    .describe('The user feedback to be used for refining the itinerary.'),
});
export type RefineItineraryBasedOnFeedbackInput = z.infer<
  typeof RefineItineraryBasedOnFeedbackInputSchema
>;

// The output should be the same as the generation output
const RefineItineraryBasedOnFeedbackOutputSchema = z.object({
    refinedItinerary: z.string().describe('The refined itinerary in JSON format, matching the original structure.')
});

export type RefineItineraryBasedOnFeedbackOutput = z.infer<
  typeof RefineItineraryBasedOnFeedbackOutputSchema
>;

export async function refineItineraryBasedOnFeedback(
  input: RefineItineraryBasedOnFeedbackInput
): Promise<RefineItineraryBasedOnFeedbackOutput> {
  return refineItineraryBasedOnFeedbackFlow(input);
}

const refineItineraryBasedOnFeedbackPrompt = ai.definePrompt({
  name: 'refineItineraryBasedOnFeedbackPrompt',
  input: {schema: RefineItineraryBasedOnFeedbackInputSchema},
  prompt: `You are an expert travel assistant. A user has provided the following itinerary as a JSON string:

  {{{originalItinerary}}}

The user has given the following feedback:

  {{{userFeedback}}}

Based on this feedback, please refine the itinerary. Your response must be only the refined itinerary, formatted as a single JSON string that is parsable. Keep the exact same JSON structure as the original, including all fields for each activity (time, description, category, address, travelTime). Only change the content of the fields based on the feedback.
`,
});

const refineItineraryBasedOnFeedbackFlow = ai.defineFlow(
  {
    name: 'refineItineraryBasedOnFeedbackFlow',
    inputSchema: RefineItineraryBasedOnFeedbackInputSchema,
    outputSchema: z.object({ refinedItinerary: z.string() }),
  },
  async input => {
    const {text} = await refineItineraryBasedOnFeedbackPrompt(input);
    
    // The model returns a raw string, we wrap it in our expected object structure.
    return { refinedItinerary: text };
  }
);
