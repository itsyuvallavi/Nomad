/**
 * Ultra-Fast Enhanced Itinerary Generator
 * Optimized for maximum speed through parallelization and caching
 */

import { openai } from './openai-config';
import { searchGooglePlaces } from '@/lib/api/google-places';
import { getWeatherForecast } from '@/lib/api/weather';
import { estimateTripCost as estimateTripCostOpenAI, estimateFlightCost, estimateHotelCost } from '@/ai/utils/openai-travel-costs';
import { logger } from '@/lib/logger';
import type { GeneratePersonalizedItineraryOutput } from './flows/generate-personalized-itinerary';

// In-memory cache with TTL
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class SmartCache {
  private cache = new Map<string, CacheEntry<any>>();
  
  set<T>(key: string, data: T, ttlSeconds: number = 300): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlSeconds * 1000
    });
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  size(): number {
    return this.cache.size;
  }
}

const cache = new SmartCache();

// Popular destinations to pre-cache
const POPULAR_DESTINATIONS = [
  'London', 'Paris', 'Tokyo', 'New York', 'Dubai', 'Singapore', 
  'Rome', 'Barcelona', 'Amsterdam', 'Bangkok', 'Los Angeles',
  'San Francisco', 'Sydney', 'Melbourne', 'Berlin', 'Madrid'
];

// Common trip durations for pre-caching
const COMMON_DURATIONS = [3, 5, 7];

/**
 * Fast extraction using GPT-3.5-turbo with optimized prompt
 */
async function extractTripInfoFast(prompt: string): Promise<any> {
  const cacheKey = `extract:${prompt.substring(0, 100)}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    logger.debug('AI', 'Cache hit for extraction');
    return cached;
  }
  
  const startTime = Date.now();
  
  // Check if OpenAI is available
  if (!openai) {
    logger.warn('AI', 'OpenAI client not available, using regex extraction');
    return quickExtract(prompt);
  }
  
  // Minimal, focused prompt for faster processing
  const systemPrompt = `Extract trip as JSON. Rules: week=7, weekend=3, fortnight=14.
IMPORTANT: Include ALL mentioned cities as destinations, including first city if it's a destination (e.g., "visiting Athens, Santorini" means Athens is also a destination).
Output: {"origin":"city","destinations":[{"city":"name","days":N}],"totalDays":N}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Faster model
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1, // Lower = faster and more deterministic
      max_tokens: 500
    });
    
    const result = JSON.parse(completion.choices[0].message.content || '{}');
    cache.set(cacheKey, result, 600); // Cache for 10 minutes
    
    logger.info('AI', `Fast extraction completed in ${Date.now() - startTime}ms`);
    return result;
  } catch (error) {
    logger.error('AI', 'Fast extraction failed', { error });
    // Fallback to regex extraction
    return quickExtract(prompt);
  }
}

/**
 * Quick regex extraction as fallback
 */
function quickExtract(prompt: string): any {
  const destinations: any[] = [];
  const matches = prompt.matchAll(/(\d+)\s*(?:days?|weeks?)\s+in\s+([A-Z][a-z]+)/gi);
  
  for (const match of matches) {
    const days = match[1].includes('week') ? 7 : parseInt(match[1]);
    destinations.push({ city: match[2], days });
  }
  
  return {
    origin: prompt.match(/from\s+([A-Z][a-z]+)/i)?.[1] || 'Unknown',
    destinations,
    totalDays: destinations.reduce((sum, d) => sum + d.days, 0)
  };
}

/**
 * Parallel generation for each destination with optimized prompt
 */
