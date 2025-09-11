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

/**
 * Simple fallback handler for common extensions without OpenAI
 */
function handleSimpleExtension(
  originalItinerary: GeneratePersonalizedItineraryOutput, 
  feedback: string
): GeneratePersonalizedItineraryOutput {
  const lowerFeedback = feedback.toLowerCase();
  
  // Extract number of days/weeks to extend
  let extensionDays = 0;
  
  if (lowerFeedback.includes('week')) {
    const weekMatch = lowerFeedback.match(/(\d+)\s*weeks?/);
    if (weekMatch) extensionDays = parseInt(weekMatch[1]) * 7;
    else extensionDays = 7; // Default to 1 week
  } else if (lowerFeedback.includes('day')) {
    const dayMatch = lowerFeedback.match(/(\d+)\s*days?/);
    if (dayMatch) extensionDays = parseInt(dayMatch[1]);
    else extensionDays = 1; // Default to 1 day
  }
  
  if (extensionDays === 0) extensionDays = 7; // Default extension
  
  const originalDays = originalItinerary.itinerary?.length || 0;
  const newTotalDays = originalDays + extensionDays;
  
  // Clone the original itinerary
  const extended = JSON.parse(JSON.stringify(originalItinerary));
  
  // Update title
  extended.title = `${newTotalDays} Days in ${originalItinerary.destination}`;
  
  // Generate new days with simple activities
  const destination = originalItinerary.destination || 'your destination';
  
  for (let i = originalDays + 1; i <= newTotalDays; i++) {
    const newDay = {
      day: i,
      title: `Day ${i}: Explore ${destination}`,
      date: new Date(2026, 0, i).toISOString().split('T')[0], // Simple date calculation
      activities: [
        {
          time: "09:00",
          description: `Morning exploration in ${destination}`,
          category: "sightseeing",
          address: `${destination} city center`
        },
        {
          time: "14:00", 
          description: `Afternoon activities in ${destination}`,
          category: "leisure",
          address: `${destination} downtown`
        },
        {
          time: "19:00",
          description: `Evening dining in ${destination}`,
          category: "dining",
          address: `${destination} restaurant district`
        }
      ]
    };
    extended.itinerary.push(newDay);
  }
  
  logger.info('AI', `✅ Extended itinerary from ${originalDays} to ${newTotalDays} days`);
  return extended;
}


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
  
  logger.info('AI', 'Refining itinerary with direct OpenAI call', { 
    feedback: userFeedback,
    originalDestination: originalItinerary.destination,
    originalDays: originalItinerary.itinerary?.length || 0
  });

  // Basic validation of the original itinerary
  if (!originalItinerary || !originalItinerary.destination) {
    throw new Error('Original itinerary is missing required fields');
  }

  // Simple fallback for common extensions to avoid OpenAI timeouts
  const feedback = userFeedback.toLowerCase().trim();
  const extensionKeywords = ['extend', 'add', 'make it', 'increase', 'expand'];
  const timeKeywords = ['week', 'day', 'days', 'weeks', 'total'];
  
  const hasExtensionWord = extensionKeywords.some(word => feedback.includes(word));
  const hasTimeWord = timeKeywords.some(word => feedback.includes(word));
  
  if (hasExtensionWord && hasTimeWord) {
    logger.info('AI', 'Using simple extension fallback instead of OpenAI');
    return handleSimpleExtension(originalItinerary, userFeedback);
  }

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
      
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('OpenAI request timeout after 30 seconds')), 30000);
    });

    const requestPromise = openai.chat.completions.create({
      model: MODEL_CONFIG.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: MODEL_CONFIG.temperature,
      max_tokens: MODEL_CONFIG.max_tokens,
      response_format: MODEL_CONFIG.response_format,
    });

    const response = await Promise.race([requestPromise, timeoutPromise]) as any;

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned an empty response.');
    }
    
    // Parse JSON with better error handling
    let refinedItinerary: GeneratePersonalizedItineraryOutput;
    try {
      refinedItinerary = JSON.parse(content);
    } catch (parseError) {
      logger.error('AI', 'Failed to parse OpenAI response as JSON', { 
        content: content.substring(0, 500),
        error: parseError 
      });
      throw new Error('OpenAI returned invalid JSON format');
    }

    // Basic validation of refined itinerary
    if (!refinedItinerary.destination || !refinedItinerary.title) {
      throw new Error('Refined itinerary is missing required fields');
    }

    logger.info('AI', '✅ Itinerary refined successfully via OpenAI', {
      newDestination: refinedItinerary.destination,
      newDays: refinedItinerary.itinerary?.length || 0
    });
    return refinedItinerary;
      
  } catch (error: any) {
    logger.error('AI', 'Failed to refine itinerary with OpenAI', error);
    throw new Error(`Failed to refine itinerary: ${error.message}`);
  }
}
