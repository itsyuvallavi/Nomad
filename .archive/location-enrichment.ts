/**
 * Location Enrichment Service
 * Combines OpenAI's itinerary generation with Radar's real place data
 */

import { radarPlaces, enrichActivityWithRadarData } from '@/lib/api/radar-places';
import type { GeneratePersonalizedItineraryOutput, Itinerary, Day } from '@/services/ai/schemas';

interface EnrichmentOptions {
  useRadar?: boolean;
  useGooglePlaces?: boolean;
  maxPlacesPerActivity?: number;
}

/**
 * Enrich an AI-generated itinerary with real place data from Radar
 */
export async function enrichItineraryWithRealPlaces(
  itinerary: GeneratePersonalizedItineraryOutput | Itinerary,
  options: EnrichmentOptions = { useRadar: true }
): Promise<GeneratePersonalizedItineraryOutput | Itinerary> {
  if (!options.useRadar) {
    return itinerary;
  }

  console.log('Enriching itinerary with Radar place data...');

  try {
    // Process each day
    const enrichedDays = await Promise.all(
      itinerary.itinerary.map(async (day) => {
        // First, try to get coordinates for the destination
        const destination = ('_destination' in day ? day._destination : undefined) || day.title;
        let cityCoords: { lat: number; lng: number } | null = null;

        // Try to geocode the destination
        if (destination) {
          cityCoords = await radarPlaces.geocodeAddress(destination);
          console.log(`Geocoded ${destination}:`, cityCoords);
        }

        if (!cityCoords) {
          // Fallback to some default coordinates based on destination name
          cityCoords = getDefaultCityCoordinates(destination);
        }

        if (!cityCoords) {
          console.warn(`Could not geocode destination: ${destination}`);
          return day; // Return unchanged if we can't geocode
        }

        // Enrich each activity with real place data
        const enrichedActivities = await Promise.all(
          day.activities.map(async (activity) => {
            try {
              // Convert activity to the format expected by enrichActivityWithRadarData
              const activityForEnrichment = {
                description: activity.description,
                category: activity.category as string,
                address: activity.address || undefined,
                time: activity.time || ''
              };
              const enriched = await enrichActivityWithRadarData(activityForEnrichment, cityCoords!);
              // Merge enriched data back with original activity, preserving the correct type
              return {
                ...activity,
                ...enriched,
                category: activity.category // Preserve the original typed category
              };
            } catch (error) {
              console.error('Error enriching activity:', error);
              return activity; // Return original if enrichment fails
            }
          })
        );

        return {
          ...day,
          activities: enrichedActivities,
          _coordinates: cityCoords, // Add city coordinates to the day
        } as Day & { _coordinates: { lat: number; lng: number } };
      })
    );

    return {
      ...itinerary,
      itinerary: enrichedDays,
      _enrichedWithRadar: true,
    } as typeof itinerary & { _enrichedWithRadar: true };
  } catch (error) {
    console.error('Error enriching itinerary:', error);
    return itinerary; // Return original if enrichment fails
  }
}

/**
 * Get city coordinates for major cities (fallback)
 */
function getDefaultCityCoordinates(cityName: string): { lat: number; lng: number } | null {
  const cities: Record<string, { lat: number; lng: number }> = {
    'London': { lat: 51.5074, lng: -0.1278 },
    'Paris': { lat: 48.8566, lng: 2.3522 },
    'Tokyo': { lat: 35.6762, lng: 139.6503 },
    'New York': { lat: 40.7128, lng: -74.0060 },
    'Brazil': { lat: -22.9068, lng: -43.1729 },
    'Argentina': { lat: -34.6037, lng: -58.3816 },
    'Chile': { lat: -33.4489, lng: -70.6693 },
    'Rio de Janeiro': { lat: -22.9068, lng: -43.1729 },
    'Buenos Aires': { lat: -34.6037, lng: -58.3816 },
    'Santiago': { lat: -33.4489, lng: -70.6693 },
    'Bali': { lat: -8.3405, lng: 115.0920 },
    'Bangkok': { lat: 13.7563, lng: 100.5018 },
    'Singapore': { lat: 1.3521, lng: 103.8198 },
    'Dubai': { lat: 25.2048, lng: 55.2708 },
    'Sydney': { lat: -33.8688, lng: 151.2093 },
  };

  // Try exact match
  if (cities[cityName]) {
    return cities[cityName];
  }

  // Try partial match
  const lowerCity = cityName.toLowerCase();
  for (const [key, coords] of Object.entries(cities)) {
    if (key.toLowerCase().includes(lowerCity) || lowerCity.includes(key.toLowerCase())) {
      return coords;
    }
  }

  return null;
}

/**
 * Search for specific places using Radar
 */
export async function searchSpecificPlaces(
  query: string,
  location: { lat: number; lng: number },
  category?: string
): Promise<any[]> {
  const places = await radarPlaces.searchPlaces(query, {
    near: { latitude: location.lat, longitude: location.lng },
    radius: 5000,
    limit: 5,
    ...(category && { categories: [category] }),
  });

  return places.map(place => ({
    name: place.name,
    address: place.address.formattedAddress,
    coordinates: {
      lat: place.location.coordinates[1],
      lng: place.location.coordinates[0],
    },
    categories: place.categories,
  }));
}

/**
 * Get recommendations for a destination
 */
export async function getDestinationRecommendations(
  destination: string,
  preferences?: {
    foodPreferences?: string[];
    interests?: string[];
    budget?: 'budget' | 'mid-range' | 'luxury';
  }
): Promise<{
  restaurants: any[];
  attractions: any[];
  coworkingSpaces: any[];
  hotels: any[];
}> {
  // First geocode the destination
  const coords = await radarPlaces.geocodeAddress(destination);
  if (!coords) {
    console.error(`Could not geocode destination: ${destination}`);
    return {
      restaurants: [],
      attractions: [],
      coworkingSpaces: [],
      hotels: [],
    };
  }

  // Get various types of places
  const [restaurants, attractions, coworkingSpaces, hotels] = await Promise.all([
    radarPlaces.findRestaurants(coords),
    radarPlaces.findAttractions(coords),
    radarPlaces.findCoworkingSpaces(coords),
    radarPlaces.findHotels(coords),
  ]);

  return {
    restaurants: restaurants.slice(0, 5),
    attractions: attractions.slice(0, 5),
    coworkingSpaces: coworkingSpaces.slice(0, 3),
    hotels: hotels.slice(0, 5),
  };
}