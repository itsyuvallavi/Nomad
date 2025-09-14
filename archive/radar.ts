/**
 * Radar Places API integration for venue data
 * Alternative to Google Places API with good POI coverage
 */

import { logger } from '@/lib/logger';

// Radar API configuration
const RADAR_BASE_URL = 'https://api.radar.io/v1';

// Rate limiting configuration
const RATE_LIMIT = {
  requests: 150, // requests per second (from docs)
  window: 1000,  // 1 second window
  backoffBase: 1000, // Base backoff time in ms
  maxBackoff: 30000, // Max backoff time in ms
  maxRetries: 3
};

// Rate limiting state
let requestCount = 0;
let windowStart = Date.now();
let isRateLimited = false;
let backoffUntil = 0;

// Request queue for rate limiting
const requestQueue: Array<() => Promise<any>> = [];
let isProcessingQueue = false;

// Lazy load API key to ensure env vars are loaded
function getRadarApiKey(): string | undefined {
  return process.env.RADR_API_KEY; // Publishable key for places API
}

/**
 * Rate limiting and retry logic
 */
function canMakeRequest(): boolean {
  const now = Date.now();
  
  // Check if we're in a backoff period
  if (now < backoffUntil) {
    return false;
  }
  
  // Reset window if needed
  if (now - windowStart >= RATE_LIMIT.window) {
    requestCount = 0;
    windowStart = now;
    isRateLimited = false;
  }
  
  return requestCount < RATE_LIMIT.requests;
}

function calculateBackoff(attempt: number): number {
  const jitter = Math.random() * 1000; // Add jitter to prevent thundering herd
  return Math.min(
    RATE_LIMIT.backoffBase * Math.pow(2, attempt) + jitter,
    RATE_LIMIT.maxBackoff
  );
}

async function processQueue(): Promise<void> {
  if (isProcessingQueue || requestQueue.length === 0) {
    return;
  }
  
  isProcessingQueue = true;
  
  while (requestQueue.length > 0) {
    if (!canMakeRequest()) {
      // Wait until we can make requests again
      const waitTime = Math.max(
        RATE_LIMIT.window - (Date.now() - windowStart),
        backoffUntil - Date.now()
      );
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
      continue;
    }
    
    const request = requestQueue.shift();
    if (request) {
      try {
        await request();
      } catch (error) {
        logger.warn('Radar API', 'Queued request failed', { error });
      }
    }
  }
  
  isProcessingQueue = false;
}

