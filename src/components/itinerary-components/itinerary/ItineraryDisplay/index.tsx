'use client';

import { useState, useEffect } from 'react';
import { CoworkingSection } from '../Coworking-spots';
import { ItineraryLoadingSkeleton } from '../Loading-skeleton';
import { EmptyState } from '@/components/common/EmptyState';
import { DayTimelineV2 } from '../DayTimeline';
import { ItineraryHeader } from './ItineraryHeader';
import { DestinationSwitcher } from './DestinationSwitcher';
import { DayActivities } from './DayActivities';
import { useLocationGrouping } from './hooks/useLocationGrouping';
import { useDestinationImages } from './hooks/usePexelsImages';
import type { GeneratePersonalizedItineraryOutput } from '@/services/ai/types/core.types';
import { parseLocalDate, getDateRange } from '@/lib/utils/date-helpers';
import { ErrorBoundary, withErrorBoundary } from '@/components/common/ErrorBoundary';

interface ItineraryPanelProps {
  itinerary: GeneratePersonalizedItineraryOutput & {
    photoUrl?: string;
    costBreakdown?: {
      flights: number;
      accommodation: number;
      dailyExpenses: number;
      activities: number;
      localTransport: number;
      total: number;
      currency: string;
      perPerson: number;
    };
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
  selectedDay?: number;
  onDayChange?: (day: number) => void;
  selectedLocation?: string;
  onLocationChange?: (location: string) => void;
}

function ItineraryPanelComponent({
  itinerary,
  isRefining,
  onRefine,
  selectedDay: externalSelectedDay,
  onDayChange,
  selectedLocation: externalSelectedLocation,
  onLocationChange
}: ItineraryPanelProps) {
  // Use external selectedDay if provided, otherwise use internal state
  const [internalSelectedDay, setInternalSelectedDay] = useState(1);
  const selectedDayInTimeline = externalSelectedDay ?? internalSelectedDay;
  const setSelectedDayInTimeline = onDayChange ?? setInternalSelectedDay;

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
  // Support both legacy 'itinerary' and new 'dailyItineraries' formats
  const daysArray = itinerary.itinerary || itinerary.dailyItineraries || [];
  const hasDays = daysArray.length > 0;
  const isGenerating = !!(itinerary.title && !hasDays);
  const hasMetadata = !!(itinerary.title && itinerary.startDate && itinerary.endDate);

  // Use location grouping hook
  const { daysByLocation, locations } = useLocationGrouping(itinerary);

  // Use external selectedLocation if provided, otherwise use internal state
  const [internalSelectedLocation, setInternalSelectedLocation] = useState('');
  const selectedLocation = externalSelectedLocation ?? internalSelectedLocation;
  const setSelectedLocation = onLocationChange ?? setInternalSelectedLocation;

  // Initialize selectedLocation when locations become available
  useEffect(() => {
    if (locations.length > 0 && !selectedLocation) {
      setSelectedLocation(locations[0]);
    }
  }, [locations, selectedLocation, setSelectedLocation]);

  // Fetch destination images using Unsplash API
  const destinationImages = useDestinationImages(itinerary.destination, locations);

  // Extract all activities for coworking section
  const allActivities = hasDays ? daysArray.flatMap((day: any) => day.activities) : [];

  // Calculate trip duration using shared date helpers
  const startDateStr = hasDays && daysArray[0]?.date
    ? daysArray[0].date
    : itinerary.startDate || '';

  const endDateStr = hasDays && daysArray[daysArray.length - 1]?.date
    ? daysArray[daysArray.length - 1].date
    : itinerary.endDate || '';

  const tripDuration = hasMetadata && startDateStr && endDateStr
    ? getDateRange(startDateStr, endDateStr)
    : 'Loading dates...';

  const dayCount = itinerary.duration || daysArray.length || 0;

  // Get photo URL from fetched images or fallback to itinerary photoUrl
  const photoUrl = itinerary.photoUrl ||
    destinationImages[selectedLocation]?.[0]?.url ||
    destinationImages[itinerary.destination || '']?.[0]?.url;

  return (
    <div className="h-full overflow-y-auto bg-background">
      {/* Trip Overview Header */}
      <ItineraryHeader
        itinerary={itinerary}
        tripDuration={tripDuration}
        dayCount={dayCount}
        photoUrl={photoUrl}
        selectedLocation={selectedLocation}
        hasMetadata={hasMetadata}
        isGenerating={isGenerating}
      />

      {/* Main Content - Responsive padding */}
      <div className="p-3 sm:p-4 md:p-6 pb-12">
        {/* Coworking Spaces (if any) */}
        <CoworkingSection activities={allActivities} />

        {/* Daily Itinerary with Timeline */}
        <div className="">
          {/* Destination Header and Timeline Section */}
          <div className="bg-background/50 backdrop-blur-sm border-b border-border">
            {/* Destination Switcher for Multi-Destination Trips */}
            <DestinationSwitcher
              locations={locations}
              daysByLocation={daysByLocation}
              selectedLocation={selectedLocation}
              onLocationSelect={setSelectedLocation}
            />

            {/* Horizontal Timeline - Show loading skeleton if days not ready */}
            {hasDays ? (
              (() => {
                const currentDays = daysByLocation[selectedLocation]?.days || daysArray;
                const dayNumbers = currentDays.map((d: any) => d.day || d.dayNumber);
                const minDay = Math.min(...dayNumbers);
                const maxDay = Math.max(...dayNumbers);

                return (
                  <DayTimelineV2
                    totalDays={maxDay - minDay + 1}
                    startDay={minDay}
                    selectedDay={selectedDayInTimeline}
                    onDaySelect={(day) => {
                      setSelectedDayInTimeline(day);
                    }}
                    location={locations.length > 1 ? selectedLocation : undefined}
                    dates={currentDays.map((d: any) => d.date)}
                  />
                );
              })()
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

          {/* Selected Day Activities */}
          {hasDays ? (
            (() => {
              const days = daysByLocation[selectedLocation]?.days || daysArray;
              const selectedDay = days.find((d: any) => (d.day || d.dayNumber) === selectedDayInTimeline) || days[0];

              return <DayActivities selectedDay={selectedDay} />;
            })()
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

// Export the component wrapped with error boundary
export const ItineraryPanel = withErrorBoundary(ItineraryPanelComponent, {
  level: 'page',
  onError: (error, errorInfo) => {
    console.error('ItineraryPanel Error:', error);
    console.error('Component Stack:', errorInfo.componentStack);
  }
});