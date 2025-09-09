'use client';

import { useEffect, useState, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Navigation, Layers, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/schemas';
import { geocodeAddresses, getCenterPoint, getBounds, getCoordinatesWithFallback, CITY_COORDINATES, type Coordinates } from './utils/geocoding';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then(mod => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import('react-leaflet').then(mod => mod.TileLayer),
  { ssr: false }
);

// Note: useMap is a hook and can't be dynamically imported
// We'll import it directly when needed inside components

const ActivityMarker = dynamic(
  () => import('./activity-marker').then(mod => ({ default: mod.ActivityMarker })),
  { ssr: false }
);

const RouteLayer = dynamic(
  () => import('./route-layer'),
  { ssr: false }
);

interface ItineraryMapProps {
  itinerary: GeneratePersonalizedItineraryOutput | {
    title: string;
    destination: string;
    days: GeneratePersonalizedItineraryOutput['itinerary'];
    quickTips: string[];
  };
  selectedDay?: number;
  onDaySelect?: (day: number) => void;
  className?: string;
}

interface MapActivity {
  dayNumber: number;
  time: string;
  description: string;
  category: string;
  address: string;
  coordinates?: Coordinates;
}

// Simplified map controls
function MapControls({ 
  onFitBounds,
  showRoutes,
  onToggleRoutes 
}: {
  onFitBounds: () => void;
  showRoutes: boolean;
  onToggleRoutes: () => void;
}) {
  return (
    <div className="absolute top-4 right-4 z-[1000] flex gap-2">
      <Button
        size="sm"
        variant="secondary"
        onClick={onFitBounds}
        className="bg-slate-900/95 backdrop-blur-sm shadow-lg hover:bg-slate-800 text-slate-200 text-xs border border-slate-700/50"
        title="Reset view"
      >
        <Maximize2 className="h-3 w-3" />
        <span className="ml-1">Reset</span>
      </Button>
      <Button
        size="sm"
        variant={showRoutes ? "default" : "secondary"}
        onClick={onToggleRoutes}
        className={cn(
          "shadow-lg text-xs border backdrop-blur-sm",
          showRoutes 
            ? "bg-blue-600/95 hover:bg-blue-700 text-white border-blue-500/50" 
            : "bg-slate-900/95 hover:bg-slate-800 text-slate-200 border-slate-700/50"
        )}
        title="Toggle routes"
      >
        <Navigation className="h-3 w-3" />
        <span className="ml-1">Routes</span>
      </Button>
    </div>
  );
}

// Map updater component to handle view changes
function MapUpdater({ center, zoom, bounds }: { center?: Coordinates; zoom?: number; bounds?: any }) {
  // Import useMap directly inside the component
  const { useMap } = require('react-leaflet');
  const map = useMap();
  
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    } else if (center) {
      map.setView([center.lat, center.lng], zoom || 13);
    }
  }, [map, center, zoom, bounds]);
  
  return null;
}

