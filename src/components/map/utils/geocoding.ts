/**
 * Geocoding utilities for converting addresses to coordinates
 */

import { logger } from '@/lib/logger';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface GeocodedLocation {
  address: string;
  coordinates: Coordinates;
  displayName?: string;
}

// Cache geocoding results to avoid repeated API calls
const geocodeCache = new Map<string, Coordinates>();

// Rate limiting for Nominatim API (max 1 request per second)
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second in milliseconds

/**
 * Geocode an address using OpenStreetMap's Nominatim API (free, no key required)
 */
export async function geocodeAddress(address: string): Promise<Coordinates | null> {
  // Check cache first
  if (geocodeCache.has(address)) {
    return geocodeCache.get(address)!;
  }

  try {
    // Rate limiting - wait if necessary
    const now = Date.now();
    const timeSinceLastRequest = now - lastRequestTime;
    if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
      await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
    }
    lastRequestTime = Date.now();
    
    // Clean and encode the address
    const cleanAddress = address.trim().replace(/\s+/g, ' ');
    const encodedAddress = encodeURIComponent(cleanAddress);
    
    // Use Nominatim API (OpenStreetMap)
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`,
      {
        headers: {
          'User-Agent': 'NomadNavigator/1.0' // Required by Nominatim
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Geocoding failed: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data && data.length > 0) {
      const result = data[0];
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);
      
      // Validate coordinates
      if (isNaN(lat) || isNaN(lng)) {
        logger.error('API', 'Invalid coordinates received from geocoding', { 
          address, 
          lat: result.lat, 
          lng: result.lon 
        });
        // Try to use fallback coordinates
        const fallback = await getCoordinatesWithFallback(address);
        return fallback;
      }
      
      const coordinates: Coordinates = { lat, lng };
      
      // Cache the result
      geocodeCache.set(address, coordinates);
      
      logger.debug('API', 'Geocoded address', { address, coordinates });
      return coordinates;
    }
    
    logger.warn('API', 'No geocoding results found', { address });
    return null;
  } catch (error) {
    // Convert error to a proper object for logging
    const errorDetails = error instanceof Error 
      ? { message: error.message, stack: error.stack }
      : { error: String(error) };
    
    logger.error('API', 'Geocoding error', { address, ...errorDetails });
    return null;
  }
}

/**
 * Batch geocode multiple addresses
 */
export async function geocodeAddresses(
  addresses: string[]
): Promise<Map<string, Coordinates>> {
  const results = new Map<string, Coordinates>();
  
  // Process in batches to avoid overwhelming the API
  const batchSize = 5;
  for (let i = 0; i < addresses.length; i += batchSize) {
    const batch = addresses.slice(i, i + batchSize);
    
    await Promise.all(
      batch.map(async (address) => {
        const coords = await geocodeAddress(address);
        if (coords) {
          results.set(address, coords);
        }
      })
    );
    
    // Add delay between batches to respect rate limits
    if (i + batchSize < addresses.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return results;
}

/**
 * Get center point of multiple coordinates
 */
export function getCenterPoint(coordinates: Coordinates[]): Coordinates {
  if (coordinates.length === 0) {
    // Return London as default center
    return CITY_COORDINATES['London'];
  }
  
  // Filter out invalid coordinates
  const validCoords = coordinates.filter(coord => 
    !isNaN(coord.lat) && !isNaN(coord.lng) &&
    Math.abs(coord.lat) <= 90 && Math.abs(coord.lng) <= 180
  );
  
  if (validCoords.length === 0) {
    // If no valid coordinates, return London as fallback
    return CITY_COORDINATES['London'];
  }
  
  const sum = validCoords.reduce(
    (acc, coord) => ({
      lat: acc.lat + coord.lat,
      lng: acc.lng + coord.lng
    }),
    { lat: 0, lng: 0 }
  );
  
  const center = {
    lat: sum.lat / validCoords.length,
    lng: sum.lng / validCoords.length
  };
  
  // Final validation
  if (isNaN(center.lat) || isNaN(center.lng)) {
    return CITY_COORDINATES['London'];
  }
  
  return center;
}

/**
 * Calculate bounding box for multiple coordinates
 */
export function getBounds(coordinates: Coordinates[]): {
  north: number;
  south: number;
  east: number;
  west: number;
} {
  if (coordinates.length === 0) {
    return { north: 0, south: 0, east: 0, west: 0 };
  }
  
  const lats = coordinates.map(c => c.lat);
  const lngs = coordinates.map(c => c.lng);
  
  return {
    north: Math.max(...lats),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    west: Math.min(...lngs)
  };
}

/**
 * Fallback coordinates for major cities (when geocoding fails)
 */
export const CITY_COORDINATES: Record<string, Coordinates> = {
  // UK
  'London': { lat: 51.5074, lng: -0.1278 },
  'Edinburgh': { lat: 55.9533, lng: -3.1883 },
  'Manchester': { lat: 53.4808, lng: -2.2426 },
  'Birmingham': { lat: 52.4862, lng: -1.8904 },
  
  // Europe
  'Paris': { lat: 48.8566, lng: 2.3522 },
  'Rome': { lat: 41.9028, lng: 12.4964 },
  'Barcelona': { lat: 41.3851, lng: 2.1734 },
  'Amsterdam': { lat: 52.3676, lng: 4.9041 },
  'Berlin': { lat: 52.5200, lng: 13.4050 },
  'Madrid': { lat: 40.4168, lng: -3.7038 },
  'Vienna': { lat: 48.2082, lng: 16.3738 },
  'Prague': { lat: 50.0755, lng: 14.4378 },
  'Copenhagen': { lat: 55.6761, lng: 12.5683 },
  'Stockholm': { lat: 59.3293, lng: 18.0686 },
  'Lisbon': { lat: 38.7223, lng: -9.1393 },
  'Athens': { lat: 37.9838, lng: 23.7275 },
  
  // Americas
  'New York': { lat: 40.7128, lng: -74.0060 },
  'Los Angeles': { lat: 34.0522, lng: -118.2437 },
  'San Francisco': { lat: 37.7749, lng: -122.4194 },
  'Chicago': { lat: 41.8781, lng: -87.6298 },
  'Toronto': { lat: 43.6532, lng: -79.3832 },
  'Vancouver': { lat: 49.2827, lng: -123.1207 },
  'Mexico City': { lat: 19.4326, lng: -99.1332 },
  'Buenos Aires': { lat: -34.6037, lng: -58.3816 },
  'São Paulo': { lat: -23.5505, lng: -46.6333 },
  'Rio de Janeiro': { lat: -22.9068, lng: -43.1729 },
  
  // Asia Pacific
  'Tokyo': { lat: 35.6762, lng: 139.6503 },
  'Sydney': { lat: -33.8688, lng: 151.2093 },
  'Melbourne': { lat: -37.8136, lng: 144.9631 },
  'Dubai': { lat: 25.2048, lng: 55.2708 },
  'Singapore': { lat: 1.3521, lng: 103.8198 },
  'Bangkok': { lat: 13.7563, lng: 100.5018 },
  'Seoul': { lat: 37.5665, lng: 126.9780 },
  'Hong Kong': { lat: 22.3193, lng: 114.1694 },
  'Shanghai': { lat: 31.2304, lng: 121.4737 },
  'Beijing': { lat: 39.9042, lng: 116.4074 },
  'Mumbai': { lat: 19.0760, lng: 72.8777 },
  'Delhi': { lat: 28.7041, lng: 77.1025 },
  
  // Other
  'Istanbul': { lat: 41.0082, lng: 28.9784 },
  'Cairo': { lat: 30.0444, lng: 31.2357 },
  'Cape Town': { lat: -33.9249, lng: 18.4241 },
  'Johannesburg': { lat: -26.2041, lng: 28.0473 }
};

/**
 * Get coordinates with fallback to city coordinates
 */
export async function getCoordinatesWithFallback(
  address: string,
  cityName?: string
): Promise<Coordinates | null> {
  // First, check if we can extract a known city from the address
  const addressLower = address.toLowerCase();
  const cityFromAddress = Object.keys(CITY_COORDINATES).find(city => 
    addressLower.includes(city.toLowerCase())
  );
  
  // If we found a city in the address, use those coordinates with slight randomization
  // to prevent all markers from stacking on the same point
  if (cityFromAddress) {
    logger.info('API', 'Using fallback coordinates for city found in address', { 
      city: cityFromAddress, 
      address 
    });
    const baseCoords = CITY_COORDINATES[cityFromAddress];
    // Add small random offset to spread markers out (about 1-2km radius)
    const offsetLat = (Math.random() - 0.5) * 0.02;
    const offsetLng = (Math.random() - 0.5) * 0.02;
    return {
      lat: baseCoords.lat + offsetLat,
      lng: baseCoords.lng + offsetLng
    };
  }
  
  // Check if cityName is provided and has fallback
  if (cityName) {
    // Check exact match
    if (CITY_COORDINATES[cityName]) {
      logger.info('API', 'Using fallback coordinates for provided city', { cityName });
      const baseCoords = CITY_COORDINATES[cityName];
      // Add small random offset
      const offsetLat = (Math.random() - 0.5) * 0.015;
      const offsetLng = (Math.random() - 0.5) * 0.015;
      return {
        lat: baseCoords.lat + offsetLat,
        lng: baseCoords.lng + offsetLng
      };
    }
    
    // Check partial match in city name
    const cityNameLower = cityName.toLowerCase();
    const cityMatch = Object.keys(CITY_COORDINATES).find(city => 
      cityNameLower.includes(city.toLowerCase()) || 
      city.toLowerCase().includes(cityNameLower)
    );
    
    if (cityMatch) {
      logger.info('API', 'Using fallback coordinates for matched city', { 
        provided: cityName, 
        matched: cityMatch 
      });
      const baseCoords = CITY_COORDINATES[cityMatch];
      // Add small random offset
      const offsetLat = (Math.random() - 0.5) * 0.015;
      const offsetLng = (Math.random() - 0.5) * 0.015;
      return {
        lat: baseCoords.lat + offsetLat,
        lng: baseCoords.lng + offsetLng
      };
    }
  }
  
  // Only try geocoding if we don't have a fallback
  // This reduces API calls for known cities
  try {
    const geocoded = await geocodeAddress(address);
    if (geocoded) {
      return geocoded;
    }
  } catch (error) {
    logger.warn('API', 'Geocoding failed, will use fallback', { address });
  }
  
  // Last resort - try to find any city mentioned in the address
  const words = address.split(/[\s,]+/);
  for (const word of words) {
    if (word.length > 3) { // Skip short words
      const cityMatch = Object.keys(CITY_COORDINATES).find(city => 
        city.toLowerCase() === word.toLowerCase()
      );
      if (cityMatch) {
        logger.info('API', 'Using fallback coordinates for word match', { 
          word, 
          city: cityMatch 
        });
        return CITY_COORDINATES[cityMatch];
      }
    }
  }
  
  // If we still don't have coordinates and have a cityName, 
  // return a default for that city even if not in our list
  if (cityName && cityName.length > 0) {
    // Return center of London as ultimate fallback
    logger.warn('API', 'Using London as ultimate fallback', { cityName, address });
    return CITY_COORDINATES['London'];
  }
  
  return null;
}