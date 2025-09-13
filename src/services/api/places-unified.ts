/**
 * Unified Places API - Smart fallback between Foursquare and static data
 * Provides cost-effective activity data with graceful degradation
 */

import { logger } from '@/lib/logger';
import { searchFoursquarePlaces, getFoursquareActivities, convertFoursquareToActivity, FoursquareVenue } from './foursquare';
import { getRadarActivities, convertRadarToActivity, testRadarConnection, RadarPlace } from './radar';
import { getStaticActivities, searchStaticActivities, hasStaticData, StaticActivity } from './static-places';
import { logDataSource } from '@/lib/constants/api-config';

export interface UnifiedActivity {
  description: string;
  category: string;
  venue_name: string;
  address: string;
  rating: number;
  tips: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  price_level?: number;
  website?: string;
  phone?: string;
  hours?: string;
  photo?: string;
  source: 'foursquare' | 'radar' | 'static';
}

// Track API status to avoid repeated failed calls
let foursquareWorkingStatus: 'unknown' | 'working' | 'no-credits' | 'failed' = 'unknown';
let radarWorkingStatus: 'unknown' | 'working' | 'failed' = 'unknown';
let lastStatusCheck = 0;
const STATUS_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes

/**
 * Check if Radar API is available and working
 */
async function checkRadarStatus(): Promise<boolean> {
  const now = Date.now();
  
  // If we checked recently and it was failing, don't check again immediately
  if (now - lastStatusCheck < STATUS_CHECK_INTERVAL && radarWorkingStatus === 'failed') {
    return false;
  }

  if (radarWorkingStatus === 'working') {
    return true;
  }

  try {
    const isWorking = await testRadarConnection();
    radarWorkingStatus = isWorking ? 'working' : 'failed';
    lastStatusCheck = now;
    return isWorking;
  } catch (error) {
    radarWorkingStatus = 'failed';
    lastStatusCheck = now;
    logger.warn('Unified Places', `Radar API failed: ${error}`);
    return false;
  }
}

/**
 * Check if Foursquare API is available and working
 */
async function checkFoursquareStatus(): Promise<boolean> {
  const now = Date.now();
  
  // If we checked recently and it was failing, don't check again immediately
  if (now - lastStatusCheck < STATUS_CHECK_INTERVAL && 
      (foursquareWorkingStatus === 'no-credits' || foursquareWorkingStatus === 'failed')) {
    return false;
  }

  try {
    // Try a minimal search to test API
    const venues = await searchFoursquarePlaces('cafe', 'London', '13034', 1);
    
    if (venues && venues.length > 0) {
      foursquareWorkingStatus = 'working';
      lastStatusCheck = now;
      return true;
    } else {
      foursquareWorkingStatus = 'no-credits';
      lastStatusCheck = now;
      return false;
    }
  } catch (error: any) {
    const errorMessage = error.message || '';
    
    if (errorMessage.includes('no API credits') || errorMessage.includes('429')) {
      foursquareWorkingStatus = 'no-credits';
      logger.info('Unified Places', 'Foursquare API has no credits, using static data');
    } else {
      foursquareWorkingStatus = 'failed';
      logger.warn('Unified Places', `Foursquare API failed: ${errorMessage}`);
    }
    
    lastStatusCheck = now;
    return false;
  }
}

/**
 * Get activities with smart fallback: Radar -> Foursquare -> Static data
 */
export async function getUnifiedActivities(
  destination: string,
  category: string,
  limit: number = 10
): Promise<UnifiedActivity[]> {
  // First, try Radar (free and reliable)
  if (radarWorkingStatus !== 'failed') {
    const isWorking = await checkRadarStatus();
    
    if (isWorking) {
      try {
        const venues = await getRadarActivities(destination, category, limit);
        
        if (venues && venues.length > 0) {
          logDataSource('radar');
          return venues.map(venue => ({
            ...convertRadarToActivity(venue),
            source: 'radar' as const
          }));
        }
      } catch (error) {
        logger.warn('Unified Places', `Radar search failed, trying Foursquare`);
      }
    }
  }

  // Second, try Foursquare if Radar failed
  if (foursquareWorkingStatus !== 'no-credits' && foursquareWorkingStatus !== 'failed') {
    const isWorking = await checkFoursquareStatus();
    
    if (isWorking) {
      try {
        const venues = await getFoursquareActivities(destination, category, limit);
        
        if (venues && venues.length > 0) {
          logDataSource('foursquare');
          return venues.map(venue => ({
            ...convertFoursquareToActivity(venue),
            source: 'foursquare' as const
          }));
        }
      } catch (error) {
        logger.warn('Unified Places', `Foursquare search failed, falling back to static data`);
      }
    }
  }

  // Fall back to static data
  logDataSource('static');
  const staticActivities = getStaticActivities(destination, category);
  
  if (staticActivities.length === 0) {
    logger.warn('Unified Places', `No static data found for ${destination} - ${category}`);
    return [];
  }

  // Shuffle and limit the results
  const shuffled = [...staticActivities].sort(() => Math.random() - 0.5);
  const limited = shuffled.slice(0, limit);

  return limited.map(activity => ({
    ...activity,
    source: 'static' as const
  }));
}

