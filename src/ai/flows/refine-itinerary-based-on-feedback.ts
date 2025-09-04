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

const RefineItineraryBasedOnFeedbackInputSchema = z.object({
  originalItinerary: z
    .string()
    .describe('The original itinerary to be refined.'),
  userFeedback: z
    .string()
    .describe('The user feedback to be used for refining the itinerary.'),
});
export type RefineItineraryBasedOnFeedbackInput = z.infer<
  typeof RefineItineraryBasedOnFeedbackInputSchema
>;

const RefineItineraryBasedOnFeedbackOutputSchema = z.object({
  refinedItinerary: z.string().describe('The refined itinerary.'),
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
  output: {schema: RefineItineraryBasedOnFeedbackOutputSchema},
  prompt: `You are an expert travel assistant. A user has provided the following itinerary:

  {{originalItinerary}}

The user has given the following feedback:

  {{userFeedback}}

Based on this feedback, please refine the itinerary. Keep the itinerary in the same format as the original. Focus on making concrete changes to address the feedback. Do not include any introductory or concluding remarks, only the new itinerary.
`,
});

const refineItineraryBasedOnFeedbackFlow = ai.defineFlow(
  {
    name: 'refineItineraryBasedOnFeedbackFlow',
    inputSchema: RefineItineraryBasedOnFeedbackInputSchema,
    outputSchema: RefineItineraryBasedOnFeedbackOutputSchema,
  },
  async input => {
    const {output} = await refineItineraryBasedOnFeedbackPrompt(input);
    return output!;
  }
);
