/**
 * LocationIQ Map Service - TILES ONLY
 * This service provides map tile URLs for LocationIQ
 * Geocoding is still handled by OSM for cost efficiency
 */

import { logger } from '@/lib/monitoring/logger';

const LOG_CATEGORY = 'LocationIQ-Map' as const;

// LocationIQ tile server configuration
const LOCATIONIQ_TILE_SERVERS = ['a', 'b', 'c'];
const LOCATIONIQ_TILE_BASE_URL = 'https://{s}-tiles.locationiq.com/v3';

// Available map styles
export const LOCATIONIQ_MAP_STYLES = {
  streets: 'streets',
  dark: 'dark',
  light: 'light',
} as const;

export type MapStyle = keyof typeof LOCATIONIQ_MAP_STYLES;

/**
 * Get LocationIQ tile URL for Leaflet
 * @param apiKey LocationIQ API key
 * @param style Map style (streets, dark, light)
 * @returns Formatted tile URL for Leaflet TileLayer
 */
export function getLocationIQTileUrl(
  apiKey: string,
  style: MapStyle = 'streets'
): string {
  if (!apiKey) {
    logger.error(LOG_CATEGORY, 'LocationIQ API key is missing');
    throw new Error('LocationIQ API key is required');
  }

  // Format: https://{s}-tiles.locationiq.com/v3/{style}/r/{z}/{x}/{y}.png?key={key}
  const tileUrl = `${LOCATIONIQ_TILE_BASE_URL}/${style}/r/{z}/{x}/{y}.png?key=${apiKey}`;

  logger.info(LOG_CATEGORY, `LocationIQ tile URL configured for style: ${style}`);

  return tileUrl;
}

/**
 * Get attribution text for LocationIQ maps
 * Required to comply with LocationIQ terms of service
 */
export function getLocationIQAttribution(): string {
  return '© <a href="https://locationiq.com/?ref=maps" target="_blank">LocationIQ</a> © <a href="https://openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors';
}

/**
 * Validate LocationIQ API key format
 * @param apiKey API key to validate
 * @returns Boolean indicating if key format is valid
 */
export function validateApiKey(apiKey: string): boolean {
  // LocationIQ keys are typically 32 character alphanumeric strings
  // This is a basic validation - actual validation happens on API call
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }

  // Check if it looks like a valid key (alphanumeric, reasonable length)
  const keyPattern = /^[a-zA-Z0-9]{20,40}$/;
  return keyPattern.test(apiKey);
}

// Export main service - NO OSM FALLBACK
export const locationIQMap = {
  getTileUrl: getLocationIQTileUrl,
  getAttribution: getLocationIQAttribution,
  validateApiKey,
  styles: LOCATIONIQ_MAP_STYLES,
};

export default locationIQMap;