export function ItineraryMap({ 
  itinerary, 
  selectedDay,
  onDaySelect,
  className 
}: ItineraryMapProps) {
  const [activities, setActivities] = useState<MapActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [mapInstance, setMapInstance] = useState<any>(null);

  // Extract activities from itinerary - only run once on mount
  useEffect(() => {
    const extractedActivities: MapActivity[] = [];
    
    const days = 'days' in itinerary ? itinerary.days : itinerary.itinerary;
    days.forEach((day) => {
      // Use the actual day number from the itinerary data
      const dayNumber = day.day || 1;
      
      day.activities.forEach((activity, activityIndex) => {
        // Build a more specific address for better geocoding
        let address = activity.address || activity.description;
        
        // If no specific address, create one from the description and destination
        if (!activity.address) {
          // Extract location hints from description
          const description = activity.description;
          const destination = (day as any).destination || itinerary.destination;
          
          // For generic activities, add city context
          if (description.toLowerCase().includes('hotel') || 
              description.toLowerCase().includes('accommodation')) {
            address = `Hotel in ${destination}`;
          } else if (description.toLowerCase().includes('airport')) {
            // Keep airport references as-is, they geocode well
            address = description;
          } else {
            // Add city context to improve geocoding
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
    
    console.log('Extracted activities for map:', extractedActivities);
    setActivities(extractedActivities);
  }, []); // Empty dependency array - only run once

  // Geocode addresses - only when activities are first set
  useEffect(() => {
    const geocodeActivities = async () => {
      // Skip if activities already have coordinates
      if (activities.some(a => a.coordinates)) {
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      
      // Process activities in batches to avoid overwhelming the API
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
              // If geocoding fails, try to use city fallback
              console.warn(`Failed to geocode: ${activity.address}`, error);
              return { ...activity, coordinates: undefined };
            }
          })
        );
        
        updatedActivities.push(...batchResults);
        
        // Add delay between batches
        if (i + batchSize < activities.length) {
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
      
      setActivities(updatedActivities);
      setIsLoading(false);
    };
    
    if (activities.length > 0 && !activities.some(a => a.coordinates)) {
      geocodeActivities();
    } else if (activities.length > 0) {
      setIsLoading(false);
    }
  }, [activities.length]); // Only depend on activities.length, not the whole object

  // Calculate map center and bounds
  const { center, bounds } = useMemo(() => {
    const validCoords = activities
      .filter(a => a.coordinates)
      .map(a => a.coordinates!);
    
    if (validCoords.length === 0) {
      // Try to get coordinates from destination name
      const destinationCity = itinerary.destination.split(',')[0].trim();
      const fallbackCoords = CITY_COORDINATES[destinationCity] || 
                            Object.keys(CITY_COORDINATES).find(city => 
                              destinationCity.toLowerCase().includes(city.toLowerCase())
                            );
      
      const defaultCenter = fallbackCoords && typeof fallbackCoords === 'string'
        ? CITY_COORDINATES[fallbackCoords] || CITY_COORDINATES['London']
        : CITY_COORDINATES['London'];
      
      return { 
        center: defaultCenter,
        bounds: null 
      };
    }
    
    const boundsData = getBounds(validCoords);
    return {
      center: getCenterPoint(validCoords),
      bounds: [
        [boundsData.south, boundsData.west],
        [boundsData.north, boundsData.east]
      ]
    };
  }, [activities, itinerary.destination]);

  // Filter activities by selected day
  const displayActivities = selectedDay 
    ? activities.filter(a => a.dayNumber === selectedDay)
    : activities;

  // Group activities by day for route drawing
  const activitiesByDay = useMemo(() => {
    const grouped = new Map<number, MapActivity[]>();
    activities.forEach(activity => {
      if (!grouped.has(activity.dayNumber)) {
        grouped.set(activity.dayNumber, []);
      }
      grouped.get(activity.dayNumber)!.push(activity);
    });
    return grouped;
  }, [activities]);

  const handleZoomIn = () => {
    if (mapInstance) {
      mapInstance.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstance) {
      mapInstance.zoomOut();
    }
  };

  const handleFitBounds = () => {
    if (mapInstance && bounds) {
      mapInstance.fitBounds(bounds, { padding: [50, 50] });
    }
  };

  if (isLoading) {
    return (
      <div className={cn("relative h-[400px] bg-gradient-to-b from-slate-800 to-slate-900 rounded-xl flex items-center justify-center border border-slate-700/50", className)}>
        <div className="text-slate-400">
          <MapPin className="h-8 w-8 mx-auto mb-2 animate-pulse" />
          <p className="text-sm">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative h-[400px] rounded-lg overflow-hidden", className)}>
      <MapContainer
        center={[center.lat, center.lng]}
        zoom={13}
        className="h-full w-full"
        ref={setMapInstance}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />
        
        <MapUpdater 
          center={selectedDay ? undefined : center} 
          bounds={selectedDay ? null : bounds}
        />
        
        {/* Draw routes for each day */}
        {showRoutes && Array.from(activitiesByDay.entries()).map(([day, dayActivities]) => {
          const routeCoords = dayActivities
            .filter(a => a.coordinates)
            .map(a => a.coordinates!);
          
          if (routeCoords.length < 2) return null;
          
          return (
            <RouteLayer
              key={day}
              coordinates={routeCoords}
              dayNumber={day}
              isSelected={selectedDay === day}
            />
          );
        })}
        
        {/* Add markers for activities */}
        {displayActivities.map((activity, index) => {
          if (!activity.coordinates) return null;
          
          return (
            <ActivityMarker
              key={`${activity.dayNumber}-${index}`}
              position={activity.coordinates}
              activity={activity}
              dayNumber={activity.dayNumber}
              isSelected={selectedDay === activity.dayNumber}
              onClick={() => onDaySelect?.(activity.dayNumber)}
            />
          );
        })}
      </MapContainer>
      
      <MapControls
        onFitBounds={handleFitBounds}
        showRoutes={showRoutes}
        onToggleRoutes={() => setShowRoutes(!showRoutes)}
      />
    </div>
  );
}