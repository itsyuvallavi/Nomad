/**
 * Route Optimizer Module
 * Optimizes daily routes to minimize travel time between activities
 * Groups activities by zones for efficient exploration
 */

import { Zone, getCityZones, calculateDistance, getClosestZone } from '../data/city-zones';
import type { GeneratePersonalizedItineraryOutput, Activity } from '../types/core.types';
import { logger } from '@/lib/monitoring/logger';

export class RouteOptimizer {
  /**
   * Optimize daily routes by grouping activities by zones
   */
  optimizeDailyRoutes(
    itinerary: GeneratePersonalizedItineraryOutput
  ): GeneratePersonalizedItineraryOutput {
    if (!itinerary.dailyItineraries) return itinerary;

    const destination = itinerary.destination?.toLowerCase() || '';
    const zones = getCityZones(destination);

    if (zones.length === 0) {
      // No zone data available, return as-is
      return itinerary;
    }

    const optimizedItineraries = itinerary.dailyItineraries.map(day => {
      if (!day.activities || day.activities.length === 0) return day;

      // Assign zones to activities
      const activitiesWithZones = this.assignZonesToActivities(
        day.activities,
        zones,
        destination
      );

      // Group activities by zone
      const groupedByZone = this.groupActivitiesByZone(activitiesWithZones);

      // Reorder activities to minimize zone changes
      const optimizedActivities = this.reorderActivitiesByZone(groupedByZone);

      return {
        ...day,
        activities: optimizedActivities
      };
    });

    logger.debug('AI', 'Routes optimized', {
      destination,
      days: optimizedItineraries.length
    });

    return {
      ...itinerary,
      dailyItineraries: optimizedItineraries
    };
  }

  /**
   * Assign zones to activities based on their location or description
   */
  private assignZonesToActivities(
    activities: Activity[],
    zones: Zone[],
    destination: string
  ): Activity[] {
    return activities.map(activity => {
      // If activity already has zone, keep it
      if (activity.zone) return activity;

      // Try to find zone by coordinates
      if (activity.coordinates) {
        const zone = getClosestZone(
          destination,
          activity.coordinates.lat,
          activity.coordinates.lng
        );
        if (zone) {
          return { ...activity, zone: zone.name };
        }
      }

      // Try to find zone by neighborhood
      if (activity.neighborhood) {
        const zone = this.findZoneByNeighborhood(zones, activity.neighborhood);
        if (zone) {
          return { ...activity, zone: zone.name };
        }
      }

      // Try to find zone by venue name or description
      const searchText = activity.venue_name || activity.description || '';
      if (searchText) {
        const zone = this.findZoneByDescription(zones, searchText);
        if (zone) {
          return { ...activity, zone: zone.name };
        }
      }

      return activity;
    });
  }

  /**
   * Find zone by neighborhood name
   */
  private findZoneByNeighborhood(zones: Zone[], neighborhood: string): Zone | null {
    const normalizedNeighborhood = neighborhood.toLowerCase();

    for (const zone of zones) {
      if (zone.neighborhoods.some(n =>
        n.toLowerCase().includes(normalizedNeighborhood) ||
        normalizedNeighborhood.includes(n.toLowerCase())
      )) {
        return zone;
      }
    }

    return null;
  }

  /**
   * Find zone by description or venue name
   */
  private findZoneByDescription(zones: Zone[], description: string): Zone | null {
    if (!description) return null;
    const normalizedDesc = description.toLowerCase();

    for (const zone of zones) {
      // Check if zone name is mentioned
      if (normalizedDesc.includes(zone.name.toLowerCase())) {
        return zone;
      }

      // Check if any neighborhood is mentioned
      for (const neighborhood of zone.neighborhoods) {
        if (normalizedDesc.includes(neighborhood.toLowerCase())) {
          return zone;
        }
      }
    }

    return null;
  }

  /**
   * Group activities by their assigned zone
   */
  private groupActivitiesByZone(activities: Activity[]): Map<string, Activity[]> {
    const grouped = new Map<string, Activity[]>();

    for (const activity of activities) {
      const zone = activity.zone || 'unassigned';
      if (!grouped.has(zone)) {
        grouped.set(zone, []);
      }
      grouped.get(zone)!.push(activity);
    }

    return grouped;
  }

