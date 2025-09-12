/**
 * Amadeus API Integration
 * Provides flight search, hotel search, and travel recommendations
 * Cost-effective alternative to Google APIs for travel data
 */

import { logger } from '@/lib/logger';

const AMADEUS_API_KEY = process.env.AMADEUS_API_KEY;
const AMADEUS_API_SECRET = process.env.AMADEUS_API_SECRET;
const AMADEUS_BASE_URL = 'https://api.amadeus.com/v1';
const AMADEUS_API_URL = 'https://api.amadeus.com/v2';

interface AmadeusToken {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
}

let cachedToken: AmadeusToken | null = null;

/**
 * Get Amadeus access token with caching
 */
async function getAccessToken(): Promise<string> {
  // Check if we have a valid cached token
  if (cachedToken && cachedToken.expires_at > Date.now()) {
    return cachedToken.access_token;
  }

  if (!AMADEUS_API_KEY || !AMADEUS_API_SECRET) {
    logger.warn('API', 'Amadeus credentials not configured - using fallback pricing');
    throw new Error('Amadeus API credentials not configured');
  }

  try {
    const response = await fetch('https://api.amadeus.com/v1/security/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: AMADEUS_API_KEY,
        client_secret: AMADEUS_API_SECRET,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn('API', `Amadeus auth failed: ${response.status} - ${errorText}`);
      throw new Error(`Failed to get access token: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Cache the token with expiration time
    cachedToken = {
      ...data,
      expires_at: Date.now() + (data.expires_in * 1000) - 60000, // Expire 1 minute early
    };

    logger.info('API', 'Amadeus token obtained successfully');
    return cachedToken?.access_token || '';
  } catch (error) {
    logger.error('API', 'Failed to get Amadeus access token', error);
    throw error;
  }
}

/**
 * Search for flights between two cities
 * More cost-effective than Google Flights API
 */
export async function searchFlights(params: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults?: number;
  maxResults?: number;
}) {
  // Disabled - Amadeus API causing timeouts
  if (!AMADEUS_API_KEY || !AMADEUS_API_SECRET) {
    logger.info('API', 'Amadeus disabled - skipping flight search');
    return null;
  }
  
  try {
    const token = await getAccessToken();
    
    const searchParams = new URLSearchParams({
      originLocationCode: params.origin,
      destinationLocationCode: params.destination,
      departureDate: params.departureDate,
      adults: String(params.adults || 1),
      max: String(params.maxResults || 3), // Limit results to save API calls
      currencyCode: 'USD',
    });

    if (params.returnDate) {
      searchParams.append('returnDate', params.returnDate);
    }

    const response = await fetch(
      `${AMADEUS_API_URL}/shopping/flight-offers?${searchParams}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      logger.warn('API', `Amadeus flight search failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    logger.info('API', `Found ${data.data?.length || 0} flight offers`);
    
    // Transform and return only essential data to minimize processing
    return data.data?.slice(0, 3).map((offer: any) => ({
      price: offer.price.total,
      currency: offer.price.currency,
      segments: offer.itineraries[0].segments.map((seg: any) => ({
        departure: seg.departure.iataCode,
        arrival: seg.arrival.iataCode,
        departureTime: seg.departure.at,
        arrivalTime: seg.arrival.at,
        carrier: seg.carrierCode,
        duration: seg.duration,
      })),
    }));
  } catch (error) {
    logger.error('API', 'Flight search error', error);
    return null;
  }
}

/**
 * Search for hotels in a city
 * More cost-effective than Google Hotels API
 */
export async function searchHotels(params: {
  cityCode: string;
  checkInDate: string;
  checkOutDate: string;
  adults?: number;
  maxResults?: number;
}) {
  // Disabled - Amadeus API causing timeouts
  if (!AMADEUS_API_KEY || !AMADEUS_API_SECRET) {
    logger.info('API', 'Amadeus disabled - skipping hotel search');
    return null;
  }
  
  try {
    const token = await getAccessToken();
    
    const searchParams = new URLSearchParams({
      cityCode: params.cityCode,
      checkInDate: params.checkInDate,
      checkOutDate: params.checkOutDate,
      adults: String(params.adults || 2),
      radius: '10',
      radiusUnit: 'KM',
      ratings: '3,4,5', // Only show 3+ star hotels
      currency: 'USD',
      bestRateOnly: 'true',
    });

    const response = await fetch(
      `${AMADEUS_API_URL}/shopping/hotel-offers?${searchParams}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      logger.warn('API', `Amadeus hotel search failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    logger.info('API', `Found ${data.data?.length || 0} hotel offers`);
    
    // Return only essential data
    return data.data?.slice(0, 5).map((hotel: any) => ({
      name: hotel.hotel.name,
      hotelId: hotel.hotel.hotelId,
      price: hotel.offers?.[0]?.price?.total,
      currency: hotel.offers?.[0]?.price?.currency,
      rating: hotel.hotel.rating,
      address: {
        lines: hotel.hotel.address?.lines,
        cityName: hotel.hotel.address?.cityName,
        countryCode: hotel.hotel.address?.countryCode,
      },
    }));
  } catch (error) {
    logger.error('API', 'Hotel search error', error);
    return null;
  }
}

/**
 * Get city/airport code from city name
 * Uses Amadeus location search
 */
export async function getCityCode(cityName: string): Promise<string | null> {
  // Disabled - Amadeus API causing timeouts
  if (!AMADEUS_API_KEY || !AMADEUS_API_SECRET) {
    logger.info('API', 'Amadeus disabled - skipping city code lookup');
    return null;
  }
  
  try {
    const token = await getAccessToken();
    
    const response = await fetch(
      `${AMADEUS_BASE_URL}/reference-data/locations?subType=CITY,AIRPORT&keyword=${encodeURIComponent(cityName)}&page[limit]=1`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      logger.warn('API', `City code search failed for ${cityName}`);
      return null;
    }

    const data = await response.json();
    const location = data.data?.[0];
    
    if (location) {
      const code = location.iataCode || location.address?.cityCode;
      logger.info('API', `Found city code ${code} for ${cityName}`);
      return code;
    }
    
    return null;
  } catch (error) {
    logger.error('API', 'City code search error', error);
    return null;
  }
}

/**
 * Get points of interest for a location
 * Alternative to Google Places for basic POI data
 */
export async function getPointsOfInterest(params: {
  latitude: number;
  longitude: number;
  radius?: number;
  categories?: string[];
}) {
  // Disabled - Amadeus API causing timeouts
  if (!AMADEUS_API_KEY || !AMADEUS_API_SECRET) {
    logger.info('API', 'Amadeus disabled - skipping POI search');
    return null;
  }
  
  try {
    const token = await getAccessToken();
    
    const searchParams = new URLSearchParams({
      latitude: String(params.latitude),
      longitude: String(params.longitude),
      radius: String(params.radius || 5),
    });

    if (params.categories?.length) {
      searchParams.append('categories', params.categories.join(','));
    }

    const response = await fetch(
      `${AMADEUS_BASE_URL}/reference-data/locations/pois?${searchParams}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      logger.warn('API', `POI search failed: ${response.status}`);
      return null;
    }

    const data = await response.json();
    logger.info('API', `Found ${data.data?.length || 0} points of interest`);
    
    return data.data?.slice(0, 10).map((poi: any) => ({
      name: poi.name,
      category: poi.category,
      tags: poi.tags,
      geoCode: poi.geoCode,
    }));
  } catch (error) {
    logger.error('API', 'POI search error', error);
    return null;
  }
}

/**
 * Get travel recommendations for a destination
 */
export async function getTravelRecommendations(cityCode: string) {
  // Disabled - Amadeus API causing timeouts
  if (!AMADEUS_API_KEY || !AMADEUS_API_SECRET) {
    logger.info('API', 'Amadeus disabled - skipping travel recommendations');
    return null;
  }
  
  try {
    const token = await getAccessToken();
    
    const response = await fetch(
      `${AMADEUS_BASE_URL}/reference-data/recommended-locations?cityCodes=${cityCode}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      logger.warn('API', `Recommendations failed for ${cityCode}`);
      return null;
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    logger.error('API', 'Recommendations error', error);
    return null;
  }
}