async function makeRateLimitedRequest<T>(
  requestFn: () => Promise<T>,
  retryCount = 0
): Promise<T> {
  // If we're being rate limited, queue the request
  if (!canMakeRequest()) {
    return new Promise((resolve, reject) => {
      requestQueue.push(async () => {
        try {
          const result = await makeRateLimitedRequest(requestFn, retryCount);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      processQueue();
    });
  }
  
  // Track the request
  requestCount++;
  
  try {
    return await requestFn();
  } catch (error: any) {
    // Handle rate limiting
    if (error.message?.includes('429') || error.message?.includes('Rate limit')) {
      if (retryCount < RATE_LIMIT.maxRetries) {
        const backoffTime = calculateBackoff(retryCount);
        backoffUntil = Date.now() + backoffTime;
        isRateLimited = true;
        
        logger.info('Radar API', `Rate limited, backing off for ${backoffTime}ms`, {
          attempt: retryCount + 1,
          maxRetries: RATE_LIMIT.maxRetries
        });
        
        await new Promise(resolve => setTimeout(resolve, backoffTime));
        return makeRateLimitedRequest(requestFn, retryCount + 1);
      }
    }
    
    throw error;
  }
}

export interface RadarPlace {
  _id: string;
  name: string;
  chain?: {
    name: string;
    slug: string;
    domain?: string;
    metadata?: Record<string, any>;
  };
  categories: string[];
  location: {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
  };
  address?: {
    formattedAddress?: string;
    country?: string;
    state?: string;
    city?: string;
    postalCode?: string;
  };
  confidence?: 'exact' | 'high' | 'medium' | 'low';
  metadata?: Record<string, any>;
}

export interface RadarSearchResponse {
  places: RadarPlace[];
  meta?: {
    code: number;
  };
}

// Category mappings for common activity types
const CATEGORY_MAPPINGS: Record<string, string[]> = {
  'restaurant': ['food-beverage', 'restaurant'],
  'cafe': ['food-beverage', 'coffee-shop'],
  'bar': ['food-beverage', 'bar', 'nightlife'],
  'hotel': ['accommodation', 'hotel'],
  'accommodation': ['accommodation'],
  'museum': ['arts-entertainment', 'museum'],
  'attraction': ['arts-entertainment', 'tourist-attraction', 'landmark'],
  'shopping': ['retail', 'shopping'],
  'park': ['outdoor-recreation', 'park'],
  'entertainment': ['arts-entertainment'],
  'nightlife': ['nightlife', 'bar', 'club'],
  'gym': ['health-fitness', 'gym'],
  'spa': ['health-fitness', 'spa'],
  'bank': ['financial', 'bank'],
  'gas': ['automotive', 'gas-station'],
  'grocery': ['retail', 'grocery'],
};

/**
 * Get coordinates for a location name using a simple geocoding approach
 * For a production app, you'd want to use a proper geocoding service
 */
async function getCoordinatesForLocation(location: string): Promise<{ lat: number; lng: number } | null> {
  // Simple mapping for common cities - in production, use proper geocoding
  const cityCoordinates: Record<string, { lat: number; lng: number }> = {
    'london': { lat: 51.5074, lng: -0.1278 },
    'paris': { lat: 48.8566, lng: 2.3522 },
    'tokyo': { lat: 35.6762, lng: 139.6503 },
    'new york': { lat: 40.7128, lng: -74.0060 },
    'san francisco': { lat: 37.7749, lng: -122.4194 },
    'los angeles': { lat: 34.0522, lng: -118.2437 },
    'chicago': { lat: 41.8781, lng: -87.6298 },
    'berlin': { lat: 52.5200, lng: 13.4050 },
    'rome': { lat: 41.9028, lng: 12.4964 },
    'madrid': { lat: 40.4168, lng: -3.7038 },
    'barcelona': { lat: 41.3851, lng: 2.1734 },
    'amsterdam': { lat: 52.3676, lng: 4.9041 },
    'vienna': { lat: 48.2082, lng: 16.3738 },
    'sydney': { lat: -33.8688, lng: 151.2093 },
    'melbourne': { lat: -37.8136, lng: 144.9631 },
    'toronto': { lat: 43.6532, lng: -79.3832 },
    'vancouver': { lat: 49.2827, lng: -123.1207 },
  };
  
  const normalizedLocation = location.toLowerCase().trim();
  return cityCoordinates[normalizedLocation] || null;
}

/**
 * Search for places using Radar API
 */
export async function searchRadarPlaces(
  near: string,
  categories?: string[],
  chains?: string[],
  radius: number = 2000,
  limit: number = 20
): Promise<RadarPlace[]> {
  const apiKey = getRadarApiKey();
  
  if (!apiKey) {
    logger.warn('Radar API', 'No API key found, returning empty results');
    return [];
  }

  // Get coordinates for the location
  const coords = await getCoordinatesForLocation(near);
  if (!coords) {
    logger.warn('Radar API', `Could not find coordinates for location: ${near}`);
    return [];
  }

  // Use rate limited request
  return makeRateLimitedRequest(async () => {
    const params = new URLSearchParams({
      near: `${coords.lat},${coords.lng}`,
      radius: radius.toString(),
      limit: limit.toString()
    });

    if (categories && categories.length > 0) {
      params.append('categories', categories.join(','));
    }

    if (chains && chains.length > 0) {
      params.append('chains', chains.join(','));
    }

    const response = await fetch(`${RADAR_BASE_URL}/search/places?${params}`, {
      headers: {
        'Authorization': apiKey,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Search failed: ${response.status} - ${errorText}`);
    }

    const data: RadarSearchResponse = await response.json();
    return data.places || [];
  });
}

/**
 * Get activities by category for a destination
 */
export async function getRadarActivities(
  destination: string,
  category: string,
  limit: number = 10
): Promise<RadarPlace[]> {
  const categories = CATEGORY_MAPPINGS[category.toLowerCase()] || [category];
  return searchRadarPlaces(destination, categories, undefined, 2000, limit);
}

/**
 * Search for specific venues or chains
 */
export async function searchRadarChains(
  destination: string,
  chainSlugs: string[],
  limit: number = 10
): Promise<RadarPlace[]> {
  return searchRadarPlaces(destination, undefined, chainSlugs, 2000, limit);
}

/**
 * Convert Radar place to a format compatible with our activity structure
 */
export function convertRadarToActivity(place: RadarPlace) {
  const [lng, lat] = place.location.coordinates;
  
  return {
    description: place.name,
    category: place.categories?.[0]?.replace('-', ' ') || 'Activity',
    venue_name: place.name,
    address: place.address?.formattedAddress || '',
    rating: 0, // Radar doesn't provide ratings
    tips: place.chain?.name ? `Part of ${place.chain.name} chain` : '',
    coordinates: {
      lat,
      lng
    },
    chain: place.chain?.slug,
    source: 'radar' as const
  };
}

/**
 * Test Radar API connection
 */
export async function testRadarConnection(): Promise<boolean> {
  const apiKey = getRadarApiKey();
  
  if (!apiKey) {
    logger.error('Radar API', 'No API key configured');
    return false;
  }

  try {
    // Test with a simple search for coffee shops in London
    const places = await searchRadarPlaces('London', ['coffee-shop'], undefined, 1000, 1);
    
    if (places.length > 0) {
      logger.info('Radar API', 'Connection test successful');
      return true;
    } else {
      logger.warn('Radar API', 'Connection test returned no results');
      return true; // Still consider it working, just no results for this query
    }
  } catch (error) {
    logger.error('Radar API', `Connection test failed: ${error}`);
    return false;
  }
}

/**
 * Get popular chains for a category
 */
export function getPopularChains(category: string): string[] {
  const chainMappings: Record<string, string[]> = {
    'coffee': ['starbucks', 'costa-coffee', 'pret-a-manger', 'dunkin'],
    'restaurant': ['mcdonalds', 'kfc', 'subway', 'pizza-hut', 'dominos'],
    'hotel': ['marriott', 'hilton', 'hyatt', 'intercontinental'],
    'shopping': ['target', 'walmart', 'whole-foods', 'costco'],
    'gas': ['shell', 'bp', 'exxon', 'chevron'],
    'bank': ['chase', 'bank-of-america', 'wells-fargo', 'citibank'],
  };
  
  return chainMappings[category.toLowerCase()] || [];
}

/**
 * Search for activities with chain preference (mix of chains and general categories)
 */
export async function getRadarActivitiesWithChains(
  destination: string,
  category: string,
  limit: number = 10
): Promise<RadarPlace[]> {
  const popularChains = getPopularChains(category);
  const categories = CATEGORY_MAPPINGS[category.toLowerCase()] || [category];
  
  // Get half from popular chains, half from general categories
  const chainLimit = Math.ceil(limit / 2);
  const categoryLimit = limit - chainLimit;
  
  const [chainResults, categoryResults] = await Promise.all([
    popularChains.length > 0 ? searchRadarPlaces(destination, undefined, popularChains, 2000, chainLimit) : Promise.resolve([]),
    searchRadarPlaces(destination, categories, undefined, 2000, categoryLimit)
  ]);
  
  // Combine and deduplicate by place ID
  const combined = [...chainResults, ...categoryResults];
  const unique = combined.filter((place, index, self) => 
    index === self.findIndex(p => p._id === place._id)
  );
  
  return unique.slice(0, limit);
}