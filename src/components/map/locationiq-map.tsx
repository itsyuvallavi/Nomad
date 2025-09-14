'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { GeneratePersonalizedItineraryOutput } from '@/services/ai/schemas';
import { cn } from '@/lib/utils';

interface LocationIQMapProps {
  itinerary: GeneratePersonalizedItineraryOutput | {
    title: string;
    destination: string;
    days: GeneratePersonalizedItineraryOutput['itinerary'];
    quickTips: string[];
  };
  selectedDay?: number;
  className?: string;
  locationiqApiKey?: string;
}

// City coordinates fallback
const CITY_COORDINATES: Record<string, [number, number]> = {
  'london': [-0.1276, 51.5074],
  'paris': [2.3522, 48.8566],
  'tokyo': [139.6503, 35.6762],
  'new york': [-74.0060, 40.7128],
  'barcelona': [2.1734, 41.3851],
  'rome': [12.4964, 41.9028],
  'berlin': [13.4050, 52.5200],
  'amsterdam': [4.9041, 52.3676],
  'dubai': [55.2708, 25.2048],
  'singapore': [103.8198, 1.3521],
  'sydney': [151.2093, -33.8688],
  'bangkok': [100.5018, 13.7563],
  'istanbul': [28.9784, 41.0082],
  'los angeles': [-118.2437, 34.0522],
  'san francisco': [-122.4194, 37.7749],
};