async function generateDestinationChunk(
  destination: string,
  days: number,
  dayOffset: number
): Promise<any[]> {
  const cacheKey = `chunk:${destination}:${days}`;
  const cached = cache.get<any[]>(cacheKey);
  if (cached) {
    logger.debug('AI', `Cache hit for ${destination}`);
    return cached;
  }
  
  // Check if OpenAI is available
  if (!openai) {
    logger.error('AI', 'OpenAI client not available for chunk generation');
    throw new Error('OpenAI API key not configured');
  }
  
  // Clear prompt that ensures proper JSON generation
  const prompt = `Create a ${days}-day itinerary for ${destination}.
Return a JSON array with ${days} objects. Each day must have this exact structure:
{
  "day": ${dayOffset + 1} (incrementing),
  "destination_city": "${destination}",
  "title": "Descriptive day title",
  "theme": "Day's theme",
  "activities": [
    {
      "time": "9:00 AM",
      "description": "Specific activity description",
      "category": "Food|Museum|Park|Attraction|Shopping",
      "duration": "2 hours",
      "tips": "Helpful tips"
    }
  ]
}
Include exactly 5 activities per day with varied times and categories.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { 
        role: 'system', 
        content: 'You are a travel planner. Always return valid JSON arrays with the exact structure requested.' 
      },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.7,
    max_tokens: 3000 // Increased for more activities
  });
  
  try {
    const responseContent = completion.choices[0].message.content || '{"days":[]}';
    // Handle both array and object responses
    const parsed = JSON.parse(responseContent);
    const result = Array.isArray(parsed) ? parsed : (parsed.days || parsed.itinerary || []);
    
    if (Array.isArray(result) && result.length > 0) {
      cache.set(cacheKey, result, 1800); // Cache 30 minutes
      return result;
    }
    
    // Fallback if no valid data
    logger.warn('AI', `Invalid chunk response for ${destination}, creating fallback`);
    return createFallbackDays(destination, days, dayOffset);
  } catch (error) {
    logger.error('AI', `Failed to parse chunk for ${destination}`, { error });
    return createFallbackDays(destination, days, dayOffset);
  }
}

/**
 * Determine transportation method based on cities and geography
 */
function getTransportMethod(fromCity: string, toCity: string): { method: string; duration: string } {
  const from = fromCity.toLowerCase();
  const to = toCity.toLowerCase();
  
  // Log for debugging
  logger.debug('Transport', `Determining transport from ${fromCity} to ${toCity}`);
  
  // Island destinations require ferry or flight
  const islandCities = ['santorini', 'mykonos', 'crete', 'rhodes', 'corsica', 'sardinia', 'sicily', 'malta', 'ibiza', 'mallorca', 'gili'];
  const fromIsland = islandCities.some(island => from.includes(island));
  const toIsland = islandCities.some(island => to.includes(island));
  
  if (fromIsland || toIsland) {
    // Greek islands - ferry is primary
    if ((from.includes('athens') || from.includes('piraeus')) && (to.includes('santorini') || to.includes('mykonos') || to.includes('crete'))) {
      return { method: 'Ferry', duration: '5-8 hours' };
    }
    // Santorini to other Greek islands
    if (from.includes('santorini') && (to.includes('mykonos') || to.includes('crete'))) {
      return { method: 'High-Speed Ferry', duration: '2-3 hours' };
    }
    // Mykonos to other Greek islands
    if (from.includes('mykonos') && (to.includes('santorini') || to.includes('crete'))) {
      return { method: 'Ferry', duration: '3-5 hours' };
    }
    // Indonesia islands
    if ((from.includes('bali') || from.includes('lombok')) && (to.includes('gili') || to.includes('lombok'))) {
      return { method: 'High-Speed Ferry', duration: '2 hours' };
    }
    // Sicily from mainland Italy
    if ((from.includes('naples') || from.includes('rome')) && to.includes('sicily')) {
      return { method: 'Overnight Ferry', duration: '8-10 hours' };
    }
    // Default for island routes
    return { method: 'Ferry', duration: '3-6 hours' };
  }
  
  // Nordic/Scandinavian routes - often include ferries
  const nordicCities = ['stockholm', 'copenhagen', 'oslo', 'helsinki', 'bergen', 'gothenburg', 'turku'];
  const fromNordic = nordicCities.some(city => from.includes(city));
  const toNordic = nordicCities.some(city => to.includes(city));
  
  if (fromNordic && toNordic) {
    if ((from.includes('stockholm') && to.includes('helsinki')) || (from.includes('helsinki') && to.includes('stockholm'))) {
      return { method: 'Overnight Ferry', duration: '16 hours' };
    }
    if ((from.includes('copenhagen') && to.includes('oslo')) || (from.includes('oslo') && to.includes('copenhagen'))) {
      return { method: 'Overnight Ferry', duration: '7-8 hours' };
    }
    if ((from.includes('copenhagen') && to.includes('stockholm')) || (from.includes('stockholm') && to.includes('copenhagen'))) {
      return { method: 'Train', duration: '5 hours' };
    }
    if (from.includes('helsinki') && to.includes('oslo')) {
      return { method: 'Flight', duration: '2 hours' };
    }
  }
  
  // European cities - trains are common
  const europeanCities = ['london', 'paris', 'rome', 'barcelona', 'amsterdam', 'berlin', 'madrid', 'lisbon', 'porto', 'prague', 'vienna', 'budapest', 'brussels', 'zurich', 'milan', 'venice', 'florence'];
  const fromEurope = europeanCities.some(city => from.includes(city));
  const toEurope = europeanCities.some(city => to.includes(city));
  
  if (fromEurope && toEurope) {
    // Same country routes
    if (from.includes('lisbon') && to.includes('porto')) {
      return { method: 'High-Speed Train', duration: '2.5 hours' };
    }
    if (from.includes('madrid') && to.includes('barcelona')) {
      return { method: 'High-Speed Train (AVE)', duration: '2.5 hours' };
    }
    if (from.includes('paris') && to.includes('lyon')) {
      return { method: 'High-Speed Train (TGV)', duration: '2 hours' };
    }
    if (from.includes('rome') && (to.includes('florence') || to.includes('venice'))) {
      return { method: 'High-Speed Train', duration: '1.5-3 hours' };
    }
    if (from.includes('london') && to.includes('edinburgh')) {
      return { method: 'Train', duration: '4.5 hours' };
    }
    
    // Cross-border routes
    if ((from.includes('london') && to.includes('paris')) || (from.includes('paris') && to.includes('london'))) {
      return { method: 'Eurostar', duration: '2.5 hours' };
    }
    if ((from.includes('paris') && to.includes('amsterdam')) || (from.includes('amsterdam') && to.includes('paris'))) {
      return { method: 'Thalys', duration: '3.5 hours' };
    }
    if ((from.includes('amsterdam') && to.includes('berlin')) || (from.includes('berlin') && to.includes('amsterdam'))) {
      return { method: 'Train', duration: '6.5 hours' };
    }
    if ((from.includes('berlin') && to.includes('prague')) || (from.includes('prague') && to.includes('berlin'))) {
      return { method: 'Train', duration: '4.5 hours' };
    }
    if ((from.includes('prague') && to.includes('vienna')) || (from.includes('vienna') && to.includes('prague'))) {
      return { method: 'Train', duration: '4 hours' };
    }
    if ((from.includes('prague') && to.includes('budapest')) || (from.includes('budapest') && to.includes('prague'))) {
      return { method: 'Bus', duration: '7 hours' };
    }
    if ((from.includes('budapest') && to.includes('bucharest')) || (from.includes('bucharest') && to.includes('budapest'))) {
      return { method: 'Bus', duration: '12 hours' };
    }
    if ((from.includes('bucharest') && to.includes('sofia')) || (from.includes('sofia') && to.includes('bucharest'))) {
      return { method: 'Bus', duration: '7 hours' };
    }
    if ((from.includes('madrid') && to.includes('barcelona')) || (from.includes('barcelona') && to.includes('madrid'))) {
      return { method: 'AVE', duration: '2.5 hours' };
    }
    if ((from.includes('barcelona') && to.includes('valencia')) || (from.includes('valencia') && to.includes('barcelona'))) {
      return { method: 'Train', duration: '3 hours' };
    }
    if ((from.includes('valencia') && to.includes('seville')) || (from.includes('seville') && to.includes('valencia'))) {
      return { method: 'Train', duration: '4 hours' };
    }
    
    // Default European - be more specific
    return { method: 'Train', duration: '4-6 hours' };
  }
  
  // Asian cities
  const asianCities = ['tokyo', 'kyoto', 'osaka', 'hiroshima', 'bangkok', 'chiang mai', 'singapore', 'hong kong', 'seoul', 'shanghai', 'beijing', 'siem reap', 'phnom penh', 'ho chi minh', 'hanoi', 'jakarta', 'bali'];
  const fromAsia = asianCities.some(city => from.includes(city));
  const toAsia = asianCities.some(city => to.includes(city));
  
  if (fromAsia && toAsia) {
    // Japan - Shinkansen routes
    if ((from.includes('tokyo') && to.includes('kyoto')) || (from.includes('kyoto') && to.includes('tokyo'))) {
      return { method: 'Shinkansen', duration: '2 hours 15 minutes' };
    }
    if ((from.includes('tokyo') && to.includes('osaka')) || (from.includes('osaka') && to.includes('tokyo'))) {
      return { method: 'Shinkansen', duration: '2 hours 30 minutes' };
    }
    if ((from.includes('tokyo') && to.includes('hiroshima')) || (from.includes('hiroshima') && to.includes('tokyo'))) {
      return { method: 'Shinkansen', duration: '4 hours' };
    }
    if ((from.includes('kyoto') && to.includes('osaka')) || (from.includes('osaka') && to.includes('kyoto'))) {
      return { method: 'Train', duration: '30 minutes' };
    }
    if ((from.includes('osaka') && to.includes('hiroshima')) || (from.includes('hiroshima') && to.includes('osaka'))) {
      return { method: 'Shinkansen', duration: '1 hour 30 minutes' };
    }
    
    // Southeast Asia routes
    if (from.includes('bangkok') && to.includes('chiang mai')) {
      return { method: 'Bus', duration: '10 hours' };
    }
    if (from.includes('chiang mai') && to.includes('siem reap')) {
      return { method: 'Flight', duration: '2 hours' };
    }
    if (from.includes('bangkok') && to.includes('siem reap')) {
      return { method: 'Bus', duration: '8-9 hours' };
    }
    if (from.includes('siem reap') && to.includes('phnom penh')) {
      return { method: 'Bus', duration: '6 hours' };
    }
    if ((from.includes('phnom penh') && to.includes('ho chi minh')) || (from.includes('ho chi minh') && to.includes('phnom penh'))) {
      return { method: 'Bus', duration: '6-7 hours' };
    }
    if (from.includes('jakarta') && to.includes('bali')) {
      return { method: 'Flight', duration: '2 hours' };
    }
    
    // Default Asia
    return { method: 'Flight', duration: '2-5 hours' };
  }
  
  // Americas
  const americanCities = ['new york', 'los angeles', 'san francisco', 'chicago', 'miami', 'boston', 'seattle', 'mexico city', 'cancun'];
  const fromAmerica = americanCities.some(city => from.includes(city));
  const toAmerica = americanCities.some(city => to.includes(city));
  
  if (fromAmerica && toAmerica) {
    // US East Coast
    if ((from.includes('new york') && to.includes('boston')) || (from.includes('boston') && to.includes('new york'))) {
      return { method: 'Amtrak Train or Bus', duration: '4-5 hours' };
    }
    if ((from.includes('new york') && to.includes('washington')) || (from.includes('washington') && to.includes('new york'))) {
      return { method: 'Amtrak Acela Train', duration: '3 hours' };
    }
    // Most US routes need flights
    return { method: 'Flight', duration: '2-5 hours' };
  }
  
  // Default to flight for international or unknown routes
  return { method: 'Flight', duration: '2-8 hours' };
}

/**
 * Create fallback days if generation fails
 */
function createFallbackDays(destination: string, days: number, dayOffset: number): any[] {
  const result = [];
  for (let i = 0; i < days; i++) {
    result.push({
      day: dayOffset + i + 1,
      destination_city: destination,
      title: `Day ${dayOffset + i + 1} in ${destination}`,
      theme: 'Exploration',
      activities: [
        {
          time: '9:00 AM',
          description: 'Breakfast at local cafe',
          category: 'Food',
          duration: '1 hour',
          tips: 'Try local specialties'
        },
        {
          time: '10:30 AM',
          description: 'Visit main attraction',
          category: 'Attraction',
          duration: '2 hours',
          tips: 'Book tickets in advance'
        },
        {
          time: '1:00 PM',
          description: 'Lunch at recommended restaurant',
          category: 'Food',
          duration: '1.5 hours',
          tips: 'Make reservations'
        },
        {
          time: '3:00 PM',
          description: 'Explore local area',
          category: 'Attraction',
          duration: '2 hours',
          tips: 'Wear comfortable shoes'
        },
        {
          time: '6:30 PM',
          description: 'Dinner and evening activities',
          category: 'Food',
          duration: '2 hours',
          tips: 'Enjoy local cuisine'
        }
      ]
    });
  }
  return result;
}

/**
 * Batch fetch venues for all activities
 */
async function batchFetchVenues(
  destinations: string[],
  categories: string[]
): Promise<Map<string, any[]>> {
  const venueMap = new Map<string, any[]>();
  const fetchPromises: Promise<void>[] = [];
  
  for (const dest of destinations) {
    for (const cat of categories) {
      const cacheKey = `venues:${dest}:${cat}`;
      const cached = cache.get<any[]>(cacheKey);
      
      if (cached) {
        venueMap.set(`${dest}:${cat}`, cached);
      } else {
        fetchPromises.push(
          searchGooglePlaces(cat, dest, cat)
            .then(places => {
              venueMap.set(`${dest}:${cat}`, places);
              cache.set(cacheKey, places, 3600); // Cache 1 hour
            })
            .catch(() => {
              venueMap.set(`${dest}:${cat}`, []);
            })
        );
      }
    }
  }
  
  await Promise.all(fetchPromises);
  return venueMap;
}

/**
 * Batch fetch weather for all destinations
 */
async function batchFetchWeather(
  destinations: string[]
): Promise<Map<string, any[]>> {
  const weatherMap = new Map<string, any[]>();
  const fetchPromises: Promise<void>[] = [];
  
  for (const dest of destinations) {
    const cacheKey = `weather:${dest}`;
    const cached = cache.get<any[]>(cacheKey);
    
    if (cached) {
      weatherMap.set(dest, cached);
    } else {
      fetchPromises.push(
        getWeatherForecast(dest, 7)
          .then(forecast => {
            weatherMap.set(dest, forecast);
            cache.set(cacheKey, forecast, 1800); // Cache 30 min
          })
          .catch(() => {
            weatherMap.set(dest, []);
          })
      );
    }
  }
  
  await Promise.all(fetchPromises);
  return weatherMap;
}

/**
 * Batch fetch flights for all routes using OpenAI
 */
async function batchFetchFlights(
  destinations: Array<{ city: string; days: number }>,
  origin: string,
  startDate: string
): Promise<Map<string, any>> {
  const flightMap = new Map<string, any>();
  const fetchPromises: Promise<void>[] = [];
  
  // Fetch origin to first destination if origin exists
  if (origin && origin !== 'Unknown' && destinations.length > 0) {
    const route = `${origin}-${destinations[0].city}`;
    const cacheKey = `flight:${route}:openai`;
    const cached = cache.get<any>(cacheKey);
    
    if (cached) {
      flightMap.set(route, cached);
    } else {
      fetchPromises.push(
        estimateFlightCost(origin, destinations[0].city, 'next month')
          .then(estimate => {
            const flightData = [{
              price: { total: estimate.price.economy, perPerson: estimate.price.economy },
              airline: estimate.airlines[0] || 'Major Airline',
              duration: estimate.duration,
              id: 'openai-estimate'
            }];
            flightMap.set(route, flightData);
            cache.set(cacheKey, flightData, 3600); // Cache 1 hour
          })
          .catch(() => {
            flightMap.set(route, []);
          })
      );
    }
  }
  
  // Fetch flights between destinations
  for (let i = 0; i < destinations.length - 1; i++) {
    const route = `${destinations[i].city}-${destinations[i + 1].city}`;
    const cacheKey = `flight:${route}:openai`;
    const cached = cache.get<any>(cacheKey);
    
    if (cached) {
      flightMap.set(route, cached);
    } else {
      fetchPromises.push(
        estimateFlightCost(destinations[i].city, destinations[i + 1].city, 'next month')
          .then(estimate => {
            const flightData = [{
              price: { total: estimate.price.economy, perPerson: estimate.price.economy },
              airline: estimate.airlines[0] || 'Major Airline',
              duration: estimate.duration,
              id: 'openai-estimate'
            }];
            flightMap.set(route, flightData);
            cache.set(cacheKey, flightData, 3600);
          })
          .catch(() => {
            flightMap.set(route, []);
          })
      );
    }
  }
  
  // Add return flight
  if (origin && origin !== 'Unknown' && destinations.length > 0) {
    const lastDest = destinations[destinations.length - 1];
    const route = `${lastDest.city}-${origin}`;
    const cacheKey = `flight:${route}:openai`;
    const cached = cache.get<any>(cacheKey);
    
    if (cached) {
      flightMap.set(route, cached);
    } else {
      fetchPromises.push(
        estimateFlightCost(lastDest.city, origin, 'next month')
          .then(estimate => {
            const flightData = [{
              price: { total: estimate.price.economy, perPerson: estimate.price.economy },
              airline: estimate.airlines[0] || 'Major Airline',
              duration: estimate.duration,
              id: 'openai-estimate'
            }];
            flightMap.set(route, flightData);
            cache.set(cacheKey, flightData, 3600);
          })
          .catch(() => {
            flightMap.set(route, []);
          })
      );
    }
  }
  
  await Promise.all(fetchPromises);
  return flightMap;
}

/**
 * Batch fetch hotels for all destinations using OpenAI
 */
async function batchFetchHotels(
  destinations: Array<{ city: string; days: number }>,
  startDate: string
): Promise<Map<string, any>> {
  const hotelMap = new Map<string, any>();
  const fetchPromises: Promise<void>[] = [];
  
  for (const dest of destinations) {
    const cacheKey = `hotels:${dest.city}:openai`;
    const cached = cache.get<any>(cacheKey);
    
    if (cached) {
      hotelMap.set(dest.city, cached);
    } else {
      fetchPromises.push(
        estimateHotelCost(dest.city, dest.days)
          .then(estimate => {
            const hotelData = [{
              name: `Quality Hotel in ${dest.city}`,
              price: estimate.pricePerNight.midRange,
              rating: 4.2,
              address: estimate.recommendedAreas[0] || `${dest.city} city center`,
              id: 'openai-estimate'
            }];
            hotelMap.set(dest.city, hotelData);
            cache.set(cacheKey, hotelData, 3600); // Cache 1 hour
          })
          .catch(() => {
            hotelMap.set(dest.city, []);
          })
      );
    }
  }
  
  await Promise.all(fetchPromises);
  return hotelMap;
}

/**
 * Main ultra-fast generation function
 */
export async function generateUltraFastItinerary(
  prompt: string,
  _attachedFile?: string,
  _conversationHistory?: string
): Promise<GeneratePersonalizedItineraryOutput> {
  const startTime = Date.now();
  logger.info('AI', '🚀 Starting ULTRA-FAST itinerary generation');
  
  try {
    // Step 1: Extract trip info (2-3s with GPT-3.5)
    const extracted = await extractTripInfoFast(prompt);
    const destinations = extracted.destinations || [];
    
    if (destinations.length === 0) {
      throw new Error('No destinations found in prompt');
    }
    
    logger.info('AI', `Extracted ${destinations.length} destinations in ${Date.now() - startTime}ms`);
    
    // Step 2: Start ALL parallel operations
    const parallelStart = Date.now();
    
    // Calculate trip dates
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 30); // Default to 30 days from now
    const tripStartDate = startDate.toISOString().split('T')[0];
    
    const [
      itineraryChunks,
      venueMap,
      weatherMap,
      flightData,
      hotelData,
      tripCostEstimate
    ] = await Promise.all([
      // Generate all destination chunks in parallel
      Promise.all(
        destinations.map((dest: any, index: number) => {
          const dayOffset = destinations
            .slice(0, index)
            .reduce((sum: number, d: any) => sum + d.days, 0);
          return generateDestinationChunk(dest.city, dest.days, dayOffset);
        })
      ),
      
      // Fetch venues in parallel (if API key exists)
      process.env.GOOGLE_API_KEY 
        ? batchFetchVenues(
            destinations.map((d: any) => d.city),
            ['restaurant', 'tourist_attraction', 'museum', 'park', 'cafe', 'shopping_mall', 'art_gallery']
          )
        : Promise.resolve(new Map()),
      
      // Fetch weather in parallel (if API key exists)
      process.env.OPENWEATHERMAP
        ? batchFetchWeather(destinations.map((d: any) => d.city))
        : Promise.resolve(new Map()),
      
      // Fetch flight data for routes using OpenAI
      batchFetchFlights(destinations, extracted.origin, tripStartDate),
      
      // Fetch hotel data for each destination using OpenAI
      batchFetchHotels(destinations, tripStartDate),
      
      // Estimate total trip cost using OpenAI
      estimateTripCostOpenAI(extracted.origin || 'Unknown', destinations, 1)
        .then(result => ({
          total: result.totalEstimate.midRange,
          flights: result.flights.reduce((sum, f) => sum + (f.price?.economy || 0), 0),
          accommodation: destinations.reduce((sum, d, i) => 
            sum + (result.hotels[d.city]?.pricePerNight?.midRange || 200) * d.days, 0),
          dailyExpenses: destinations.reduce((sum, d) => sum + (100 * d.days), 0),
          currency: 'USD',
          breakdown: [
            ...result.flights.map(f => ({
              type: 'flight',
              description: `${f.origin} → ${f.destination}`,
              amount: f.price?.economy || 0
            })),
            ...destinations.map(d => ({
              type: 'accommodation',
              description: `${d.city} (${d.days} nights)`,
              amount: (result.hotels[d.city]?.pricePerNight?.midRange || 200) * d.days
            }))
          ]
        }))
        .catch(() => null)
    ]);
    
    logger.info('AI', `Parallel operations completed in ${Date.now() - parallelStart}ms`);
    
    // Step 3: Combine all chunks into single itinerary with transportation
    let allDays: any[] = [];
    
    // Add initial transportation day from origin if specified
    if (extracted.origin && extracted.origin !== 'Unknown' && destinations.length > 0) {
      const originCity = extracted.origin;
      const firstDestination = destinations[0].city;
      
      // Only add if origin is different from first destination
      if (originCity.toLowerCase() !== firstDestination.toLowerCase()) {
        const transport = getTransportMethod(originCity, firstDestination);
        
        // Get flight data if available
        const route = `${originCity}-${firstDestination}`;
        const flights = flightData.get(route) || [];
        const cheapestFlight = flights.length > 0 
          ? flights.reduce((min: any, f: any) => f.price.total < min.price.total ? f : min, flights[0])
          : null;
        
        const originTransportDay = {
          day: 1,
          destination_city: `Travel Day`,
          title: `${originCity} → ${firstDestination}`,
          theme: 'Transportation',
          _flightPrice: cheapestFlight?.price?.total || null,
          _flightCurrency: cheapestFlight?.price?.currency || 'USD',
          activities: [
            {
              time: '8:00 AM',
              description: `Departure from ${originCity}`,
              category: 'Travel',
              duration: '1 hour',
              tips: `Head to ${transport.method.includes('Train') ? 'train station' : 'airport'}`
            },
            {
              time: '10:00 AM',
              description: `${transport.method} to ${firstDestination}`,
              category: 'Travel',
              duration: transport.duration,
              tips: transport.method.includes('Flight') ? 'Check in online 24h before' : 'Book seats in advance'
            },
            {
              time: '3:00 PM',
              description: `Arrival in ${firstDestination}`,
              category: 'Travel',
              duration: '1 hour',
              tips: 'Transfer to accommodation'
            },
            {
              time: '5:00 PM',
              description: `Hotel check-in`,
              category: 'Accommodation',
              duration: '1 hour',
              tips: 'Get settled and oriented'
            },
            {
              time: '7:00 PM',
              description: `Welcome dinner`,
              category: 'Food',
              duration: '2 hours',
              tips: `First meal in ${firstDestination}`
            }
          ]
        };
        allDays.push(originTransportDay);
      }
    }
    
    // Add transportation between cities for multi-city trips
    if (destinations.length > 1) {
      itineraryChunks.forEach((chunk, chunkIndex) => {
        // Adjust day numbers if we added an origin transport day
        const dayOffset = allDays.length;
        const adjustedChunk = chunk.map((day: any) => ({
          ...day,
          day: day.day + dayOffset
        }));
        
        // Add the destination's days
        allDays = allDays.concat(adjustedChunk);
        
        // Add transportation day between cities (except after last city)
        if (chunkIndex < itineraryChunks.length - 1) {
          const currentCity = destinations[chunkIndex].city;
          const nextCity = destinations[chunkIndex + 1].city;
          const travelDay = allDays.length + 1;
          
          // Determine transportation method
          const transport = getTransportMethod(currentCity, nextCity);
          
          // Create transportation day with clear, non-redundant activities
          const transportDay = {
            day: travelDay,
            destination_city: `Travel Day`,
            title: `${currentCity} → ${nextCity}`,
            theme: 'Transportation',
            activities: [
              {
                time: '8:00 AM',
                description: `Check out and pack`,
                category: 'Accommodation',
                duration: '1 hour',
                tips: `Leave ${currentCity} accommodation`
              },
              {
                time: '10:00 AM',
                description: `Depart for ${transport.method.includes('Train') ? 'train station' : 'airport'}`,
                category: 'Travel',
                duration: '1 hour',
                tips: 'Account for traffic and check-in time'
              },
              {
                time: '12:00 PM',
                description: `${transport.method}`,
                category: 'Travel',
                duration: transport.duration,
                tips: `${currentCity} to ${nextCity} - ${transport.method.includes('Flight') ? 'Remember to check in online' : 'Seat reservations recommended'}`
              },
              {
                time: '4:00 PM',
                description: `Arrival and transfer`,
                category: 'Travel',
                duration: '1 hour',
                tips: `Arrive in ${nextCity}, head to accommodation`
              },
              {
                time: '6:00 PM',
                description: `Hotel check-in`,
                category: 'Accommodation',
                duration: '1 hour',
                tips: 'Get settled and oriented with the area'
              },
              {
                time: '7:30 PM',
                description: `Welcome dinner`,
                category: 'Food',
                duration: '2 hours',
                tips: `First meal in ${nextCity} - try something local`
              }
            ]
          };
          
          allDays.push(transportDay);
          
          // No need to adjust - will renumber all days at the end
        }
      });
    } else {
      // Single destination - just add the days (origin transport already handled above)
      const dayOffset = allDays.length;
      const adjustedChunk = itineraryChunks.flat().map((day: any) => ({
        ...day,
        day: day.day + dayOffset
      }));
      allDays = allDays.concat(adjustedChunk);
      
      // Add return flight day for single-destination trips
      if (extracted.origin && extracted.origin !== 'Unknown' && destinations.length === 1) {
        const returnDay = allDays.length + 1;
        const destinationCity = destinations[0].city;
        
        const returnFlightDay = {
          day: returnDay,
          destination_city: `Travel Day`,
          title: `${destinationCity} → ${extracted.origin}`,
          theme: 'Transportation',
          activities: [
            {
              time: '8:00 AM',
              description: `Check out and pack`,
              category: 'Accommodation',
              duration: '1 hour',
              tips: `Leave ${destinationCity} accommodation`
            },
            {
              time: '10:00 AM',
              description: `Depart for airport`,
              category: 'Travel',
              duration: '1 hour',
              tips: `Head to ${destinationCity} airport`
            },
            {
              time: '12:00 PM',
              description: `Return flight to ${extracted.origin}`,
              category: 'Travel',
              duration: '10 hours',
              tips: `${destinationCity} to ${extracted.origin}`
            },
            {
              time: '10:00 PM',
              description: `Arrival back home`,
              category: 'Travel',
              duration: '30 minutes',
              tips: `Arrive in ${extracted.origin}`
            }
          ]
        };
        allDays.push(returnFlightDay);
      }
    }
    
    // Step 4: Enhance with real data (already fetched)
    // Track used venues to ensure diversity
    const usedVenues = new Map<string, Set<string>>();
    
    allDays.forEach((day: any) => {
      // For Travel Days, extract the actual destination city from the title
      let city = day.destination_city;
      if (city === 'Travel Day' && day.title) {
        // Extract destination from title like "London → Paris"
        const match = day.title.match(/→\s*(.+)$/);
        if (match) {
          city = match[1].trim();
        } else {
          // For origin travel day like "LA → London", use origin city
          const originMatch = day.title.match(/^(.+)\s*→/);
          if (originMatch) {
            city = originMatch[1].trim();
          }
        }
      }
      
      // Add weather
      const weather = weatherMap.get(city);
      if (weather && weather[day.day % 7]) {
        day.weather = {
          temp_high: weather[day.day % 7].temp.max,
          temp_low: weather[day.day % 7].temp.min,
          description: weather[day.day % 7].weather.description
        };
      }
      
      // Initialize city's used venues set if not exists
      if (!usedVenues.has(city)) {
        usedVenues.set(city, new Set<string>());
      }
      const cityUsedVenues = usedVenues.get(city)!;
      
      // Add venues to activities with diversity
      day.activities?.forEach((activity: any, activityIndex: number) => {
        const activityDesc = (activity.description || '').toLowerCase();
        const category = activity.category?.toLowerCase() || '';
        let venueType = '';
        
        // Skip departure/arrival/flight activities completely
        if (activityDesc.includes('departure from') || 
            activityDesc.includes('arrival in') ||
            activityDesc.includes('flight to') ||
            activityDesc.includes('fly to') ||
            activityDesc.includes('depart for') ||
            activityDesc.includes('arrival and transfer')) {
          // Don't search for venues for these activities
          return;
        }
        
        // More comprehensive matching based on activity description and category
        if (activityDesc.includes('cafe') || activityDesc.includes('coffee') || 
            activityDesc.includes('tea') || activityDesc.includes('pastry')) {
          venueType = 'cafe';
        } else if (category.includes('food') || activityDesc.includes('restaurant') || 
            activityDesc.includes('breakfast') || activityDesc.includes('lunch') || 
            activityDesc.includes('dinner') || activityDesc.includes('meal') ||
            activityDesc.includes('eat') || activityDesc.includes('dine')) {
          venueType = 'restaurant';
        } else if (activityDesc.includes('gallery') || activityDesc.includes('art')) {
          venueType = 'art_gallery';
        } else if (activityDesc.includes('museum') || activityDesc.includes('exhibition')) {
          venueType = 'museum';
        } else if (activityDesc.includes('shopping') || activityDesc.includes('shop') || 
                   activityDesc.includes('mall') || activityDesc.includes('boutique')) {
          venueType = 'shopping_mall';
        } else if (activityDesc.includes('park') || activityDesc.includes('garden') || 
                   activityDesc.includes('nature')) {
          venueType = 'park';
        } else if (category.includes('attraction') || activityDesc.includes('visit') || 
                   activityDesc.includes('explore') || activityDesc.includes('tour') ||
                   activityDesc.includes('landmark') || activityDesc.includes('monument') ||
                   activityDesc.includes('cathedral') || activityDesc.includes('palace') ||
                   activityDesc.includes('castle') || activityDesc.includes('bridge') ||
                   activityDesc.includes('square') || activityDesc.includes('market') ||
                   activityDesc.includes('church') || activityDesc.includes('temple')) {
          venueType = 'tourist_attraction';
        } else if (category.includes('accommodation') || activityDesc.includes('hotel') ||
                   activityDesc.includes('check-in') || activityDesc.includes('check in') ||
                   activityDesc.includes('check out')) {
          // Skip hotel/accommodation activities as they don't need venue search
          venueType = '';
        } else if (category.includes('travel') || category.includes('transport')) {
          // Skip pure travel activities
          venueType = '';
        } else if (category.includes('leisure') || activityDesc.includes('relax')) {
          venueType = 'park';  // Default leisure to parks
        } else {
          // Default to tourist attraction for general activities
          venueType = 'tourist_attraction';
        }
        
        if (venueType && city !== 'Travel Day' && city !== 'LA' && city !== 'Los Angeles') {
          const venues = venueMap.get(`${city}:${venueType}`) || [];
          if (venues.length > 0) {
            // Try to find an unused venue
            let selectedVenue = null;
            
            // First pass: try to find unused venue
            for (const venue of venues) {
              if (!cityUsedVenues.has(venue.place_id)) {
                selectedVenue = venue;
                cityUsedVenues.add(venue.place_id);
                break;
              }
            }
            
            // Second pass: if all venues used, pick the least recently used
            if (!selectedVenue) {
              // Use index-based selection to ensure variety even when recycling
              const venueIndex = (day.day - 1 + activityIndex) % venues.length;
              selectedVenue = venues[venueIndex];
            }
            
            if (selectedVenue) {
              activity.venue_name = selectedVenue.name;
              activity.address = selectedVenue.formatted_address;
              activity.rating = selectedVenue.rating;
            }
          }
        }
      });
    });
    
    // Step 5: Generate metadata in parallel with chunk generation
    // Account for transportation days
    const actualTotalDays = allDays.length;
    const title = destinations.length > 1 
      ? `${actualTotalDays}-Day Multi-City Adventure`
      : `${actualTotalDays} Days in ${destinations[0].city}`;
    
    const totalTime = Date.now() - startTime;
    logger.info('AI', `✅ ULTRA-FAST generation completed in ${totalTime}ms`);
    
    // Format days to match schema and preserve destination metadata
    // Ensure sequential day numbering
    const formattedDays = allDays.map((day: any, index: number) => {
      // Determine the actual city for this day
      let actualCity = day.destination_city;
      if (actualCity === 'Travel Day' && day.title) {
        // Extract destination from title like "London → Paris"
        const match = day.title.match(/→\s*(.+)$/);
        if (match) {
          actualCity = match[1].trim();
        } else {
          // Fallback: look for origin in title
          const originMatch = day.title.match(/^(.+)\s*→/);
          if (originMatch) {
            actualCity = originMatch[1].trim();
          }
        }
      }
      
      return {
        day: index + 1, // Always use sequential numbering
        date: new Date(Date.now() + index * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        title: day.title || `Day ${index + 1}`,
        _destination: day.destination_city, // Preserve city metadata for UI grouping
        activities: (day.activities || []).map((activity: any) => ({
          time: activity.time || '9:00 AM',
          description: activity.description || 'Activity',
          category: mapToValidCategory(activity.category),
          address: activity.address || activity.tips || `${actualCity} area`,
          venue_name: activity.venue_name,
          rating: activity.rating,
          _tips: activity.tips // Preserve tips as metadata
        }))
      };
    });
    
    // Create a proper destination string listing all cities
    const destinationString = destinations.length > 1 
      ? destinations.map((d: any) => d.city).join(', ')
      : destinations[0].city;
    
    return {
      destination: destinationString,
      title,
      itinerary: formattedDays,
      quickTips: generateQuickTips(destinations),
      _costEstimate: tripCostEstimate ? {
        total: Math.round(tripCostEstimate.total),
        flights: Math.round(tripCostEstimate.flights),
        accommodation: Math.round(tripCostEstimate.accommodation),
        dailyExpenses: Math.round(tripCostEstimate.dailyExpenses),
        currency: tripCostEstimate.currency,
        breakdown: tripCostEstimate.breakdown.map((item: any) => ({
          ...item,
          amount: Math.round(item.amount)
        }))
      } : null,
      _hotelOptions: hotelData,
      _flightOptions: flightData
    };
    
  } catch (error: any) {
    logger.error('AI', 'Ultra-fast generation failed', { error: error.message });
    throw error;
  }
}

// Helper functions
function mapToValidCategory(category: string): 'Work' | 'Leisure' | 'Food' | 'Travel' | 'Accommodation' | 'Attraction' {
  const cat = (category || '').toLowerCase();
  if (cat.includes('food') || cat.includes('restaurant') || cat.includes('breakfast') || cat.includes('lunch') || cat.includes('dinner')) {
    return 'Food';
  }
  if (cat.includes('museum') || cat.includes('attraction') || cat.includes('sights') || cat.includes('landmark')) {
    return 'Attraction';
  }
  if (cat.includes('park') || cat.includes('nature') || cat.includes('leisure')) {
    return 'Leisure';
  }
  if (cat.includes('shopping')) {
    return 'Leisure';
  }
  if (cat.includes('travel') || cat.includes('flight') || cat.includes('transport')) {
    return 'Travel';
  }
  if (cat.includes('hotel') || cat.includes('accommodation')) {
    return 'Accommodation';
  }
  return 'Attraction'; // Default
}

function generateQuickTips(_destinations: any[]): string[] {
  return [
    'Book accommodations in advance',
    'Check visa requirements',
    'Get travel insurance',
    'Download offline maps',
    'Keep digital copies of documents'
  ];
}

/**
 * Pre-warm cache with popular destinations and common requests
 */
export async function prewarmCache(): Promise<void> {
  logger.info('AI', 'Pre-warming cache with popular destinations');
  
  const promises: Promise<void>[] = [];
  
  // Pre-warm venue and weather data for popular destinations
  for (const city of POPULAR_DESTINATIONS.slice(0, 10)) { // Limit to top 10 to avoid rate limits
    // Pre-fetch weather
    if (process.env.OPENWEATHERMAP) {
      promises.push(
        getWeatherForecast(city, 7)
          .then(weather => cache.set(`weather:${city}`, weather, 3600))
          .catch(() => logger.debug('AI', `Weather pre-warm failed for ${city}`))
      );
    }
    
    // Pre-fetch venues for common categories
    if (process.env.GOOGLE_API_KEY) {
      const venueTypes = ['restaurant', 'tourist_attraction', 'museum', 'park'];
      for (const type of venueTypes) {
        promises.push(
          searchGooglePlaces(type, city, type)
            .then(venues => cache.set(`venues:${city}:${type}`, venues, 7200)) // 2 hour cache
            .catch(() => logger.debug('AI', `Venue pre-warm failed for ${city}:${type}`))
        );
      }
    }
    
    // Pre-generate common trip extractions
    for (const days of COMMON_DURATIONS) {
      const mockPrompt = `${days} days in ${city}`;
      const extraction = {
        origin: 'Unknown',
        destinations: [{ city, days }],
        totalDays: days,
        returnTo: 'Unknown'
      };
      cache.set(`extract:${mockPrompt.substring(0, 100)}`, extraction, 1800);
    }
  }
  
  // Wait for all pre-warming to complete (with timeout)
  await Promise.race([
    Promise.all(promises),
    new Promise(resolve => setTimeout(resolve, 10000)) // 10 second timeout
  ]);
  
  logger.info('AI', 'Cache pre-warming complete', { 
    cachedCities: POPULAR_DESTINATIONS.slice(0, 10).length,
    cacheSize: cache.size() 
  });
}