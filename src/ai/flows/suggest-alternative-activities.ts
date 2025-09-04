'use server';

/**
 * @fileOverview A flow for suggesting alternative activities or locations for an itinerary.
 *
 * - suggestAlternativeActivities - A function that suggests alternative activities.
 * - SuggestAlternativeActivitiesInput - The input type for the suggestAlternativeActivities function.
 * - SuggestAlternativeActivitiesOutput - The return type for the suggestAlternativeActivities function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestAlternativeActivitiesInputSchema = z.object({
  itinerary: z.string().describe('The itinerary for which to suggest alternative activities.'),
  userPreferences: z.string().describe('The user preferences to tailor the suggestions.'),
  currentActivity: z.string().describe('The current activity for which to find alternatives.'),
});
export type SuggestAlternativeActivitiesInput = z.infer<typeof SuggestAlternativeActivitiesInputSchema>;

const SuggestAlternativeActivitiesOutputSchema = z.object({
  alternativeActivities: z.array(z.string()).describe('The list of alternative activities.'),
});
export type SuggestAlternativeActivitiesOutput = z.infer<typeof SuggestAlternativeActivitiesOutputSchema>;

export async function suggestAlternativeActivities(input: SuggestAlternativeActivitiesInput): Promise<SuggestAlternativeActivitiesOutput> {
  return suggestAlternativeActivitiesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestAlternativeActivitiesPrompt',
  input: {schema: SuggestAlternativeActivitiesInputSchema},
  output: {schema: SuggestAlternativeActivitiesOutputSchema},
  prompt: `You are a travel expert. Given an itinerary, user preferences, and a current activity, suggest alternative activities or locations.

Itinerary: {{{itinerary}}}
User Preferences: {{{userPreferences}}}
Current Activity: {{{currentActivity}}}

Suggest a few alternative activities:
`,
});

const suggestAlternativeActivitiesFlow = ai.defineFlow(
  {
    name: 'suggestAlternativeActivitiesFlow',
    inputSchema: SuggestAlternativeActivitiesInputSchema,
    outputSchema: SuggestAlternativeActivitiesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
