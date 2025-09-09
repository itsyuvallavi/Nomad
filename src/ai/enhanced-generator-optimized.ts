/**
 * Optimized Enhanced Itinerary Generator with parallel API calls and caching
 */

import { parseDestinations } from './utils/destination-parser';
import { searchGooglePlaces } from '@/lib/api/google-places';
import { getWeatherForecast } from '@/lib/api/weather';
import { logger } from '@/lib/logger';
import { openai } from './openai-config';
import type { GeneratePersonalizedItineraryOutput } from './flows/generate-personalized-itinerary';

// Cache for API responses to avoid duplicate calls
const apiCache = new Map<string, any>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached or fetch new data
 */
async function getCachedOrFetch<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = apiCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    logger.debug('AI', `Cache hit: ${key}`);
    return cached.data;
  }
  
  const data = await fetcher();
  apiCache.set(key, { data, timestamp: Date.now() });
  return data;
}

/**
 * Batch venue searches by city
 */
async function batchSearchVenues(
  itinerary: any
): Promise<Map<string, Map<string, any[]>>> {
  const venueSearches = new Map<string, Set<string>>();
  
  // Collect all unique searches needed
  itinerary.itinerary.forEach((day: any) => {
    const city = day.destination_city || itinerary.destination;
    if (!venueSearches.has(city)) {
      venueSearches.set(city, new Set());
    }
    
    day.activities.forEach((activity: any) => {
      const category = activity.category?.toLowerCase() || '';
      let searchType = '';
      
      if (category.includes('food') || category.includes('restaurant')) {
        searchType = 'restaurant';
      } else if (category.includes('museum')) {
        searchType = 'museum';
      } else if (category.includes('park') || category.includes('nature')) {
        searchType = 'park';
      } else if (category.includes('attraction') || category.includes('sights')) {
        searchType = 'tourist_attraction';
      }
      
      if (searchType) {
        venueSearches.get(city)!.add(searchType);
      }
    });
  });
  
  // Execute all searches in parallel
  const results = new Map<string, Map<string, any[]>>();
  const searchPromises: Promise<void>[] = [];
  
  for (const [city, types] of venueSearches.entries()) {
    results.set(city, new Map());
    
    for (const type of types) {
      const cacheKey = `places:${city}:${type}`;
      searchPromises.push(
        getCachedOrFetch(cacheKey, async () => {
          const query = type === 'restaurant' ? 'best restaurants' : 
                       type === 'museum' ? 'museum' :
                       type === 'park' ? 'park' : 'tourist attractions';
          return searchGooglePlaces(query, city, type);
        }).then(places => {
          results.get(city)!.set(type, places);
          if (places.length > 0) {
            logger.info('AI', `Batch found ${places.length} ${type}s in ${city}`);
          }
        }).catch(error => {
          logger.error('AI', `Batch search failed for ${type} in ${city}`, { error });
          results.get(city)!.set(type, []);
        })
      );
    }
  }
  
  await Promise.all(searchPromises);
  return results;
}

/**
 * Batch weather fetching for all cities
 */
async function batchFetchWeather(
  cities: Set<string>
): Promise<Map<string, any[]>> {
  const weatherData = new Map<string, any[]>();
  const weatherPromises: Promise<void>[] = [];
  
  for (const city of cities) {
    const cacheKey = `weather:${city}`;
    weatherPromises.push(
      getCachedOrFetch(cacheKey, () => getWeatherForecast(city, 7))
        .then(forecast => {
          weatherData.set(city, forecast);
          logger.info('AI', `Got weather for ${city}`, { days: forecast.length });
        })
        .catch(error => {
          logger.warn('AI', `Failed to get weather for ${city}`, { error });
          weatherData.set(city, []);
        })
    );
  }
  
  await Promise.all(weatherPromises);
  return weatherData;
}

/**
 * Apply venues to activities efficiently
 */
function applyVenuesToActivities(
  itinerary: any,
  venueResults: Map<string, Map<string, any[]>>
): void {
  const usedVenues = new Set<string>();
  
  itinerary.itinerary.forEach((day: any) => {
    const city = day.destination_city || itinerary.destination;
    const cityVenues = venueResults.get(city);
    
    if (!cityVenues) return;
    
    day.activities.forEach((activity: any) => {
      const category = activity.category?.toLowerCase() || '';
      let searchType = '';
      
      if (category.includes('food') || category.includes('restaurant')) {
        searchType = 'restaurant';
      } else if (category.includes('museum')) {
        searchType = 'museum';
      } else if (category.includes('park') || category.includes('nature')) {
        searchType = 'park';
      } else if (category.includes('attraction') || category.includes('sights')) {
        searchType = 'tourist_attraction';
      }
      
      if (searchType) {
        const venues = cityVenues.get(searchType) || [];
        
        // Find an unused venue or cycle through if all used
        let selectedVenue = null;
        for (const venue of venues) {
          const venueKey = `${city}:${venue.place_id}`;
          if (!usedVenues.has(venueKey)) {
            selectedVenue = venue;
            usedVenues.add(venueKey);
            break;
          }
        }
        
        // If all venues used, take the first one
        if (!selectedVenue && venues.length > 0) {
          selectedVenue = venues[Math.floor(Math.random() * Math.min(3, venues.length))];
        }
        
        if (selectedVenue) {
          activity.venue_name = selectedVenue.name;
          activity.address = selectedVenue.formatted_address;
          activity.rating = selectedVenue.rating;
          activity.description = `${activity.description} - Visit ${selectedVenue.name}`;
        }
      }
      
      // Fallback address
      if (!activity.address) {
        activity.address = `${city} city center`;
      }
    });
  });
}