  /**
   * Reorder activities to minimize zone changes
   */
  private reorderActivitiesByZone(
    groupedByZone: Map<string, Activity[]>
  ): Activity[] {
    const reordered: Activity[] = [];

    // Sort zones by priority (if available) or by number of activities
    const zones = Array.from(groupedByZone.entries()).sort((a, b) => {
      // Prioritize zones with more activities
      return b[1].length - a[1].length;
    });

    // Process morning activities first (if they have time)
    const morningActivities: Activity[] = [];
    const afternoonActivities: Activity[] = [];
    const eveningActivities: Activity[] = [];
    const untimedActivities: Activity[] = [];

    for (const [_zone, activities] of zones) {
      for (const activity of activities) {
        if (activity.time) {
          const hour = this.extractHour(activity.time);
          if (hour < 12) {
            morningActivities.push(activity);
          } else if (hour < 17) {
            afternoonActivities.push(activity);
          } else {
            eveningActivities.push(activity);
          }
        } else {
          untimedActivities.push(activity);
        }
      }
    }

    // Combine in chronological order, grouping by zone within each time period
    reordered.push(...this.sortByZoneProximity(morningActivities));
    reordered.push(...this.sortByZoneProximity(afternoonActivities));
    reordered.push(...this.sortByZoneProximity(eveningActivities));
    reordered.push(...this.sortByZoneProximity(untimedActivities));

    return reordered;
  }

  /**
   * Sort activities by zone proximity to minimize travel
   */
  private sortByZoneProximity(activities: Activity[]): Activity[] {
    if (activities.length <= 1) return activities;

    const sorted: Activity[] = [activities[0]];
    const remaining = activities.slice(1);

    while (remaining.length > 0) {
      const lastActivity = sorted[sorted.length - 1];
      let closestIndex = 0;
      let minChange = this.calculateZoneChange(lastActivity, remaining[0]);

      for (let i = 1; i < remaining.length; i++) {
        const change = this.calculateZoneChange(lastActivity, remaining[i]);
        if (change < minChange) {
          minChange = change;
          closestIndex = i;
        }
      }

      sorted.push(remaining[closestIndex]);
      remaining.splice(closestIndex, 1);
    }

    return sorted;
  }

  /**
   * Calculate the "cost" of changing from one activity to another
   */
  private calculateZoneChange(from: Activity, to: Activity): number {
    // Same zone = no cost
    if (from.zone === to.zone) return 0;

    // One has zone, other doesn't = small cost
    if (!from.zone || !to.zone) return 1;

    // Different zones = higher cost
    return 2;

    // Could enhance this with actual distance calculations if coordinates are available
  }

  /**
   * Extract hour from time string
   */
  private extractHour(time: string): number {
    const match = time.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    if (!match) return 12; // Default to noon if can't parse

    let hour = parseInt(match[1]);
    const isPM = match[3]?.toLowerCase() === 'pm';

    if (isPM && hour < 12) hour += 12;
    if (!isPM && hour === 12) hour = 0;

    return hour;
  }

  /**
   * Build zone guidance for prompts
   */
  buildZoneGuidance(zones: Zone[], duration: number): string {
    if (zones.length === 0) return '';

    const sortedZones = zones
      .filter(z => z.priority !== undefined)
      .sort((a, b) => (a.priority || 999) - (b.priority || 999));

    const daysPerZone = Math.max(1, Math.floor(duration / sortedZones.length));

    let guidance = '\nZONE PLANNING GUIDANCE:\n';
    guidance += 'Group activities by these zones to minimize travel time:\n\n';

    sortedZones.forEach((zone, index) => {
      const startDay = index * daysPerZone + 1;
      const endDay = Math.min(startDay + daysPerZone - 1, duration);

      guidance += `Days ${startDay}-${endDay}: ${zone.name}\n`;
      guidance += `  Key areas: ${zone.neighborhoods.slice(0, 3).join(', ')}\n`;
    });

    return guidance;
  }
}