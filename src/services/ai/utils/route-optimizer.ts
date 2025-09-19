/**
 * Route Optimization Service
 * Optimizes the order of activities to minimize travel distance and time
 */

import { calculateDistance } from '@/services/api/openstreetmap';
import { logger } from '@/lib/monitoring/logger';

// Use 'API' as the log category for route optimization logs
const LOG_CATEGORY = 'API' as const;

export interface ActivityWithLocation {
  venue_name: string;
  coordinates?: { lat: number; lng: number };
  time_slot: 'morning' | 'afternoon' | 'evening';
  duration_hours: number;
  address?: string;
  activity?: string;
}

export interface RouteValidation {
  isEfficient: boolean;
  totalDistance: number;
  warnings: string[];
  segments: Array<{
    from: string;
    to: string;
    distance: number;
  }>;
}

/**
 * Optimize route for a day's activities
 * Maintains time slot structure while optimizing within each slot
 */
export async function optimizeRoute(activities: ActivityWithLocation[]): Promise<ActivityWithLocation[]> {
  if (activities.length <= 1) {
    return activities;
  }

  logger.info(LOG_CATEGORY, `Optimizing route for ${activities.length} activities`);

  // Group by time slots first (maintain morning/afternoon/evening structure)
  const timeGroups: Record<string, ActivityWithLocation[]> = {
    morning: [],
    afternoon: [],
    evening: [],
  };

  activities.forEach(activity => {
    const slot = activity.time_slot || 'morning';
    timeGroups[slot].push(activity);
  });

  // Optimize within each time slot
  const optimized: ActivityWithLocation[] = [];

  for (const slot of ['morning', 'afternoon', 'evening'] as const) {
    const group = timeGroups[slot];
    if (group.length === 0) continue;

    if (group.length === 1) {
      optimized.push(...group);
    } else {
      // Use nearest neighbor algorithm for optimization
      const sorted = nearestNeighborSort(group);
      optimized.push(...sorted);
    }
  }

  logger.info(LOG_CATEGORY, `Route optimized: ${activities.length} → ${optimized.length} activities`);
  return optimized;
}

/**
 * Sort activities using nearest neighbor algorithm
 * Starts with first activity and always visits the nearest unvisited one
 */
function nearestNeighborSort(activities: ActivityWithLocation[]): ActivityWithLocation[] {
  if (activities.length <= 1) return activities;

  const sorted: ActivityWithLocation[] = [activities[0]];
  const remaining = [...activities.slice(1)];

  while (remaining.length > 0) {
    const current = sorted[sorted.length - 1];
    let nearestIndex = 0;
    let nearestDistance = Infinity;

    // Find nearest unvisited activity
    remaining.forEach((activity, index) => {
      if (current.coordinates && activity.coordinates) {
        const distance = calculateDistance(
          current.coordinates.lat,
          current.coordinates.lng,
          activity.coordinates.lat,
          activity.coordinates.lng
        );
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      }
    });

    // Add nearest to sorted and remove from remaining
    sorted.push(remaining[nearestIndex]);
    remaining.splice(nearestIndex, 1);
  }

  return sorted;
}

/**
 * Optimize route using 2-opt algorithm for better results
 * Iteratively improves the route by swapping segments
 */
export function twoOptOptimization(activities: ActivityWithLocation[]): ActivityWithLocation[] {
  if (activities.length <= 3) return activities;

  let improved = true;
  let route = [...activities];
  let bestDistance = calculateTotalDistance(route);

  while (improved) {
    improved = false;

    for (let i = 1; i < route.length - 2; i++) {
      for (let j = i + 1; j < route.length; j++) {
        if (j - i === 1) continue;

        const newRoute = [...route];
        // Reverse the segment between i and j
        const reversed = newRoute.slice(i, j).reverse();
        newRoute.splice(i, j - i, ...reversed);

        const newDistance = calculateTotalDistance(newRoute);
        if (newDistance < bestDistance) {
          route = newRoute;
          bestDistance = newDistance;
          improved = true;
        }
      }
    }
  }

  return route;
}

/**
 * Calculate total distance for a route
 */
function calculateTotalDistance(activities: ActivityWithLocation[]): number {
  let total = 0;

  for (let i = 0; i < activities.length - 1; i++) {
    if (activities[i].coordinates && activities[i + 1].coordinates) {
      total += calculateDistance(
        activities[i].coordinates!.lat,
        activities[i].coordinates!.lng,
        activities[i + 1].coordinates!.lat,
        activities[i + 1].coordinates!.lng
      );
    }
  }

  return total;
}

/**
 * Validate route efficiency and identify potential issues
 */
