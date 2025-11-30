import { useState, useEffect } from 'react';
import { logger } from '@/lib/monitoring/logger';

// Generic image type that works with both Pexels and Unsplash
export interface DestinationImage {
  id: string | number;
  url: string;
  photographer?: string;
  alt?: string;
}

export function useDestinationImages(
  destination: string | undefined,
  locations: string[]
): Record<string, DestinationImage[]> {
  const [destinationImages, setDestinationImages] = useState<Record<string, DestinationImage[]>>({});

  useEffect(() => {
    const fetchImages = async () => {
      // Use destinations from metadata if available, otherwise use locations from days
      const destinationsToFetch = destination
        ? destination.split(',').map(d => d.trim())
        : locations;

      console.log('🎨 [usePexelsImages] Hook triggered', {
        destination,
        locations,
        destinationsToFetch,
        willFetch: destinationsToFetch.length > 0
      });

      if (destinationsToFetch.length === 0) {
        console.warn('🎨 [usePexelsImages] No destinations to fetch - aborting');
        return;
      }

      logger.info('IMAGE', 'Starting image fetch', { destinations: destinationsToFetch });
      const newImages: Record<string, DestinationImage[]> = {};

      for (const location of destinationsToFetch) {
        try {
          // Call server-side API route
          const response = await fetch(`/api/images?destination=${encodeURIComponent(location)}&count=3`);

          if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
          }

          const data = await response.json();

          // Convert API response to generic format (works with both Pexels and Unsplash)
          const images: DestinationImage[] = (data.images || []).map((img: any) => ({
            id: img.id,
            url: img.urls?.regular || img.src?.large || img.url,
            photographer: img.user?.name || img.photographer,
            alt: img.alt_description || img.alt || location
          }));

          newImages[location] = images;
          logger.info('IMAGE', `Found ${images.length} images for ${location}`);
          console.log('✅ [useDest inationImages] Stored', images.length, 'images for', location);
        } catch (error) {
          logger.error('IMAGE', `Failed to fetch images for ${location}`, { error });
          newImages[location] = [];
        }
      }

      setDestinationImages(newImages);
    };

    fetchImages();
  }, [destination, locations.join(',')]); // Fetch when destination changes

  return destinationImages;
}