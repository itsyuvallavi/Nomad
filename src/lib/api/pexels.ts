/**
 * Pexels API Integration
 * Alternative image provider with simpler API
 */
import { logger } from '@/lib/logger';

const PEXELS_API_KEY = process.env.PEXELS_API_KEY || 'JDkOJu5vNAQmnwxkw9mGixEZsvuAmzNBPSOjuwtmyQiKpUdlG3fdwpKF';
const PEXELS_API_URL = 'https://api.pexels.com/v1';

export interface PexelsImage {
  id: number;
  url: string;
  photographer: string;
  photographer_url: string;
  src: {
    original: string;
    large: string;
    medium: string;
    small: string;
  };
  alt: string;
}

/**
 * Search for destination images on Pexels
 */
export async function searchPexelsImages(
  destination: string,
  count: number = 3
): Promise<PexelsImage[]> {
  try {
    const query = `${destination} travel destination landscape`;
    const url = `${PEXELS_API_URL}/search?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`;
    
    logger.info('IMAGE', `Searching Pexels for: ${destination}`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': PEXELS_API_KEY,
      },
    });

    if (!response.ok) {
      logger.error('API', 'Pexels API error', { status: response.status });
      return [];
    }

    const data = await response.json();
    logger.info('IMAGE', `Found ${data.photos?.length || 0} images for ${destination} from Pexels`);
    
    return data.photos || [];
  } catch (error: any) {
    logger.error('API', `Error fetching Pexels images:`, { error: error.message });
    return [];
  }
}
