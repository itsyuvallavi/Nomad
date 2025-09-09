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
      <div className="h-full bg-slate-800/50 rounded-lg flex items-center justify-center">
        <Map className="h-8 w-8 text-slate-500 animate-pulse" />
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
    <div className={cn("flex flex-col h-full bg-gradient-to-b from-slate-800 to-slate-900", className)}>
      {/* Simplified Map Header */}
      <div className="p-4 border-b border-slate-700/50 bg-slate-900/50 backdrop-blur">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium text-white">Map View</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedDay(undefined)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                selectedDay === undefined 
                  ? "bg-blue-600 text-white shadow-sm" 
                  : "bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700/50"
              )}
            >
              All Days
            </button>
            <select 
              value={selectedDay || ''} 
              onChange={(e) => setSelectedDay(e.target.value ? Number(e.target.value) : undefined)}
              className="bg-slate-800/50 text-slate-300 text-xs rounded-md px-3 py-1.5 border border-slate-700/50 hover:bg-slate-700/50 hover:text-white transition-colors"
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
      <div className="flex-1 p-4 bg-gradient-to-b from-slate-800/50 to-slate-900/50">
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
          className="h-full rounded-xl shadow-xl border border-slate-700/50"
        />
      </div>
    </div>
  );
}