'use client';

import dynamic from 'next/dynamic';

// Dynamically import the map to avoid SSR issues with Leaflet
const ItineraryMap = dynamic(
  () => import('./ItineraryMap').then((mod) => mod.ItineraryMap),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-muted rounded-lg animate-pulse">
        <div className="text-sm text-muted-foreground">Loading map...</div>
      </div>
    ),
  }
);

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

interface MapPanelProps {
  city: string;
  activities: Activity[];
  selectedDay?: number;
  center?: [number, number];
}

export function MapPanel({ city, activities, selectedDay = 1, center }: MapPanelProps) {
  return (
    <div className="h-full flex flex-col bg-background">
      {/* Map Header */}
      <div className="p-4 border-b border-border">
        <h3 className="text-lg font-semibold">Map View</h3>
        <p className="text-sm text-muted-foreground">{city}</p>
      </div>

      {/* Map Container */}
      <div className="flex-1 p-4">
        <ItineraryMap
          city={city}
          activities={activities}
          selectedDay={selectedDay}
          center={center}
        />
      </div>
    </div>
  );
}
