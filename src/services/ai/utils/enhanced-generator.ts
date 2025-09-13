/**
 * Enhanced itinerary generator that uses multiple APIs
 * - OpenAI/Gemini for structure and descriptions
 * - Google Places for real venues
 * - OpenWeatherMap for weather forecasts
 */

import OpenAI from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { logger } from '@/lib/logger';
import { getUnifiedActivities } from '@/lib/api/places-unified';
import { getWeatherForecast } from '@/lib/api/weather';
import type { GeneratePersonalizedItineraryOutput } from '@/services/ai/schemas';
import { parseDestinations } from '@/services/ai/utils/destination-parser';

// Initialize AI clients
let openai: OpenAI | null = null;
let gemini: GoogleGenerativeAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openai && process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 30000,
      maxRetries: 2,
    });
  }
  return openai!;
}

function getGeminiClient(): GoogleGenerativeAI {
  if (!gemini && process.env.GEMINI_API_KEY) {
    gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return gemini!;
}

/**
 * Check trip complexity and enforce limits
 */
export function validateTripComplexity(prompt: string): { valid: boolean; error?: string } {
  const parsed = parseDestinations(prompt);
  
  // Check for vague or undefined destinations
  const vagueTerms = ['exploring', 'traveling', 'visiting', 'touring', 'around', 'across'];
  const hasVagueDestination = vagueTerms.some(term => 
    prompt.toLowerCase().includes(term) && 
    (prompt.toLowerCase().includes('europe') || 
     prompt.toLowerCase().includes('asia') || 
     prompt.toLowerCase().includes('africa') || 
     prompt.toLowerCase().includes('america') ||
     prompt.toLowerCase().includes('world'))
  );
  
  if (hasVagueDestination && parsed.destinations.length === 0) {
    return {
      valid: false,
      error: 'Please specify which cities you\'d like to visit. For example: "London, Paris, and Rome for 2 weeks" instead of "exploring Europe"'
    };
  }
  
  // Check destination count (6+ cities will likely timeout)
  if (parsed.destinations.length > 5) {
    return {
      valid: false,
      error: `I can plan trips with up to 5 cities. You've requested ${parsed.destinations.length} destinations. Please select your top 5 cities to visit.`
    };
  }
  
  // Check total days
  if (parsed.totalDays > 30) {
    return {
      valid: false,
      error: `I can plan trips up to 30 days. For your ${parsed.totalDays}-day journey, please break it into smaller segments or reduce the duration.`
    };
  }
  
  // Check for extremely long trips with multiple cities (complexity score)
  // Allow up to 150 complexity points (e.g., 5 cities * 30 days = 150, or 6 cities * 25 days = 150)
  const complexityScore = parsed.destinations.length * parsed.totalDays;
  if (complexityScore > 150) {
    return {
      valid: false,
      error: `This trip is too complex for me to process efficiently. Try reducing either the number of cities (${parsed.destinations.length}) or the duration (${parsed.totalDays} days).`
    };
  }
  
  // Check for valid destinations
  if (parsed.destinations.length === 0) {
    return {
      valid: false,
      error: 'Please tell me where you\'d like to go! For example: "3 days in Paris" or "One week in Tokyo"'
    };
  }
  
  // Origin is now optional - removed the check
  // Users can plan trips without specifying departure location
  
  return { valid: true };
}

/**
 * Generate itinerary structure using AI (OpenAI with Gemini fallback)
 */
async function generateItineraryStructure(
  prompt: string,
  parsedTrip: ReturnType<typeof parseDestinations>
): Promise<any> {
  const systemPrompt = `Generate a ${parsedTrip.totalDays}-day travel itinerary for: ${parsedTrip.destinations.map(d => d.name).join(', ')}.

Return a JSON object with:
{
  "destination": "destination names",
  "title": "trip title",
  "itinerary": [
    {
      "day": 1,
      "date": "YYYY-MM-DD",
      "title": "Day title",
      "destination_city": "Current city name",
      "activities": [
        {
          "time": "HH:MM",
          "description": "Activity description", 
          "category": "Food|Leisure|Travel|Attraction",
          "venue_type": "restaurant|tourist_attraction|museum|park|lodging"
        }
      ]
    }
  ],
  "quickTips": ["tip1", "tip2", "tip3", "tip4", "tip5"]
}`;

  try {
    logger.info('AI', 'Attempting OpenAI generation');
    const openaiClient = getOpenAIClient();
    
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 4096,
      response_format: { type: 'json_object' },
    });
    
    const content = response.choices[0]?.message?.content || '{}';
    return JSON.parse(content);
  } catch (openAIError: any) {
    logger.warn('AI', 'OpenAI failed, trying Gemini fallback', { error: openAIError.message });
    
    // Fallback to Gemini
    try {
      const geminiClient = getGeminiClient();
      const model = geminiClient.getGenerativeModel({ model: 'gemini-pro' });
      
      const result = await model.generateContent(`${systemPrompt}\n\nUser request: ${prompt}`);
      const response = await result.response;
      const text = response.text();
      
      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('Gemini response did not contain valid JSON');
    } catch (geminiError: any) {
      logger.error('AI', 'Both OpenAI and Gemini failed', { 
        openAIError: openAIError.message,
        geminiError: geminiError.message 
      });
      throw new Error(`AI generation failed. OpenAI: ${openAIError.message}, Gemini: ${geminiError.message}`);
    }
  }
}

