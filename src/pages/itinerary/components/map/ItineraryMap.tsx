'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import { MapPin, Navigation, Layers, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import type { GeneratePersonalizedItineraryOutput } from '@/services/ai/schemas';
import { geocodeAddresses, getCenterPoint, getBounds, getCoordinatesWithFallback, CITY_COORDINATES, type Coordinates } from './utils/geocoding';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/helpers/general';
import { locationIQMap } from '@/services/api/locationiq-map';

// Global registry to track initialized map containers
const GLOBAL_MAP_REGISTRY = new Map<string, boolean>();

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  async () => {
    const mod = await import('react-leaflet');
    return mod.MapContainer;
  },
  { ssr: false }
);

const TileLayer = dynamic(
  async () => {
    const mod = await import('react-leaflet');
    return mod.TileLayer;
  },
  { ssr: false }
);

// Note: useMap is a hook and can't be dynamically imported
// We'll import it directly when needed inside components

const ActivityMarker = dynamic(
  async () => {
    const mod = await import('./Activity-marker');
    return { default: mod.ActivityMarker };
  },
  { ssr: false }
);

const RouteLayer = dynamic(
  () => import('./Route-layer'),
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
  showRoutes?: boolean;
  mapView?: 'satellite' | 'streets';
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
        className="bg-background/95 backdrop-blur-sm shadow-sm hover:bg-muted text-foreground text-xs border border-border"
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
  );
}

// Create MapUpdater as a separate dynamic component to handle the useMap hook
const MapUpdater = dynamic(
  async () => {
    const React = await import('react');
    const mod = await import('react-leaflet');
    const { useMap } = mod;
    const { useEffect } = React;

    return function MapUpdaterComponent({ center, zoom, bounds }: { center?: Coordinates; zoom?: number; bounds?: any }) {
      const map = useMap();

      useEffect(() => {
        if (bounds) {
          map.fitBounds(bounds, { padding: [50, 50] });
        } else if (center) {
          map.setView([center.lat, center.lng], zoom || 13);
        }
      }, [map, center, zoom, bounds]);

      return null;
    };
  },
  { ssr: false }
);

