/**
 * Hook for handling message processing and conversation flow
 */

import { useState, useRef, useCallback } from 'react';
import { logger } from '@/lib/monitoring/logger';
import { offlineStorage } from '@/services/storage/offline-storage';
import { tripsService } from '@/services/trips/trips-service';
import { useItineraryGeneration } from './use-itinerary-generation';
import type { ConversationalItineraryOutput } from './use-itinerary-generation';
import type { User } from 'firebase/auth';

type Message = {
    role: 'user' | 'assistant';
    content: string;
    messageType?: 'question' | 'answer' | 'confirmation' | 'itinerary' | 'error' | 'initial';
    awaitingInput?: string;
    suggestedOptions?: string[];
};

interface UseMessageHandlerParams {
    sessionId: string;
    searchId?: string;
    currentSearchId: React.MutableRefObject<string>;
    conversationContext?: string;
    setConversationContext: (context: string | undefined) => void;
    currentItinerary: any;
    setCurrentItinerary: (itinerary: any) => void;
    setMobileActiveTab: (tab: 'chat' | 'itinerary') => void;
    generationProgress: any;
    setGenerationProgress: (progress: any) => void;
    setPartialItinerary: (itinerary: any) => void;
    setGenerationMetadata: (metadata: any) => void;
    user: User | null;
}

