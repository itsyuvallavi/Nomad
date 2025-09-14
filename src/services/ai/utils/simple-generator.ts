/**
 * Simplified Itinerary Generator
 * A clean, maintainable approach to generating travel itineraries
 */

import { openai } from '../openai-config';
import { parseDestinationsWithAI } from './ai-destination-parser';
import { logger } from '@/lib/monitoring/logger';
import type { GeneratePersonalizedItineraryOutput } from '../flows/generate-personalized-itinerary';
import { estimateTripCost } from './openai-travel-costs';

/**
 * Simple validation to prevent overly complex trips
 */
export function validateTripComplexity(prompt: string): { valid: boolean; error?: string } {
  const lowerPrompt = prompt.toLowerCase();

  // Check for excessive duration
  const durationMatch = lowerPrompt.match(/(\d+)\s*(days?|weeks?|months?)/g);
  if (durationMatch) {
    let totalDays = 0;
    durationMatch.forEach(match => {
      const num = parseInt(match);
      if (match.includes('week')) totalDays += num * 7;
      else if (match.includes('month')) totalDays += num * 30;
      else totalDays += num;
    });

    if (totalDays > 30) {
      return { valid: false, error: `Trip is too long (${totalDays} days). Maximum 30 days supported.` };
    }
  }

  // Check for too many destinations (simple heuristic)
  const cityPattern = /(?:to|visit|explore|see|in)\s+([A-Z][a-zA-Z\s]+)(?:,|and|then)/gi;
  const matches = [...prompt.matchAll(cityPattern)];
  if (matches.length > 5) {
    return { valid: false, error: 'Too many destinations. Maximum 5 cities supported.' };
  }

  return { valid: true };
}

/**
 * Extract travel date from prompt
 */
function extractTravelDate(prompt: string): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const lowerPrompt = prompt.toLowerCase();

  // Handle "next week"
  if (lowerPrompt.includes('next week')) {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString().split('T')[0];
  }

  // Handle "tomorrow"
  if (lowerPrompt.includes('tomorrow')) {
    return tomorrow.toISOString().split('T')[0];
  }

  // Handle specific months
  const months = ['january', 'february', 'march', 'april', 'may', 'june',
                  'july', 'august', 'september', 'october', 'november', 'december'];
  for (let i = 0; i < months.length; i++) {
    if (lowerPrompt.includes(months[i])) {
      const date = new Date();
      date.setMonth(i, 1);
      if (date < new Date()) {
        date.setFullYear(date.getFullYear() + 1);
      }
      return date.toISOString().split('T')[0];
    }
  }

  // Default to tomorrow
  return tomorrow.toISOString().split('T')[0];
}

/**
 * Generate activities for a destination
 */
async function generateActivities(
  destination: string,
  days: number,
  dayOffset: number
): Promise<any[]> {
  const prompt = `Generate a ${days}-day itinerary for ${destination}.
Start with day ${dayOffset + 1}.

Return ONLY a JSON array with this exact structure for each day:
{
  "day": <number>,
  "destination_city": "${destination}",
  "title": "Day X: <theme>",
  "activities": [
    {
      "time": "<time>",
      "description": "<activity>",
      "category": "Food|Attraction|Leisure|Travel|Accommodation",
      "venue_name": "<venue name>",
      "address": "Address TBD",
      "tips": "<tips>"
    }
  ]
}

Include 4-5 activities per day. Mix categories.`;

  try {
    if (!openai) {
      throw new Error('OpenAI client not configured');
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a travel planning assistant. Return only valid JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1500
    });

    const content = completion.choices[0].message.content || '{"days":[]}';
    const parsed = JSON.parse(content);
    const days = Array.isArray(parsed) ? parsed : (parsed.days || []);

    // Ensure correct day numbering
    return days.map((day: any, index: number) => ({
      ...day,
      day: dayOffset + index + 1
    }));
  } catch (error) {
    logger.error('AI', `Failed to generate activities for ${destination}`, error);
    return createFallbackDays(destination, days, dayOffset);
  }
}

/**
 * Create fallback activities if generation fails
 */
