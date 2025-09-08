/**
 * Unsplash API Integration
 * Fetches high-quality destination images with proper attribution
 */

// For client-side access, we need NEXT_PUBLIC_ prefix
const UNSPLASH_ACCESS_KEY = process.env.NEXT_PUBLIC_UNSPLASH_API_ACCESS_KEY || process.env.UNSPLASH_API_ACCESS_KEY;
const UNSPLASH_API_URL = 'https://api.unsplash.com';

// Cache for image results (in-memory for session)
const imageCache = new Map<string, UnsplashImage[]>();

export interface UnsplashImage {
  id: string;
  url: string;
  thumbnailUrl: string;
  photographerName: string;
  photographerUrl: string;
  description: string | null;
  downloadUrl: string;
}

/**
 * Log Unsplash API calls to console
 */
const logUnsplashCall = (action: string, details: any) => {
  const timestamp = new Date().toISOString();
  console.log(`📸 [Unsplash ${action}] ${timestamp}`, details);
};

/**
 * Search for destination images on Unsplash
 */
export async function searchDestinationImages(
  destination: string,
  count: number = 3
): Promise<UnsplashImage[]> {
  const cacheKey = `${destination}-${count}`;
  
  // Check cache first
  if (imageCache.has(cacheKey)) {
    logUnsplashCall('Cache Hit', { destination, count });
    return imageCache.get(cacheKey)!;
  }

  if (!UNSPLASH_ACCESS_KEY) {
    logUnsplashCall('Error', { 
      message: 'Unsplash API key not configured',
      destination 
    });
    return [];
  }

  const startTime = Date.now();
  logUnsplashCall('Search Request', { 
    destination, 
    count,
    query: `${destination} travel tourism` 
  });

  try {
    // Build search query - add travel/tourism keywords for better results
    const query = `${destination} travel tourism`;
    const params = new URLSearchParams({
      query,
      per_page: count.toString(),
      orientation: 'landscape',
      content_filter: 'high',
    });

    const response = await fetch(
      `${UNSPLASH_API_URL}/search/photos?${params}`,
      {
        headers: {
          Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Unsplash API error: ${response.status}`);
    }

    const data = await response.json();
    const duration = Date.now() - startTime;

    logUnsplashCall('Search Response', {
      destination,
      resultsFound: data.results?.length || 0,
      duration: `${duration}ms`,
      totalResults: data.total,
    });

    // Transform Unsplash results to our format
    const images: UnsplashImage[] = (data.results || []).map((photo: any) => ({
      id: photo.id,
      url: photo.urls.regular,
      thumbnailUrl: photo.urls.small,
      photographerName: photo.user.name,
      photographerUrl: `${photo.user.links.html}?utm_source=nomad_navigator&utm_medium=referral`,
      description: photo.description || photo.alt_description,
      downloadUrl: photo.links.download_location,
    }));

    // Cache the results
    imageCache.set(cacheKey, images);

    // Track download for Unsplash guidelines (required by API terms)
    images.forEach(image => {
      trackImageView(image.downloadUrl);
    });

    return images;
  } catch (error: any) {
    logUnsplashCall('Error', {
      destination,
      error: error.message,
    });
    return [];
  }
}

/**
 * Get a single hero image for a destination
 */
export async function getDestinationHeroImage(
  destination: string
): Promise<UnsplashImage | null> {
  const images = await searchDestinationImages(destination, 1);
  return images[0] || null;
}

/**
 * Track image view/download per Unsplash guidelines
 */
async function trackImageView(downloadUrl: string) {
  if (!UNSPLASH_ACCESS_KEY || !downloadUrl) return;

  try {
    await fetch(downloadUrl, {
      headers: {
        Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`,
      },
    });
    logUnsplashCall('Track View', { success: true });
  } catch (error) {
    // Silently fail - don't break the app if tracking fails
    logUnsplashCall('Track Error', { error });
  }
}

/**
 * Build attribution HTML for Unsplash photos
 */
export function buildUnsplashAttribution(image: UnsplashImage): string {
  return `Photo by <a href="${image.photographerUrl}" target="_blank" rel="noopener noreferrer">${image.photographerName}</a> on <a href="https://unsplash.com?utm_source=nomad_navigator&utm_medium=referral" target="_blank" rel="noopener noreferrer">Unsplash</a>`;
}

/**
 * Clear the image cache (useful for testing or memory management)
 */
export function clearImageCache() {
  const cacheSize = imageCache.size;
  imageCache.clear();
  logUnsplashCall('Cache Cleared', { entriesCleared: cacheSize });
}