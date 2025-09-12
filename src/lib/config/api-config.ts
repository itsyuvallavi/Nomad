/**
 * API Configuration - Controls which data sources to use
 */

export const API_CONFIG = {
  // Use static data when testing or when Google API key is not available
  USE_STATIC_DATA: process.env.NODE_ENV === 'test' || 
                   process.env.USE_STATIC_DATA === 'true' || 
                   !process.env.GOOGLE_API_KEY,
  
  // Log which data source is being used  
  VERBOSE_LOGGING: process.env.NODE_ENV === 'development',
  
  // Enable strict day count control with static data
  STRICT_DAY_COUNTS: process.env.USE_STATIC_DATA === 'true',
};

export function shouldUseStaticData(): boolean {
  return API_CONFIG.USE_STATIC_DATA;
}

export function logDataSource(source: 'static' | 'google' | 'foursquare' | 'radar'): void {
  if (API_CONFIG.VERBOSE_LOGGING) {
    console.log(`🔍 Using ${source} data source`);
  }
}