import { useMemo } from 'react';
import { logger } from '@/lib/monitoring/logger';

interface Day {
  day: number;
  date: string;
  title: string;
  activities: any[];
  weather?: string;
  _destination?: string;
}

interface LocationGroupingResult {
  daysByLocation: Record<string, {
    days: Day[];
    startDay: number;
    endDay: number;
  }>;
  locations: string[];
  dayCountries: string[];
}

export function useLocationGrouping(
  itinerary: {
    destination: string;
    itinerary?: Day[];
  }
): LocationGroupingResult {
  return useMemo(() => {
    if (!itinerary.itinerary || itinerary.itinerary.length === 0) {
      return {
        daysByLocation: {},
        locations: [],
        dayCountries: []
      };
    }

    // Parse the main destinations from the itinerary (countries, not cities)
    const mainDestinations = itinerary.destination.split(',').map(d => {
      // Clean up destination names, removing parenthetical additions
      let cleaned = d.trim().replace(/\s*\([^)]*\)/g, '');
      // Handle "Denmark Copenhagen" format (from chunked generation)
      if (cleaned === 'Denmark Copenhagen') {
        cleaned = 'Denmark';
      }
      return cleaned;
    });

    // Build country mapping dynamically from the destinations in the itinerary
    const countryMapping: Record<string, string[]> = {};
    for (const destination of mainDestinations) {
      // Each destination is its own key, we'll look for it in the content
      countryMapping[destination] = [destination, destination.toLowerCase()];
    }

    let currentCountry = '';
    const countryOrder: string[] = [];

    // First pass: identify country for each day based on content
    const dayCountries = itinerary.itinerary.map((day: Day, index) => {
      // Check if day has destination metadata from chunked generation
      if (day._destination) {
        // Skip "Travel Day" entries - they should be merged with the destination
        if (day._destination === 'Travel Day' || day._destination.toLowerCase().includes('travel day')) {
          // This is a travel day - use the destination from the title (e.g., "Paris → Rome" means going to Rome)
          const titleMatch = day.title?.match(/→\s*(.+)$/);
          if (titleMatch) {
            const destination = titleMatch[1].trim();
            const matchedDest = mainDestinations.find((d: string) =>
              destination.toLowerCase().includes(d.toLowerCase()) ||
              d.toLowerCase().includes(destination.toLowerCase())
            ) || destination;

            if (!countryOrder.includes(matchedDest) && matchedDest !== 'Travel Day') {
              countryOrder.push(matchedDest);
            }
            return matchedDest;
          }
          // If we can't parse the destination, use the current country
          return currentCountry || mainDestinations[0];
        }

        // Use the destination metadata directly - most reliable!
        const destination = mainDestinations.find((d: string) =>
          day._destination!.toLowerCase().includes(d.toLowerCase()) ||
          d.toLowerCase().includes(day._destination!.toLowerCase().replace(' copenhagen', ''))
        ) || day._destination;

        if (!countryOrder.includes(destination!) && destination !== 'Travel Day') {
          countryOrder.push(destination!);
        }
        return destination;
      }

      // Fallback: analyze content if no metadata
      const dayText = `${day.title} ${day.activities.map((a: any) => a.description + ' ' + (a.address || '')).join(' ')}`.toLowerCase();

      // Check each destination to see if this day belongs to it
      for (const destination of mainDestinations) {
        // Check for partial matches (e.g., "Korea" in "South Korea")
        // Split destination into words and check if any significant word appears
        const destWords = destination.toLowerCase().split(/\s+/);
        const significantWords = destWords.filter((word: string) => word.length > 3); // Skip short words like "the", "and"

        // Check if destination name or any significant part appears in content
        const isMatch = dayText.includes(destination.toLowerCase()) ||
                        significantWords.some((word: string) => dayText.includes(word));

        if (isMatch) {
          // Found the country for this day
          currentCountry = destination; // Update current country
          if (!countryOrder.includes(destination)) {
            countryOrder.push(destination);
          }
          return destination;
        }
      }

      // If no country detected, use the current country (continuation)
      // Or if it's the first day and we couldn't detect, use day ranges
      if (!currentCountry) {
        // Use dynamic detection based on day ranges
        // Assume roughly equal distribution of days across destinations
        const dayNum = day.day;
        const avgDaysPerDestination = Math.ceil(itinerary.itinerary.length / mainDestinations.length);
        const destinationIndex = Math.floor((dayNum - 1) / avgDaysPerDestination);

        currentCountry = mainDestinations[Math.min(destinationIndex, mainDestinations.length - 1)] || 'Unknown';

        if (!countryOrder.includes(currentCountry)) {
          countryOrder.push(currentCountry);
        }
      }

      return currentCountry;
    });

    // Second pass: group consecutive days by country
    const daysByLocation = itinerary.itinerary.reduce((acc: any, day: Day, index: number) => {
      const country = dayCountries[index];

      if (!acc[country]) {
        acc[country] = {
          days: [],
          startDay: index + 1,
          endDay: index + 1
        };
      }

      acc[country].days.push(day);
      acc[country].endDay = index + 1;

      return acc;
    }, {} as Record<string, { days: Day[], startDay: number, endDay: number }>);

    const locations = Object.keys(daysByLocation);

    // Log destination detection for debugging (only on destination change)
    logger.debug('SYSTEM', 'Location grouping analysis', {
      rawDestination: itinerary.destination,
      parsedLocations: locations,
      daysByLocation: Object.entries(daysByLocation).map(([loc, data]: [string, any]) => ({
        location: loc,
        days: data.days.length,
        dayNumbers: data.days.map((d: any) => d.day),
        startDay: data.startDay,
        endDay: data.endDay
      }))
    });

    return {
      daysByLocation,
      locations,
      dayCountries
    };
  }, [itinerary.destination, itinerary.itinerary]);
}