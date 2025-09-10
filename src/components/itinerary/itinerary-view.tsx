import { DayItinerary } from './day-schedule';
import { DayTimeline } from './day-timeline';
import { CoworkingSection } from './coworking-spots';
import { ExportMenu } from './export-menu';
import { ItineraryLoadingSkeleton } from './loading-skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/schemas';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { MapPin, Map, Calendar, Clock, DollarSign, Plane, Home, Utensils, Car } from 'lucide-react';
import Image from 'next/image';
import { searchPexelsImages, type PexelsImage } from '@/lib/api/pexels';
import { logger } from '@/lib/logger';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { getIconicImageSearch } from '@/lib/city-landmarks';

// Dynamically import map to avoid SSR issues
const ItineraryMap = dynamic(
  () => import('@/components/map/itinerary-map').then(mod => ({ default: mod.ItineraryMap })),
  { 
    ssr: false,
    loading: () => (
      <div className="h-[400px] bg-muted/50 rounded-lg flex items-center justify-center">
        <Map className="h-8 w-8 text-muted-foreground animate-pulse" />
      </div>
    )
  }
);

interface ItineraryPanelProps {
  itinerary: GeneratePersonalizedItineraryOutput & {
    _costEstimate?: {
      total: number;
      flights: number;
      accommodation: number;
      dailyExpenses: number;
      currency: string;
      breakdown: Array<{
        type: string;
        description: string;
        amount: number;
      }>;
    };
    _flightOptions?: Map<string, any>;
    _hotelOptions?: Map<string, any>;
  };
  onRefine?: (feedback: string) => void;
  isRefining?: boolean;
  showMapToggle?: boolean;
}