function createFallbackDays(destination: string, days: number, dayOffset: number): any[] {
  const result = [];
  for (let i = 0; i < days; i++) {
    result.push({
      day: dayOffset + i + 1,
      destination_city: destination,
      title: `Day ${dayOffset + i + 1} in ${destination}`,
      activities: [
        {
          time: '9:00 AM',
          description: 'Breakfast at local cafe',
          category: 'Food',
          venue_name: 'Local Cafe',
          address: 'Address TBD',
          tips: 'Try local specialties'
        },
        {
          time: '10:30 AM',
          description: 'Visit main attraction',
          category: 'Attraction',
          venue_name: 'Main Attraction',
          address: 'Address TBD',
          tips: 'Book tickets in advance'
        },
        {
          time: '1:00 PM',
          description: 'Lunch',
          category: 'Food',
          venue_name: 'Restaurant',
          address: 'Address TBD',
          tips: 'Make reservations'
        },
        {
          time: '3:00 PM',
          description: 'Explore local area',
          category: 'Leisure',
          venue_name: 'Local Area',
          address: 'Address TBD',
          tips: 'Wear comfortable shoes'
        },
        {
          time: '7:00 PM',
          description: 'Dinner',
          category: 'Food',
          venue_name: 'Dinner Restaurant',
          address: 'Address TBD',
          tips: 'Enjoy local cuisine'
        }
      ]
    });
  }
  return result;
}

/**
 * Main generation function - SIMPLIFIED
 */
export async function generateSimpleItinerary(
  prompt: string,
  _attachedFile?: string,
  _conversationHistory?: string
): Promise<GeneratePersonalizedItineraryOutput> {
  const startTime = Date.now();
  logger.info('AI', '🚀 Starting simple itinerary generation');

  try {
    // Step 1: Parse the trip using AI
    const parsedTrip = await parseDestinationsWithAI(prompt);

    if (!parsedTrip.destinations || parsedTrip.destinations.length === 0) {
      throw new Error('No destinations found in prompt');
    }

    logger.info('AI', `Parsed ${parsedTrip.destinations.length} destinations in ${Date.now() - startTime}ms`);

    // Step 2: Generate activities for each destination
    const chunks = [];
    let dayOffset = 0;

    for (const dest of parsedTrip.destinations) {
      const activities = await generateActivities(dest.name, dest.days, dayOffset);
      chunks.push(...activities);
      dayOffset += dest.days;
    }

    // Step 3: Format the result
    const startDate = extractTravelDate(prompt);
    const destinationString = parsedTrip.destinations.map(d => d.name).join(', ');
    const title = parsedTrip.destinations.length > 1
      ? `${parsedTrip.totalDays}-Day Multi-City Adventure`
      : `${parsedTrip.totalDays} Days in ${parsedTrip.destinations[0].name}`;

    // Format days with proper dates
    const formattedDays = chunks.map((day: any, index: number) => {
      const dayDate = new Date(startDate);
      dayDate.setDate(dayDate.getDate() + index);

      return {
        day: index + 1,
        date: dayDate.toISOString().split('T')[0],
        title: day.title || `Day ${index + 1}`,
        activities: (day.activities || []).map((activity: any) => ({
          time: activity.time || '9:00 AM',
          description: activity.description || 'Activity',
          category: activity.category || 'Attraction',
          address: activity.address || 'Address TBD',
          venue_name: activity.venue_name,
          venue_search: activity.venue_name ? `${activity.venue_name} ${day.destination_city}` : undefined
        }))
      };
    });

    // Step 4: Estimate costs (optional, with error handling)
    let costEstimate;
    try {
      const tripCostData = await estimateTripCost(
        parsedTrip.origin || 'Your location',
        parsedTrip.destinations,
        1 // Default to 1 traveler
      );

      if (tripCostData) {
        costEstimate = {
          total: Math.round(tripCostData.total),
          flights: Math.round(tripCostData.flights),
          accommodation: Math.round(tripCostData.accommodation),
          dailyExpenses: Math.round(tripCostData.dailyExpenses),
          currency: tripCostData.currency,
          breakdown: tripCostData.breakdown.map((item: any) => ({
            type: item.type,
            description: item.description,
            amount: Math.round(item.amount)
          }))
        };
      }
    } catch (costError) {
      logger.warn('AI', 'Cost estimation failed, continuing without costs', costError);
    }

    logger.info('AI', `✅ Generation completed in ${Date.now() - startTime}ms`);

    const result: any = {
      destination: destinationString,
      title,
      itinerary: formattedDays,
      quickTips: [
        'Book accommodations in advance',
        'Check visa requirements',
        'Get travel insurance',
        'Download offline maps',
        'Keep digital copies of documents'
      ]
    };

    // Add cost estimate if available
    if (costEstimate) {
      result._costEstimate = costEstimate;
    }

    return result;

  } catch (error: any) {
    logger.error('AI', 'Generation failed', error);
    throw error;
  }
}

/**
 * Export the function with the same name as the old one for compatibility
 */
export const generateUltraFastItinerary = generateSimpleItinerary;