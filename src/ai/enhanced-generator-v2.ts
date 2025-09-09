/**
 * Enhanced Itinerary Generator V2
 * Uses intelligent extraction for complex trips
 */

import { extractTripInfo, createStructuredPrompt } from './utils/intelligent-trip-extractor';
import { searchGooglePlaces } from '@/lib/api/google-places';
import { getWeatherForecast } from '@/lib/api/weather';
import { logger } from '@/lib/logger';
import { openai } from './openai-config';
import type { GeneratePersonalizedItineraryOutput } from './flows/generate-personalized-itinerary';

/**
 * Validate trip complexity
 */
export function validateTripComplexity(prompt: string): { valid: boolean; error?: string } {
  // Quick check for obvious issues
  const wordCount = prompt.split(' ').length;
  if (wordCount > 500) {
    return { 
      valid: false, 
      error: 'Trip description is too long. Please be more concise.' 
    };
  }
  
  return { valid: true };
}

/**
 * Generate itinerary structure using structured extraction
 */
async function generateItineraryWithStructuredPrompt(
  structuredPrompt: string,
  extractedInfo: any
): Promise<any> {
  logger.info('AI', 'Generating itinerary with structured prompt');
  
  const systemPrompt = `You are a travel planning assistant. Create a detailed day-by-day itinerary based on the structured trip information provided.
  
  Return a JSON object with this structure:
  {
    "destination": "Primary destination or 'Multi-City Trip'",
    "title": "Creative trip title",
    "duration": "X days",
    "itinerary": [
      {
        "day": 1,
        "destination_city": "City name",
        "date": "Day 1",
        "title": "Day title describing main activities",
        "theme": "Day theme",
        "activities": [
          {
            "time": "9:00 AM",
            "description": "Activity description",
            "category": "Category (Food/Sightseeing/Museum/Park/Shopping/Entertainment)",
            "duration": "2 hours",
            "tips": "Helpful tips"
          }
        ]
      }
    ],
    "packing_suggestions": ["item1", "item2"],
    "budget_estimate": {
      "accommodation": "$X per night",
      "food": "$X per day", 
      "activities": "$X per day",
      "total": "$X per person"
    },
    "quickTips": ["tip1", "tip2", "tip3"]
  }
  
  IMPORTANT:
  - Create exactly ${extractedInfo.totalDays} days of itinerary
  - Each destination should have the correct number of days as specified
  - Include 4-6 activities per day
  - Ensure each day has a unique title and theme`;

  const completion = await openai!.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: structuredPrompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 16384
  });

  return JSON.parse(completion.choices[0].message.content || '{}');
}

/**
 * Enhance itinerary with real venues
 */
async function enhanceWithRealVenues(itinerary: any): Promise<any> {
  if (!process.env.GOOGLE_API_KEY) {
    logger.warn('AI', 'Google Places API not configured');
    return itinerary;
  }
  
  logger.info('AI', 'Enhancing itinerary with real Google Places venues');
  
  // Process each day
  for (const day of itinerary.itinerary) {
    const cityName = day.destination_city || itinerary.destination;
    
    for (const activity of day.activities) {
      const category = activity.category?.toLowerCase() || '';
      let searchQuery = '';
      let placeType = '';
      
      if (category.includes('food') || category.includes('restaurant')) {
        searchQuery = 'best restaurants';
        placeType = 'restaurant';
      } else if (category.includes('museum')) {
        searchQuery = 'museum';
        placeType = 'museum';
      } else if (category.includes('park') || category.includes('nature')) {
        searchQuery = 'park';
        placeType = 'park';
      } else if (category.includes('attraction') || category.includes('sights')) {
        searchQuery = 'tourist attractions';
        placeType = 'tourist_attraction';
      }
      
      if (searchQuery) {
        try {
          const places = await searchGooglePlaces(searchQuery, cityName, placeType);
          if (places.length > 0) {
            const place = places[Math.floor(Math.random() * Math.min(3, places.length))];
            activity.venue_name = place.name;
            activity.address = place.formatted_address;
            activity.rating = place.rating;
          }
        } catch (error) {
          logger.debug('AI', 'Could not find venue', { city: cityName, category });
        }
      }
    }
  }
  
  return itinerary;
}

/**
 * Add weather data
 */
