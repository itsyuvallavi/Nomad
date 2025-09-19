/**
 * Zone-Based Activity Planner
 * Groups activities by neighborhood to minimize travel distance
 */

import { logger } from '@/lib/monitoring/logger';

export interface Zone {
  name: string;
  coordinates: { lat: number; lng: number };
  neighborhoods: string[];
  priority?: number; // Lower number = visit earlier
}

export interface Activity {
  time?: string;
  description: string;
  venue_name?: string;
  venue_search?: string;
  category?: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
  neighborhood?: string;
  zone?: string;
}

export interface DayPlan {
  day: number;
  activities: Activity[];
  totalDistance?: number;
  zones?: string[];
}

/**
 * City zones database - defines neighborhoods and their relationships
 */
const cityZonesDatabase: Record<string, Zone[]> = {
  'paris': [
    {
      name: 'Central Paris',
      coordinates: { lat: 48.8566, lng: 2.3522 },
      neighborhoods: ['1st arr.', '2nd arr.', 'Louvre', 'Palais Royal', 'Les Halles'],
      priority: 1
    },
    {
      name: 'Latin Quarter',
      coordinates: { lat: 48.8462, lng: 2.3464 },
      neighborhoods: ['5th arr.', '6th arr.', 'Latin Quarter', 'Saint-Germain', 'Saint-Germain-des-Prés'],
      priority: 2
    },
    {
      name: 'Marais',
      coordinates: { lat: 48.8570, lng: 2.3590 },
      neighborhoods: ['3rd arr.', '4th arr.', 'Marais', 'Le Marais', 'Île de la Cité'],
      priority: 2
    },
    {
      name: 'Eiffel Tower Area',
      coordinates: { lat: 48.8584, lng: 2.2945 },
      neighborhoods: ['7th arr.', 'Champ de Mars', 'Invalides', 'Trocadéro'],
      priority: 1
    },
    {
      name: 'Champs-Élysées',
      coordinates: { lat: 48.8738, lng: 2.2950 },
      neighborhoods: ['8th arr.', 'Champs-Élysées', 'Arc de Triomphe', 'Opéra'],
      priority: 1
    },
    {
      name: 'Montmartre',
      coordinates: { lat: 48.8867, lng: 2.3431 },
      neighborhoods: ['18th arr.', 'Montmartre', 'Pigalle', 'Sacré-Cœur'],
      priority: 3
    }
  ],

  'london': [
    {
      name: 'Westminster',
      coordinates: { lat: 51.4994, lng: -0.1248 },
      neighborhoods: ['Westminster', 'Big Ben', 'Buckingham Palace', 'St James'],
      priority: 1
    },
    {
      name: 'South Bank',
      coordinates: { lat: 51.5033, lng: -0.1195 },
      neighborhoods: ['South Bank', 'Southwark', 'London Eye', 'Tate Modern'],
      priority: 2
    },
    {
      name: 'City of London',
      coordinates: { lat: 51.5155, lng: -0.0922 },
      neighborhoods: ['City of London', 'Tower Hill', 'Tower Bridge', 'St Pauls'],
      priority: 2
    },
    {
      name: 'West End',
      coordinates: { lat: 51.5138, lng: -0.1277 },
      neighborhoods: ['Soho', 'Covent Garden', 'Leicester Square', 'Piccadilly'],
      priority: 1
    },
    {
      name: 'Kensington',
      coordinates: { lat: 51.5020, lng: -0.1947 },
      neighborhoods: ['South Kensington', 'Knightsbridge', 'Hyde Park', 'Chelsea'],
      priority: 3
    },
    {
      name: 'Camden',
      coordinates: { lat: 51.5391, lng: -0.1426 },
      neighborhoods: ['Camden', 'Regents Park', 'Kings Cross', 'Bloomsbury'],
      priority: 3
    }
  ],

  'tokyo': [
    {
      name: 'Central Tokyo',
      coordinates: { lat: 35.6812, lng: 139.7671 },
      neighborhoods: ['Ginza', 'Tokyo Station', 'Marunouchi', 'Imperial Palace'],
      priority: 1
    },
    {
      name: 'Shibuya-Shinjuku',
      coordinates: { lat: 35.6580, lng: 139.7016 },
      neighborhoods: ['Shibuya', 'Shinjuku', 'Harajuku', 'Omotesando'],
      priority: 1
    },
    {
      name: 'Asakusa',
      coordinates: { lat: 35.7148, lng: 139.7967 },
      neighborhoods: ['Asakusa', 'Ueno', 'Tokyo Skytree', 'Sumida'],
      priority: 2
    },
    {
      name: 'Roppongi-Minato',
      coordinates: { lat: 35.6627, lng: 139.7316 },
      neighborhoods: ['Roppongi', 'Minato', 'Tokyo Tower', 'Azabu'],
      priority: 2
    }
  ],

  'new york': [
    {
      name: 'Midtown',
      coordinates: { lat: 40.7549, lng: -73.9840 },
      neighborhoods: ['Midtown', 'Times Square', 'Empire State', 'Fifth Avenue'],
      priority: 1
    },
    {
      name: 'Downtown',
      coordinates: { lat: 40.7128, lng: -74.0060 },
      neighborhoods: ['Financial District', 'Wall Street', 'Battery Park', 'Tribeca'],
      priority: 2
    },
    {
      name: 'Village',
      coordinates: { lat: 40.7336, lng: -74.0027 },
      neighborhoods: ['Greenwich Village', 'SoHo', 'East Village', 'West Village'],
      priority: 2
    },
    {
      name: 'Upper East Side',
      coordinates: { lat: 40.7736, lng: -73.9566 },
      neighborhoods: ['Upper East Side', 'Museum Mile', 'Central Park East'],
      priority: 3
    },
    {
      name: 'Upper West Side',
      coordinates: { lat: 40.7870, lng: -73.9754 },
      neighborhoods: ['Upper West Side', 'Lincoln Center', 'Central Park West'],
      priority: 3
    }
  ]
};

