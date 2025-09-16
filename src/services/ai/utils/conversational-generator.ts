/**
 * Conversational Itinerary Generator
 * Always generates something useful and provides helpful responses
 */

import { openai } from '../openai-config';
import { logger } from '@/lib/monitoring/logger';
import { understandTripIntent, getMissingRequirements, hasRequiredInformation } from './intent-understanding';
import { estimateTripCost } from './openai-travel-costs';
import type { GeneratePersonalizedItineraryOutput } from '../flows/generate-personalized-itinerary';

/**
 * Generate vacation activities for a destination
 * Focus on tourism, culture, food, and relaxation
 */
async function generateVacationActivities(
  destination: string,
  days: number,
  includeCoworking: boolean = false
): Promise<any[]> {
  const tripType = includeCoworking ? 'workation' : 'vacation';

  // Handle multi-city trips
  const cities = destination.toLowerCase().includes(' and ')
    ? destination.split(' and ').map(c => c.trim())
    : [destination];

  const daysPerCity = Math.ceil(days / cities.length);

  const prompt = `Generate a ${days}-day ${tripType} itinerary for ${destination}.

${cities.length > 1 ?
  `Split the itinerary across cities: ${cities.map((c, i) => {
    const startDay = i * daysPerCity + 1;
    const endDay = Math.min(startDay + daysPerCity - 1, days);
    return `Days ${startDay}-${endDay}: ${c}`;
  }).join(', ')}` : ''}

${includeCoworking ?
  'Include coworking spaces in the mornings (9 AM - 1 PM) and vacation activities for afternoons/evenings.' :
  'Create a balanced VACATION itinerary with sightseeing, culture, food, and relaxation.'}

Return a JSON object with a "days" array property containing the itinerary. Each day should have this structure:
{
  "days": [
    {
      "day": <number>,
      "destination_city": "${cities.length > 1 ? '<actual city for this day, e.g., London or Paris>' : destination}",
      "title": "Day X ${cities.length > 1 ? 'in <city>: ' : ': '}<theme>",
      "activities": [
        ${includeCoworking ? `{
          "time": "9:00 AM",
          "description": "Work from [specific coworking space name]",
          "category": "Work",
          "venue_name": "[Actual coworking space in ${destination}]",
          "tips": "Day pass available, good wifi"
        },` : ''}
        {
          "time": "<time>",
          "description": "<activity>",
          "category": "Food|Attraction|Culture|Leisure|Shopping",
          "venue_name": "<real venue name>",
          "tips": "<helpful tips>"
        }
      ]
    }
  ]
}

${includeCoworking ?
  'Include 1 coworking session + 3-4 vacation activities per day.' :
  'Include 5-6 activities per day mixing attractions, food, and culture.'}

IMPORTANT:
- Return exactly ${days} days in the array
${cities.length > 1 ? `- Each day MUST have destination_city set to the actual city (e.g., "London" or "Paris", NOT "${destination}")
- Divide days evenly: ${cities.map((city, i) => {
  const startDay = Math.floor(i * days / cities.length) + 1;
  const endDay = Math.floor((i + 1) * days / cities.length);
  return `Days ${startDay}-${endDay}: set destination_city="${city}"`;
}).join(', ')}` : ''}`;

  try {
    if (!openai) {
      throw new Error('OpenAI client not configured');
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a travel planning assistant. Create realistic vacation itineraries with actual venue names. Always return a valid JSON object with a "days" array.'
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 4000  // Increased to handle multi-city trips
    });

    const content = completion.choices[0].message.content || '{"days":[]}';

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (parseError) {
      logger.warn('AI', 'JSON parse error, attempting to fix', parseError);
      // Try to fix common JSON issues
      const fixedContent = content
        .replace(/,\s*}/, '}')  // Remove trailing commas
        .replace(/,\s*]/, ']')  // Remove trailing commas in arrays
        .replace(/"\s*$/, '"}]}');  // Complete truncated JSON

      try {
        parsed = JSON.parse(fixedContent);
      } catch (e) {
        logger.error('AI', 'Could not parse JSON even after fixes', e);
        parsed = { days: [] };
      }
    }

    const generatedDays = parsed.days || parsed || [];

    // Validate we got the expected number of days
    if (generatedDays.length !== days) {
      logger.warn('AI', `Expected ${days} days but got ${generatedDays.length}, filling in missing days`);
      // If we don't have enough days, throw error instead of using defaults
      if (generatedDays.length < days) {
        throw new Error(`Only generated ${generatedDays.length} days, expected ${days}`);
      }
    }

    logger.info('AI', `Generated ${generatedDays.length} days of activities for ${destination}`);
    return generatedDays;
  } catch (error) {
    logger.error('AI', `Failed to generate activities for ${destination}`, error);
    throw error; // Don't fall back to defaults - propagate error
  }
}