async function addWeatherData(itinerary: any): Promise<any> {
  if (!process.env.OPENWEATHERMAP) {
    return itinerary;
  }
  
  logger.info('AI', 'Adding weather forecasts');
  
  try {
    const cities = new Set<string>();
    itinerary.itinerary.forEach((day: any) => {
      cities.add(day.destination_city || itinerary.destination);
    });
    
    const weatherData: Record<string, any[]> = {};
    
    for (const city of cities) {
      try {
        const forecast = await getWeatherForecast(city, 7);
        weatherData[city] = forecast;
      } catch (error) {
        logger.debug('AI', `Weather unavailable for ${city}`);
      }
    }
    
    itinerary.itinerary.forEach((day: any, index: number) => {
      const cityName = day.destination_city || itinerary.destination;
      const cityWeather = weatherData[cityName];
      
      if (cityWeather && cityWeather[index % cityWeather.length]) {
        day.weather = {
          temp_high: cityWeather[index % cityWeather.length].temp.max,
          temp_low: cityWeather[index % cityWeather.length].temp.min,
          description: cityWeather[index % cityWeather.length].weather.description,
          precipitation_chance: cityWeather[index % cityWeather.length].pop
        };
      }
    });
  } catch (error) {
    logger.error('AI', 'Failed to add weather data', { error });
  }
  
  return itinerary;
}

/**
 * Main enhanced generation function V2
 */
export async function generateEnhancedItinerary(
  prompt: string,
  attachedFile?: string,
  conversationHistory?: string
): Promise<GeneratePersonalizedItineraryOutput> {
  const startTime = Date.now();
  
  logger.info('AI', 'Starting ENHANCED V2 itinerary generation');
  
  // Validate basic complexity
  const validation = validateTripComplexity(prompt);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  
  try {
    // Extract structured information from the prompt
    const extractedInfo = await extractTripInfo(prompt, true);
    logger.info('AI', 'Extracted trip structure', {
      destinations: extractedInfo.destinations.length,
      totalDays: extractedInfo.totalDays
    });
    
    // Validate extracted complexity
    if (extractedInfo.destinations.length > 5) {
      throw new Error(`Trip too complex: ${extractedInfo.destinations.length} destinations exceeds maximum of 5`);
    }
    
    if (extractedInfo.totalDays > 30) {
      throw new Error(`Trip too long: ${extractedInfo.totalDays} days exceeds maximum of 30 days`);
    }
    
    // Create structured prompt
    const structuredPrompt = createStructuredPrompt(extractedInfo);
    
    // Generate base itinerary with structured prompt
    let itinerary = await generateItineraryWithStructuredPrompt(structuredPrompt, extractedInfo);
    
    // Enhance with real venues and weather
    if (process.env.GOOGLE_API_KEY) {
      itinerary = await enhanceWithRealVenues(itinerary);
    }
    
    if (process.env.OPENWEATHERMAP) {
      itinerary = await addWeatherData(itinerary);
    }
    
    const duration = Date.now() - startTime;
    logger.info('AI', `✅ Enhanced V2 generation completed`, {
      duration: `${duration}ms`,
      destinations: extractedInfo.destinations.length,
      totalDays: extractedInfo.totalDays,
      hasRealVenues: !!process.env.GOOGLE_API_KEY,
      hasWeather: !!process.env.OPENWEATHERMAP
    });
    
    // Format response
    const startDate = extractedInfo.startDate || new Date().toISOString().split('T')[0];
    const endDate = new Date(Date.now() + extractedInfo.totalDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const result: any = {
      destination: itinerary.destination || 'Multi-City Trip',
      title: itinerary.title,
      itinerary: itinerary.itinerary,
      quickTips: itinerary.quickTips || []
    };
    
    // Add extended metadata
    result.origin = `${extractedInfo.origin.city}${extractedInfo.origin.country ? ', ' + extractedInfo.origin.country : ''}`;
    result.startDate = startDate;
    result.endDate = endDate;
    result.tripDuration = `${extractedInfo.totalDays} days`;
    result.packingSuggestions = itinerary.packing_suggestions || [];
    result.budgetEstimate = itinerary.budget_estimate || {};
    result.missingInfo = [];
    
    return result;
    
  } catch (error: any) {
    logger.error('AI', 'Enhanced V2 generation failed', { error: error.message });
    throw error;
  }
}