import { DayItinerary } from './DayItinerary';
import { CoworkingSection } from './CoworkingSection';
import { TripActions } from './TripActions';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/schemas';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { MapPin } from 'lucide-react';

interface ItineraryPanelProps {
  itinerary: GeneratePersonalizedItineraryOutput;
  onRefine?: (feedback: string) => void;
  isRefining?: boolean;
}

export function ItineraryPanel({ itinerary }: ItineraryPanelProps) {
  // Extract all activities for coworking section
  const allActivities = itinerary.itinerary.flatMap(day => day.activities);
  
  // Calculate trip duration
  const startDate = new Date(itinerary.itinerary[0]?.date || new Date());
  const endDate = new Date(itinerary.itinerary[itinerary.itinerary.length - 1]?.date || new Date());
  const tripDuration = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  
  // Extract budget info (using quickTips or default)
  const budgetLevel = 'Budget-friendly';
  
  // Group days by destination/city/country
  const daysByLocation = itinerary.itinerary.reduce((acc, day, index) => {
    let location = itinerary.destination.split(',')[0].trim(); // Default to main destination
    let currentLocation = location;
    
    // First priority: Check day title for location (most reliable)
    if (day.title) {
      // Enhanced patterns for titles like "Brussels Day 1", "Day 8: Brussels", "Brussels - Historic Center"
      const titlePatterns = [
        /^([A-Z][\w\s]+?)(?:\s+Day\s+\d+|\s+-|:)/i,
        /^Day\s+\d+:\s+([A-Z][\w\s]+)/i,
        /in\s+([A-Z][\w\s]+?)$/i,
        /^([A-Z][\w\s]+?)\s*$/i, // Just the city name
      ];
      
      for (const pattern of titlePatterns) {
        const match = day.title.match(pattern);
        if (match && match[1]) {
          const extractedLocation = match[1].trim();
          // Filter out generic words that aren't locations
          if (!['Arrival', 'Departure', 'Day', 'Morning', 'Evening', 'Afternoon'].includes(extractedLocation)) {
            currentLocation = extractedLocation;
            console.log(`[Location] Day ${day.day} - Detected from title: "${currentLocation}" (from "${day.title}")`);
          }
          break;
        }
      }
    }
    
    // Second priority: Look through activities for location clues
    let locationFromActivity = null;
    day.activities.forEach(activity => {
      // Check for travel activities that mention destinations (strongest signal)
      if (activity.category === 'Travel' && !locationFromActivity) {
        // Look for patterns like "to Brussels", "arrive in Brussels", "Brussels Airport"
        const patterns = [
          /(?:to|arrive at|arrive in|arrival in)\s+([A-Z][\w\s]+?)(?:\s+Airport|\s+Station|\s|,|$)/i,
          /([A-Z][\w\s]+?)\s+(?:Airport|Station|Terminal)/i,
          /^(?:Travel to|Depart for|Journey to)\s+([A-Z][\w\s]+)/i,
        ];
        
        for (const pattern of patterns) {
          const match = activity.description.match(pattern);
          if (match && match[1]) {
            locationFromActivity = match[1].trim();
            console.log(`[Location] Day ${day.day} - Detected from travel activity: "${locationFromActivity}" (from "${activity.description}")`);
            break;
          }
        }
      }
      
      // Check addresses for city names (weaker signal, only use if no travel activity found)
      if (!locationFromActivity && activity.address) {
        const addressParts = activity.address.split(',');
        if (addressParts.length >= 2) {
          // Get the second-to-last part (usually the city)
          const possibleLocation = addressParts[addressParts.length - 2]?.trim();
          // Make sure it looks like a city name
          if (possibleLocation && 
              possibleLocation.length > 2 && 
              /^[A-Z]/.test(possibleLocation) &&
              !possibleLocation.match(/^\d/) && // Not a postal code
              !possibleLocation.match(/^[A-Z]{2,3}\d/) // Not a postal code like "SE1"
          ) {
            // Only use address location if we haven't found a better one from title
            if (currentLocation === location) {
              currentLocation = possibleLocation;
              console.log(`[Location] Day ${day.day} - Detected from address: "${currentLocation}" (from "${activity.address}")`);
            }
          }
        }
      }
    });
    
    // If we found a location from travel activity, use it (it's the strongest signal after title)
    if (locationFromActivity) {
      currentLocation = locationFromActivity;
    }
    
    // Clean up location name
    currentLocation = currentLocation
      .replace(/\s+(Airport|Station|Terminal|City|Center|Centre)$/i, '')
      .replace(/^(The|Visit|Explore|Tour)\s+/i, '') // Remove action words
      .trim();
    
    // Make sure we got a valid location
    if (!currentLocation || currentLocation.length < 2) {
      currentLocation = location; // Fall back to main destination
    }
    
    if (!acc[currentLocation]) {
      acc[currentLocation] = {
        days: [],
        startDay: index + 1,
        endDay: index + 1
      };
    }
    
    acc[currentLocation].days.push(day);
    acc[currentLocation].endDay = index + 1;
    
    return acc;
  }, {} as Record<string, { days: typeof itinerary.itinerary, startDay: number, endDay: number }>);
  
  const locations = Object.keys(daysByLocation);
  const [selectedLocation, setSelectedLocation] = useState(locations[0] || '');
  
  // Generate image search terms based on destination
  const destinationName = selectedLocation || itinerary.destination.split(',')[0].trim();
  
  console.log('[ItineraryPanel] ====== Location Detection Results ======');
  console.log('[ItineraryPanel] Total days:', itinerary.itinerary.length);
  console.log('[ItineraryPanel] Detected locations:', locations);
  console.log('[ItineraryPanel] Days grouped by location:', Object.entries(daysByLocation).map(([loc, data]) => 
    `${loc}: Days ${data.startDay}-${data.endDay} (${data.days.length} days)`
  ));
  console.log('[ItineraryPanel] Selected location:', selectedLocation);
  console.log('[ItineraryPanel] Loading images for:', destinationName);
  console.log('[ItineraryPanel] ========================================');

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900">
      {/* Trip Overview */}
      <div className="p-6 border-b border-slate-600/50">
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-2xl font-medium mb-2 text-white">{itinerary.title}</h1>
          <p className="text-slate-400 mb-4">{tripDuration}</p>
          
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="px-3 py-1 bg-slate-700/50 rounded-full text-sm text-slate-300">
              {itinerary.destination}
            </span>
            <span className="px-3 py-1 bg-slate-700/50 rounded-full text-sm text-slate-300">
              {itinerary.itinerary.length} days
            </span>
            <span className="px-3 py-1 bg-slate-700/50 rounded-full text-sm text-slate-300">
              {budgetLevel}
            </span>
          </div>

          {/* Destination Images using Picsum (more reliable) */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[1, 2, 3].map((num, index) => {
              const imageUrl = `https://picsum.photos/400/300?random=${destinationName}-${num}`;
              console.log('[Image] Attempting to load:', imageUrl);
              
              return (
                <div key={index} className="relative aspect-video bg-slate-600/50 rounded-xl overflow-hidden group">
                  <img 
                    src={imageUrl}
                    alt={`${destinationName} view ${num}`}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    loading="eager"
                    onLoad={(e) => {
                      console.log('[Image] Successfully loaded:', imageUrl);
                      const target = e.target as HTMLImageElement;
                      target.style.opacity = '1';
                    }}
                    onError={(e) => {
                      console.error('[Image] Failed to load:', imageUrl);
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent && !parent.querySelector('.fallback-emoji')) {
                        const fallback = document.createElement('div');
                        fallback.className = 'fallback-emoji w-full h-full bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center';
                        const emojis = ['🏛️', '🌆', '🎭', '🏰', '🌉'];
                        fallback.innerHTML = `<span class="text-4xl">${emojis[index] || '🏛️'}</span>`;
                        parent.appendChild(fallback);
                      }
                    }}
                    style={{ opacity: 0, transition: 'opacity 0.3s' }}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-white text-xs truncate">{destinationName}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="p-6 pb-12">
        {/* Trip Actions */}
        <TripActions itinerary={itinerary} />

        {/* Coworking Spaces (if any) */}
        <CoworkingSection activities={allActivities} />

        {/* Horizontal Location Tabs for Multi-Destination Trips */}
        {locations.length > 1 && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-blue-400" />
              <h2 className="text-xs font-medium text-slate-400 uppercase tracking-wider">Trip Destinations</h2>
              <span className="text-xs text-slate-500">({locations.length} locations)</span>
            </div>
            <div className="relative">
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
                {locations.map((location, index) => {
                  const locationData = daysByLocation[location];
                  const isSelected = selectedLocation === location;
                  
                  return (
                    <button
                      key={location}
                      onClick={() => setSelectedLocation(location)}
                      className={`flex-shrink-0 px-4 py-2.5 rounded-lg transition-all border ${
                        isSelected
                          ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white border-blue-500 shadow-lg shadow-blue-500/20'
                          : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/70 border-slate-600/50 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div className={`flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                          isSelected ? 'bg-white/20' : 'bg-slate-600/50'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="text-left">
                          <div className="font-medium">{location}</div>
                          <div className="text-[10px] opacity-75">
                            Day {locationData.startDay}-{locationData.endDay} • {locationData.days.length} {locationData.days.length === 1 ? 'day' : 'days'}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              
              {/* Scroll indicators */}
              {locations.length > 4 && (
                <div className="absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-slate-900 to-transparent pointer-events-none" />
              )}
            </div>
          </div>
        )}

        {/* Daily Itinerary */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium text-white">
            {locations.length > 1 ? (
              <>
                <span className="text-blue-400">{selectedLocation}</span>
                <span className="text-slate-400 text-sm ml-2">Itinerary</span>
              </>
            ) : (
              'Daily Itinerary'
            )}
          </h2>
          {locations.length > 1 && (
            <div className="text-xs text-slate-400">
              Location {locations.indexOf(selectedLocation) + 1} of {locations.length}
            </div>
          )}
        </div>
        
        <div className="space-y-6">
          {(daysByLocation[selectedLocation]?.days || itinerary.itinerary).map((day, index) => (
            <DayItinerary
              key={`${selectedLocation}-day-${day.day}`}
              day={day.day}
              date={day.date}
              activities={day.activities}
              dayIndex={index}
            />
          ))}
        </div>

      </div>
    </div>
  );
}