/**
 * Calculate distance between two coordinates
 */
function calculateDistance(coord1: { lat: number; lng: number }, coord2: { lat: number; lng: number }): number {
  const R = 6371; // km
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 180;
  const dLng = (coord2.lng - coord1.lng) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(coord1.lat * Math.PI / 180) * Math.cos(coord2.lat * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

/**
 * Find the zone for an activity based on its neighborhood or coordinates
 */
export function findZoneForActivity(city: string, activity: Activity): Zone | null {
  const cityZones = cityZonesDatabase[city.toLowerCase()];
  if (!cityZones) return null;

  // First try to match by neighborhood
  if (activity.neighborhood) {
    const neighborhoodLower = activity.neighborhood.toLowerCase();
    for (const zone of cityZones) {
      if (zone.neighborhoods.some(n => neighborhoodLower.includes(n.toLowerCase()))) {
        return zone;
      }
    }
  }

  // If no neighborhood match and we have coordinates, find closest zone
  if (activity.coordinates) {
    let closestZone = cityZones[0];
    let minDistance = Infinity;

    for (const zone of cityZones) {
      const distance = calculateDistance(activity.coordinates, zone.coordinates);
      if (distance < minDistance) {
        minDistance = distance;
        closestZone = zone;
      }
    }

    return closestZone;
  }

  return null;
}

/**
 * Group activities by zone
 */
export function groupActivitiesByZone(city: string, activities: Activity[]): Map<string, Activity[]> {
  const zoneMap = new Map<string, Activity[]>();
  const unzoned: Activity[] = [];

  for (const activity of activities) {
    const zone = findZoneForActivity(city, activity);
    if (zone) {
      const zoneName = zone.name;
      if (!zoneMap.has(zoneName)) {
        zoneMap.set(zoneName, []);
      }
      zoneMap.get(zoneName)!.push({
        ...activity,
        zone: zoneName
      });
    } else {
      unzoned.push(activity);
    }
  }

  // Add unzoned activities to a special group
  if (unzoned.length > 0) {
    zoneMap.set('Other', unzoned);
  }

  return zoneMap;
}

/**
 * Optimize activity order within a day to minimize travel
 */
export function optimizeDayActivities(city: string, activities: Activity[]): Activity[] {
  const zoneGroups = groupActivitiesByZone(city, activities);
  const cityZones = cityZonesDatabase[city.toLowerCase()] || [];

  // Sort zones by priority
  const sortedZones = Array.from(zoneGroups.keys()).sort((a, b) => {
    const zoneA = cityZones.find(z => z.name === a);
    const zoneB = cityZones.find(z => z.name === b);
    const priorityA = zoneA?.priority || 999;
    const priorityB = zoneB?.priority || 999;
    return priorityA - priorityB;
  });

  // Rebuild activities list with zone grouping
  const optimizedActivities: Activity[] = [];
  const timeSlots = ['9:00 AM', '11:00 AM', '1:00 PM', '3:00 PM', '6:00 PM', '8:00 PM'];
  let timeIndex = 0;

  for (const zoneName of sortedZones) {
    const zoneActivities = zoneGroups.get(zoneName) || [];

    // Sort activities within zone by category (attractions first, then food)
    zoneActivities.sort((a, b) => {
      const categoryOrder: Record<string, number> = {
        'Attraction': 1,
        'Museum': 2,
        'Park': 3,
        'Shopping': 4,
        'Food': 5,
        'Leisure': 6
      };
      const orderA = categoryOrder[a.category || 'Other'] || 7;
      const orderB = categoryOrder[b.category || 'Other'] || 7;
      return orderA - orderB;
    });

    // Add activities with appropriate times
    for (const activity of zoneActivities) {
      optimizedActivities.push({
        ...activity,
        time: timeSlots[timeIndex % timeSlots.length]
      });
      timeIndex++;
    }
  }

  return optimizedActivities;
}

/**
 * Calculate total travel distance for a day
 */
export function calculateDayDistance(activities: Activity[]): number {
  let totalDistance = 0;

  for (let i = 0; i < activities.length - 1; i++) {
    if (activities[i].coordinates && activities[i + 1].coordinates) {
      totalDistance += calculateDistance(
        activities[i].coordinates!,
        activities[i + 1].coordinates!
      );
    }
  }

  return totalDistance;
}

/**
 * Optimize an entire itinerary
 */
export function optimizeItinerary(city: string, days: DayPlan[]): DayPlan[] {
  const optimizedDays: DayPlan[] = [];

  for (const day of days) {
    const optimizedActivities = optimizeDayActivities(city, day.activities);
    const totalDistance = calculateDayDistance(optimizedActivities);
    const zones = [...new Set(optimizedActivities.map(a => a.zone).filter(Boolean))];

    optimizedDays.push({
      ...day,
      activities: optimizedActivities,
      totalDistance,
      zones: zones as string[]
    });

    logger.info('AI', `Day ${day.day} optimized`, {
      originalActivities: day.activities.length,
      totalDistance: `${totalDistance.toFixed(2)} km`,
      zonesVisited: zones.length,
      zones: zones.join(', ')
    });
  }

  return optimizedDays;
}

/**
 * Get zone recommendations for a specific day
 */
export function getZoneRecommendations(city: string, dayNumber: number): Zone[] {
  const cityZones = cityZonesDatabase[city.toLowerCase()];
  if (!cityZones) return [];

  // Recommend zones based on day number and priority
  const maxZonesPerDay = 2; // Visit max 2 zones per day for efficiency

  // Sort by priority
  const sortedZones = [...cityZones].sort((a, b) => (a.priority || 999) - (b.priority || 999));

  // Calculate which zones to visit on this day
  const startIndex = (dayNumber - 1) * maxZonesPerDay;
  const endIndex = startIndex + maxZonesPerDay;

  return sortedZones.slice(startIndex, endIndex);
}

export default {
  findZoneForActivity,
  groupActivitiesByZone,
  optimizeDayActivities,
  calculateDayDistance,
  optimizeItinerary,
  getZoneRecommendations
};