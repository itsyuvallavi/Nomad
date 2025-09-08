/**
 * Pexels API Integration
 * Alternative image provider with simpler API
 */

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
    
    console.log(`📷 [Pexels] Searching for: ${destination}`);
    
    const response = await fetch(url, {
      headers: {
        'Authorization': PEXELS_API_KEY,
      },
    });

    if (!response.ok) {
      console.error(`❌ [Pexels] API error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    console.log(`✅ [Pexels] Found ${data.photos?.length || 0} images for ${destination}`);
    
    return data.photos || [];
  } catch (error: any) {
    console.error(`❌ [Pexels] Error fetching images:`, error.message);
    return [];
  }
}