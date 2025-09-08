import { DayItinerary } from './DayItinerary';
import { CoworkingSection } from './CoworkingSection';
import { TripActions } from './TripActions';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/schemas';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import Image from 'next/image';
import { searchPexelsImages, type PexelsImage } from '@/lib/api/pexels';
import { logger } from '@/lib/logger';

interface ItineraryPanelProps {
  itinerary: GeneratePersonalizedItineraryOutput;
  onRefine?: (feedback: string) => void;
  isRefining?: boolean;
}

export function ItineraryPanel({ itinerary }: ItineraryPanelProps) {
  const [destinationImages, setDestinationImages] = useState<Record<string, PexelsImage[]>>({});
  
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
      // Use the destination metadata directly - most reliable!
      const destination = mainDestinations.find(d => 
        day._destination.toLowerCase().includes(d.toLowerCase()) || 
        d.toLowerCase().includes(day._destination.toLowerCase().replace(' copenhagen', ''))
      ) || day._destination;
      
      if (!countryOrder.includes(destination)) {
        countryOrder.push(destination);
      }
      return destination;
    }
    
    // Fallback: analyze content if no metadata
    const dayText = `${day.title} ${day.activities.map(a => a.description + ' ' + (a.address || '')).join(' ')}`.toLowerCase();
    
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

          {/* Destination Images - Using Unsplash API with city-specific searches */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            {[1, 2, 3].map((num, index) => {
              // More specific search terms for better results
              const searchTerms = [
                `${destinationName} city`,
                `${destinationName} landmark tourist`,  
                `${destinationName} street view`
              ];
              
              // Use Pexels images if available
              const pexelsImages = destinationImages[destinationName] || [];
              const pexelsImage = pexelsImages[index];
              const imageUrl = pexelsImage?.src?.large || 
                `https://source.unsplash.com/400x300/?${encodeURIComponent(searchTerms[index])}&sig=${Date.now()}-${index}`;
              const photographer = pexelsImage?.photographer;
              const photographerUrl = pexelsImage?.photographer_url;
              
              return (
                <div key={index} className="relative aspect-video bg-gradient-to-br from-slate-600 to-slate-700 rounded-xl overflow-hidden">
                  {/* Emoji fallback always rendered behind image */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-4xl">
                      {['🏛️', '🌆', '🎭', '🏰', '🌉'][index] || '🏛️'}
                    </span>
                  </div>
                  
                  {/* Actual image on top */}
                  <Image 
                    src={imageUrl}
                    alt={`${destinationName} - ${searchTerms[index].split(' ').slice(1).join(' ')}`}
                    fill
                    sizes="(max-width: 768px) 100vw, 400px"
                    className="object-cover opacity-0"
                    priority
                    unoptimized // Use unoptimized for dynamic Unsplash images
                    onLoad={(e) => {
                      const imgElement = e.target as HTMLImageElement;
                      imgElement.classList.remove('opacity-0');
                      imgElement.classList.add('opacity-100');
                    }}
                    onError={() => {
                      // Silently fail - emoji fallback is visible
                    }}
                  />
                  
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2 z-10">
                    <p className="text-white text-xs truncate">{destinationName}</p>
                    {photographer && (
                      <p className="text-white/70 text-[10px] truncate">
                        Photo: <a href={photographerUrl} target="_blank" rel="noopener noreferrer" className="underline">{photographer}</a>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Main Content */}
      <div className="p-6 pb-12">
        {/* Trip Actions - Tips specific to selected location */}
        <TripActions itinerary={itinerary} selectedLocation={selectedLocation} />

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
