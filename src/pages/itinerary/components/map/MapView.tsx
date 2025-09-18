'use client';

import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { cn } from '@/lib/helpers/general';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import type { GeneratePersonalizedItineraryOutput } from '@/services/ai/schemas';

// Dynamically import ItineraryMap to avoid SSR issues
// Now using LocationIQ tiles with OSM geocoding
const ItineraryMap = dynamic(
  () => import('./ItineraryMap').then(mod => mod.ItineraryMap),
  {
    ssr: false,
    loading: () => (
      <motion.div
        className="h-full bg-gray-50 flex items-center justify-center"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="text-center">
          <p className="text-sm text-gray-500">Loading map...</p>
        </div>
      </motion.div>
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
  const [selectedDay, setSelectedDay] = useState<number>(1);
  
  // Get the days to display based on location selection
  const displayDays = selectedLocation && daysByLocation
    ? daysByLocation[selectedLocation]?.days || itinerary.itinerary
    : itinerary.itinerary;

  return (
    <motion.div 
      className={cn("flex flex-col h-full bg-white overflow-hidden rounded-lg border border-gray-200", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Minimal Header */}
      <motion.div 
        className="px-4 py-3 border-b border-gray-200 flex-shrink-0"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-gray-600" />
            <h2 className="text-sm font-medium text-gray-900">
              Map
            </h2>
          </div>
          
          {/* Minimal day selector */}
          <select 
            value={selectedDay} 
            onChange={(e) => setSelectedDay(Number(e.target.value))}
            className="text-xs text-gray-600 border border-gray-200 rounded px-2 py-1 focus:outline-none focus:border-gray-400"
          >
            <option value={0}>All days</option>
            {displayDays.map((day: any) => (
              <option key={day.day} value={day.day}>
                Day {day.day}
              </option>
            ))}
          </select>
        </div>
        
        {/* Subtle info */}
        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
          <span>{displayDays.length} days</span>
          <span>·</span>
          <span>{displayDays.reduce((acc: number, day: any) => acc + (day.activities?.length || 0), 0)} activities</span>
        </div>
      </motion.div>
      
      {/* Map Container */}
      <motion.div 
        className="flex-1 p-3 bg-gray-50 min-h-0 overflow-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="h-full min-h-[400px] rounded overflow-hidden border border-gray-200">
          <ItineraryMap
            itinerary={{
              ...itinerary,
              days: displayDays
            }}
            selectedDay={selectedDay === 0 ? undefined : selectedDay}
            className="h-full w-full"
          />
        </div>
      </motion.div>
    </motion.div>
  );
}