export function ItineraryMap({
  itinerary,
  selectedDay,
  onDaySelect,
  className
}: ItineraryMapProps) {
  // Debug logging to trace double initialization
  const instanceId = useRef(`map-instance-${Math.random().toString(36).substr(2, 9)}`);
  const renderCount = useRef(0);
  const mountCount = useRef(0);
  renderCount.current += 1;

  console.log(`🗺️ [${instanceId.current}] ItineraryMap RENDER #${renderCount.current}`, {
    destination: itinerary.destination,
    className,
    timestamp: new Date().toISOString(),
    phase: 'Component Function Called',
    stackTrace: new Error().stack
  });
  const [activities, setActivities] = useState<MapActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  const [mapInstance, setMapInstance] = useState<any>(null);

  // Create stable container ID based on component instance
  const containerId = useMemo(() => {
    // Create a stable ID based on the destination and a session key
    const baseId = `leaflet-${itinerary.destination.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`;
    const id = `map-container-${baseId}`;

    console.log(`🗺️ [${instanceId.current}] Container ID logic:`, {
      id,
      alreadyInRegistry: GLOBAL_MAP_REGISTRY.has(id),
      registrySize: GLOBAL_MAP_REGISTRY.size,
      registryKeys: Array.from(GLOBAL_MAP_REGISTRY.keys())
    });

    return id;
  }, [itinerary.destination]);

  // Track mount/unmount lifecycle and manage container registry
  useEffect(() => {
    mountCount.current += 1;
    const existingElement = document.getElementById(containerId);
    const isInRegistry = GLOBAL_MAP_REGISTRY.has(containerId);

    console.log(`🗺️🔵 [${instanceId.current}] MOUNT #${mountCount.current}`, {
      timestamp: new Date().toISOString(),
      renderCount: renderCount.current,
      containerId,
      existingElement: !!existingElement,
      hasLeafletClass: existingElement?.classList.contains('leaflet-container'),
      isInRegistry,
      registrySize: GLOBAL_MAP_REGISTRY.size
    });

    // Clean up existing Leaflet instance if present
    if (existingElement && existingElement.classList.contains('leaflet-container')) {
      console.log(`🗺️🧹 [${instanceId.current}] Cleaning up existing Leaflet container`);

      // Try to get the Leaflet map instance and properly remove it
      const L = (window as any).L;
      if (L && L.DomUtil) {
        // Remove Leaflet's event listeners
        L.DomUtil.empty(existingElement);
      }

      // Remove all Leaflet classes and content
      existingElement.innerHTML = '';
      existingElement.className = existingElement.className.replace(/leaflet-[\w-]+/g, '').trim();

      // Clear from registry
      GLOBAL_MAP_REGISTRY.delete(containerId);
    }

    return () => {
      console.log(`🗺️🔴 [${instanceId.current}] UNMOUNT`, {
        timestamp: new Date().toISOString(),
        mountCount: mountCount.current,
        renderCount: renderCount.current,
        containerId,
        willCleanRegistry: GLOBAL_MAP_REGISTRY.has(containerId)
      });

      // Clean up registry on unmount
      GLOBAL_MAP_REGISTRY.delete(containerId);
    };
  }, [containerId]);

  // Clean up map on unmount to prevent "already initialized" errors
  useEffect(() => {
    if (mapInstance) {
      const mapContainer = mapInstance.getContainer?.();
      const mapId = mapContainer?.id;

      console.log(`🗺️ [${instanceId.current}] Map instance effect`, {
        hasInstance: !!mapInstance,
        mapId,
        containerElement: mapContainer,
        registryHasId: mapId ? GLOBAL_MAP_REGISTRY.has(mapId) : false
      });

      // Mark as initialized in registry
      if (mapId && !GLOBAL_MAP_REGISTRY.has(mapId)) {
        GLOBAL_MAP_REGISTRY.set(mapId, true);
        console.log(`🗺️✅ [${instanceId.current}] Registered map in global registry:`, mapId);
      }
    }

    return () => {
      if (mapInstance) {
        const mapContainer = mapInstance.getContainer?.();
        const mapId = mapContainer?.id;

        console.log(`🗺️ [${instanceId.current}] Map cleanup starting`, {
          hasInstance: !!mapInstance,
          mapId
        });

        try {
          // Check if container still exists in DOM
          const containerExists = mapId ? document.getElementById(mapId) : null;
          console.log(`🗺️ [${instanceId.current}] Container exists in DOM:`, !!containerExists);

          // Remove the map instance
          mapInstance.remove?.();
          console.log(`🗺️ [${instanceId.current}] Map instance removed successfully`);

          // Clean up registry
          if (mapId) {
            GLOBAL_MAP_REGISTRY.delete(mapId);
            console.log(`🗺️ [${instanceId.current}] Removed from global registry:`, mapId);
          }
        } catch (e) {
          console.error(`🗺️ [${instanceId.current}] Error removing map:`, e);
        }
      }
    };
  }, [mapInstance]);

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

  // Removed mapKey - now using unique containerId as the key

  // LocationIQ API key - hardcoded for now (env vars need rebuild in Next.js)
  const locationIQKey = 'pk.640f8feec3de6cc33e2d8fcbd44e5cfe';

  // Get LocationIQ tile URL and attribution - NO FALLBACK
  const { tileUrl, attribution } = useMemo(() => {
    console.log('Using LocationIQ tiles exclusively');
    return {
      tileUrl: locationIQMap.getTileUrl(locationIQKey, 'streets'),
      attribution: locationIQMap.getAttribution()
    };
  }, [locationIQKey]);

  // Delay map rendering to avoid StrictMode double-mount issues
  const [canRenderMap, setCanRenderMap] = useState(false);

  useEffect(() => {
    console.log(`🗺️⏱️ [${instanceId.current}] Setting render delay timer`);
    // Small delay to let StrictMode's first mount/unmount cycle complete
    const timer = setTimeout(() => {
      console.log(`🗺️✅ [${instanceId.current}] Timer fired, enabling map render`);
      setCanRenderMap(true);
    }, 10);

    return () => {
      console.log(`🗺️⏱️ [${instanceId.current}] Clearing render delay timer`);
      clearTimeout(timer);
      setCanRenderMap(false);
    };
  }, []);

  if (isLoading || !canRenderMap) {
    return (
      <div className={cn("relative h-[400px] bg-background rounded-xl flex items-center justify-center border border-border", className)}>
        <div className="text-center">
          <div className="relative w-16 h-16 mx-auto mb-4">
            {/* Animated circles */}
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

  // Check if we should skip rendering due to existing initialization
  const shouldSkipRender = GLOBAL_MAP_REGISTRY.has(containerId);

  console.log(`🗺️🎨 [${instanceId.current}] RENDER CHECK`, {
    containerId,
    shouldSkipRender,
    existingElement: !!document.getElementById(containerId),
    existingLeafletMaps: document.querySelectorAll('.leaflet-container').length,
    registrySize: GLOBAL_MAP_REGISTRY.size,
    phase: 'Pre-Render Check'
  });

  // Check for existing Leaflet instances before rendering
  const existingMaps = document.querySelectorAll('.leaflet-container');
  if (existingMaps.length > 0) {
    console.warn(`🗺️⚠️ [${instanceId.current}] Found ${existingMaps.length} existing Leaflet maps:`);
    existingMaps.forEach((map, i) => {
      console.warn(`  Map ${i}: ID=${map.id}, Parent=${map.parentElement?.id}, InRegistry=${GLOBAL_MAP_REGISTRY.has(map.id)}`);
    });
  }

  // If container is already initialized, skip rendering to prevent errors
  if (shouldSkipRender) {
    console.warn(`🗺️🚫 [${instanceId.current}] SKIPPING MAP RENDER - Container already initialized:`, containerId);
    return (
      <div className={cn("relative h-[400px] bg-background rounded-xl flex items-center justify-center border border-border", className)}>
        <div className="text-center">
          <p className="text-sm text-foreground">Map already initialized</p>
          <p className="text-xs text-muted-foreground mt-1">Please refresh if map is not visible</p>
        </div>
      </div>
    );
  }

  console.log(`🗺️✨ [${instanceId.current}] RENDERING MAP COMPONENT`, {
    containerId,
    phase: 'Final Render'
  });

  return (
    <div id={containerId} className={cn("relative h-[400px] rounded-lg overflow-hidden", className)}>
      <MapContainer
        key={containerId}
        center={[center.lat, center.lng]}
        zoom={13}
        className="h-full w-full"
        ref={(instance) => {
          console.log(`🗺️📍 [${instanceId.current}] MapContainer ref callback`, {
            hasInstance: !!instance,
            containerId: instance?.getContainer?.()?.id,
            registryState: GLOBAL_MAP_REGISTRY.has(containerId)
          });
          setMapInstance(instance);
        }}
      >
        <TileLayer
          attribution={attribution}
          url={tileUrl}
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