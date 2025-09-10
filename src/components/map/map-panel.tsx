'use client';

import { useState } from 'react';
import { Map, Layers, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/schemas';

// Dynamically import map to avoid SSR issues
const ItineraryMap = dynamic(
  () => import('./itinerary-map').then(mod => ({ default: mod.ItineraryMap })),
  { 
    ssr: false,
    loading: () => (
      <div className="h-full bg-muted/50 rounded-lg flex items-center justify-center">
        <Map className="h-8 w-8 text-muted-foreground animate-pulse" />
      </div>
    )
  }
);

interface MapPanelProps {
  itinerary: GeneratePersonalizedItineraryOutput;
  selectedLocation?: string;
  daysByLocation?: Record<string, { days: any[], startDay: number, endDay: number }>;
  className?: string;
}

export function MapPanel({ 
  itinerary, 
  selectedLocation,
  daysByLocation,
  className 
}: MapPanelProps) {
  const [selectedDay, setSelectedDay] = useState<number | undefined>(undefined);
  
  // Get the days to display based on location selection
  const displayDays = selectedLocation && daysByLocation
    ? daysByLocation[selectedLocation]?.days || itinerary.itinerary
    : itinerary.itinerary;

  return (
    <div className={cn("flex flex-col h-full bg-background overflow-hidden", className)}>
      {/* Simplified Map Header */}
      <div className="p-4 border-b border-border bg-background flex-shrink-0">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium text-foreground">Map View</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedDay(undefined)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                selectedDay === undefined 
                  ? "bg-foreground text-background shadow-sm" 
                  : "bg-muted text-foreground hover:bg-muted/80"
              )}
            >
              All Days
            </button>
            <select 
              value={selectedDay || ''} 
              onChange={(e) => setSelectedDay(e.target.value ? Number(e.target.value) : undefined)}
              className="bg-muted text-foreground text-xs rounded-md px-3 py-1.5 border border-border hover:bg-muted/80 transition-colors"
            >
              <option value="">Filter by day</option>
              {displayDays.map((day: any) => (
                <option key={day.day} value={day.day}>
                  Day {day.day}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
      
      {/* Map Container with proper padding */}
      <div className="flex-1 p-4 bg-background min-h-0 overflow-auto">
        <ItineraryMap
          itinerary={{
            ...itinerary,
            days: displayDays
          }}
          selectedDay={selectedDay}
          onDaySelect={(day) => {
            setSelectedDay(day);
            // Scroll to the selected day in the itinerary
            const dayElement = document.getElementById(`day-${day}`);
            if (dayElement) {
              dayElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }}
          className="h-full min-h-[400px] rounded-xl shadow-sm border border-border"
        />
      </div>
    </div>
  );
}