export function useMessageHandler({
    sessionId,
    searchId,
    currentSearchId,
    conversationContext,
    setConversationContext,
    currentItinerary,
    setCurrentItinerary,
    setMobileActiveTab,
    generationProgress,
    setGenerationProgress,
    setPartialItinerary,
    setGenerationMetadata,
    user
}: UseMessageHandlerParams) {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [awaitingInput, setAwaitingInput] = useState<string | undefined>(undefined);
    const [errorMessage, setErrorMessage] = useState('');
    const [errorDialogOpen, setErrorDialogOpen] = useState(false);

    const generationIdRef = useRef<string | null>(null);
    const generationStartTime = useRef<number>(0);

    // Use ref to avoid dependency issues - always has current messages
    const messagesRef = useRef<Message[]>(messages);
    messagesRef.current = messages;

    // Use the itinerary generation hook
    const { handleStreamingResponse } = useItineraryGeneration({
        conversationContext,
        sessionId,
        currentItinerary,
        setGenerationProgress,
        setGenerationMetadata,
        setPartialItinerary,
        setCurrentItinerary
    });

    const saveChatStateToStorage = useCallback((
        isCompleted: boolean = false,
        itinerary?: any,
        initialPrompt?: any,
        user?: any,
        firestoreTripId?: string | null
    ) => {
        try {
            const chatState = {
                messages: messagesRef.current,
                itinerary: (itinerary || currentItinerary) as any,
                timestamp: Date.now(),
                searchId: currentSearchId.current,
                isComplete: isCompleted,
                isCompleted: isCompleted  // Add both for compatibility
            };

            // Save chat state using the offline storage service
            // Note: If saveChatState doesn't exist, we'll use the generic save method
            if ('saveChatState' in offlineStorage && typeof offlineStorage.saveChatState === 'function') {
                offlineStorage.saveChatState(currentSearchId.current, chatState);
            } else if ('save' in offlineStorage && typeof offlineStorage.save === 'function') {
                (offlineStorage as any).save(`chat-${currentSearchId.current}`, chatState);
            }

            // Update recent searches
            const existingSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
            const recentSearches = existingSearches.filter((s: any) => s.id !== currentSearchId.current);

            if (initialPrompt || currentItinerary) {
                // Build a descriptive title for the search
                // Try to get destination and duration from the itinerary first, then from initialPrompt
                const actualItinerary = itinerary || currentItinerary;
                let destination = actualItinerary?.destination || actualItinerary?.title || initialPrompt?.destination;
                let duration = actualItinerary?.duration || initialPrompt?.duration;

                // If we still don't have destination, try to extract from the prompt
                const promptText = messagesRef.current[0]?.content || initialPrompt?.prompt || '';
                if (!destination && promptText) {
                    // Try to extract destination from prompt (e.g., "plan a 7 day trip to london")
                    const destinationMatch = promptText.match(/(?:to|in|visit|explore)\s+([a-zA-Z\s]+?)(?:\s+(?:on|for|in|during)|$)/i);
                    if (destinationMatch) {
                        destination = destinationMatch[1].trim();
                        // Capitalize first letter of each word
                        destination = destination.split(' ').map((word: string) =>
                            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                        ).join(' ');
                    }
                }

                // If we still don't have duration, try to extract from prompt
                if (!duration && promptText) {
                    const durationMatch = promptText.match(/(\d+)\s*(?:day|days|night|nights)/i);
                    if (durationMatch) {
                        duration = parseInt(durationMatch[1]);
                    }
                }

                // Build title with what we have
                let title = destination || 'Trip';
                if (duration) {
                    title += ` - ${duration} days`;
                }

                const prompt = promptText || initialPrompt?.destination || 'New trip';

                recentSearches.unshift({
                    id: currentSearchId.current,
                    destination: destination || initialPrompt?.destination,
                    startDate: actualItinerary?.startDate || initialPrompt?.startDate,
                    duration: duration || initialPrompt?.duration,
                    timestamp: Date.now(),
                    hasItinerary: !!(itinerary || currentItinerary),
                    title: title,
                    prompt: prompt,
                    chatState: chatState,
                    lastUpdated: new Date().toISOString()
                });
            }

            localStorage.setItem('recentSearches', JSON.stringify(recentSearches.slice(0, 5)));

            // Save to Firestore if authenticated
            if (user && firestoreTripId) {
                import('@/services/trips/trips-service').then(({ tripsService }) => {
                    tripsService.updateTrip(firestoreTripId, {
                        chatState,
                        itinerary: (itinerary || currentItinerary) as any,
                        status: isCompleted ? 'confirmed' : 'draft'
                    }).catch((error: any) => {
                        console.error('Error saving to Firestore:', error);
                    });
                });
            }
        } catch (e) {
            logger.error('SYSTEM', 'Could not save chat state', e);
        }
    }, [currentItinerary, currentSearchId]); // Removed 'messages' - using messagesRef instead

    const handleUserMessage = useCallback(async (
        message: string,
        isInitial: boolean = false
    ) => {
        const thisGenerationId = `gen-${Date.now()}-${Math.random()}`;

        // Prevent duplicate calls
        if (generationIdRef.current && !isInitial) {
            console.warn('🚫 Skipping duplicate call, generation already in progress');
            return;
        }
        generationIdRef.current = thisGenerationId;

        console.log('💬 Processing User Message:', message);

        // Add user message to chat
        setMessages(prev => [...prev, {
            role: 'user',
            content: message,
            messageType: isInitial ? 'initial' : 'answer'
        }]);

        setIsGenerating(true);
        generationStartTime.current = Date.now();

        // Reset partial states for new generation
        setPartialItinerary(null);
        setGenerationMetadata(null);

        // Update progress
        setGenerationProgress({
            stage: awaitingInput && awaitingInput !== 'confirmation' ? 'understanding' : 'understanding',
            percentage: awaitingInput ? 50 : 10,
            message: awaitingInput ? 'Processing your response...' : 'Understanding your request...',
            estimatedTimeRemaining: awaitingInput ? 2 : 15
        });

        try {
            console.log('🚀 Using progressive generation (default for all trips)');
            console.log('📤 Sending request with:', {
                message,
                sessionId,
                hasContext: !!conversationContext
            });

            const response = await handleStreamingResponse(message, conversationContext, sessionId);

            console.log('🤖 AI Response received:', {
                type: response.type,
                hasItinerary: !!response.itinerary,
                awaitingInput: response.awaitingInput,
                fullResponse: response
            });

            // Update conversation context
            if (response.conversationContext) {
                setConversationContext(response.conversationContext);
                if (typeof window !== 'undefined') {
                    const storageId = searchId || currentSearchId.current;
                    localStorage.setItem(`conversation-context-${storageId}`, response.conversationContext);
                    localStorage.setItem(`session-id-${storageId}`, sessionId);
                }
            }

            // Handle different response types
            switch (response.type) {
                case 'question':
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: response.message,
                        messageType: 'question',
                        awaitingInput: response.awaitingInput,
                        suggestedOptions: response.suggestedOptions
                    }]);
                    setAwaitingInput(response.awaitingInput);
                    setGenerationProgress({
                        stage: 'understanding',
                        percentage: 100,
                        message: 'Waiting for your response...',
                        estimatedTimeRemaining: 0
                    });
                    break;

                case 'confirmation':
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: response.message,
                        messageType: 'confirmation',
                        awaitingInput: 'confirmation'
                    }]);
                    setAwaitingInput('confirmation');
                    setGenerationProgress({
                        stage: 'planning',
                        percentage: 100,
                        message: 'Ready to generate your itinerary!',
                        estimatedTimeRemaining: 0
                    });
                    break;

                case 'itinerary':
                    if (response.itinerary) {
                        setGenerationProgress({
                            stage: 'finalizing',
                            percentage: 100,
                            message: 'Your itinerary is ready!',
                            estimatedTimeRemaining: 0
                        });
                        setCurrentItinerary(response.itinerary);
                        setAwaitingInput(undefined);
                        setMessages(prev => [...prev, {
                            role: 'assistant',
                            content: "✨ Your personalized itinerary is ready! You can see it on the right. Would you like to make any changes?",
                            messageType: 'itinerary'
                        }]);

                        // Cache to offline storage
                        await offlineStorage.cacheItinerary(response.itinerary.destination, response.itinerary);

                        // Save to Firestore if user is authenticated
                        if (user) {
                            try {
                                logger.info('MessageHandler', 'Saving trip to Firestore', {
                                    userId: user.uid,
                                    destination: response.itinerary.destination
                                });

                                // Extract dates from itinerary
                                const dailyItineraries = response.itinerary.dailyItineraries || response.itinerary.itinerary || [];
                                const firstDay = dailyItineraries[0];
                                const lastDay = dailyItineraries[dailyItineraries.length - 1];

                                // Generate dates if not available
                                const now = new Date();
                                const startDate = firstDay?.date ? new Date(firstDay.date) : now;
                                const duration = dailyItineraries.length || 0;
                                const endDate = lastDay?.date ? new Date(lastDay.date) : new Date(now.getTime() + duration * 24 * 60 * 60 * 1000);

                                const tripData: any = {
                                    userId: user.uid,
                                    title: response.itinerary.title || `Trip to ${response.itinerary.destination}`,
                                    destination: response.itinerary.destination,
                                    prompt: messagesRef.current.find(m => m.role === 'user')?.content || '',
                                    startDate,
                                    endDate,
                                    duration,
                                    currency: 'USD',
                                    travelStyle: 'mid-range',
                                    itinerary: response.itinerary,
                                    chatState: {
                                        messages: messagesRef.current,
                                        itinerary: response.itinerary,
                                        conversationContext
                                    }
                                };

                                // Only include budget if it has a valid value (Firestore doesn't accept undefined)
                                if (response.itinerary.budget && typeof response.itinerary.budget === 'number') {
                                    tripData.budget = response.itinerary.budget;
                                }

                                await tripsService.createTrip(tripData);

                                logger.info('MessageHandler', 'Trip saved successfully to Firestore');
                            } catch (error) {
                                logger.error('MessageHandler', 'Failed to save trip to Firestore', error);
                                // Don't fail the user experience if trip saving fails
                            }
                        } else {
                            logger.info('MessageHandler', 'User not authenticated, trip saved to memory only');
                        }

                        if (window.innerWidth < 768) {
                            setMobileActiveTab('itinerary');
                        }
                    }
                    break;

                case 'error':
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: response.message,
                        messageType: 'error'
                    }]);
                    setAwaitingInput(response.awaitingInput);
                    break;
            }

        } catch (error: any) {
            console.error('❌ Conversation error:', error);
            console.error('Stack trace:', error.stack);
            console.error('Full error object:', error);

            logger.error('AI', 'Conversation failed', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `I encountered an error: ${error.message}. Please try again.`,
                messageType: 'error'
            }]);
            setErrorMessage(error.message || 'Something went wrong. Please try again.');
            setErrorDialogOpen(true);
        } finally {
            setIsGenerating(false);
            generationIdRef.current = null;
        }
    }, [
        awaitingInput,
        conversationContext,
        sessionId,
        searchId,
        currentSearchId,
        setConversationContext,
        setCurrentItinerary,
        setMobileActiveTab,
        setGenerationProgress,
        setPartialItinerary,
        setGenerationMetadata,
        handleStreamingResponse,
        user
        // Removed 'messages' - using messagesRef instead to prevent unnecessary re-renders
    ]);

    return {
        messages,
        isGenerating,
        awaitingInput,
        errorMessage,
        errorDialogOpen,
        setErrorDialogOpen,
        handleUserMessage,
        saveChatStateToStorage
    };
}