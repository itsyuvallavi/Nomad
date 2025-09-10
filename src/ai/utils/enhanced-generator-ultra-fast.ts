/**
 * Ultra-Fast Enhanced Itinerary Generator
 * Optimized for maximum speed through parallelization and caching
 */

import { openai } from '../openai-config';
import { searchGooglePlaces } from '@/lib/api/google-places';
import { getWeatherForecast } from '@/lib/api/weather';
import { estimateTripCost as estimateTripCostOpenAI, estimateFlightCost, estimateHotelCost } from '@/ai/utils/openai-travel-costs';
import { logger } from '@/lib/logger';
import type { GeneratePersonalizedItineraryOutput } from '../flows/generate-personalized-itinerary';

// Enhanced cache with optimized TTLs and smart invalidation
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hitCount: number;
  category: 'extraction' | 'venue' | 'weather' | 'flight' | 'itinerary' | 'hotel';
}

class SmartCache {
  private cache = new Map<string, CacheEntry<any>>();
  private readonly MAX_CACHE_SIZE = 1000;
  
  // Optimized TTLs by category (in seconds)
  private readonly TTL_CONFIG = {
    extraction: 1800,     // 30 min - user queries
    venue: 86400,        // 24 hours - stable data
    weather: 3600,       // 1 hour - changes hourly
    flight: 7200,        // 2 hours - price changes
    itinerary: 3600,     // 1 hour - generated content
    hotel: 86400         // 24 hours - stable data
  };
  
  set<T>(key: string, data: T, ttlSeconds?: number): void {
    // Determine category from key
    const cat = this.getCategoryFromKey(key);
    const ttl = ttlSeconds || this.TTL_CONFIG[cat] || 300;
    
    // LRU eviction if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      this.evictLeastUsed();
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttl * 1000,
      hitCount: 0,
      category: cat
    });
  }
  
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    // Increment hit count for LRU tracking
    entry.hitCount++;
    return entry.data;
  }
  
  private getCategoryFromKey(key: string): CacheEntry<any>['category'] {
    if (key.startsWith('extract:')) return 'extraction';
    if (key.startsWith('venues:') || key.includes(':restaurant') || key.includes(':cafe')) return 'venue';
    if (key.startsWith('weather:')) return 'weather';
    if (key.startsWith('flight:')) return 'flight';
    if (key.startsWith('hotel:')) return 'hotel';
    if (key.startsWith('chunk:')) return 'itinerary';
    return 'extraction';
  }
  
  private evictLeastUsed(): void {
    let minHits = Infinity;
    let keyToEvict = '';
    
    for (const [key, entry] of this.cache.entries()) {
      // Prefer evicting expired entries first
      if (Date.now() - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        return;
      }
      
      // Track least used entry
      if (entry.hitCount < minHits) {
        minHits = entry.hitCount;
        keyToEvict = key;
      }
    }
    
    if (keyToEvict) {
      this.cache.delete(keyToEvict);
    }
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  size(): number {
    return this.cache.size;
  }
  
  getStats(): { size: number; categories: Record<string, number> } {
    const categories: Record<string, number> = {};
    for (const entry of this.cache.values()) {
      categories[entry.category] = (categories[entry.category] || 0) + 1;
    }
    return { size: this.cache.size, categories };
  }
}

const cache = new SmartCache();

// Popular destinations to pre-cache (expanded list)
const POPULAR_DESTINATIONS = [
  'London', 'Paris', 'Tokyo', 'New York', 'Dubai', 'Singapore', 
  'Rome', 'Barcelona', 'Amsterdam', 'Bangkok', 'Los Angeles',
  'San Francisco', 'Sydney', 'Melbourne', 'Berlin', 'Madrid',
  'Istanbul', 'Prague', 'Vienna', 'Lisbon', 'Athens'
];

