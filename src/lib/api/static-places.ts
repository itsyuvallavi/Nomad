/**
 * Static Places API - Uses pre-generated activity data for testing
 * Eliminates API costs during testing while maintaining functionality
 */

import staticActivities from '../../../data/static/static-activities.json';
import { logger } from '@/lib/logger';

export interface StaticActivity {
  description: string;
  category: string;
  venue_name: string;
  address: string;
  rating: number;
  tips: string;
}

/**
 * Get activities for a destination from static data
 */
export function getStaticActivities(destination: string, category?: string): StaticActivity[] {
  const normalizedDestination = destination.charAt(0).toUpperCase() + destination.slice(1).toLowerCase();
  
  const destinationData = staticActivities[normalizedDestination as keyof typeof staticActivities];
  
  if (!destinationData) {
    logger.warn('Static Places', `No static data found for destination: ${destination}`);
    return [];
  }

  if (category) {
    const categoryData = destinationData[category as keyof typeof destinationData];
    return Array.isArray(categoryData) ? categoryData : [];
  }

  // Return all activities from all categories
  const allActivities: StaticActivity[] = [];
  Object.values(destinationData).forEach(categoryActivities => {
    if (Array.isArray(categoryActivities)) {
      allActivities.push(...categoryActivities);
    }
  });

  return allActivities;
}

/**
 * Get random activities by category
 */
export function getRandomStaticActivities(
  destination: string, 
  category: string, 
  count: number = 5
): StaticActivity[] {
  const activities = getStaticActivities(destination, category);
  
  if (activities.length === 0) {
    return [];
  }

  // Shuffle and take requested count
  const shuffled = [...activities].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Search activities by query in static data
 */
export function searchStaticActivities(
  destination: string, 
  query: string, 
  limit: number = 10
): StaticActivity[] {
  const allActivities = getStaticActivities(destination);
  const queryLower = query.toLowerCase();
  
  const matches = allActivities.filter(activity => 
    activity.description.toLowerCase().includes(queryLower) ||
    activity.venue_name.toLowerCase().includes(queryLower) ||
    activity.category.toLowerCase().includes(queryLower)
  );

  return matches.slice(0, limit);
}

/**
 * Check if static data is available for a destination
 */
export function hasStaticData(destination: string): boolean {
  const normalizedDestination = destination.charAt(0).toUpperCase() + destination.slice(1).toLowerCase();
  return normalizedDestination in staticActivities;
}

/**
 * Get available destinations in static data
 */
export function getAvailableDestinations(): string[] {
  return Object.keys(staticActivities);
}

/**
 * Convert static activity to Google Places format for compatibility
 */
export function formatAsGooglePlace(activity: StaticActivity) {
  return {
    name: activity.venue_name,
    formatted_address: activity.address,
    rating: activity.rating,
    geometry: {
      location: { lat: 0, lng: 0 } // Placeholder coordinates
    },
    place_id: `static_${activity.venue_name.replace(/\s+/g, '_').toLowerCase()}`,
    types: [activity.category.toLowerCase()],
    opening_hours: { open_now: true },
    price_level: 2,
    photos: [],
    reviews: []
  };
}