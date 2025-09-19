'use client';

// MapLibre implementation - replaced Leaflet
import { useState, useMemo, useCallback, useEffect } from 'react';
import { Map as MapGL, Marker, Source, Layer, NavigationControl, ScaleControl } from 'react-map-gl/maplibre';
import { MapPin, Navigation } from 'lucide-react';
import type { GeneratePersonalizedItineraryOutput } from '@/services/ai/schemas';
import { geocodeAddresses, getCenterPoint, getBounds, getCoordinatesWithFallback, CITY_COORDINATES, type Coordinates } from './utils/geocoding';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/helpers/general';
import 'maplibre-gl/dist/maplibre-gl.css';

interface MapActivity {
  dayNumber: number;
  time: string;
  description: string;
  category: string;
  address: string;
  coordinates?: Coordinates;
}

interface ItineraryMapProps {
  itinerary: GeneratePersonalizedItineraryOutput | {
    title: string;
    destination: string;
    days: GeneratePersonalizedItineraryOutput['itinerary'];
    quickTips: string[];
  };
  selectedDay?: number;
  onDaySelect?: (day: number) => void;
  showRoutes?: boolean;
  className?: string;
}

// Color palette for different days
const DAY_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FECA57', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
];

export function MapLibreMap({
  itinerary,
  selectedDay,
  onDaySelect,
  className
}: ItineraryMapProps) {
  console.log('🗺️ MapLibre: Component rendering', {
    destination: itinerary.destination,
    selectedDay
  });

  const [activities, setActivities] = useState<MapActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [viewState, setViewState] = useState({
    longitude: -0.1276,
    latitude: 51.5074,
    zoom: 12
  });

  // Extract activities from itinerary
  useEffect(() => {
    const extractedActivities: MapActivity[] = [];

    const days = 'days' in itinerary ? itinerary.days : itinerary.itinerary;
    days.forEach((day) => {
      const dayNumber = day.day || 1;

      day.activities.forEach((activity) => {
        let address = activity.address || activity.description;

        if (!activity.address) {
          const description = activity.description;
          const destination = (day as any).destination || itinerary.destination;

          if (description.toLowerCase().includes('hotel') ||
              description.toLowerCase().includes('accommodation')) {
            address = `Hotel in ${destination}`;
          } else if (description.toLowerCase().includes('airport')) {
            address = description;
          } else {
            address = `${description}, ${destination}`;
          }
        }

        extractedActivities.push({
          dayNumber: dayNumber,
          time: activity.time,
          description: activity.description,
          category: activity.category || 'general',
          address
        });
      });
    });

    console.log('MapLibre: Extracted activities:', extractedActivities.length);
    setActivities(extractedActivities);
  }, [itinerary]);

  // Geocode addresses
  useEffect(() => {
    const geocodeActivities = async () => {
      if (activities.some(a => a.coordinates)) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      console.log('MapLibre: Starting geocoding for', activities.length, 'activities');

      const batchSize = 3;
      const updatedActivities: MapActivity[] = [];

      for (let i = 0; i < activities.length; i += batchSize) {
        const batch = activities.slice(i, i + batchSize);

        const batchResults = await Promise.all(
          batch.map(async (activity) => {
            try {
              const coords = await getCoordinatesWithFallback(
                activity.address,
                itinerary.destination
              );
              return { ...activity, coordinates: coords || undefined };
            } catch (error) {
              console.warn(`Failed to geocode: ${activity.address}`, error);
              return { ...activity, coordinates: undefined };
            }
          })
        );

        updatedActivities.push(...batchResults);

        if (i + batchSize < activities.length) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }

      console.log('MapLibre: Geocoding complete,', updatedActivities.filter(a => a.coordinates).length, 'succeeded');
      setActivities(updatedActivities);
      setIsLoading(false);
    };

    if (activities.length > 0 && !activities.some(a => a.coordinates)) {
      geocodeActivities();
    } else if (activities.length > 0) {
      setIsLoading(false);
    }
  }, [activities.length, itinerary.destination]);

  // Calculate map bounds
  useEffect(() => {
    const validCoords = activities
      .filter(a => a.coordinates)
      .map(a => a.coordinates!);

    if (validCoords.length === 0) {
      // Try to get coordinates from destination name
      const destinationCity = itinerary.destination.split(',')[0].trim();
      const fallbackCoords = CITY_COORDINATES[destinationCity] ||
                            CITY_COORDINATES['London'];

      setViewState({
        longitude: fallbackCoords.lng,
        latitude: fallbackCoords.lat,
        zoom: 12
      });
      return;
    }

    const bounds = getBounds(validCoords);
    const center = getCenterPoint(validCoords);

    // Calculate appropriate zoom level based on bounds
    const latDiff = bounds.north - bounds.south;
    const lngDiff = bounds.east - bounds.west;
    const maxDiff = Math.max(latDiff, lngDiff);

    let zoom = 12;
    if (maxDiff < 0.01) zoom = 15;
    else if (maxDiff < 0.05) zoom = 13;
    else if (maxDiff < 0.1) zoom = 12;
    else if (maxDiff < 0.5) zoom = 10;
    else zoom = 9;

    setViewState({
      longitude: center.lng,
      latitude: center.lat,
      zoom
    });
  }, [activities, itinerary.destination]);

  // Filter activities by selected day
  const displayActivities = selectedDay
    ? activities.filter(a => a.dayNumber === selectedDay)
    : activities;

  // Group activities by day for routes
  const routeData = useMemo(() => {
    if (!showRoutes) return [];

    const grouped = new Map<number, MapActivity[]>();
    activities.forEach(activity => {
      if (!activity.coordinates) return;
      if (!grouped.has(activity.dayNumber)) {
        grouped.set(activity.dayNumber, []);
      }
      grouped.get(activity.dayNumber)!.push(activity);
    });

    const routes = [];
    for (const [day, dayActivities] of grouped.entries()) {
      if (dayActivities.length < 2) continue;
      if (selectedDay && day !== selectedDay) continue;

      const coordinates = dayActivities
        .map((a: MapActivity) => [a.coordinates!.lng, a.coordinates!.lat]);

      routes.push({
        type: 'Feature' as const,
        properties: { day },
        geometry: {
          type: 'LineString' as const,
          coordinates
        }
      });
    }

    return routes;
  }, [activities, showRoutes, selectedDay]);

  const handleFitBounds = useCallback(() => {
    const validCoords = (selectedDay
      ? activities.filter(a => a.dayNumber === selectedDay && a.coordinates)
      : activities.filter(a => a.coordinates))
      .map(a => a.coordinates!);

    if (validCoords.length === 0) return;

    const bounds = getBounds(validCoords);
    const center = getCenterPoint(validCoords);

    setViewState({
      longitude: center.lng,
      latitude: center.lat,
      zoom: 13
    });
  }, [activities, selectedDay]);

  if (isLoading) {
    return (
      <div className={cn("relative h-[400px] bg-background rounded-xl flex items-center justify-center border border-border", className)}>
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-orange-200 animate-ping" />
            <div className="absolute inset-0 rounded-full border-2 border-orange-300 animate-ping" style={{ animationDelay: '0.5s' }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <MapPin className="h-8 w-8 text-orange-500 animate-bounce" />
            </div>
          </div>
          <p className="text-sm text-foreground font-medium">Loading map...</p>
          <p className="text-xs text-muted-foreground mt-1">Plotting your journey</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative h-[400px] rounded-lg overflow-hidden", className)}>
      <MapGL
        {...viewState}
        onMove={evt => setViewState(evt.viewState)}
        style={{ width: '100%', height: '100%' }}
        mapStyle="https://tiles.locationiq.com/v3/streets/vector.json?key=pk.640f8feec3de6cc33e2d8fcbd44e5cfe"
      >
        <NavigationControl position="top-left" />
        <ScaleControl position="bottom-left" />

        {/* Draw routes */}
        {routeData.length > 0 && (
          <Source
            id="routes"
            type="geojson"
            data={{
              type: 'FeatureCollection',
              features: routeData
            }}
          >
            <Layer
              id="route-lines"
              type="line"
              paint={{
                'line-color': '#3B82F6', // Simple blue color for all routes
                'line-width': 3,
                'line-opacity': 0.6
              }}
            />
          </Source>
        )}

        {/* Add markers for activities */}
        {displayActivities.map((activity, index) => {
          if (!activity.coordinates) return null;

          return (
            <Marker
              key={`${activity.dayNumber}-${index}`}
              longitude={activity.coordinates.lng}
              latitude={activity.coordinates.lat}
              anchor="bottom"
              onClick={() => onDaySelect?.(activity.dayNumber)}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full text-white font-bold text-xs cursor-pointer transition-transform hover:scale-110",
                  selectedDay === activity.dayNumber ? "ring-4 ring-white ring-opacity-50" : ""
                )}
                style={{ backgroundColor: DAY_COLORS[(activity.dayNumber - 1) % DAY_COLORS.length] }}
              >
                {activity.dayNumber}
              </div>
            </Marker>
          );
        })}
      </MapGL>

      {/* Map Controls */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          onClick={handleFitBounds}
          className="bg-background/95 backdrop-blur-sm shadow-sm hover:bg-muted text-foreground text-xs border border-border"
          title="Reset view"
        >
          <Navigation className="h-3 w-3" />
          <span className="ml-1">Reset</span>
        </Button>
        <Button
          size="sm"
          variant={showRoutes ? "default" : "secondary"}
          onClick={() => setShowRoutes(!showRoutes)}
          className={cn(
            "shadow-sm text-xs border backdrop-blur-sm",
            showRoutes
              ? "bg-orange-500/95 hover:bg-orange-600 text-white border-orange-500/50"
              : "bg-background/95 hover:bg-muted text-foreground border-border"
          )}
          title="Toggle routes"
        >
          <Navigation className="h-3 w-3" />
          <span className="ml-1">Routes</span>
        </Button>
      </div>
    </div>
  );
}