/**
 * Apply weather data to days
 */
function applyWeatherToItinerary(
  itinerary: any,
  weatherData: Map<string, any[]>
): void {
  itinerary.itinerary.forEach((day: any, index: number) => {
    const cityName = day.destination_city || itinerary.destination;
    const cityWeather = weatherData.get(cityName);
    
    if (cityWeather && cityWeather[index % cityWeather.length]) {
      day.weather = {
        temp_high: cityWeather[index % cityWeather.length].temp.max,
        temp_low: cityWeather[index % cityWeather.length].temp.min,
        description: cityWeather[index % cityWeather.length].weather.description,
        precipitation_chance: cityWeather[index % cityWeather.length].pop
      };
    }
  });
}

/**
 * Validate trip complexity
 */
export function validateTripComplexity(prompt: string): { valid: boolean; error?: string } {
  const parsed = parseDestinations(prompt);
  
  if (parsed.destinations.length > 5) {
    return { 
      valid: false, 
      error: `Trip too complex: ${parsed.destinations.length} destinations exceeds maximum of 5` 
    };
  }
  
  if (parsed.totalDays > 30) {
    return { 
      valid: false, 
      error: `Trip too long: ${parsed.totalDays} days exceeds maximum of 30 days` 
    };
  }
  
  return { valid: true };
}

/**
 * Generate base itinerary structure with OpenAI
 */
async function generateItineraryStructure(prompt: string, parsedTrip: any): Promise<any> {
  logger.info('AI', 'Attempting OpenAI generation');
  
  const systemPrompt = `You are a travel planning assistant. Create a detailed day-by-day itinerary based on the user's request.
  
  Return a JSON object with this structure:
  {
    "destination": "Primary destination name",
    "title": "Trip title",
    "duration": "X days",
    "itinerary": [
      {
        "day": 1,
        "destination_city": "City name",
        "date": "Day 1",
        "title": "Day title",
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
    }
  }`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 16384
  });

  return JSON.parse(completion.choices[0].message.content || '{}');
}

/**
 * Main optimized generation function
 */
export async function generateEnhancedItinerary(
  prompt: string,
  attachedFile?: string,
  conversationHistory?: string
): Promise<GeneratePersonalizedItineraryOutput> {
  const startTime = Date.now();
  
  logger.info('AI', 'Starting OPTIMIZED itinerary generation');
  
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
  const itinerary = await generateItineraryStructure(prompt, parsedTrip);
  
  // Collect all cities for parallel processing
  const cities = new Set<string>();
  itinerary.itinerary.forEach((day: any) => {
    cities.add(day.destination_city || itinerary.destination);
  });
  
  // Execute all external API calls in parallel
  const [venueResults, weatherData] = await Promise.all([
    process.env.GOOGLE_API_KEY ? batchSearchVenues(itinerary) : Promise.resolve(new Map()),
    process.env.OPENWEATHERMAP ? batchFetchWeather(cities) : Promise.resolve(new Map())
  ]);
  
  // Apply results to itinerary
  if (venueResults.size > 0) {
    applyVenuesToActivities(itinerary, venueResults);
  }
  
  if (weatherData.size > 0) {
    applyWeatherToItinerary(itinerary, weatherData);
  }
  
  const duration = Date.now() - startTime;
  logger.info('AI', `✅ OPTIMIZED generation completed`, {
    duration: `${duration}ms`,
    destinations: parsedTrip.destinations.length,
    totalDays: parsedTrip.totalDays,
    hasRealVenues: venueResults.size > 0,
    hasWeather: weatherData.size > 0
  });
  
  return {
    origin: parsedTrip.origin || '',
    destination: itinerary.destination,
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + parsedTrip.totalDays * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    tripDuration: `${parsedTrip.totalDays} days`,
    title: itinerary.title,
    itinerary: itinerary.itinerary,
    packingSuggestions: itinerary.packing_suggestions || [],
    budgetEstimate: itinerary.budget_estimate || {},
    missingInfo: parsedTrip.origin ? [] : ['origin']
  };
}