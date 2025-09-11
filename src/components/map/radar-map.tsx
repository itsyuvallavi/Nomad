'use client';

import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/schemas';
import { cn } from '@/lib/utils';

interface RadarMapProps {
  itinerary: GeneratePersonalizedItineraryOutput | {
    title: string;
    destination: string;
    days: GeneratePersonalizedItineraryOutput['itinerary'];
    quickTips: string[];
  };
  selectedDay?: number;
  className?: string;
  radarApiKey?: string;
}

export function RadarMap({ 
  itinerary, 
  selectedDay = 1, 
  className,
  radarApiKey = process.env.NEXT_PUBLIC_RADAR_PUBLISHABLE_KEY 
}: RadarMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;
    
    // Initialize the map
    try {
      let style: any;
      
      // Check if we have a valid Radar API key
      if (radarApiKey && radarApiKey.startsWith('prj_')) {
        // Use Radar Maps with the publishable key
        style = `https://api.radar.io/maps/styles/radar-default-v1?publishableKey=${radarApiKey}`;
        console.log('Using Radar Maps');
      } else {
        // Fallback to OpenStreetMap
        console.log('Using OpenStreetMap (add your Radar publishable key to use Radar Maps)');
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
        zoom: 1.5, // Start more zoomed out to see more countries
        minZoom: 1, // Allow zooming out to see whole world
        maxZoom: 18,
        attributionControl: false
      });

      // Add attribution control with compact style
      map.current.addControl(
        new maplibregl.AttributionControl({
          compact: true
        }),
        'bottom-right'
      );

      // Add navigation controls
      map.current.addControl(new maplibregl.NavigationControl(), 'top-right');

      map.current.on('load', () => {
        setIsLoading(false);
        addMarkers();
        fitBounds();
      });

      map.current.on('error', (e) => {
        console.warn('Map warning:', e);
        // Don't set error for non-critical issues
        if (e.error && e.error.message) {
          console.warn('Map issue details:', e.error.message);
        }
      });
    } catch (err) {
      console.error('Map initialization error:', err);
      setError('Failed to initialize map');
    }

    return () => {
      markers.current.forEach(marker => marker.remove());
      markers.current = [];
      map.current?.remove();
    };
  }, [radarApiKey]);

  useEffect(() => {
    // Update markers when selected day changes
    if (map.current && !isLoading) {
      updateMarkers();
    }
  }, [selectedDay, isLoading]);

  const addMarkers = () => {
    if (!map.current) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    // Get unique cities from the itinerary
    const cities = new Map<string, { lat: number; lng: number; days: number[] }>();
    
    itinerary.itinerary.forEach((day) => {
      const destination = day._destination || day.title.split(':')[1]?.trim() || '';
      
      // First check if we have enriched coordinates from Radar
      let coords = null;
      if ((day as any)._coordinates) {
        coords = (day as any)._coordinates;
        const cityKey = destination;
        if (!cities.has(cityKey)) {
          cities.set(cityKey, { ...coords, days: [day.day] });
        } else {
          const city = cities.get(cityKey)!;
          if (!city.days.includes(day.day)) {
            city.days.push(day.day);
          }
        }
      } else {
        // Try to get coordinates for the destination from our database
        coords = getCityCoordinates(destination);
        if (coords) {
          const cityKey = destination;
          if (!cities.has(cityKey)) {
            cities.set(cityKey, { ...coords, days: [day.day] });
          } else {
            const city = cities.get(cityKey)!;
            if (!city.days.includes(day.day)) {
              city.days.push(day.day);
            }
          }
        }
      }
      
      if (!coords) {
        // If we can't find the exact destination, try to parse it
        // Handle cases like "Explore Brazil" or "Day in Buenos Aires"
        const possibleCities = [
          'Brazil', 'Argentina', 'Chile', 'Peru', 'Colombia',
          'Rio de Janeiro', 'Buenos Aires', 'Santiago', 'Lima', 'Bogota',
          'São Paulo', 'Sao Paulo'
        ];
        
        for (const city of possibleCities) {
          if (destination.includes(city) || day.title.includes(city)) {
            const cityCoords = getCityCoordinates(city);
            if (cityCoords) {
              if (!cities.has(city)) {
                cities.set(city, { ...cityCoords, days: [day.day] });
              } else {
                const existingCity = cities.get(city)!;
                if (!existingCity.days.includes(day.day)) {
                  existingCity.days.push(day.day);
                }
              }
              break;
            }
          }
        }
      }
    });

    // Debug logging
    console.log('Found cities for map:', Array.from(cities.keys()));
    
    // If no cities found, log warning
    if (cities.size === 0) {
      console.warn('No cities found to display on map. Check destination names.');
      return;
    }

    // If only one city, don't zoom in too close
    if (cities.size === 1) {
      const [cityData] = cities.values();
      map.current.setCenter([cityData.lng, cityData.lat]);
      map.current.setZoom(5); // City-level zoom that shows surrounding area
    }

    // Add markers for each city
    cities.forEach((city, name) => {
      const el = document.createElement('div');
      el.className = 'radar-map-marker';
      el.style.width = '32px';
      el.style.height = '32px';
      el.style.borderRadius = '50%';
      el.style.backgroundColor = city.days.includes(selectedDay) ? '#1a1a1a' : '#9ca3af';
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 6px rgba(0,0,0,0.3)';
      el.style.cursor = 'pointer';
      el.style.display = 'flex';
      el.style.alignItems = 'center';
      el.style.justifyContent = 'center';
      el.style.color = 'white';
      el.style.fontSize = '12px';
      el.style.fontWeight = 'bold';
      el.innerHTML = city.days.length.toString();

      const popup = new maplibregl.Popup({ offset: 25 })
        .setHTML(`
          <div style="padding: 8px;">
            <h3 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600;">${name}</h3>
            <p style="margin: 0; font-size: 12px; color: #666;">Days ${city.days.join(', ')}</p>
          </div>
        `);

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([city.lng, city.lat])
        .setPopup(popup)
        .addTo(map.current!);

      markers.current.push(marker);
    });
  };

  const updateMarkers = () => {
    // Update marker styles based on selected day
    markers.current.forEach((marker, index) => {
      const el = marker.getElement();
      if (el) {
        // This is simplified - in production you'd track which marker corresponds to which days
        el.style.backgroundColor = '#1a1a1a';
        el.style.transform = 'scale(1)';
      }
    });
  };

  const fitBounds = () => {
    if (!map.current || markers.current.length === 0) return;

    const bounds = new maplibregl.LngLatBounds();
    markers.current.forEach(marker => {
      bounds.extend(marker.getLngLat());
    });

    // Add extra padding to show surrounding countries
    map.current.fitBounds(bounds, {
      padding: { top: 150, bottom: 150, left: 150, right: 150 },
      maxZoom: 6, // Don't zoom in too much - keep wide view
      duration: 1000 // Smooth animation
    });
  };

  // Helper function to get city coordinates
  const getCityCoordinates = (cityName: string): { lat: number; lng: number } | null => {
    const cities: Record<string, { lat: number; lng: number }> = {
      'London': { lat: 51.5074, lng: -0.1278 },
      'Paris': { lat: 48.8566, lng: 2.3522 },
      'Tokyo': { lat: 35.6762, lng: 139.6503 },
      'New York': { lat: 40.7128, lng: -74.0060 },
      'Bali': { lat: -8.3405, lng: 115.0920 },
      'Indonesia': { lat: -8.3405, lng: 115.0920 },
      'Bali, Indonesia': { lat: -8.3405, lng: 115.0920 },
      'Rome': { lat: 41.9028, lng: 12.4964 },
      'Barcelona': { lat: 41.3851, lng: 2.1734 },
      'Amsterdam': { lat: 52.3676, lng: 4.9041 },
      'Berlin': { lat: 52.5200, lng: 13.4050 },
      'Dubai': { lat: 25.2048, lng: 55.2708 },
      'Singapore': { lat: 1.3521, lng: 103.8198 },
      'Sydney': { lat: -33.8688, lng: 151.2093 },
      'Los Angeles': { lat: 34.0522, lng: -118.2437 },
      'San Francisco': { lat: 37.7749, lng: -122.4194 },
      'Chicago': { lat: 41.8781, lng: -87.6298 },
      'Boston': { lat: 42.3601, lng: -71.0589 },
      'Miami': { lat: 25.7617, lng: -80.1918 },
      'Bangkok': { lat: 13.7563, lng: 100.5018 },
      'Seoul': { lat: 37.5665, lng: 126.9780 },
      'Mumbai': { lat: 19.0760, lng: 72.8777 },
      'Mexico City': { lat: 19.4326, lng: -99.1332 },
      'Istanbul': { lat: 41.0082, lng: 28.9784 },
      'Moscow': { lat: 55.7558, lng: 37.6173 },
      'Cairo': { lat: 30.0444, lng: 31.2357 },
      'Athens': { lat: 37.9838, lng: 23.7275 },
      'Vienna': { lat: 48.2082, lng: 16.3738 },
      'Prague': { lat: 50.0755, lng: 14.4378 },
      'Budapest': { lat: 47.4979, lng: 19.0402 },
      'Lisbon': { lat: 38.7223, lng: -9.1393 },
      'Madrid': { lat: 40.4168, lng: -3.7038 },
      'Dublin': { lat: 53.3498, lng: -6.2603 },
      'Edinburgh': { lat: 55.9533, lng: -3.1883 },
      'Copenhagen': { lat: 55.6761, lng: 12.5683 },
      'Stockholm': { lat: 59.3293, lng: 18.0686 },
      'Oslo': { lat: 59.9139, lng: 10.7522 },
      'Helsinki': { lat: 60.1699, lng: 24.9384 },
      'Warsaw': { lat: 52.2297, lng: 21.0122 },
      'Brussels': { lat: 50.8503, lng: 4.3517 },
      'Zurich': { lat: 47.3769, lng: 8.5417 },
      'Geneva': { lat: 46.2044, lng: 6.1432 },
      'Venice': { lat: 45.4408, lng: 12.3155 },
      'Florence': { lat: 43.7696, lng: 11.2558 },
      'Milan': { lat: 45.4642, lng: 9.1900 },
      // South America
      'Brazil': { lat: -22.9068, lng: -43.1729 }, // Rio de Janeiro
      'Rio de Janeiro': { lat: -22.9068, lng: -43.1729 },
      'São Paulo': { lat: -23.5505, lng: -46.6333 },
      'Sao Paulo': { lat: -23.5505, lng: -46.6333 },
      'Argentina': { lat: -34.6037, lng: -58.3816 }, // Buenos Aires
      'Buenos Aires': { lat: -34.6037, lng: -58.3816 },
      'Chile': { lat: -33.4489, lng: -70.6693 }, // Santiago
      'Santiago': { lat: -33.4489, lng: -70.6693 },
      'Peru': { lat: -12.0464, lng: -77.0428 }, // Lima
      'Lima': { lat: -12.0464, lng: -77.0428 },
      'Colombia': { lat: 4.7110, lng: -74.0721 }, // Bogota
      'Bogota': { lat: 4.7110, lng: -74.0721 },
      'Bogotá': { lat: 4.7110, lng: -74.0721 },
      // More cities
      'Kyoto': { lat: 35.0116, lng: 135.7681 },
      'Osaka': { lat: 34.6937, lng: 135.5023 },
      'Beijing': { lat: 39.9042, lng: 116.4074 },
      'Shanghai': { lat: 31.2304, lng: 121.4737 },
      'Hong Kong': { lat: 22.3193, lng: 114.1694 },
      'Delhi': { lat: 28.7041, lng: 77.1025 },
      'Toronto': { lat: 43.6532, lng: -79.3832 },
      'Vancouver': { lat: 49.2827, lng: -123.1207 },
      'Montreal': { lat: 45.5017, lng: -73.5673 },
      'Cancun': { lat: 21.1619, lng: -86.8515 },
      'Cape Town': { lat: -33.9249, lng: 18.4241 },
      'Johannesburg': { lat: -26.2041, lng: 28.0473 },
      'Marrakech': { lat: 31.6295, lng: -7.9811 },
      'Casablanca': { lat: 33.5731, lng: -7.5898 }
    };

    // Try exact match first
    if (cities[cityName]) {
      return cities[cityName];
    }

    // Try partial match
    const lowerCity = cityName.toLowerCase();
    for (const [key, coords] of Object.entries(cities)) {
      if (key.toLowerCase().includes(lowerCity) || lowerCity.includes(key.toLowerCase())) {
        return coords;
      }
    }

    return null;
  };

  if (error) {
    return (
      <div className={cn("relative w-full h-full bg-gray-100 flex items-center justify-center", className)}>
        <div className="text-center">
          <p className="text-gray-600 mb-2">Unable to load map</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative w-full h-full", className)}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-10">
          <div className="text-gray-600">Loading map...</div>
        </div>
      )}
      <div ref={mapContainer} className="w-full h-full" />
    </div>
  );
}