export function validateRouteEfficiency(activities: ActivityWithLocation[]): RouteValidation {
  const warnings: string[] = [];
  const segments: RouteValidation['segments'] = [];
  let totalDistance = 0;

  for (let i = 0; i < activities.length - 1; i++) {
    if (activities[i].coordinates && activities[i + 1].coordinates) {
      const distance = calculateDistance(
        activities[i].coordinates!.lat,
        activities[i].coordinates!.lng,
        activities[i + 1].coordinates!.lat,
        activities[i + 1].coordinates!.lng
      );

      totalDistance += distance;
      segments.push({
        from: activities[i].venue_name,
        to: activities[i + 1].venue_name,
        distance: Math.round(distance),
      });

      // Warn if activities are too far apart
      if (distance > 5000) { // More than 5km
        warnings.push(
          `⚠️ Long distance: ${activities[i].venue_name} → ${activities[i + 1].venue_name} (${(distance / 1000).toFixed(1)}km)`
        );
      }

      // Warn if consecutive activities in same time slot are far
      if (activities[i].time_slot === activities[i + 1].time_slot && distance > 2000) {
        warnings.push(
          `⚠️ Consider closer venues: ${activities[i].venue_name} and ${activities[i + 1].venue_name} are ${(distance / 1000).toFixed(1)}km apart in same time slot`
        );
      }
    }
  }

  // Check for zigzagging (going back and forth)
  if (segments.length >= 3) {
    for (let i = 0; i < segments.length - 2; i++) {
      // Simple zigzag detection: if we go A→B→C and C is closer to A than B
      const seg1 = segments[i];
      const seg2 = segments[i + 1];
      const seg3 = segments[i + 2];

      if (seg1.from === seg3.to || seg1.to === seg3.from) {
        warnings.push(
          `⚠️ Possible zigzag pattern detected between ${seg1.from}, ${seg2.from}, and ${seg3.from}`
        );
      }
    }
  }

  const avgDistance = segments.length > 0 ? totalDistance / segments.length : 0;
  const isEfficient = warnings.length === 0 && avgDistance < 3000; // Average less than 3km

  return {
    isEfficient,
    totalDistance: Math.round(totalDistance),
    warnings,
    segments,
  };
}

/**
 * Group activities by proximity/neighborhood
 */
export function groupActivitiesByProximity(
  activities: ActivityWithLocation[],
  maxDistance: number = 1500 // 1.5km
): ActivityWithLocation[][] {
  const groups: ActivityWithLocation[][] = [];
  const visited = new Set<number>();

  activities.forEach((activity, index) => {
    if (visited.has(index)) return;

    const group: ActivityWithLocation[] = [activity];
    visited.add(index);

    // Find all activities within maxDistance
    activities.forEach((other, otherIndex) => {
      if (visited.has(otherIndex)) return;
      if (!activity.coordinates || !other.coordinates) return;

      const distance = calculateDistance(
        activity.coordinates.lat,
        activity.coordinates.lng,
        other.coordinates.lat,
        other.coordinates.lng
      );

      if (distance <= maxDistance) {
        group.push(other);
        visited.add(otherIndex);
      }
    });

    groups.push(group);
  });

  return groups;
}

/**
 * Suggest optimal day assignment for activities based on location
 */
export async function suggestDayAssignment(
  activities: ActivityWithLocation[],
  numDays: number
): Promise<Map<number, ActivityWithLocation[]>> {
  const dayAssignments = new Map<number, ActivityWithLocation[]>();

  // Group by proximity
  const groups = groupActivitiesByProximity(activities);

  // Distribute groups across days
  groups.forEach((group, index) => {
    const day = (index % numDays) + 1;
    const existing = dayAssignments.get(day) || [];
    dayAssignments.set(day, [...existing, ...group]);
  });

  // Optimize each day's route
  for (const [day, dayActivities] of dayAssignments) {
    const optimized = await optimizeRoute(dayActivities);
    dayAssignments.set(day, optimized);
  }

  return dayAssignments;
}

/**
 * Calculate estimated travel time based on distance and mode
 */
export function estimateTravelTime(
  distanceMeters: number,
  mode: 'walking' | 'transit' | 'driving' = 'walking'
): number {
  // Average speeds in m/s
  const speeds = {
    walking: 1.4, // ~5 km/h
    transit: 8.3, // ~30 km/h (including stops)
    driving: 11.1, // ~40 km/h (city driving)
  };

  const timeSeconds = distanceMeters / speeds[mode];
  const timeMinutes = Math.ceil(timeSeconds / 60);

  // Add buffer time for navigation, traffic, etc.
  const bufferMultiplier = mode === 'walking' ? 1.1 : 1.3;
  return Math.ceil(timeMinutes * bufferMultiplier);
}

/**
 * Generate travel instructions between activities
 */
export function generateTravelInstructions(
  from: ActivityWithLocation,
  to: ActivityWithLocation
): string {
  if (!from.coordinates || !to.coordinates) {
    return 'Travel to next location';
  }

  const distance = calculateDistance(
    from.coordinates.lat,
    from.coordinates.lng,
    to.coordinates.lat,
    to.coordinates.lng
  );

  const distanceKm = (distance / 1000).toFixed(1);
  const walkTime = estimateTravelTime(distance, 'walking');
  const transitTime = estimateTravelTime(distance, 'transit');

  if (distance < 500) {
    return `${distanceKm}km - ${walkTime} min walk`;
  } else if (distance < 2000) {
    return `${distanceKm}km - ${walkTime} min walk or ${transitTime} min by transit`;
  } else {
    return `${distanceKm}km - ${transitTime} min by transit recommended`;
  }
}

// Export main functions
export const routeOptimizer = {
  optimizeRoute,
  twoOptOptimization,
  validateRouteEfficiency,
  groupActivitiesByProximity,
  suggestDayAssignment,
  estimateTravelTime,
  generateTravelInstructions,
};

export default routeOptimizer;