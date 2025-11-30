/**
 * Unsplash API Integration
 * Fetches high-quality travel destination images
 */
import { logger } from '@/lib/monitoring/logger';

const UNSPLASH_API_KEY = process.env.UNSPLASH_API_ACCESS_KEY;
const UNSPLASH_API_URL = 'https://api.unsplash.com';

export interface UnsplashImage {
  id: string;
  urls: {
    raw: string;
    full: string;
    regular: string;
    small: string;
    thumb: string;
  };
  user: {
    name: string;
    username: string;
  };
  alt_description: string | null;
}

/**
 * Search for destination images on Unsplash
 */
export async function searchUnsplashImages(
  destination: string,
  count: number = 3
): Promise<UnsplashImage[]> {
  try {
    console.log('🔑 [UNSPLASH] API Key check:', {
      hasKey: !!UNSPLASH_API_KEY,
      keyLength: UNSPLASH_API_KEY?.length || 0,
      keyPrefix: UNSPLASH_API_KEY?.substring(0, 5) || 'missing'
    });

    if (!UNSPLASH_API_KEY) {
      logger.warn('IMAGE', 'Unsplash API key not configured');
      console.error('❌ [UNSPLASH] No API key found in process.env.UNSPLASH_API_ACCESS_KEY');
      return [];
    }

    const query = `${destination} travel landmark`;
    const url = `${UNSPLASH_API_URL}/search/photos?query=${encodeURIComponent(query)}&per_page=${count}&orientation=landscape`;

    logger.info('IMAGE', `Searching Unsplash for: ${destination}`);
    console.log('📡 [UNSPLASH] Fetching:', url);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Client-ID ${UNSPLASH_API_KEY}`,
      },
    });

    if (!response.ok) {
      logger.error('API', 'Unsplash API error', { status: response.status });
      console.error('❌ [UNSPLASH] API error:', response.status);
      return [];
    }

    const data = await response.json();
    logger.info('IMAGE', `Found ${data.results?.length || 0} images for ${destination} from Unsplash`);
    console.log('✅ [UNSPLASH] Found', data.results?.length || 0, 'images');

    return data.results || [];
  } catch (error: any) {
    logger.error('API', `Error fetching Unsplash images:`, { error: error.message });
    console.error('❌ [UNSPLASH] Error:', error.message);
    return [];
  }
}
