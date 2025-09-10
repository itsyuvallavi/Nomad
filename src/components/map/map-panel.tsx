'use client';

import { useState } from 'react';
import { Map, Layers, Filter, MapPin, Navigation, Globe, Eye, EyeOff, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/schemas';

// Dynamically import map to avoid SSR issues
const ItineraryMap = dynamic(
  () => import('./itinerary-map').then(mod => ({ default: mod.ItineraryMap })),
  { 
    ssr: false,
    loading: () => (
      <motion.div 
        className="h-full bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl flex items-center justify-center border border-border shadow-inner"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="text-center space-y-3">
          <motion.div
            animate={{ rotate: 360, scale: [1, 1.2, 1] }}
            transition={{ 
              rotate: { duration: 3, repeat: Infinity, ease: "linear" },
              scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
            }}
          >
            <Globe className="h-12 w-12 text-blue-400 mx-auto" />
          </motion.div>
          <p className="text-sm text-muted-foreground font-medium">Loading interactive map...</p>
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
  const [selectedDay, setSelectedDay] = useState<number | undefined>(undefined);
  const [showRoutes, setShowRoutes] = useState(true);
  const [mapView, setMapView] = useState<'satellite' | 'streets'>('streets');
  
  // Get the days to display based on location selection
  const displayDays = selectedLocation && daysByLocation
    ? daysByLocation[selectedLocation]?.days || itinerary.itinerary
    : itinerary.itinerary;

  return (
    <motion.div 
      className={cn("flex flex-col h-full bg-gradient-to-b from-background to-muted/20 overflow-hidden rounded-lg border border-border shadow-lg", className)}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Enhanced Map Header */}
      <motion.div 
        className="p-4 border-b border-border bg-gradient-to-r from-background via-muted/10 to-background flex-shrink-0 backdrop-blur-sm"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: [0, 10, 0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <MapPin className="h-5 w-5 text-blue-500" />
            </motion.div>
            <h2 className="text-base font-semibold text-foreground bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Interactive Map
            </h2>
            <motion.div 
              className={`h-2 w-2 rounded-full ${
                displayDays.length > 0 ? 'bg-emerald-500' : 'bg-muted-foreground'
              }`}
              animate={{ 
                scale: displayDays.length > 0 ? [1, 1.3, 1] : 1,
                opacity: displayDays.length > 0 ? [1, 0.7, 1] : 0.5
              }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          
          <div className="flex gap-2">
            {/* View Toggle */}
            <motion.div className="flex bg-muted/50 rounded-lg p-0.5">
              <motion.button
                onClick={() => setMapView('streets')}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1",
                  mapView === 'streets'
                    ? "bg-white text-gray-900 shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Map className="h-3 w-3" />
                Streets
              </motion.button>
              <motion.button
                onClick={() => setMapView('satellite')}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1",
                  mapView === 'satellite'
                    ? "bg-white text-gray-900 shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Globe className="h-3 w-3" />
                Satellite
              </motion.button>
            </motion.div>
            
            {/* Routes Toggle */}
            <motion.button
              onClick={() => setShowRoutes(!showRoutes)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1",
                showRoutes 
                  ? "bg-blue-500 text-white shadow-sm" 
                  : "bg-muted text-foreground hover:bg-muted/80"
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {showRoutes ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              Routes
            </motion.button>
            
            {/* Day Filter */}
            <motion.button
              onClick={() => setSelectedDay(undefined)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1",
                selectedDay === undefined 
                  ? "bg-emerald-500 text-white shadow-sm" 
                  : "bg-muted text-foreground hover:bg-muted/80"
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Layers className="h-3 w-3" />
              All Days
            </motion.button>
            
            <motion.select 
              value={selectedDay || ''} 
              onChange={(e) => setSelectedDay(e.target.value ? Number(e.target.value) : undefined)}
              className="bg-muted text-foreground text-xs rounded-lg px-3 py-1.5 border border-border hover:bg-muted/80 transition-all cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              whileFocus={{ scale: 1.02 }}
            >
              <option value="">🗓️ Select day</option>
              {displayDays.map((day: any) => (
                <option key={day.day} value={day.day}>
                  📍 Day {day.day}
                </option>
              ))}
            </motion.select>
          </div>
        </div>
        
        {/* Activity Summary */}
        <motion.div 
          className="flex items-center gap-4 mt-3 text-xs text-muted-foreground"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            {displayDays.reduce((acc: number, day: any) => acc + (day.activities?.length || 0), 0)} Activities
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
            {displayDays.length} Days
          </span>
          {selectedDay && (
            <motion.span 
              className="flex items-center gap-1 text-blue-600 font-medium"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <Compass className="h-3 w-3" />
              Day {selectedDay} Focus
            </motion.span>
          )}
        </motion.div>
      </motion.div>
      
      {/* Enhanced Map Container */}
      <motion.div 
        className="flex-1 p-4 bg-gradient-to-br from-background via-muted/10 to-background min-h-0 overflow-auto"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <motion.div
          className="h-full min-h-[400px] rounded-2xl shadow-2xl border border-border/50 overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800"
          initial={{ scale: 0.95, rotateX: 5 }}
          animate={{ scale: 1, rotateX: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          whileHover={{ 
            shadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
            transition: { duration: 0.2 }
          }}
        >
          <ItineraryMap
            itinerary={{
              ...itinerary,
              days: displayDays
            }}
            selectedDay={selectedDay}
            showRoutes={showRoutes}
            mapView={mapView}
            onDaySelect={(day) => {
              setSelectedDay(day);
              // Scroll to the selected day in the itinerary with smooth animation
              const dayElement = document.getElementById(`day-${day}`);
              if (dayElement) {
                dayElement.scrollIntoView({ 
                  behavior: 'smooth', 
                  block: 'center',
                  inline: 'nearest'
                });
              }
            }}
            className="h-full w-full"
          />
        </motion.div>
      </motion.div>
    </motion.div>
  );
}