export function ItineraryPanel({ itinerary, showMapToggle = true, isRefining }: ItineraryPanelProps) {
  // Show loading skeleton while refining
  if (isRefining) {
    return (
      <div className="h-full overflow-y-auto bg-background">
        <ItineraryLoadingSkeleton />
      </div>
    );
  }

  // Show empty state if no itinerary
  if (!itinerary || !itinerary.itinerary || itinerary.itinerary.length === 0) {
    return (
      <div className="h-full overflow-y-auto bg-background">
        <EmptyState 
          type="no-itinerary"
          title="Your Journey Awaits"
          description="Start a conversation to create your personalized travel itinerary."
        />
      </div>
    );
  }
  const [destinationImages, setDestinationImages] = useState<Record<string, PexelsImage[]>>({});
  const [showMap, setShowMap] = useState(false);
  const [selectedMapDay, setSelectedMapDay] = useState<number | undefined>(undefined);
  const [selectedDayInTimeline, setSelectedDayInTimeline] = useState(1);
  
  // Extract all activities for coworking section
  const allActivities = itinerary.itinerary.flatMap(day => day.activities);
  
  // Calculate trip duration
  const startDate = new Date(itinerary.itinerary[0]?.date || new Date());
  const endDate = new Date(itinerary.itinerary[itinerary.itinerary.length - 1]?.date || new Date());
  const tripDuration = `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  
  // Extract budget info (using quickTips or default)
  const budgetLevel = 'Budget-friendly';
  
  // Group days by main country/destination - following chronological order
  let currentCountry = '';
  const countryOrder: string[] = [];
  
  // Parse the main destinations from the itinerary (countries, not cities)
  const mainDestinations = itinerary.destination.split(',').map(d => {
    // Clean up destination names, removing parenthetical additions
    let cleaned = d.trim().replace(/\s*\([^)]*\)/g, '');
    // Handle "Denmark Copenhagen" format (from chunked generation)
    if (cleaned === 'Denmark Copenhagen') {
      cleaned = 'Denmark';
    }
    return cleaned;
  });
  
  // ⚠️ NO HARDCODED DATA! Detect countries dynamically from API response
  // Build country mapping dynamically from the destinations in the itinerary
  const countryMapping: Record<string, string[]> = {};
  
  // Extract countries from the destination string
  for (const destination of mainDestinations) {
    // Each destination is its own key, we'll look for it in the content
    countryMapping[destination] = [destination, destination.toLowerCase()];
  }
  
  // First pass: identify country for each day based on content  
  const dayCountries = itinerary.itinerary.map((day: any, index) => {
    // Check if day has destination metadata from chunked generation
    if (day._destination) {
      // Skip "Travel Day" entries - they should be merged with the destination
      if (day._destination === 'Travel Day' || day._destination.toLowerCase().includes('travel day')) {
        // This is a travel day - use the destination from the title (e.g., "Paris → Rome" means going to Rome)
        const titleMatch = day.title?.match(/→\s*(.+)$/);
        if (titleMatch) {
          const destination = titleMatch[1].trim();
          const matchedDest = mainDestinations.find(d => 
            destination.toLowerCase().includes(d.toLowerCase()) || 
            d.toLowerCase().includes(destination.toLowerCase())
          ) || destination;
          
          if (!countryOrder.includes(matchedDest) && matchedDest !== 'Travel Day') {
            countryOrder.push(matchedDest);
          }
          return matchedDest;
        }
        // If we can't parse the destination, use the current country
        return currentCountry || mainDestinations[0];
      }
      
      // Use the destination metadata directly - most reliable!
      const destination = mainDestinations.find(d => 
        day._destination.toLowerCase().includes(d.toLowerCase()) || 
        d.toLowerCase().includes(day._destination.toLowerCase().replace(' copenhagen', ''))
      ) || day._destination;
      
      if (!countryOrder.includes(destination) && destination !== 'Travel Day') {
        countryOrder.push(destination);
      }
      return destination;
    }
    
    // Fallback: analyze content if no metadata
    const dayText = `${day.title} ${day.activities.map((a: any) => a.description + ' ' + (a.address || '')).join(' ')}`.toLowerCase();
    
    // Check each destination to see if this day belongs to it
    for (const destination of mainDestinations) {
      // Check for partial matches (e.g., "Korea" in "South Korea")
      // Split destination into words and check if any significant word appears
      const destWords = destination.toLowerCase().split(/\s+/);
      const significantWords = destWords.filter(word => word.length > 3); // Skip short words like "the", "and"
      
      // Check if destination name or any significant part appears in content
      const isMatch = dayText.includes(destination.toLowerCase()) || 
                      significantWords.some(word => dayText.includes(word));
      
      if (isMatch) {
        // Found the country for this day
        currentCountry = destination; // Update current country
        if (!countryOrder.includes(destination)) {
          countryOrder.push(destination);
        }
        return destination;
      }
    }
    
    // If no country detected, use the current country (continuation)
    // Or if it's the first day and we couldn't detect, use day ranges
    if (!currentCountry) {
      // ⚠️ NO HARDCODED LOGIC! Use dynamic detection based on day ranges
      // Assume roughly equal distribution of days across destinations
      const dayNum = day.day;
      const avgDaysPerDestination = Math.ceil(itinerary.itinerary.length / mainDestinations.length);
      const destinationIndex = Math.floor((dayNum - 1) / avgDaysPerDestination);
      
      currentCountry = mainDestinations[Math.min(destinationIndex, mainDestinations.length - 1)] || 'Unknown';
      
      if (!countryOrder.includes(currentCountry)) {
        countryOrder.push(currentCountry);
      }
    }
    
    return currentCountry;
  });
  
  // Second pass: group consecutive days by country
  const daysByLocation = itinerary.itinerary.reduce((acc, day, index) => {
    const country = dayCountries[index];
    
    if (!acc[country]) {
      acc[country] = {
        days: [],
        startDay: index + 1,
        endDay: index + 1
      };
    }
    
    acc[country].days.push(day);
    acc[country].endDay = index + 1;
    
    return acc;
  }, {} as Record<string, { days: typeof itinerary.itinerary, startDay: number, endDay: number }>);
  
  const locations = Object.keys(daysByLocation);
  const [selectedLocation, setSelectedLocation] = useState(locations[0] || '');
  
  // Log destination detection for debugging
  useEffect(() => {
    logger.debug('SYSTEM', 'Destination Analysis in ItineraryPanel', {
      rawDestination: itinerary.destination,
      parsedLocations: locations,
      daysByLocation: Object.entries(daysByLocation).map(([loc, data]) => ({
        location: loc,
        days: data.days.length,
        dayNumbers: data.days.map(d => d.day),
        startDay: data.startDay,
        endDay: data.endDay
      }))
    });
  }, [itinerary.destination, daysByLocation, locations]);
  
  // Fetch images for each destination from Pexels
  useEffect(() => {
    const fetchImages = async () => {
      logger.info('IMAGE', 'Starting Pexels image fetch', { locations });
      const newImages: Record<string, PexelsImage[]> = {};
      
      for (const location of locations) {
        try {
          const images = await searchPexelsImages(location, 3);
          newImages[location] = images;
          logger.info('IMAGE', `Pexels found ${images.length} images for ${location}`);
        } catch (error) {
          logger.error('IMAGE', `Pexels failed to fetch images for ${location}`, { error });
          newImages[location] = [];
        }
      }
      
      setDestinationImages(newImages);
    };
    
    if (locations.length > 0) {
      fetchImages();
    }
  }, [locations.join(',')]); // Use locations string as dependency
  
  // Generate image search terms based on destination
  const destinationName = selectedLocation || itinerary.destination.split(',')[0].trim();

  return (
    <div className="h-full overflow-y-auto bg-background">
      {/* Trip Overview - Compact Header */}
      <div className="p-4 border-b border-border">
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header Section - Compact */}
          <div className="flex items-start justify-between mb-4">
            <div className="space-y-1">
              <h1 className="text-xl tracking-tight text-foreground font-medium">{itinerary.title}</h1>
              <p className="text-xs text-muted-foreground">{tripDuration}</p>
            </div>
            <div className="flex gap-2">
              {showMapToggle && (
                <Button
                  onClick={() => setShowMap(!showMap)}
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                >
                  <Map className="h-3 w-3 mr-1" />
                  {showMap ? 'Hide' : 'Map'}
                </Button>
              )}
              <ExportMenu itinerary={itinerary} className="self-start" />
            </div>
          </div>
          
          {/* Layout with Cost on Left and Image on Right - 50/50 split */}
          <div className="flex gap-4 mb-4">
            {/* Left Side - Trip Meta and Cost Breakdown */}
            <div className="w-1/2">
              {/* Trip Meta - Ultra Compact Grid */}
              <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>Duration</span>
                  </div>
                  <p className="text-foreground font-medium">{itinerary.itinerary.length} days</p>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span>Location</span>
                  </div>
                  <p className="text-foreground font-medium truncate">{itinerary.destination}</p>
                </div>
              </div>
              
              {/* Cost Breakdown - Compact */}
              {itinerary._costEstimate && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-foreground">Cost breakdown</h3>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between py-0.5">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded bg-muted flex items-center justify-center">
                          <Plane className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <span className="text-xs text-foreground">Flights</span>
                      </div>
                      <span className="text-xs text-foreground font-medium">
                        ${itinerary._costEstimate.flights.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-0.5">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded bg-muted flex items-center justify-center">
                          <Home className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <span className="text-xs text-foreground">Stay</span>
                      </div>
                      <span className="text-xs text-foreground font-medium">
                        ${itinerary._costEstimate.accommodation.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-0.5">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded bg-muted flex items-center justify-center">
                          <Utensils className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <span className="text-xs text-foreground">Food & Daily</span>
                      </div>
                      <span className="text-xs text-foreground font-medium">
                        ${itinerary._costEstimate.dailyExpenses.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="pt-1.5 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-foreground">Total estimated</span>
                      <span className="text-sm text-foreground font-bold">
                        ${itinerary._costEstimate.total.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Per person • {itinerary.itinerary.length} days</p>
                  </div>
                </div>
              )}
            </div>

            {/* Right Side - Single Destination Image - 50% width */}
            <div className="w-1/2">
              {(() => {
                // Get iconic landmark search for this destination
                const { searchTerm, fallbackEmoji } = getIconicImageSearch(destinationName);
                
                // Use first Pexels image if available
                const pexelsImages = destinationImages[destinationName] || [];
                const pexelsImage = pexelsImages[0];
                
                // Use iconic landmark search term for better results
                const imageUrl = pexelsImage?.src?.large || 
                  `https://source.unsplash.com/1200x800/?${encodeURIComponent(searchTerm)}&sig=${Date.now()}-iconic`;
                
                return (
                  <div className="relative w-full h-[200px] bg-muted rounded-xl overflow-hidden group shadow-lg">
                    {/* Emoji fallback with city-specific icon */}
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted/80">
                      <span className="text-6xl opacity-30">{fallbackEmoji}</span>
                    </div>
                    
                    {/* Actual image on top */}
                    <Image 
                      src={imageUrl}
                      alt={`${destinationName} - Iconic view`}
                      fill
                      sizes="50vw"
                      className="object-cover opacity-0 transition-all duration-700"
                      priority
                      quality={90}
                      unoptimized
                      onLoad={(e) => {
                        const imgElement = e.target as HTMLImageElement;
                        imgElement.classList.remove('opacity-0');
                        imgElement.classList.add('opacity-100');
                      }}
                      onError={(e) => {
                        // Try fallback to generic search if iconic fails
                        const imgElement = e.target as HTMLImageElement;
                        if (!imgElement.src.includes('fallback')) {
                          imgElement.src = `https://source.unsplash.com/1200x800/?${encodeURIComponent(destinationName + ' city tourism')}&sig=${Date.now()}-fallback`;
                        }
                      }}
                    />
                    
                    {/* Subtle hover effect */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    {/* Location label on hover */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/60 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                      <p className="text-white text-sm font-medium">{destinationName}</p>
                      <p className="text-white/80 text-xs">Iconic landmark</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Interactive Map View - Only show if map toggle is enabled */}
          {showMapToggle && showMap && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mb-6"
            >
              <div className="rounded-xl border border-slate-700 overflow-hidden p-2">
                <ItineraryMap
                  itinerary={{
                    ...itinerary,
                    days: locations.length > 1 
                      ? (daysByLocation[selectedLocation]?.days || itinerary.itinerary)
                      : itinerary.itinerary
                  }}
                  selectedDay={selectedMapDay}
                  onDaySelect={(day) => {
                    setSelectedMapDay(day);
                    // Scroll to the selected day in the itinerary
                    const dayElement = document.getElementById(`day-${day}`);
                    if (dayElement) {
                      dayElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }}
                  className="h-[400px] md:h-[500px]"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant={selectedMapDay === undefined ? "default" : "outline"}
                  onClick={() => setSelectedMapDay(undefined)}
                  className="text-xs"
                >
                  All Days
                </Button>
                {(locations.length > 1 
                  ? (daysByLocation[selectedLocation]?.days || itinerary.itinerary)
                  : itinerary.itinerary
                ).map((day) => (
                  <Button
                    key={`day-btn-${day.day}`}
                    size="sm"
                    variant={selectedMapDay === day.day ? "default" : "outline"}
                    onClick={() => setSelectedMapDay(day.day)}
                    className="text-xs"
                  >
                    Day {day.day}
                  </Button>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="p-6 pb-12">
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
            {/* Destinations - Horizontal Compact */}
            <div className="mb-4">
              <h3 className="text-sm font-medium text-foreground mb-2">Destinations</h3>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {locations.map((location, index) => {
                  const locationData = daysByLocation[location];
                  const isSelected = selectedLocation === location;
                  
                  return (
                    <button
                      key={location}
                      onClick={() => setSelectedLocation(location)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-md transition-all border text-xs ${
                        isSelected
                          ? 'bg-foreground text-background border-foreground'
                          : 'bg-muted/50 text-foreground hover:bg-muted border-border'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${
                          isSelected ? 'bg-background/20' : 'bg-muted'
                        }`}>
                          {index + 1}
                        </span>
                        <div className="text-left">
                          <div className="font-medium">{location}</div>
                          <div className="text-[9px] opacity-70">
                            {locationData.days.length} {locationData.days.length === 1 ? 'day' : 'days'}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Daily Itinerary with Timeline */}
        <div className="py-3">
          <div className="px-4 mb-3">
            <h2 className="text-sm font-medium text-foreground">
              {locations.length > 1 ? (
                <>
                  <span>{selectedLocation}</span>
                  <span className="text-muted-foreground text-xs ml-1">Itinerary</span>
                </>
              ) : (
                'Daily Itinerary'
              )}
            </h2>
          </div>
          
          {/* Horizontal Timeline */}
          <DayTimeline 
            totalDays={(daysByLocation[selectedLocation]?.days || itinerary.itinerary).length}
            selectedDay={selectedDayInTimeline}
            onDaySelect={(day) => {
              setSelectedDayInTimeline(day);
              // Also update map day selection if needed
              setSelectedMapDay(day);
            }}
            location={locations.length > 1 ? selectedLocation : undefined}
          />
          
          {/* Selected Day Activities */}
          <div className="px-4 mt-8">
            {(() => {
              const days = daysByLocation[selectedLocation]?.days || itinerary.itinerary;
              const selectedDay = days.find(d => d.day === selectedDayInTimeline) || days[0];
              
              return (
                <motion.div
                  key={`day-${selectedDay.day}`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="border-l-2 border-orange-500 pl-4 ml-2">
                    <div className="mb-3">
                      <h3 className="text-lg font-semibold text-foreground">Day {selectedDay.day}</h3>
                      <p className="text-sm text-muted-foreground">{selectedDay.date}</p>
                    </div>
                    
                    <div className="space-y-2">
                      {selectedDay.activities.map((activity, index) => (
                        <motion.div
                          key={`activity-${index}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: index * 0.05 }}
                          className="bg-card border border-border rounded-lg p-3 hover:bg-muted/30 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs text-muted-foreground">{activity.time}</span>
                              </div>
                              <h4 className="text-sm font-medium text-foreground">{activity.description}</h4>
                              {activity.address && (
                                <p className="text-xs text-muted-foreground mt-1">{activity.address}</p>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            })()}
          </div>
        </div>

      </div>
    </div>
  );
}