export function LocationIQMap({
  itinerary,
  selectedDay = 1,
  className,
  locationiqApiKey = process.env.NEXT_PUBLIC_LOCATIONIQ_API_KEY || process.env.LOCATIONIQ_API_KEY
}: LocationIQMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to extract coordinates from activities
  const extractCoordinates = (day: any) => {
    const coords: Array<{ lat: number; lng: number; title: string; type: string }> = [];

    if (day.activities && Array.isArray(day.activities)) {
      day.activities.forEach((activity: any, index: number) => {
        // Check if activity has coordinates from LocationIQ enrichment
        if (activity.coordinates && activity.coordinates.lat && activity.coordinates.lng) {
          coords.push({
            lat: activity.coordinates.lat,
            lng: activity.coordinates.lng,
            title: activity.venue_name || activity.description || `Activity ${index + 1}`,
            type: activity.category || 'activity'
          });
        } else if (activity._coordinates) {
          coords.push({
            lat: activity._coordinates.lat,
            lng: activity._coordinates.lng,
            title: activity.venue_name || activity.description || `Activity ${index + 1}`,
            type: activity.category || 'activity'
          });
        }
      });
    }

    // If no activity coordinates, try to get city coordinates
    if (coords.length === 0 && day._coordinates) {
      coords.push({
        lat: day._coordinates.lat,
        lng: day._coordinates.lng,
        title: day.title || day.location || 'Day Location',
        type: 'city'
      });
    }

    // Fallback to city lookup
    if (coords.length === 0) {
      const destination = itinerary.destination?.toLowerCase();
      if (destination) {
        for (const [city, [lng, lat]] of Object.entries(CITY_COORDINATES)) {
          if (destination.includes(city)) {
            coords.push({
              lat,
              lng,
              title: itinerary.destination,
              type: 'city'
            });
            break;
          }
        }
      }
    }

    return coords;
  };

  // Function to fit map bounds to show all markers
  const fitBounds = () => {
    if (!map.current || markers.current.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();
    markers.current.forEach(marker => {
      const lngLat = marker.getLngLat();
      bounds.extend([lngLat.lng, lngLat.lat]);
    });

    // Add padding and fit bounds
    map.current.fitBounds(bounds, {
      padding: { top: 50, bottom: 50, left: 50, right: 50 },
      maxZoom: 14,
      duration: 1000
    });
  };

  // Function to add markers to the map
  const addMarkers = () => {
    if (!map.current) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    // Get the selected day's data
    const days = 'itinerary' in itinerary ? itinerary.itinerary : itinerary.days;
    const selectedDayData = days.find((d: any) => d.day === selectedDay) || days[0];

    if (!selectedDayData) return;

    const coordinates = extractCoordinates(selectedDayData);

    // Add markers for each coordinate
    coordinates.forEach((coord, index) => {
      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.borderRadius = '50%';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';

      // Color based on type
      const colors: Record<string, string> = {
        'Food': '#ef4444',       // red
        'Attraction': '#3b82f6',  // blue
        'Accommodation': '#10b981', // green
        'Shopping': '#f59e0b',    // yellow
        'Entertainment': '#8b5cf6', // purple
        'activity': '#6b7280',    // gray
        'city': '#059669'         // emerald
      };

      el.style.backgroundColor = colors[coord.type] || '#6b7280';

      // Add number label
      if (coord.type !== 'city') {
        el.innerHTML = `<span style="color: white; font-weight: bold; font-size: 14px; display: flex; align-items: center; justify-content: center; height: 100%;">${index + 1}</span>`;
      }

      // Create marker
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([coord.lng, coord.lat])
        .setPopup(
          new maplibregl.Popup({ offset: 25 })
            .setHTML(`
              <div style="padding: 8px;">
                <h3 style="margin: 0 0 4px 0; font-weight: 600;">${coord.title}</h3>
                <p style="margin: 0; font-size: 12px; color: #666;">${coord.type}</p>
              </div>
            `)
        )
        .addTo(map.current!);

      markers.current.push(marker);
    });

    // Fit bounds after adding markers
    if (markers.current.length > 0) {
      setTimeout(() => fitBounds(), 100);
    }
  };

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize the map
    try {
      let style: any;

      // Check if we have a valid LocationIQ API key
      if (locationiqApiKey && locationiqApiKey.startsWith('pk')) {
        // Use LocationIQ Maps with the API key
        style = `https://tiles.locationiq.com/v3/streets/vector.json?key=${locationiqApiKey}`;
        console.log('Using LocationIQ Maps');
      } else {
        // Fallback to OpenStreetMap
        console.log('Using OpenStreetMap (add LOCATIONIQ_API_KEY to use LocationIQ Maps)');
        style = {
          version: 8,
          sources: {
            'osm-tiles': {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap contributors'
            }
          },
          layers: [{
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19
          }]
        };
      }

      map.current = new maplibregl.Map({
        container: mapContainer.current,
        style: style,
        center: [0, 20],
        zoom: 1.5,
        minZoom: 1,
        maxZoom: 18,
        attributionControl: false
      });

      // Add attribution control
      map.current.addControl(
        new maplibregl.AttributionControl({
          compact: true,
          customAttribution: locationiqApiKey ? '© LocationIQ © OpenStreetMap' : undefined
        }),
        'bottom-right'
      );

      // Add navigation controls
      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

      map.current.on('load', () => {
        setIsLoading(false);
        addMarkers();
      });

      map.current.on('error', (e) => {
        console.warn('Map warning:', e);
        // Don't set error for non-critical issues
        if (e.error && e.error.message) {
          console.warn('Map issue details:', e.error.message);
        }
      });

    } catch (err) {
      console.error('Failed to initialize map:', err);
      setError('Failed to load map. Please check your connection and try again.');
      setIsLoading(false);
    }

    // Cleanup
    return () => {
      markers.current.forEach(marker => marker.remove());
      map.current?.remove();
    };
  }, [locationiqApiKey]);

  // Update markers when selected day changes
  useEffect(() => {
    if (map.current && !isLoading) {
      addMarkers();
    }
  }, [selectedDay, itinerary]);

  if (error) {
    return (
      <div className={cn("h-full bg-gray-50 flex items-center justify-center", className)}>
        <div className="text-center p-4">
          <p className="text-sm text-gray-600 mb-2">Map unavailable</p>
          <p className="text-xs text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative h-full w-full", className)}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-50 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-gray-500">Loading map...</p>
          </div>
        </div>
      )}
      <div ref={mapContainer} className="h-full w-full" />
    </div>
  );
}