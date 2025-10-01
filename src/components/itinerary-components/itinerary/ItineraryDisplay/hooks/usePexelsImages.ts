import { useState, useEffect } from 'react';
import { searchPexelsImages, type PexelsImage } from '@/services/api/media/pexels';
import { logger } from '@/lib/monitoring/logger';

export function usePexelsImages(
  destination: string | undefined,
  locations: string[]
): Record<string, PexelsImage[]> {
  const [destinationImages, setDestinationImages] = useState<Record<string, PexelsImage[]>>({});

  useEffect(() => {
    const fetchImages = async () => {
      // Use destinations from metadata if available, otherwise use locations from days
      const destinationsToFetch = destination
        ? destination.split(',').map(d => d.trim())
        : locations;

      if (destinationsToFetch.length === 0) return;

      logger.info('IMAGE', 'Starting Pexels image fetch', { destinations: destinationsToFetch });
      const newImages: Record<string, PexelsImage[]> = {};

      for (const location of destinationsToFetch) {
        try {
          const images = await searchPexelsImages(location, 3);
          newImages[location] = images;
          logger.info('IMAGE', `Pexels found ${images.length} images for ${location}`);
        } catch (error) {
          logger.error('IMAGE', `Pexels failed to fetch images for ${location}`, { error });
          newImages[location] = [];
        }
      }

      setDestinationImages(newImages);
    };

    fetchImages();
  }, [destination, locations.join(',')]); // Fetch when destination changes

  return destinationImages;
}