// Foursquare Places API integration
const FOURSQUARE_API_KEY = process.env.FOURSQUARE_API_KEY;
const FOURSQUARE_BASE_URL = 'https://api.foursquare.com/v3/places';

export interface FoursquarePlace {
  fsq_id: string;
  name: string;
  location: {
    address?: string;
    formatted_address: string;
    locality?: string;
    postcode?: string;
    country?: string;
  };
  categories: Array<{
    id: number;
    name: string;
    icon: {
      prefix: string;
      suffix: string;
    };
  }>;
  distance?: number;
  rating?: number;
  price?: number;
  hours?: {
    display: string;
    is_local_holiday: boolean;
    open_now: boolean;
  };
  website?: string;
  tel?: string;
  description?: string;
}

export async function searchPlaces(
  query: string,
  near: string,
  categories?: string,
  limit: number = 10
): Promise<FoursquarePlace[]> {
  console.log('🔍 [FOURSQUARE API] Searching places:', {
    query,
    near,
    categories,
    limit
  });

  if (!FOURSQUARE_API_KEY) {
    console.error('❌ [FOURSQUARE API] No API key configured');
    throw new Error('Foursquare API key not configured');
  }

  const params = new URLSearchParams({
    query,
    near,
    limit: limit.toString(),
    ...(categories && { categories })
  });

  const url = `${FOURSQUARE_BASE_URL}/search?${params}`;
  console.log('📡 [FOURSQUARE API] Request URL:', url);

  const response = await fetch(url, {
    headers: {
      'Authorization': FOURSQUARE_API_KEY,
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    console.error('❌ [FOURSQUARE API] Error:', response.status, response.statusText);
    throw new Error(`Foursquare API error: ${response.statusText}`);
  }

  const data = await response.json();
  console.log(`✅ [FOURSQUARE API] Found ${data.results?.length || 0} places`);
  
  // Log first 3 results for debugging
  if (data.results && data.results.length > 0) {
    console.log('📍 [FOURSQUARE API] Sample results:', data.results.slice(0, 3).map((p: any) => ({
      name: p.name,
      address: p.location?.formatted_address,
      category: p.categories?.[0]?.name
    })));
  }
  
  return data.results;
}

// Category IDs for different types of places
export const FOURSQUARE_CATEGORIES = {
  // Accommodation
  HOTELS: '19014', // Hotels
  HOSTELS: '19006', // Hostels
  
  // Food & Drink
  RESTAURANTS: '13065', // Restaurants
  CAFES: '13032,13034,13035', // Coffee shops, cafes
  BARS: '13003', // Bars
  
  // Work
  COWORKING: '12081', // Coworking spaces
  WIFI_SPOTS: '13032,13034,13035', // Cafes with WiFi
  
  // Tourism
  TOURIST_ATTRACTIONS: '10000', // Arts and Entertainment
  MUSEUMS: '10027', // Museums
  LANDMARKS: '16000', // Landmarks and Outdoors
  SHOPPING: '17000', // Retail
  NIGHTLIFE: '10032', // Nightlife
  
  // Transportation
  AIRPORTS: '19040', // Airports
  TRAIN_STATIONS: '19043', // Train stations
  BUS_STATIONS: '19044', // Bus stations
};

// Helper function to get places by category
export async function getPlacesByCategory(
  destination: string,
  category: string,
  limit: number = 5
): Promise<FoursquarePlace[]> {
  return searchPlaces('', destination, category, limit);
}

// Get accommodation options
export async function findAccommodation(
  destination: string,
  priceLevel?: number // 1-4 scale
): Promise<FoursquarePlace[]> {
  const hotels = await getPlacesByCategory(destination, FOURSQUARE_CATEGORIES.HOTELS, 10);
  
  // Filter by price if specified
  if (priceLevel && hotels.length > 0) {
    return hotels.filter(h => !h.price || h.price <= priceLevel);
  }
  
  return hotels;
}

// Get restaurants
export async function findRestaurants(
  destination: string,
  mealType?: 'breakfast' | 'lunch' | 'dinner',
  limit: number = 5
): Promise<FoursquarePlace[]> {
  const query = mealType || 'restaurant';
  return searchPlaces(query, destination, FOURSQUARE_CATEGORIES.RESTAURANTS, limit);
}

// Get coworking spaces and cafes with WiFi
export async function findWorkspaces(
  destination: string,
  limit: number = 5
): Promise<FoursquarePlace[]> {
  const coworking = await getPlacesByCategory(destination, FOURSQUARE_CATEGORIES.COWORKING, 3);
  const cafes = await searchPlaces('wifi coffee', destination, FOURSQUARE_CATEGORIES.CAFES, limit - 3);
  
  return [...coworking, ...cafes];
}

// Get tourist attractions
export async function findAttractions(
  destination: string,
  limit: number = 10
): Promise<FoursquarePlace[]> {
  const attractions = await searchPlaces('things to do', destination, FOURSQUARE_CATEGORIES.TOURIST_ATTRACTIONS, limit);
  const landmarks = await getPlacesByCategory(destination, FOURSQUARE_CATEGORIES.LANDMARKS, 5);
  
  // Combine and deduplicate
  const combined = [...attractions, ...landmarks];
  const unique = Array.from(new Map(combined.map(item => [item.fsq_id, item])).values());
  
  return unique.slice(0, limit);
}
