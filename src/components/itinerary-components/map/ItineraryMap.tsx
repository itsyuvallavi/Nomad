'use client';

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useMemo } from 'react';

// Fix for default marker icons in Next.js
// Leaflet's default icon images don't work with webpack, so we need to set them manually
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to handle map centering when center changes
function MapCenterUpdater({ center }: { center: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, 13, {
        animate: true,
        duration: 1 // 1 second smooth animation
      });
    }
  }, [center, map]);

  return null;
}

// Component to fit map bounds to show all markers for selected day
function MapBoundsUpdater({
  activities,
  selectedDay
}: {
  activities: Activity[];
  selectedDay: number;
}) {
  const map = useMap();

  useEffect(() => {
    // Filter activities for selected day that have coordinates
    const selectedDayActivities = activities.filter(
      activity => activity.dayNumber === selectedDay &&
                  activity.coordinates?.lat &&
                  activity.coordinates?.lng
    );

    if (selectedDayActivities.length === 0) return;

    // If only one activity, just center on it
    if (selectedDayActivities.length === 1) {
      const coords = selectedDayActivities[0].coordinates!;
      map.setView([coords.lat, coords.lng], 14, { animate: true });
      return;
    }

    // Create bounds from all selected day activities
    const bounds = L.latLngBounds(
      selectedDayActivities.map(activity => [
        activity.coordinates!.lat,
        activity.coordinates!.lng
      ])
    );

    // Fit map to show all markers with padding
    map.fitBounds(bounds, {
      padding: [50, 50], // 50px padding on all sides
      animate: true,
      duration: 0.5, // Faster animation (0.5s instead of 1s)
      easeLinearity: 0.5 // Smoother easing
    });
  }, [activities, selectedDay, map]);

  return null;
}

interface Activity {
  time?: string;
  description: string;
  venue_name?: string;
  address?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
  category?: string;
  dayNumber?: number; // Added: which day this activity belongs to
  date?: string;
}

interface ItineraryMapProps {
  city: string;
  activities: Activity[];
  selectedDay?: number;
  center?: [number, number];
}

const DEFAULT_CENTER: [number, number] = [50.8503, 4.3517]; // Brussels default

export function ItineraryMap({
  city,
  activities,
  selectedDay = 1,
  center = DEFAULT_CENTER
}: ItineraryMapProps) {
  // Filter activities that have coordinates
  const activitiesWithCoordinates = activities.filter(
    (activity) => activity.coordinates?.lat && activity.coordinates?.lng
  );

  // Memoize marker icons to avoid recreating them on every render
  const markerIcons = useMemo(() => {
    const cache: Record<string, L.Icon> = {};

    const createIcon = (isSelected: boolean, dayNumber?: number) => {
      const key = `${isSelected}-${dayNumber || 0}`;
      if (cache[key]) return cache[key];

      const color = isSelected ? '#3b82f6' : '#94a3b8';
      const iconSize: [number, number] = isSelected ? [30, 45] : [20, 30];

      cache[key] = new L.Icon({
        iconUrl: `data:image/svg+xml;base64,${btoa(`
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36">
            <path fill="${color}" d="M12 0C5.4 0 0 5.4 0 12c0 8.1 12 24 12 24s12-15.9 12-24c0-6.6-5.4-12-12-12z"/>
            ${dayNumber ? `<text x="12" y="16" text-anchor="middle" font-size="10" font-weight="bold" fill="white">${dayNumber}</text>` : ''}
          </svg>
        `)}`,
        iconSize,
        iconAnchor: isSelected ? [15, 45] : [10, 30],
        popupAnchor: [0, isSelected ? -45 : -30]
      });

      return cache[key];
    };

    return { createIcon };
  }, []); // Empty deps - icons are static

  // Calculate center from activities if not provided
  const mapCenter = center || (activitiesWithCoordinates.length > 0
    ? [
        activitiesWithCoordinates[0].coordinates!.lat,
        activitiesWithCoordinates[0].coordinates!.lng,
      ] as [number, number]
    : DEFAULT_CENTER);

  useEffect(() => {
    console.log('🗺️ [ItineraryMap] Rendering map', {
      city,
      totalActivities: activities.length,
      activitiesWithCoordinates: activitiesWithCoordinates.length,
      center: mapCenter
    });
  }, [city, activities.length, activitiesWithCoordinates.length]);

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-border">
      <MapContainer
        center={mapCenter}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        {/* Update map center when it changes (e.g., new city) */}
        <MapCenterUpdater center={mapCenter} />

        {/* Fit bounds to show all activities for selected day */}
        <MapBoundsUpdater activities={activities} selectedDay={selectedDay} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
          minZoom={3}
        />

        {activitiesWithCoordinates.map((activity, index) => {
          const isSelected = activity.dayNumber === selectedDay;

          return (
            <Marker
              key={`marker-${activity.dayNumber}-${index}`}
              position={[
                activity.coordinates!.lat,
                activity.coordinates!.lng,
              ]}
              icon={markerIcons.createIcon(isSelected, activity.dayNumber)}
              opacity={isSelected ? 1 : 0.5}
            >
              <Popup>
                <div className="p-2">
                  {activity.dayNumber && (
                    <div className="text-xs font-semibold text-blue-600 mb-1">
                      Day {activity.dayNumber}
                    </div>
                  )}
                  <h3 className="font-semibold text-sm">
                    {activity.venue_name || activity.description}
                  </h3>
                  {activity.time && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {activity.time}
                    </p>
                  )}
                  {activity.address && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {activity.address}
                    </p>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
