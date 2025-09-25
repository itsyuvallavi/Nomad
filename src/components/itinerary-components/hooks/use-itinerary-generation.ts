/**
 * Hook for handling itinerary generation API calls
 * Extracted from ItineraryPage.tsx to reduce component size
 */

import { useRef, useCallback } from 'react';
import { logger } from '@/lib/monitoring/logger';

export type ConversationalItineraryOutput = {
    type: 'question' | 'confirmation' | 'itinerary' | 'error';
    message: string;
    awaitingInput?: string;
    suggestedOptions?: string[];
    itinerary?: any;
    requiresGeneration?: boolean;
    conversationContext?: string;
};

interface GenerationProgress {
    stage: 'understanding' | 'planning' | 'generating' | 'finalizing' | 'analyzing';
    percentage: number;
    message: string;
    estimatedTimeRemaining?: number;
}

interface UseItineraryGenerationParams {
    conversationContext?: string;
    sessionId: string;
    currentItinerary: any;
    setGenerationProgress: (progress: GenerationProgress) => void;
    setGenerationMetadata: (metadata: any) => void;
    setPartialItinerary: (itinerary: any) => void;
    setCurrentItinerary: (itinerary: any) => void;
}

export function useItineraryGeneration({
    conversationContext,
    sessionId,
    currentItinerary,
    setGenerationProgress,
    setGenerationMetadata,
    setPartialItinerary,
    setCurrentItinerary
}: UseItineraryGenerationParams) {
    /**
     * Handle polling-based progressive response (Firebase-compatible)
     */
    const partialItinerary = useRef<any>(null);
    const processedCities = useRef<Set<string>>(new Set());
    const hasReceivedMetadata = useRef<boolean>(false);

    const handlePollingResponse = useCallback(async (
        message: string,
        conversationContext: string | undefined,
        sessionId: string
    ): Promise<ConversationalItineraryOutput> => {
        console.log('🚀 Starting generation request with:', {
            message,
            hasContext: !!conversationContext,
            sessionId
        });

        // Reset refs for new generation
        partialItinerary.current = null;
        processedCities.current.clear();
        hasReceivedMetadata.current = false;

        // Start generation
        const startResponse = await fetch('/api/ai', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                conversationContext,
                sessionId
            })
        });

        console.log('📡 Start response status:', startResponse.status);

        if (!startResponse.ok) {
            const errorText = await startResponse.text();
            console.error('❌ Start response failed:', errorText);
            throw new Error(`Failed to start generation: ${errorText}`);
        }

        const responseData = await startResponse.json();
        console.log('✅ Start response data:', responseData);

        const { data } = responseData;
        const generationId = data.generationId;

        // Poll for progress
        let attempts = 0;
        const maxAttempts = 300; // 5 minutes with 1 second intervals

        console.log('🎯 Starting polling immediately for generation:', generationId);

        while (attempts < maxAttempts) {
            // First poll should be immediate, then every second
            if (attempts > 0) {
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            const progressResponse = await fetch(`/api/ai?generationId=${generationId}`);

            if (!progressResponse.ok) {
                const errorText = await progressResponse.text();
                console.error(`❌ Progress poll failed (attempt ${attempts + 1}):`, errorText);
                throw new Error(`Failed to get progress: ${errorText}`);
            }

            const progressData = await progressResponse.json();
            const { data: progress } = progressData;

            console.log(`🔄 Poll #${attempts + 1} @ ${new Date().toISOString().split('T')[1].slice(0, 8)}:`, {
                status: progress.status,
                type: progress.type,
                progress: progress.progress,
                hasMetadata: !!progress.metadata,
                hasCityData: !!progress.cityData,
                hasItinerary: !!progress.itinerary,
                currentItineraryDays: currentItinerary?.itinerary?.length || 0
            });

            // Update UI based on progress
            if (progress.status === 'understanding') {
                setGenerationProgress({
                    stage: 'understanding',
                    percentage: progress.progress,
                    message: progress.message,
                    estimatedTimeRemaining: 30
                });
            } else if (progress.status === 'metadata_ready') {
                // Only process metadata once to avoid duplicates
                if (!hasReceivedMetadata.current) {
                    hasReceivedMetadata.current = true;
                    console.log('📦 METADATA READY - Building initial itinerary structure');
                    // Metadata is ready - start showing partial itinerary
                    setGenerationMetadata(progress.metadata);
                    setGenerationProgress({
                        stage: 'generating',
                        percentage: progress.progress,
                        message: progress.message,
                        estimatedTimeRemaining: 25
                    });

                    // Initialize partial itinerary with metadata
                    const initialItinerary = {
                        destination: progress.metadata.destinations.join(', '),
                        title: progress.metadata.title,
                        itinerary: [],  // Legacy format for backward compatibility
                        dailyItineraries: [],  // New format
                        quickTips: progress.metadata.quickTips || [],
                        cost: progress.metadata.estimatedCost,
                        photoUrl: progress.metadata.photoUrl || null,
                        // Add missing date and duration fields from metadata
                        startDate: progress.metadata.startDate,
                        endDate: progress.metadata.endDate,
                        duration: progress.metadata.duration,
                        // Add cost estimate structure for the UI
                        _costEstimate: progress.metadata.estimatedCost ? {
                            total: progress.metadata.estimatedCost.total,
                            flights: Math.round(progress.metadata.estimatedCost.total * 0.4), // Estimate 40% for flights
                            accommodation: Math.round(progress.metadata.estimatedCost.total * 0.35), // 35% for hotels
                            dailyExpenses: Math.round(progress.metadata.estimatedCost.total * 0.25), // 25% for daily
                            currency: progress.metadata.estimatedCost.currency || 'USD',
                            breakdown: []
                        } : undefined
                    };
                    console.log('🏗️ Setting initial itinerary with empty days:', initialItinerary);
                    partialItinerary.current = initialItinerary;
                    setPartialItinerary(initialItinerary);
                    setCurrentItinerary(initialItinerary as any);
                    console.log('✅ UI should now show trip overview with no days yet');
                }

            } else if (progress.status === 'city_complete') {
                // Check if we've already processed this city update
                const cityKey = `${progress.city}_${progress.allCities?.length || 0}`;
                if (processedCities.current.has(cityKey)) {
                    console.log(`⏭️ Skipping duplicate city update for ${progress.city}`);
                    continue;
                }
                processedCities.current.add(cityKey);

                console.log(`🏙️ CITY COMPLETE: ${progress.city} - Adding days to itinerary`);
                // A city's itinerary is complete - add it to the display
                setGenerationProgress({
                    stage: 'generating',
                    percentage: progress.progress,
                    message: progress.message,
                    estimatedTimeRemaining: 10
                });

                // Use allCities data to rebuild entire itinerary (avoids duplicates)
                if (progress.allCities && progress.allCities.length > 0 && partialItinerary.current) {
                    console.log(`📅 Rebuilding itinerary from ${progress.allCities.length} cities`);

                    // Build complete itinerary from all cities data
                    const allDays = progress.allCities.flatMap((cityInfo: any) =>
                        (cityInfo.data.days || []).map((day: any) => ({
                            title: day.title || `Day ${day.day} - ${day.city || cityInfo.city}`,
                            day: day.day,
                            date: day.date,
                            activities: day.activities.map((act: any) => ({
                                time: act.time,
                                description: act.description,
                                category: act.category,
                                address: act.address || 'Address not available',
                                venue_name: act.venueName,
                                rating: undefined,
                                _tips: act.tips
                            })),
                            weather: day.weather || 'Check local forecast'
                        }))
                    ).sort((a, b) => a.day - b.day);

                    const updatedItinerary = {
                        ...partialItinerary.current,
                        itinerary: allDays,  // Legacy format
                        dailyItineraries: allDays.map(day => ({
                            dayNumber: day.day,
                            date: day.date,
                            title: day.title,
                            activities: day.activities || [],
                            weather: day.weather
                        }))  // New format
                    };

                    console.log(`📊 Updated itinerary now has ${allDays.length} total days`);
                    partialItinerary.current = updatedItinerary;
                    setPartialItinerary(updatedItinerary);
                    setCurrentItinerary(updatedItinerary as any);
                    console.log(`✅ UI should now show ${allDays.length} days`);
                } else {
                    console.warn('⚠️ Cannot add city data:', {
                        hasCityData: !!progress.cityData,
                        hasPartialItinerary: !!partialItinerary
                    });
                }
            } else if (progress.status === 'generating') {
                setGenerationProgress({
                    stage: 'generating',
                    percentage: progress.progress,
                    message: progress.message,
                    estimatedTimeRemaining: 20
                });
            }

            // Check if complete
            if (progress.type === 'complete') {
                console.log('🎉 GENERATION COMPLETE - Returning full itinerary');
                // Handle both itinerary formats (legacy 'itinerary' and new 'dailyItineraries')
                const dayCount = progress.itinerary?.dailyItineraries?.length ||
                               progress.itinerary?.itinerary?.length || 0;
                console.log(`   Final itinerary has ${dayCount} days`);
                console.log('   Itinerary structure:', {
                    hasDailyItineraries: !!progress.itinerary?.dailyItineraries,
                    hasItinerary: !!progress.itinerary?.itinerary,
                    destination: progress.itinerary?.destination
                });
                return {
                    type: 'itinerary',
                    message: progress.message,
                    itinerary: progress.itinerary,
                    conversationContext: progress.conversationContext
                };
            } else if (progress.type === 'question') {
                return {
                    type: 'question',
                    message: progress.message,
                    awaitingInput: progress.awaitingInput,
                    conversationContext: progress.conversationContext
                };
            } else if (progress.type === 'error' || progress.status === 'failed') {
                const errorMessage = progress.message || 'Generation failed';
                console.error('❌ Generation failed with error:', errorMessage);
                throw new Error(errorMessage);
            }

            attempts++;
        }

        console.error('❌ Polling loop exited after', attempts, 'attempts without completion');
        throw new Error('Generation timed out');
    }, [setGenerationProgress, setGenerationMetadata, setPartialItinerary, setCurrentItinerary]);

    /**
     * Handle streaming response for complex trips (with polling fallback)
     */
    const handleStreamingResponse = useCallback(async (
        message: string,
        conversationContext: string | undefined,
        sessionId: string
    ): Promise<ConversationalItineraryOutput> => {
        // Always use polling-based approach for Firebase compatibility
        console.log('📊 Using polling-based progressive generation');
        return await handlePollingResponse(message, conversationContext, sessionId);
    }, [handlePollingResponse]);

    return {
        handlePollingResponse,
        handleStreamingResponse
    };
}