// REMOVED: createDefaultVacationDays function
// We no longer provide default activities - always require real AI generation

/**
 * Main conversational generation function
 * Requires complete information - no defaults
 */
export async function generateConversationalItinerary(
  prompt: string,
  conversationHistory?: string
): Promise<GeneratePersonalizedItineraryOutput & { aiMessage?: string }> {
  const startTime = Date.now();
  logger.info('AI', '🤖 Starting conversational itinerary generation');

  try {
    // Step 1: Understand what the user wants
    const intent = await understandTripIntent(prompt, conversationHistory);

    // Step 2: Check if we have minimum required information
    if (!intent.location || !intent.duration) {
      const missing = [];
      if (!intent.location) missing.push('destination');
      if (!intent.duration) missing.push('duration');
      throw new Error(`Missing required information: ${missing.join(', ')}`);
    }

    const location = intent.location;
    const duration = intent.duration;
    const startDate = intent.startDate || 'flexible dates';
    const needsCoworking = intent.needsCoworking;

    logger.info('AI', 'Using parameters', {
      location,
      duration,
      startDate,
      tripType: intent.tripType,
      needsCoworking
    });

    // Step 3: Generate activities (vacation by default, with coworking only if requested)
    const activities = await generateVacationActivities(
      location,
      duration,
      needsCoworking
    );

    logger.info('AI', `Activities generated: ${activities.length} days`);

    // Step 4: Format the itinerary
    const formattedDays = activities.map((day: any, index: number) => {
      // Handle flexible dates or invalid date strings
      let dateString = 'TBD';
      if (startDate && startDate !== 'flexible dates' && startDate !== 'flexible') {
        try {
          const dayDate = new Date(startDate);
          if (!isNaN(dayDate.getTime())) {
            dayDate.setDate(dayDate.getDate() + index);
            dateString = dayDate.toISOString().split('T')[0];
          }
        } catch (e) {
          // Keep dateString as 'TBD' if date parsing fails
        }
      }

      return {
        day: index + 1,
        date: dateString,
        title: day.title || `Day ${index + 1}`,
        activities: (day.activities || []).map((activity: any) => ({
          time: activity.time || '9:00 AM',
          description: activity.description || 'Activity',
          category: activity.category || 'Attraction',
          venue_name: activity.venue_name,
          tips: activity.tips
          // address will be added by LocationIQ enrichment
       }))
      };
    });

    // Step 5: Try to estimate costs (optional)
    let costEstimate;
    try {
      const tripCostData = await estimateTripCost(
        'Your location',
        [{ city: location, days: duration }],
        1
      );

      if (tripCostData && tripCostData.totalEstimate) {
        // Calculate average daily expenses
        const dailyExpenses = 100; // Default daily expenses
        const totalFlights = tripCostData.flights.reduce((sum, flight) => sum + flight.price.economy, 0);
        const totalHotel = tripCostData.totalEstimate.midRange;
        const total = totalFlights + totalHotel + (dailyExpenses * duration);

        costEstimate = {
          total: Math.round(total),
          flights: Math.round(totalFlights),
          accommodation: Math.round(totalHotel),
          dailyExpenses: Math.round(dailyExpenses),
          currency: 'USD',
          breakdown: [
            { type: 'flight', description: 'Round-trip flights', amount: Math.round(totalFlights) },
            { type: 'hotel', description: `${duration} nights accommodation`, amount: Math.round(totalHotel) },
            { type: 'daily', description: 'Food and activities', amount: Math.round(dailyExpenses * duration) }
          ]
        };
      }
    } catch (error) {
      logger.warn('AI', 'Cost estimation failed, continuing without costs');
    }

    logger.info('AI', `Formatted days: ${formattedDays.length} days with activities`);
    logger.info('AI', `✅ Conversational generation completed in ${Date.now() - startTime}ms`);

    // Step 6: Create the result with conversational message
    const result: any = {
      destination: location,
      title: `${duration} Days in ${location}`,
      itinerary: formattedDays,
      quickTips: needsCoworking ? [
        'Research coworking spaces in advance',
        'Check wifi speeds at accommodations',
        'Plan work hours around time zones',
        'Book quiet accommodations for calls',
        'Find cafes with good wifi as backup'
      ] : [
        'Book accommodations in advance',
        'Check visa requirements',
        'Get travel insurance',
        'Download offline maps',
        'Keep digital copies of documents'
      ],
      aiMessage: intent.aiResponse // Add the conversational response
    };

    // Add cost estimate if available
    if (costEstimate) {
      result._costEstimate = costEstimate;
    }

    return result;

  } catch (error: any) {
    logger.error('AI', 'Conversational generation failed', error);

    // Don't provide defaults - throw error with helpful message
    throw new Error('Unable to generate itinerary. Please provide destination, dates, and duration.');
  }
}