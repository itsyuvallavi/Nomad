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
 * Parse relative date strings to actual dates
 */
function parseRelativeDate(dateStr: string): Date | null {
  if (!dateStr || dateStr === 'flexible' || dateStr === 'flexible dates') {
    return null;
  }

  const today = new Date();
  const lowercaseStr = dateStr.toLowerCase().trim();

  // Try parsing as a standard date first
  const standardDate = new Date(dateStr);
  if (!isNaN(standardDate.getTime()) && standardDate > new Date('2024-01-01')) {
    return standardDate;
  }

  // Handle relative date terms
  if (lowercaseStr.includes('tomorrow')) {
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    return tomorrow;
  }

  if (lowercaseStr.includes('next week') || lowercaseStr.includes('next monday')) {
    const nextMonday = new Date(today);
    const daysUntilMonday = (8 - today.getDay()) % 7 || 7;
    nextMonday.setDate(today.getDate() + daysUntilMonday);
    return nextMonday;
  }

  if (lowercaseStr.includes('next month')) {
    const nextMonth = new Date(today);
    nextMonth.setMonth(today.getMonth() + 1);
    nextMonth.setDate(1);
    return nextMonth;
  }

  if (lowercaseStr.includes('this weekend')) {
    const thisSaturday = new Date(today);
    const daysUntilSaturday = (6 - today.getDay() + 7) % 7 || 7;
    thisSaturday.setDate(today.getDate() + daysUntilSaturday);
    return thisSaturday;
  }

  // Try to extract date in YYYY-MM-DD format from the string
  const dateMatch = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (dateMatch) {
    const parsedDate = new Date(dateMatch[0]);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }

  return null;
}

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
      "title": "Day X: <theme>",
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
  days > 10 ? 'Include 3-4 activities per day. Be concise.' :
  'Include 5-6 activities per day mixing attractions, food, and culture.'}

IMPORTANT RULES:
- Return exactly ${days} days in the array
- DO NOT include duplicate activities (each activity must be unique)
- Each activity must have a unique description and venue_name
- EVERY day MUST have a "destination_city" field set to the correct city
${cities.length > 1 ? `- For multi-city trips, set destination_city to the actual city (e.g., "London" or "Paris", NOT "${destination}")
- Divide days evenly: ${cities.map((city, i) => {
  const startDay = Math.floor(i * days / cities.length) + 1;
  const endDay = Math.floor((i + 1) * days / cities.length);
  return `Days ${startDay}-${endDay}: set destination_city="${city}"`;
}).join(', ')}` : ''}`;

  try {
    if (!openai) {
      throw new Error('OpenAI client not configured');
    }

    // Combine system and user prompts for GPT-5 Responses API
    const systemPrompt = 'You are a travel planning assistant. Create realistic vacation itineraries with actual venue names. Always return a valid JSON object with a "days" array. Be concise to fit within token limits.';
    const fullPrompt = `${systemPrompt}\n\n${prompt}`;

    // Determine reasoning effort and verbosity based on trip complexity
    // For multi-city or long trips, use higher reasoning but lower verbosity
    const isMultiCity = cities.length > 1;
    const reasoningEffort = days > 20 || (isMultiCity && days > 10) ? 'medium' : days > 14 ? 'low' : 'minimal';
    const textVerbosity = days > 10 || isMultiCity ? 'low' : 'medium';

    // Use the Responses API for GPT-5
    const completion = await (openai as any).responses.create({
      model: 'gpt-5',
      input: fullPrompt,
      reasoning: {
        effort: reasoningEffort
      },
      text: {
        verbosity: textVerbosity
      }
    });

    // Extract content from Responses API format
    const content = completion.output_text || completion.output || '{"days":[]}';

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
  } catch (error: any) {
    logger.error('AI', `Failed to generate activities for ${destination}`, error);

    // Check if it's a token limit or API error
    if (error.message?.includes('max_tokens') || error.message?.includes('max_completion_tokens') ||
        error.code === 'invalid_value' || error.message?.includes('responses')) {
      // Parse the destination to provide helpful examples
      const isMultiCity = destination.includes(',') || destination.includes(' and ');
      const cityCount = destination.split(/,| and /).length;

      let suggestion = '';
      if (days > 14) {
        suggestion = `Try a shorter trip like "${destination} for ${Math.floor(days/2)} days"`;
      } else if (isMultiCity && cityCount > 3) {
        const firstTwoCities = destination.split(/,| and /).slice(0, 2).join(' and ');
        suggestion = `Try fewer cities like "${firstTwoCities} for ${days} days"`;
      } else if (days > 10 && isMultiCity) {
        suggestion = `Try either "${destination} for 7 days" or a single city for ${days} days`;
      } else {
        suggestion = `Try a simpler itinerary like "${destination.split(/,| and /)[0]} for 5 days"`;
      }

      throw new Error(
        `Your ${days}-day trip to ${destination} is too complex for me to generate in detail. ` +
        `${suggestion}. Alternatively, you can break it into smaller segments and plan each separately.`
      );
    }

    throw error; // Re-throw other errors
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

      // Use our relative date parser
      const parsedStartDate = parseRelativeDate(startDate);
      if (parsedStartDate) {
        const dayDate = new Date(parsedStartDate);
        dayDate.setDate(dayDate.getDate() + index);
        dateString = dayDate.toISOString().split('T')[0];
      }

      // Deduplicate activities based on description and time
      const uniqueActivities = new Map();
      (day.activities || []).forEach((activity: any) => {
        const key = `${activity.time}-${activity.description}`;
        if (!uniqueActivities.has(key)) {
          uniqueActivities.set(key, activity);
        } else {
          logger.warn('AI', `Duplicate activity removed: ${activity.description} at ${activity.time}`);
        }
      });

      return {
        day: index + 1,
        date: dateString,
        title: day.title || `Day ${index + 1}`,
        activities: Array.from(uniqueActivities.values()).map((activity: any) => ({
          time: activity.time || '9:00 AM',
          description: activity.description || 'Activity',
          category: activity.category || 'Attraction',
          venue_name: activity.venue_name,
          tips: activity.tips
          // address will be added by OSM enrichment
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