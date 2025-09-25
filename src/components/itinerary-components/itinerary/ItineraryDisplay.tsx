import { DayItinerary } from './Day-schedule';
import { DayTimelineV2 } from './DayTimeline';
import { CoworkingSection } from './Coworking-spots';
import { ExportMenu } from './Export-menu';
import { ItineraryLoadingSkeleton } from './Loading-skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import type { GeneratePersonalizedItineraryOutput } from '@/services/ai/types/core.types';
import { motion, useInView } from 'framer-motion';
import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Calendar, Clock, DollarSign, Plane, Home, Utensils, Car } from 'lucide-react';
import { LazyImage } from '@/components/ui/lazy-image';
import { searchPexelsImages, type PexelsImage } from '@/services/api/media/pexels';
import { logger } from '@/lib/monitoring/logger';
import { Button } from '@/components/ui/button';
import { getIconicImageSearch } from '@/lib/constants/city-landmarks';
import { fadeInUp, staggerContainer, countAnimation } from '@/lib/utils/animations';

interface ItineraryPanelProps {
  itinerary: GeneratePersonalizedItineraryOutput & {
    cost?: {
      total: number;
      currency: string;
    };
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
}

export function ItineraryPanel({ itinerary, isRefining, onRefine }: ItineraryPanelProps) {
  // Show loading skeleton while refining
  if (isRefining) {
    return (
      <div className="h-full overflow-y-auto bg-background">
        <ItineraryLoadingSkeleton />
      </div>
    );
  }

  // Show empty state only if no itinerary object at all
  if (!itinerary) {
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

  // Check if we have metadata but no days yet (progressive loading)
  const hasDays = itinerary.itinerary && itinerary.itinerary.length > 0;
  const isGenerating = itinerary.title && !hasDays;
  const hasMetadata = !!(itinerary.title && itinerary.startDate && itinerary.endDate);
  const [destinationImages, setDestinationImages] = useState<Record<string, PexelsImage[]>>({});
  const [selectedDayInTimeline, setSelectedDayInTimeline] = useState(1);
  
  // Extract all activities for coworking section
  const allActivities = hasDays && itinerary.itinerary ? itinerary.itinerary.flatMap((day: any) => day.activities) : [];

  // Calculate trip duration - parse dates in local timezone to avoid off-by-one
  const parseLocalDate = (dateStr: string) => {
    if (!dateStr) return new Date();
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const startDate = hasDays && itinerary.itinerary && itinerary.itinerary[0]?.date
    ? parseLocalDate(itinerary.itinerary[0].date)
    : itinerary.startDate
    ? parseLocalDate(itinerary.startDate)
    : new Date();

  const endDate = hasDays && itinerary.itinerary && itinerary.itinerary[itinerary.itinerary.length - 1]?.date
    ? parseLocalDate(itinerary.itinerary[itinerary.itinerary.length - 1].date)
    : itinerary.endDate
    ? parseLocalDate(itinerary.endDate)
    : new Date();

  const tripDuration = hasMetadata
    ? `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
    : 'Loading dates...';

  const dayCount = itinerary.duration || (itinerary.itinerary?.length) || 0;
  
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
  const dayCountries = (itinerary.itinerary || []).map((day: any, index) => {
    // Check if day has destination metadata from chunked generation
    if (day._destination) {
      // Skip "Travel Day" entries - they should be merged with the destination
      if (day._destination === 'Travel Day' || day._destination.toLowerCase().includes('travel day')) {
        // This is a travel day - use the destination from the title (e.g., "Paris → Rome" means going to Rome)
        const titleMatch = day.title?.match(/→\s*(.+)$/);
        if (titleMatch) {
          const destination = titleMatch[1].trim();
          const matchedDest = mainDestinations.find((d: string) =>
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
      const destination = mainDestinations.find((d: string) =>
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
      const significantWords = destWords.filter((word: string) => word.length > 3); // Skip short words like "the", "and"

      // Check if destination name or any significant part appears in content
      const isMatch = dayText.includes(destination.toLowerCase()) ||
                      significantWords.some((word: string) => dayText.includes(word));
      
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
      const avgDaysPerDestination = Math.ceil((itinerary.itinerary || []).length / mainDestinations.length);
      const destinationIndex = Math.floor((dayNum - 1) / avgDaysPerDestination);
      
      currentCountry = mainDestinations[Math.min(destinationIndex, mainDestinations.length - 1)] || 'Unknown';
      
      if (!countryOrder.includes(currentCountry)) {
        countryOrder.push(currentCountry);
      }
    }
    
    return currentCountry;
  });
  
  // Second pass: group consecutive days by country
  const daysByLocation = (itinerary.itinerary || []).reduce((acc: any, day: any, index: number) => {
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
  
  // Log destination detection for debugging (only on destination change)
  useEffect(() => {
    logger.debug('SYSTEM', 'Destination Analysis in ItineraryPanel', {
      rawDestination: itinerary.destination,
      parsedLocations: locations,
      daysByLocation: Object.entries(daysByLocation).map(([loc, data]: [string, any]) => ({
        location: loc,
        days: (data as any).days.length,
        dayNumbers: (data as any).days.map((d: any) => d.day),
        startDay: (data as any).startDay,
        endDay: (data as any).endDay
      }))
    });
  }, [itinerary.destination]); // Only log when destination actually changes
  
  // Fetch images for each destination from Pexels
  useEffect(() => {
    const fetchImages = async () => {
      // Use destinations from metadata if available, otherwise use locations from days
      const destinationsToFetch = itinerary.destination
        ? itinerary.destination.split(',').map(d => d.trim())
        : locations;

      if (destinationsToFetch.length === 0) return;

      logger.info('IMAGE', 'Starting Pexels image fetch', { destinations: destinationsToFetch });
      const newImages: Record<string, PexelsImage[]> = {};

      for (const location of destinationsToFetch) {
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

    fetchImages();
  }, [itinerary.destination, locations.join(',')]); // Fetch when destination changes
  
  // Generate image search terms based on destination
  const destinationName = selectedLocation || itinerary.destination?.split(',')[0]?.trim() || 'destination';

  
  return (
    <div className="h-full overflow-y-auto bg-background">
        {/* Trip Overview - Mobile Responsive Header */}
        <div className="p-3 sm:p-4 border-b border-border">
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Header Section - Mobile Responsive */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3 sm:mb-4">
            <div className="space-y-1">
              <h1 className="text-lg sm:text-xl tracking-tight text-foreground font-medium">
                {itinerary.title || <span className="animate-pulse bg-muted rounded w-48 h-6 inline-block"/>}
              </h1>
              <p className="text-xs text-muted-foreground">
                {hasMetadata ? tripDuration : <span className="animate-pulse bg-muted rounded w-32 h-4 inline-block"/>}
              </p>
            </div>
            <div className="flex gap-1.5 sm:gap-2">
              <ExportMenu itinerary={itinerary} className="self-start" />
            </div>
          </div>
          
          {/* Layout - Stack on mobile, side-by-side on tablet+ */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-3 sm:mb-4">
            {/* Left Side - Trip Meta and Cost Breakdown */}
            <div className="w-full sm:w-1/2">
              {/* Trip Meta - Responsive Grid */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4 text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>Duration</span>
                  </div>
                  <p className="text-foreground font-medium">
                    {dayCount > 0 ? `${dayCount} days` : <span className="animate-pulse bg-muted rounded w-12 h-4 inline-block"/>}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {hasMetadata ? tripDuration : <span className="animate-pulse bg-muted rounded w-24 h-3 inline-block"/>}
                  </p>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span>Location</span>
                  </div>
                  <p className="text-foreground font-medium truncate">
                    {itinerary.destination || <span className="animate-pulse bg-muted rounded w-20 h-4 inline-block"/>}
                  </p>
                </div>
              </div>
              
              {/* Cost Breakdown - Compact */}
              {(itinerary._costEstimate || itinerary.cost || isGenerating) && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-foreground">Cost breakdown</h3>
                  {(itinerary._costEstimate || itinerary.cost) ? (
                  <>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between py-0.5">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded bg-muted flex items-center justify-center">
                          <Plane className="w-3 h-3 text-muted-foreground" />
                        </div>
                        <span className="text-xs text-foreground">Flights</span>
                      </div>
                      <span className="text-xs text-foreground font-medium">
                        ${(itinerary._costEstimate?.flights || (itinerary.cost?.total ? Math.round(itinerary.cost.total * 0.4) : 0)).toLocaleString()}
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
                        ${(itinerary._costEstimate?.accommodation || (itinerary.cost?.total ? Math.round(itinerary.cost.total * 0.35) : 0)).toLocaleString()}
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
                        ${(itinerary._costEstimate?.dailyExpenses || (itinerary.cost?.total ? Math.round(itinerary.cost.total * 0.25) : 0)).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="pt-1.5 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-foreground">Total estimated</span>
                      <span className="text-sm text-foreground font-bold">
                        ${(itinerary._costEstimate?.total || itinerary.cost?.total || 0).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Per person • {dayCount} days</p>
                  </div>
                  </>
                  ) : (
                    // Loading skeleton for cost breakdown
                    <div className="space-y-2 animate-pulse">
                      <div className="h-8 bg-muted rounded-lg"/>
                      <div className="h-8 bg-muted rounded-lg"/>
                      <div className="h-8 bg-muted rounded-lg"/>
                      <div className="h-10 bg-muted rounded-lg mt-2"/>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Side - Single Destination Image - Full width on mobile */}
            <div className="w-full sm:w-1/2 order-first sm:order-last">
              {(() => {
                // Get iconic landmark search for this destination
                const { fallbackEmoji } = getIconicImageSearch(destinationName);
                
                // Use first Pexels image if available
                const pexelsImages = destinationImages[destinationName] || [];
                const pexelsImage = pexelsImages[0];
                
                // Try to get image from various sources
                // 1. Selected destination images
                // 2. First destination if no selection
                // 3. Any available destination image
                let imageUrl: string | null = pexelsImage?.src?.large || null;

                if (!imageUrl && itinerary.destination) {
                  // Try to get image for the main destination
                  const mainDest = itinerary.destination.split(',')[0].trim();
                  const mainDestImages = destinationImages[mainDest] || [];
                  imageUrl = mainDestImages[0]?.src?.large || null;
                }
                
                return (
                  <div className="relative w-full h-[150px] sm:h-[200px] bg-muted rounded-lg sm:rounded-xl overflow-hidden group shadow-md sm:shadow-lg">
                    {/* Emoji fallback with city-specific icon */}
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-muted to-muted/80">
                      <span className="text-6xl opacity-30">{fallbackEmoji}</span>
                    </div>
                    
                    {/* Actual image on top with lazy loading */}
                    {imageUrl ? (
                      <LazyImage
                        src={imageUrl}
                        alt={`${destinationName} - Iconic view`}
                        fill
                        sizes="(max-width: 640px) 100vw, 50vw"
                        className="object-cover"
                        quality={90}
                        threshold={0.1}
                        rootMargin="100px"
                      />
                    ) : (
                      // Loading skeleton while fetching images
                      <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted to-muted/60" />
                    )}
                    
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

        </motion.div>
      </div>

      {/* Main Content - Responsive padding */}
      <div className="p-3 sm:p-4 md:p-6 pb-12">
        {/* Coworking Spaces (if any) */}
        <CoworkingSection activities={allActivities} />

        {/* Daily Itinerary with Timeline */}
        <div className="">
          {/* Destination Header and Timeline Section */}
          <div className="bg-background/50 backdrop-blur-sm border-b border-border">
            {/* Destination Switcher for Multi-Destination Trips - Mobile optimized */}
            {locations.length > 1 && (
              <div className="px-3 sm:px-4 pt-3 sm:pt-4 pb-2">
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-muted-foreground" />
                    <h2 className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wider">Destinations</h2>
                    <span className="text-[10px] sm:text-xs text-muted-foreground">({locations.length})</span>
                  </div>
                </div>
                
                {/* Destinations - Horizontal scrollable with momentum */}
                <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-hide" data-scrollable="horizontal" style={{ WebkitOverflowScrolling: 'touch' }}>
                  {locations.map((location, index) => {
                    const locationData = daysByLocation[location];
                    const isSelected = selectedLocation === location;
                    
                    return (
                      <button
                        key={location}
                        onClick={() => setSelectedLocation(location)}
                        className={`flex-shrink-0 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md transition-all border text-[11px] sm:text-xs min-w-[80px] ${
                          isSelected
                            ? 'bg-foreground text-background border-foreground'
                            : 'bg-muted/50 text-foreground hover:bg-muted border-border'
                        }`}
                      >
                        <div className="flex items-center gap-1 sm:gap-1.5">
                          <span className={`w-3 h-3 sm:w-4 sm:h-4 rounded-full text-[9px] sm:text-[10px] font-bold flex items-center justify-center ${
                            isSelected ? 'bg-background/20' : 'bg-muted'
                          }`}>
                            {index + 1}
                          </span>
                          <div className="text-left">
                            <div className="font-medium truncate max-w-[60px] sm:max-w-none">{location}</div>
                            <div className="text-[8px] sm:text-[9px] opacity-70">
                              {locationData.days.length} {locationData.days.length === 1 ? 'day' : 'days'}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Horizontal Timeline - Show loading skeleton if days not ready */}
            {hasDays ? (
              <DayTimelineV2
                totalDays={(daysByLocation[selectedLocation]?.days || itinerary.itinerary).length}
                selectedDay={selectedDayInTimeline}
                onDaySelect={(day) => {
                  setSelectedDayInTimeline(day);
                }}
                location={locations.length > 1 ? selectedLocation : undefined}
                dates={(daysByLocation[selectedLocation]?.days || itinerary.itinerary).map((d: any) => d.date)}
              />
            ) : (
              <div className="py-4">
                <div className="flex gap-2 animate-pulse">
                  {[1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <div key={i} className="flex-1 h-16 bg-muted rounded-lg"></div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Selected Day Activities - Responsive padding */}
          {hasDays ? (
          <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
            {(() => {
              const days = daysByLocation[selectedLocation]?.days || itinerary.itinerary;
              const selectedDay = days.find((d: any) => d.day === selectedDayInTimeline) || days[0];
              
              return (
                <motion.div
                  key={`day-${selectedDay.day}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.4, 0.0, 0.2, 1] }}
                >
                  {/* Day Header - Mobile optimized */}
                  <div className="flex items-center justify-between mb-3 sm:mb-4 md:mb-6">
                    <div>
                      <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                        Day {selectedDay.day}
                      </h3>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 sm:mt-1">
                        {(() => {
                          const [year, month, day] = selectedDay.date.split('-').map(Number);
                          return new Date(year, month - 1, day).toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          });
                        })()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] sm:text-xs text-muted-foreground">Activities</p>
                      <p className="text-base sm:text-lg font-medium text-gray-900">{selectedDay.activities.length}</p>
                    </div>
                  </div>
                  
                  {/* Activities Grid - Responsive spacing */}
                  <div className="space-y-2 sm:space-y-3">
                    {selectedDay.activities.map((activity: any, index: number) => (
                      <motion.div
                        key={`activity-${index}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ 
                          duration: 0.3, 
                          delay: index * 0.08,
                          ease: [0.4, 0.0, 0.2, 1]
                        }}
                      >
                        <motion.div
                          className="group relative bg-background border border-border rounded-lg sm:rounded-xl p-3 sm:p-4 hover:shadow-md sm:hover:shadow-lg transition-all duration-300 cursor-pointer overflow-hidden"
                          whileHover={{ y: -2 }}
                        >
                          {/* Subtle hover background */}
                          <div className="absolute inset-0 bg-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                          
                          <div className="relative flex gap-2 sm:gap-3">
                            {/* Minimal time display - Hidden on very small screens */}
                            <div className="hidden xs:block flex-shrink-0 w-10 sm:w-12 text-right">
                              <span className="text-xs sm:text-sm font-medium text-gray-900">
                                {activity.time.split(' - ')[0]}
                              </span>
                            </div>
                            
                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <h4 className="text-xs sm:text-sm font-medium text-gray-900 line-clamp-2">
                                    {activity.description}
                                  </h4>
                                  {activity.address && (
                                    <div className="flex items-center gap-1 mt-1 sm:mt-2">
                                      <MapPin className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-muted-foreground flex-shrink-0" />
                                      <p className="text-[11px] sm:text-sm text-muted-foreground truncate">{activity.address}</p>
                                    </div>
                                  )}
                                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1 sm:mt-2">
                                    <span className="text-[10px] sm:text-xs text-muted-foreground">
                                      {activity.time}
                                    </span>
                                    {activity.category && (
                                      <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                                        {activity.category}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Activity Number - Smaller on mobile */}
                                <div className="flex-shrink-0">
                                  <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-muted flex items-center justify-center">
                                    <span className="text-[10px] sm:text-xs font-bold text-muted-foreground">
                                      {index + 1}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              );
            })()}
          </div>
          ) : (
            /* Show loading skeleton for activities when days aren't ready */
            <div className="px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6">
              <div className="animate-pulse space-y-4">
                <div className="h-8 bg-muted rounded w-1/3"></div>
                <div className="space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-background border border-border rounded-lg p-4">
                      <div className="flex gap-3">
                        <div className="w-12 h-4 bg-muted rounded"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-3/4"></div>
                          <div className="h-3 bg-muted rounded w-1/2 opacity-50"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
