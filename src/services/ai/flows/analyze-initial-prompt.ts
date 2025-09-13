'use server';

import { z } from 'genkit';
import { parseDestinations } from '@/services/ai/utils/destination-parser';
import { logger } from '@/lib/logger';

const AnalyzeInitialPromptInputSchema = z.object({
  prompt: z.string().describe('The user\'s travel request'),
  conversationHistory: z.string().optional().describe('Previous conversation context'),
});

const AnalyzeInitialPromptOutputSchema = z.object({
  hasAllRequiredInfo: z.boolean().describe('Whether we have all required information'),
  missingInfo: z.array(z.string()).describe('List of missing information'),
  clarifyingQuestion: z.string().optional().describe('Question to ask the user'),
  extractedInfo: z.object({
    origin: z.string().optional(),
    destinations: z.array(z.string()).optional(),
    duration: z.string().optional(),
    travelers: z.number().optional(),
    dates: z.string().optional(),
  }).optional(),
});

export type AnalyzeInitialPromptInput = z.infer<typeof AnalyzeInitialPromptInputSchema>;
export type AnalyzeInitialPromptOutput = z.infer<typeof AnalyzeInitialPromptOutputSchema>;

export async function analyzeInitialPrompt(
  input: AnalyzeInitialPromptInput
): Promise<AnalyzeInitialPromptOutput> {
  logger.info('AI', 'Analyzing initial prompt for missing information');
  
  try {
    // Parse the user's input
    const parsedTrip = parseDestinations(input.prompt);
    
    const missingInfo: string[] = [];
    let clarifyingQuestion = '';
    
    // Check for critical missing information
    if (!parsedTrip.origin || parsedTrip.origin === '') {
      missingInfo.push('departure city');
      clarifyingQuestion = "I'd love to help plan your trip! Where will you be flying from?";
    } else if (parsedTrip.destinations.length === 0) {
      missingInfo.push('destination');
      clarifyingQuestion = "Where would you like to travel to?";
    } else if (parsedTrip.totalDays === 0) {
      missingInfo.push('trip duration');
      clarifyingQuestion = "How many days are you planning to travel?";
    }
    
    // Return analysis
    return {
      hasAllRequiredInfo: missingInfo.length === 0,
      missingInfo,
      clarifyingQuestion: clarifyingQuestion || undefined,
      extractedInfo: {
        origin: parsedTrip.origin || undefined,
        destinations: parsedTrip.destinations.map(d => d.name),
        duration: parsedTrip.totalDays > 0 ? `${parsedTrip.totalDays} days` : undefined,
        travelers: 1, // Default
        dates: parsedTrip.startDate || undefined,
      },
    };
  } catch (error: any) {
    logger.error('AI', 'Failed to analyze prompt', { error: error.message });
    
    // If we can't parse, ask for basic info
    return {
      hasAllRequiredInfo: false,
      missingInfo: ['trip details'],
      clarifyingQuestion: "I'd love to help plan your trip! Could you tell me where you'd like to go and where you'll be departing from?",
      extractedInfo: {},
    };
  }
}