/**
 * Search activities with smart fallback: Radar -> Foursquare -> Static data
 */
export async function searchUnifiedActivities(
  destination: string,
  query: string,
  limit: number = 10
): Promise<UnifiedActivity[]> {
  // Try Radar first (free and reliable)
  if (radarWorkingStatus !== 'failed') {
    const isWorking = await checkRadarStatus();
    
    if (isWorking) {
      try {
        // For search, we can use Radar's category search
        const venues = await getRadarActivities(destination, query, limit);
        
        if (venues && venues.length > 0) {
          logDataSource('radar');
          return venues.map(venue => ({
            ...convertRadarToActivity(venue),
            source: 'radar' as const
          }));
        }
      } catch (error) {
        logger.warn('Unified Places', `Radar search failed for query "${query}"`);
      }
    }
  }

  // Try Foursquare second if Radar failed
  if (foursquareWorkingStatus !== 'no-credits' && foursquareWorkingStatus !== 'failed') {
    const isWorking = await checkFoursquareStatus();
    
    if (isWorking) {
      try {
        const venues = await searchFoursquarePlaces(query, destination, undefined, limit);
        
        if (venues && venues.length > 0) {
          logDataSource('foursquare');
          return venues.map(venue => ({
            ...convertFoursquareToActivity(venue),
            source: 'foursquare' as const
          }));
        }
      } catch (error) {
        logger.warn('Unified Places', `Foursquare search failed for query "${query}"`);
      }
    }
  }

  // Fall back to static data
  logDataSource('static');
  const staticResults = searchStaticActivities(destination, query, limit);
  
  return staticResults.map(activity => ({
    ...activity,
    source: 'static' as const
  }));
}

/**
 * Get random activities mixing both sources when possible
 */
export async function getRandomUnifiedActivities(
  destination: string,
  categories: string[],
  countPerCategory: number = 3
): Promise<UnifiedActivity[]> {
  const allActivities: UnifiedActivity[] = [];

  for (const category of categories) {
    const activities = await getUnifiedActivities(destination, category, countPerCategory);
    allActivities.push(...activities);
  }

  // Shuffle the final results
  return allActivities.sort(() => Math.random() - 0.5);
}

/**
 * Check what data sources are available for a destination
 */
export async function getAvailableDataSources(destination: string): Promise<{
  radar: boolean;
  foursquare: boolean;
  static: boolean;
  recommended: 'radar' | 'foursquare' | 'static';
}> {
  const staticAvailable = hasStaticData(destination);
  const radarAvailable = await checkRadarStatus();
  const foursquareAvailable = await checkFoursquareStatus();

  let recommended: 'radar' | 'foursquare' | 'static' = 'static';
  if (radarAvailable) {
    recommended = 'radar';
  } else if (foursquareAvailable) {
    recommended = 'foursquare';
  }

  return {
    radar: radarAvailable,
    foursquare: foursquareAvailable,
    static: staticAvailable,
    recommended
  };
}

/**
 * Force a fresh check of API status
 */
export function resetApiStatus(): void {
  foursquareWorkingStatus = 'unknown';
  radarWorkingStatus = 'unknown';
  lastStatusCheck = 0;
}

/**
 * Get current API status for debugging
 */
export function getApiStatus() {
  return {
    radarStatus: radarWorkingStatus,
    foursquareStatus: foursquareWorkingStatus,
    lastChecked: new Date(lastStatusCheck).toISOString(),
    nextCheckIn: Math.max(0, STATUS_CHECK_INTERVAL - (Date.now() - lastStatusCheck))
  };
}