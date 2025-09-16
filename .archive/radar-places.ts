/**
 * Radar Places API Integration
 * Provides geocoding, places search, and location enrichment
 */

import Radar from 'radar-sdk-js';

// Initialize Radar with the secret key for server-side operations
const RADAR_SECRET_KEY = process.env.RADAR_API_SECRET_KEY;
const RADAR_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_RADAR_PUBLISHABLE_KEY;

interface RadarPlace {
  _id: string;
  name: string;
  categories: string[];
  address: {
    addressLabel?: string;
    city?: string;
    country?: string;
    countryCode?: string;
    formattedAddress?: string;
    latitude?: number;
    longitude?: number;
  };
  location: {
    coordinates: [number, number]; // [longitude, latitude]
  };
  chain?: {
    name: string;
    slug: string;
  };
}

interface SearchOptions {
  near?: {
    latitude: number;
    longitude: number;
  };
  radius?: number; // in meters
  chains?: string[]; // filter by chain slugs
  categories?: string[]; // filter by categories
  limit?: number;
}

export class RadarPlacesService {
  private apiKey: string;
  
  constructor() {
    this.apiKey = RADAR_SECRET_KEY || '';
    if (!this.apiKey) {
      console.warn('Radar API key not configured');
    }
  }

  /**
   * Search for places near a location
   */
  async searchPlaces(query: string, options: SearchOptions = {}): Promise<RadarPlace[]> {
    try {
      const params = new URLSearchParams({
        query,
        ...(options.limit && { limit: options.limit.toString() }),
        ...(options.radius && { radius: options.radius.toString() }),
        ...(options.categories && { categories: options.categories.join(',') }),
      });

      if (options.near) {
        params.append('near', `${options.near.latitude},${options.near.longitude}`);
      }

      const response = await fetch(`https://api.radar.io/v1/search/places?${params}`, {
        headers: {
          'Authorization': this.apiKey,
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Radar API rate limit exceeded, returning empty results');
          return [];
        }
        throw new Error(`Radar API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.places || [];
    } catch (error) {
      console.error('Radar Places search error:', error);
      return [];
    }
  }

  /**
   * Geocode an address to coordinates
   */
  async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const response = await fetch(`https://api.radar.io/v1/geocode/forward?query=${encodeURIComponent(address)}`, {
        headers: {
          'Authorization': this.apiKey,
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Radar Geocoding API rate limit exceeded');
          return null;
        }
        throw new Error(`Radar Geocoding error: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.addresses && data.addresses.length > 0) {
        const result = data.addresses[0];
        return {
          lat: result.latitude,
          lng: result.longitude,
        };
      }
      return null;
    } catch (error) {
      console.error('Radar Geocoding error:', error);
      return null;
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    try {
      const response = await fetch(`https://api.radar.io/v1/geocode/reverse?coordinates=${lat},${lng}`, {
        headers: {
          'Authorization': this.apiKey,
        },
      });

      if (!response.ok) {
        throw new Error(`Radar Reverse Geocoding error: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.addresses && data.addresses.length > 0) {
        return data.addresses[0].formattedAddress;
      }
      return null;
    } catch (error) {
      console.error('Radar Reverse Geocoding error:', error);
      return null;
    }
  }

  /**
   * Search for restaurants near a location
   */
  async findRestaurants(near: { lat: number; lng: number }, cuisine?: string): Promise<RadarPlace[]> {
    const query = cuisine ? `${cuisine} restaurant` : 'restaurant';
    return this.searchPlaces(query, {
      near: { latitude: near.lat, longitude: near.lng },
      categories: ['food-beverage', 'restaurant', 'cafe'],
      radius: 5000, // 5km radius
      limit: 10,
    });
  }

  /**
   * Search for tourist attractions
   */
  async findAttractions(near: { lat: number; lng: number }): Promise<RadarPlace[]> {
    return this.searchPlaces('tourist attractions', {
      near: { latitude: near.lat, longitude: near.lng },
      categories: ['arts-entertainment', 'landmark-attraction', 'museum', 'park'],
      radius: 10000, // 10km radius
      limit: 10,
    });
  }

  /**
   * Search for coworking spaces
   */
  async findCoworkingSpaces(near: { lat: number; lng: number }): Promise<RadarPlace[]> {
    return this.searchPlaces('coworking space', {
      near: { latitude: near.lat, longitude: near.lng },
      categories: ['office', 'coworking'],
      radius: 5000, // 5km radius
      limit: 10,
    });
  }

  /**
   * Search for hotels
   */
  async findHotels(near: { lat: number; lng: number }): Promise<RadarPlace[]> {
    return this.searchPlaces('hotel', {
      near: { latitude: near.lat, longitude: near.lng },
      categories: ['hotel-lodging', 'hotel'],
      radius: 10000, // 10km radius
      limit: 10,
    });
  }
}

// Singleton instance
export const radarPlaces = new RadarPlacesService();

/**
 * Helper function to enrich AI-generated activities with real places from Radar
 */
export async function enrichActivityWithRadarData(activity: {
  description: string;
  category: string;
  address?: string;
  time: string;
}, cityCoordinates: { lat: number; lng: number }) {
  const radar = new RadarPlacesService();
  
  // Determine what to search for based on category
  let places: RadarPlace[] = [];
  
  if (activity.category.toLowerCase().includes('food') || 
      activity.description.toLowerCase().includes('restaurant') ||
      activity.description.toLowerCase().includes('lunch') ||
      activity.description.toLowerCase().includes('dinner') ||
      activity.description.toLowerCase().includes('breakfast')) {
    places = await radar.findRestaurants(cityCoordinates);
  } else if (activity.category.toLowerCase().includes('attraction') ||
             activity.category.toLowerCase().includes('leisure')) {
    places = await radar.findAttractions(cityCoordinates);
  } else if (activity.description.toLowerCase().includes('work') ||
             activity.description.toLowerCase().includes('cowork')) {
    places = await radar.findCoworkingSpaces(cityCoordinates);
  } else if (activity.category.toLowerCase().includes('accommodation') ||
             activity.description.toLowerCase().includes('hotel')) {
    places = await radar.findHotels(cityCoordinates);
  }

  // If we found relevant places, enrich the activity
  if (places.length > 0) {
    const place = places[0]; // Take the first/best result
    return {
      ...activity,
      venue_name: place.name,
      address: place.address?.formattedAddress || activity.address,
      coordinates: {
        lat: place.location.coordinates[1],
        lng: place.location.coordinates[0],
      },
      radar_place_id: place._id,
    };
  }

  // If no places found but we have an address, try to geocode it
  if (activity.address) {
    const coords = await radar.geocodeAddress(activity.address);
    if (coords) {
      return {
        ...activity,
        coordinates: coords,
      };
    }
  }

  return activity;
}