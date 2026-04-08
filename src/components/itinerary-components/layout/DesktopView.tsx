/**
 * Desktop view layout component
 * 3-column layout: Chat (25%) | Itinerary (45%) | Map (30%)
 */

import { useState, useEffect, useMemo } from 'react';
import { ChatPanel } from '../chat/ChatPanel';
import { ItineraryPanel } from '../itinerary/ItineraryDisplay';
import { ModernLoadingPanel } from '../chat/LoadingProgress';
import { MapPanel } from '../map/MapPanel';
import type { GeneratePersonalizedItineraryOutput } from '@/services/ai/types/core.types';

type StandardProgressStage = 'understanding' | 'planning' | 'generating' | 'finalizing';

interface DesktopViewProps {
    messages: any[];
    userInput: string;
    setUserInput: (value: string) => void;
    handleSendMessage: () => void;
    isGenerating: boolean;
    currentItinerary: GeneratePersonalizedItineraryOutput | null;
    generationProgress: {
        stage: string;
        percentage: number;
        message: string;
        estimatedTimeRemaining?: number;
    };
}

export function DesktopView({
    messages,
    userInput,
    setUserInput,
    handleSendMessage,
    isGenerating,
    currentItinerary,
    generationProgress
}: DesktopViewProps) {
    // Shared state for day selection between itinerary and map
    const [selectedDay, setSelectedDay] = useState(1);

    // Extract all activities with day information and location
    // IMPORTANT: Preserve the original dayNumber from the itinerary for multi-city trips
    // DO NOT recalculate as dayIndex + 1, as this breaks sequential numbering across cities
    const activitiesWithDayInfo = currentItinerary?.dailyItineraries?.flatMap((day, dayIndex) =>
        (day.activities || []).map(activity => ({
            ...activity,
            dayNumber: day.dayNumber || (dayIndex + 1), // Preserve original day number from itinerary
            date: day.date,
            city: day.city || currentItinerary.destination // Add city/location info
        }))
    ) || [];

    // Get unique locations from itinerary
    const locations = useMemo(() => Array.from(
        new Set(currentItinerary?.dailyItineraries?.map(day => day.city || currentItinerary?.destination).filter(Boolean))
    ) as string[], [currentItinerary?.dailyItineraries, currentItinerary?.destination]);

    // Shared state for location selection (multi-city support)
    // CRITICAL FIX: Initialize with first location to avoid empty map on initial render
    const [selectedLocation, setSelectedLocation] = useState<string>('');

    // Update selectedLocation when locations change (e.g., new itinerary loaded)
    useEffect(() => {
        if (locations.length > 0 && !selectedLocation) {
            setSelectedLocation(locations[0]);
        }
    }, [locations, selectedLocation]);

    // Filter activities by selected location (for multi-city trips)
    // FIXED: Show all activities if selectedLocation is not set yet (prevents empty map on first render)
    const currentLocationActivities = (locations.length > 1 && selectedLocation)
        ? activitiesWithDayInfo.filter(activity => activity.city === selectedLocation)
        : activitiesWithDayInfo;

    // Get city name from selected location or default to destination
    const cityName = selectedLocation || currentItinerary?.destination || 'City';

    // Get center coordinates from first activity of the selected day, or fallback to first activity overall
    const firstActivityOfSelectedDay = currentLocationActivities.find(
        activity => activity.dayNumber === selectedDay && activity.coordinates?.lat && activity.coordinates?.lng
    );
    const firstActivityWithCoords = firstActivityOfSelectedDay || currentLocationActivities.find(
        activity => activity.coordinates?.lat && activity.coordinates?.lng
    );
    const mapCenter = firstActivityWithCoords
        ? [firstActivityWithCoords.coordinates!.lat, firstActivityWithCoords.coordinates!.lng] as [number, number]
        : undefined;

    return (
        <div className="hidden md:flex w-full gap-4 p-4">
            {/* Left Column - Chat (25%) */}
            <div className="w-1/4">
                <ChatPanel
                    messages={messages}
                    inputValue={userInput}
                    onInputChange={setUserInput}
                    onSendMessage={handleSendMessage}
                    onKeyPress={(e: React.KeyboardEvent) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                        }
                    }}
                    isGenerating={isGenerating}
                />
            </div>

            {/* Center Column - Itinerary (45%) */}
            <div className="w-[45%]">
                {currentItinerary ? (
                    <ItineraryPanel
                        key="itinerary-panel"
                        itinerary={currentItinerary}
                        selectedDay={selectedDay}
                        onDayChange={setSelectedDay}
                        selectedLocation={selectedLocation}
                        onLocationChange={setSelectedLocation}
                    />
                ) : (
                    <ModernLoadingPanel
                        key="loading-panel"
                        progress={{
                            ...generationProgress,
                            stage: (generationProgress.stage === 'analyzing' ? 'planning' : generationProgress.stage) as StandardProgressStage
                        }}
                    />
                )}
            </div>

            {/* Right Column - Map (30%) */}
            <div className="w-[30%]">
                {currentItinerary && currentLocationActivities.length > 0 && mapCenter ? (
                    <MapPanel
                        city={cityName}
                        activities={currentLocationActivities}
                        center={mapCenter}
                        selectedDay={selectedDay}
                    />
                ) : (
                    <div className="h-full flex items-center justify-center bg-muted rounded-lg border border-border">
                        <p className="text-sm text-muted-foreground">
                            Map will appear when itinerary is generated
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}