/**
 * Enhance itinerary with real venue data from Google Places
 */
async function enhanceWithRealVenues(itinerary: any): Promise<any> {
  logger.info('AI', 'Enhancing itinerary with real Google Places venues');
  
  for (const day of itinerary.itinerary) {
    const cityName = day.destination_city || itinerary.destination;
    
    for (const activity of day.activities) {
      // Skip travel activities
      if (activity.category === 'Travel') {
        activity.address = `Travel to/from ${cityName}`;
        continue;
      }
      
      // Determine search query and type based on activity
      let searchQuery = '';
      let placeType = '';
      
      if (activity.category === 'Food' || activity.venue_type === 'restaurant') {
        searchQuery = 'best restaurants';
        placeType = 'restaurant';
      } else if (activity.venue_type === 'museum' || activity.description?.toLowerCase().includes('museum')) {
        searchQuery = 'museum';
        placeType = 'museum';
      } else if (activity.venue_type === 'park' || activity.description?.toLowerCase().includes('park')) {
        searchQuery = 'park';
        placeType = 'park';
      } else if (activity.category === 'Attraction' || activity.category === 'Leisure') {
        searchQuery = 'tourist attractions';
        placeType = 'tourist_attraction';
      } else {
        searchQuery = 'points of interest';
        placeType = '';
      }
      
      try {
        // Search for venues using Unified Places API (Radar/Foursquare/Static)
        const activities = await getUnifiedActivities(cityName, searchQuery, 5);
        
        if (activities.length > 0) {
          const place = activities[0]; // Take the top result
          activity.venue_name = place.venue_name;
          activity.address = place.address;
          activity.rating = place.rating;
          activity.description = `${activity.description} - Visit ${place.venue_name}`;
          
          logger.info('AI', `Found venue via unified API: ${place.venue_name}`, { 
            city: cityName, 
            query: searchQuery,
            rating: place.rating,
            source: place.source
          });
        } else {
          // Fallback to generic address
          activity.address = `${cityName} city center`;
          logger.warn('AI', 'No venues found via unified API', { city: cityName, query: searchQuery });
        }
      } catch (error) {
        logger.error('AI', 'Unified places search failed', { error, city: cityName });
        activity.address = `${cityName} city center`;
      }
    }
  }
  
  return itinerary;
}

/**
 * Add weather forecast to itinerary
 */
async function addWeatherData(itinerary: any): Promise<any> {
  logger.info('AI', 'Adding weather forecasts');
  
  try {
    // Get unique cities
    const cities = new Set<string>();
    itinerary.itinerary.forEach((day: any) => {
      cities.add(day.destination_city || itinerary.destination);
    });
    
    // Get weather for each city
    const weatherData: Record<string, any[]> = {};
    
    for (const city of cities) {
      try {
        const forecast = await getWeatherForecast(city, 7); // Get 7-day forecast
        weatherData[city] = forecast;
        logger.info('AI', `Got weather for ${city}`, { days: forecast.length });
      } catch (error) {
        logger.warn('AI', `Failed to get weather for ${city}`, { error });
      }
    }
    
    // Add weather to each day
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
 * Main enhanced generation function
 */
export async function generateEnhancedItinerary(
  prompt: string,
  attachedFile?: string,
  conversationHistory?: string
): Promise<GeneratePersonalizedItineraryOutput> {
  const startTime = Date.now();
  
  logger.info('AI', 'Starting ENHANCED itinerary generation');
  
  // Validate complexity
  const validation = validateTripComplexity(prompt);
  if (!validation.valid) {
    throw new Error(validation.error);
  }
  
  // Parse destinations
  const parsedTrip = parseDestinations(prompt);
  logger.info('AI', 'Trip parsed', {
    destinations: parsedTrip.destinations.length,
    totalDays: parsedTrip.totalDays
  });
  
  // Generate base structure with AI
  let itinerary = await generateItineraryStructure(prompt, parsedTrip);
  
  // Enhance with real venues from Google Places
  if (process.env.GOOGLE_API_KEY) {
    itinerary = await enhanceWithRealVenues(itinerary);
  }
  
  // Add weather data
  if (process.env.OPENWEATHERMAP) {
    itinerary = await addWeatherData(itinerary);
  }
  
  const duration = Date.now() - startTime;
  logger.info('AI', '✅ Enhanced generation completed', {
    duration: `${duration}ms`,
    destinations: parsedTrip.destinations.length,
    totalDays: itinerary.itinerary.length,
    hasRealVenues: !!process.env.GEMINI_API_KEY,
    hasWeather: !!process.env.OPENWEATHERMAP
  });
  
  // Clean up the response to match schema
  const cleanedItinerary: GeneratePersonalizedItineraryOutput = {
    destination: itinerary.destination,
    title: itinerary.title,
    itinerary: itinerary.itinerary.map((day: any) => ({
      day: day.day,
      date: day.date,
      title: day.title,
      activities: day.activities.map((activity: any) => ({
        time: activity.time,
        description: activity.description,
        category: activity.category,
        address: activity.address || 'Location TBD'
      }))
    })),
    quickTips: itinerary.quickTips || []
  };
  
  return cleanedItinerary;
}