// Common trip durations for pre-caching
const COMMON_DURATIONS = [3, 5, 7, 10, 14];

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
  
  // Clear extraction prompt with explicit rules
  const systemPrompt = `Extract trip as JSON. Rules:
- "weekend" = 3 days
- "week" or "7 days" = 7 days  
- "fortnight" or "2 weeks" = 14 days
- Count actual days, not nights
Output: {"origin":"city","destinations":[{"city":"name","days":number}],"totalDays":number}`;

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
  const lowerPrompt = prompt.toLowerCase();
  
  // Handle weekend specially
  if (lowerPrompt.includes('weekend')) {
    const weekendMatch = prompt.match(/weekend\s+(?:trip\s+)?(?:from\s+\w+\s+)?(?:to\s+|in\s+)?([A-Z][a-z]+)/i);
    if (weekendMatch) {
      destinations.push({ city: weekendMatch[1], days: 3 });
    }
  } else {
    // Regular extraction for numbered days/weeks
    const matches = prompt.matchAll(/(\d+)\s*(?:days?|weeks?)\s+in\s+([A-Z][a-z]+)/gi);
    
    for (const match of matches) {
      const numStr = match[1];
      const isWeek = match[0].toLowerCase().includes('week');
      const days = isWeek ? parseInt(numStr) * 7 : parseInt(numStr);
      destinations.push({ city: match[2], days });
    }
  }
  
  // Extract origin
  const originMatch = prompt.match(/from\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  const origin = originMatch ? originMatch[1] : 'Unknown';
  
  return {
    origin,
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
  
  // Explicit prompt ensuring correct day count
  const prompt = `Generate EXACTLY ${days} days for ${destination}.
Return a JSON array with EXACTLY ${days} objects.
Each object: {"day":${dayOffset+1} to ${dayOffset+days},"destination_city":"${destination}","title":"Day X: Title","theme":"Theme","activities":[5 activities]}
Each activity: {"time":"HH:MM AM/PM","description":"Activity","category":"Food|Museum|Park|Attraction|Shopping","duration":"X hours","tips":"Tips"}
CRITICAL: Must return exactly ${days} day objects, no more, no less.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      { 
        role: 'system', 
        content: 'Return JSON array only. No text.' 
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
    
    if (Array.isArray(result)) {
      // Ensure we have exactly the right number of days
      if (result.length !== days) {
        logger.warn('AI', `Day count mismatch for ${destination}: got ${result.length}, expected ${days}`);
        
        // Trim or pad to match expected days
        if (result.length > days) {
          // Too many days - trim to exact count
          result.splice(days);
        } else if (result.length < days) {
          // Too few days - use fallback for missing days
          const fallbackDays = createFallbackDays(destination, days - result.length, dayOffset + result.length);
          result.push(...fallbackDays);
        }
      }
      
      // Fix day numbering to be sequential
      result.forEach((day: any, index: number) => {
        day.day = dayOffset + index + 1;
      });
      
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
 * Generate request hash for deduplication
 */
function generateRequestHash(prompt: string): string {
  // Normalize prompt for consistent hashing
  const normalized = prompt.toLowerCase().trim()
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .replace(/[^\w\s]/g, '');  // Remove punctuation
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `req_${Math.abs(hash)}`;
}

/**
 * Main ultra-fast generation function with request deduplication
 */
export async function generateUltraFastItinerary(
  prompt: string,
  _attachedFile?: string,
  _conversationHistory?: string
): Promise<GeneratePersonalizedItineraryOutput> {
  const startTime = Date.now();
  
  // Check for duplicate request
  const requestHash = generateRequestHash(prompt);
  const dedupKey = `dedup:${requestHash}`;
  const cachedResult = cache.get<GeneratePersonalizedItineraryOutput>(dedupKey);
  
  if (cachedResult) {
    logger.info('AI', `🎯 Request deduplication hit - returning cached result [${Date.now() - startTime}ms]`);
    return cachedResult;
  }
  
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
          flights: result.flights.reduce((sum: number, f: any) => sum + (f.price?.economy || 0), 0),
          accommodation: destinations.reduce((sum: number, d: any, i: number) => 
            sum + (result.hotels[d.city]?.pricePerNight?.midRange || 200) * d.days, 0),
          dailyExpenses: destinations.reduce((sum: number, d: any) => sum + (100 * d.days), 0),
          currency: 'USD',
          breakdown: [
            ...result.flights.map(f => ({
              type: 'flight',
              description: `${f.origin} → ${f.destination}`,
              amount: f.price?.economy || 0
            })),
            ...destinations.map((d: any) => ({
              type: 'accommodation',
              description: `${d.city} (${d.days} nights)`,
              amount: (result.hotels[d.city]?.pricePerNight?.midRange || 200) * d.days
            }))
          ]
        }))
        .catch(() => null)
    ]);
    
    logger.info('AI', `Parallel operations completed in ${Date.now() - parallelStart}ms`);
    
    // Step 3: Combine all chunks into single itinerary WITHOUT adding extra travel days
    let allDays: any[] = [];
    
    // DO NOT add separate travel days - they should be included in the destination days
    // Travel should be the first activity of day 1 and last activity of the final day
    
    // Combine chunks without adding extra travel days
    if (destinations.length > 1) {
      // Multi-city trips - combine all chunks
      let currentDayNum = 1;
      itineraryChunks.forEach((chunk) => {
        const adjustedChunk = chunk.map((day: any) => ({
          ...day,
          day: currentDayNum++
        }));
        allDays = allDays.concat(adjustedChunk);
      });
    } else {
      // Single destination - just use the days as-is
      allDays = itineraryChunks.flat();
    }
    
    // Step 4: Enhance with real data (already fetched)
    // Enhanced venue diversity tracking with category-specific usage
    const usedVenues = new Map<string, Map<string, Set<string>>>();  // city -> category -> Set of venue IDs
    const venueUsageCount = new Map<string, number>();  // Track global usage count per venue
    
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
      
      // Initialize city's category-specific venue tracking if not exists
      if (!usedVenues.has(city)) {
        usedVenues.set(city, new Map<string, Set<string>>());
      }
      const cityVenuesByCategory = usedVenues.get(city)!;
      
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
            // Initialize category tracking if needed
            if (!cityVenuesByCategory.has(venueType)) {
              cityVenuesByCategory.set(venueType, new Set<string>());
            }
            const categoryUsedVenues = cityVenuesByCategory.get(venueType)!;
            
            // Enhanced selection: prioritize by usage count
            let selectedVenue = null;
            let minUsageCount = Infinity;
            
            // Sort venues by usage count (least used first)
            const sortedVenues = [...venues].sort((a, b) => {
              const aCount = venueUsageCount.get(a.place_id) || 0;
              const bCount = venueUsageCount.get(b.place_id) || 0;
              return aCount - bCount;
            });
            
            // First: Try to find completely unused venue
            for (const venue of sortedVenues) {
              if (!categoryUsedVenues.has(venue.place_id)) {
                selectedVenue = venue;
                break;
              }
            }
            
            // Second: If all used in this category, pick least globally used
            if (!selectedVenue && sortedVenues.length > 0) {
              // For restaurants, ensure we never use the same one twice in a day
              if (venueType === 'restaurant') {
                // Check if this restaurant was already used today
                const todayActivities = day.activities || [];
                const usedToday = new Set<string>();
                todayActivities.forEach((act: any) => {
                  if (act.venue_name) {
                    usedToday.add(act.venue_name);
                  }
                });
                
                // Find first restaurant not used today
                for (const venue of sortedVenues) {
                  if (!usedToday.has(venue.name)) {
                    selectedVenue = venue;
                    break;
                  }
                }
              }
              
              // If still no selection or not restaurant, use least globally used
              if (!selectedVenue) {
                selectedVenue = sortedVenues[0];
              }
            }
            
            if (selectedVenue) {
              // Update tracking
              categoryUsedVenues.add(selectedVenue.place_id);
              venueUsageCount.set(
                selectedVenue.place_id, 
                (venueUsageCount.get(selectedVenue.place_id) || 0) + 1
              );
              
              // Assign venue details
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
    
    const result: any = {
      destination: destinationString,
      title,
      itinerary: formattedDays,
      quickTips: generateQuickTips(destinations)
    };
    
    // Add metadata as extended properties
    if (tripCostEstimate) {
      result._costEstimate = {
        total: Math.round(tripCostEstimate.total),
        flights: Math.round(tripCostEstimate.flights),
        accommodation: Math.round(tripCostEstimate.accommodation),
        dailyExpenses: Math.round(tripCostEstimate.dailyExpenses),
        currency: tripCostEstimate.currency,
        breakdown: tripCostEstimate.breakdown.map((item: any) => ({
          ...item,
          amount: Math.round(item.amount)
        }))
      };
    }
    
    result._hotelOptions = hotelData;
    result._flightOptions = flightData;
    
    // Cache the successful result for deduplication
    cache.set(dedupKey, result, 1800); // Cache for 30 minutes
    logger.info('AI', `Cached successful result for deduplication [hash: ${requestHash}]`);
    
    return result;
    
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
 * Enhanced cache pre-warming with prioritized strategy
 */
export async function prewarmCache(priority: 'startup' | 'background' = 'startup'): Promise<void> {
  const startTime = Date.now();
  logger.info('AI', `Starting ${priority} cache pre-warming`);
  
  const promises: Promise<void>[] = [];
  const citiesToWarm = priority === 'startup' 
    ? POPULAR_DESTINATIONS.slice(0, 5)  // Top 5 for fast startup
    : POPULAR_DESTINATIONS;              // All for background
  
  // Batch API calls to avoid rate limits
  const batchSize = priority === 'startup' ? 2 : 5;
  
  for (let i = 0; i < citiesToWarm.length; i += batchSize) {
    const cityBatch = citiesToWarm.slice(i, i + batchSize);
    
    for (const city of cityBatch) {
      // Weather data - essential for all trips
      if (process.env.OPENWEATHERMAP) {
        promises.push(
          getWeatherForecast(city, 7)
            .then(weather => cache.set(`weather:${city}`, weather))  // Uses optimized TTL
            .catch(() => logger.debug('AI', `Weather pre-warm skipped: ${city}`))
        );
      }
      
      // Venues - only essential categories initially
      if (process.env.GOOGLE_API_KEY) {
        const essentialVenues = priority === 'startup' 
          ? ['restaurant', 'tourist_attraction']  // Essential only
          : ['restaurant', 'tourist_attraction', 'museum', 'park', 'cafe', 'shopping_mall'];
        
        for (const type of essentialVenues) {
          promises.push(
            searchGooglePlaces(type, city, type)
              .then(venues => {
                cache.set(`venues:${city}:${type}`, venues);  // Uses optimized TTL
                // Also cache with alternate key format
                cache.set(`${city}:${type}`, venues);
              })
              .catch(() => logger.debug('AI', `Venue pre-warm skipped: ${city}:${type}`))
          );
        }
      }
      
      // Pre-generate common extractions
      if (priority === 'background') {
        for (const days of COMMON_DURATIONS) {
          // Multiple prompt variations
          const variations = [
            `${days} days in ${city}`,
            `I want to visit ${city} for ${days} days`,
            `Plan a ${days} day trip to ${city}`,
            `${city} ${days} days`
          ];
          
          for (const prompt of variations) {
            const extraction = {
              origin: 'Unknown',
              destinations: [{ city, days }],
              totalDays: days,
              returnTo: 'Unknown'
            };
            cache.set(`extract:${prompt.substring(0, 100)}`, extraction);
          }
        }
      }
    }
    
    // Add delay between batches to avoid rate limits
    if (i + batchSize < citiesToWarm.length) {
      await new Promise(resolve => setTimeout(resolve, priority === 'startup' ? 100 : 500));
    }
  }
  
  // Wait with appropriate timeout
  const timeout = priority === 'startup' ? 5000 : 15000;
  await Promise.race([
    Promise.all(promises),
    new Promise(resolve => setTimeout(resolve, timeout))
  ]);
  
  const stats = cache.getStats();
  logger.info('AI', `Cache pre-warming complete (${priority})`, { 
    duration: `${Date.now() - startTime}ms`,
    stats
  });
  
  // Schedule background pre-warming if this was startup
  if (priority === 'startup') {
    setTimeout(() => {
      prewarmCache('background').catch(err => 
        logger.error('AI', 'Background pre-warming failed', { error: err })
      );
    }, 30000); // Run after 30 seconds
  }
}