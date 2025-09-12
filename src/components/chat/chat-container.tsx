
'use client';

import { useState, useEffect, useRef } from 'react';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useSwipeGestures } from '@/hooks/use-swipe-gestures';
import { Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { generatePersonalizedItinerary } from '@/ai/flows/generate-personalized-itinerary';
import { refineItineraryBasedOnFeedback } from '@/ai/flows/refine-itinerary-based-on-feedback';
import type { FormValues } from '../forms/trip-details-form';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/schemas';
import { ArrowLeft, MessageSquare, Map as MapIcon, Layers } from 'lucide-react';
import { Button } from '../ui/button';
import type { RecentSearch, ChatState } from '@/app/page';
import { ChatPanel } from './chat-interface';
import { ItineraryPanel } from '../itinerary/itinerary-view';
import { MapPanel } from '../map/map-panel';
import { MobileMapModal } from '../map/mobile-map-modal';
import { cn } from '@/lib/utils';
import { ModernLoadingPanel } from './modern-loading-panel';
import { ErrorDialog } from '../ui/error-dialog';
import { logger } from '@/lib/logger';
import { getDraftManager } from '@/lib/draft-manager';
import { retryApiCall } from '@/lib/retry-utils';
import { handleError, ErrorCategory } from '@/lib/error-handler';
import { offlineStorage } from '@/lib/offline-storage';
import { useAuth } from '@/contexts/AuthContext';
import { tripsService } from '@/lib/trips-service';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type ChatDisplayProps = {
    initialPrompt: FormValues;
    savedChatState?: ChatState;
    searchId?: string;
    onError: (error: string) => void;
    onReturn: () => void;
};

type ProgressStage = 'understanding' | 'planning' | 'generating' | 'finalizing';

interface GenerationProgress {
    stage: ProgressStage;
    percentage: number;
    message: string;
    estimatedTimeRemaining?: number;
}

export default function ChatDisplay({
    initialPrompt,
    savedChatState,
    searchId,
    onError,
    onReturn,
}: ChatDisplayProps) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>(savedChatState?.messages || []);
    const [userInput, setUserInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentItinerary, setCurrentItinerary] = useState<GeneratePersonalizedItineraryOutput | null>(savedChatState?.itinerary || null);
    const [firestoreTripId, setFirestoreTripId] = useState<string | null>(null);
    const [errorDialogOpen, setErrorDialogOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [mobileActiveTab, setMobileActiveTab] = useState<'chat' | 'itinerary'>('chat');
    const [showMapPanel, setShowMapPanel] = useState(true); // Auto-show map by default on desktop
    const [showMobileMapModal, setShowMobileMapModal] = useState(false); // Mobile map modal state
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [generationProgress, setGenerationProgress] = useState<GenerationProgress>({
        stage: 'understanding',
        percentage: 0,
        message: 'Understanding your request...'
    });
    
    // Swipe gestures for mobile tab switching
    const swipeHandlers = useSwipeGestures({
        onSwipeLeft: () => {
            if (window.innerWidth < 768 && currentItinerary) {
                setMobileActiveTab('itinerary');
                // Ensure we start at the top when swiping to itinerary
                setTimeout(() => {
                    if (itineraryContainerRef.current) {
                        itineraryContainerRef.current.scrollTop = 0;
                    }
                }, 100);
            }
        },
        onSwipeRight: () => {
            if (window.innerWidth < 768) {
                setMobileActiveTab('chat');
            }
        },
        threshold: 50
    });
    const currentSearchId = useRef(searchId || new Date().toISOString());
    const generationIdRef = useRef<string | null>(null);
    const generationStartTime = useRef<number>(0);

    const chatContainerRef = useRef<HTMLDivElement>(null);
    const itineraryContainerRef = useRef<HTMLDivElement>(null);

     useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
        
        if (messages.length > 0 && !savedChatState?.isCompleted) {
            saveChatStateToStorage();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages]);
    
    // Scroll to top when switching to itinerary tab
    useEffect(() => {
        if (mobileActiveTab === 'itinerary') {
            // Reset scroll immediately
            if (itineraryContainerRef.current) {
                itineraryContainerRef.current.scrollTop = 0;
            }
            
            // Also reset after a short delay to catch any async scrolling
            const timeouts = [0, 50, 100, 200].map(delay => 
                setTimeout(() => {
                    if (itineraryContainerRef.current) {
                        itineraryContainerRef.current.scrollTop = 0;
                        // Also scroll any child elements that might have scroll
                        const scrollableChildren = itineraryContainerRef.current.querySelectorAll('[data-scrollable], .overflow-y-auto, .overflow-auto');
                        scrollableChildren.forEach(child => {
                            (child as HTMLElement).scrollTop = 0;
                        });
                    }
                }, delay)
            );
            
            return () => {
                timeouts.forEach(timeout => clearTimeout(timeout));
            };
        }
    }, [mobileActiveTab]);
    
    const saveChatStateToStorage = async (isCompleted = false, itinerary?: GeneratePersonalizedItineraryOutput) => {
        try {
            const storedSearches = localStorage.getItem('recentSearches');
            const recentSearches: RecentSearch[] = storedSearches ? JSON.parse(storedSearches) : [];
            
            const existingIndex = recentSearches.findIndex(s => s.id === currentSearchId.current);
            
            const chatState: ChatState = {
                messages,
                isCompleted, 
                itinerary: itinerary || currentItinerary || undefined,
            };
            
            const searchEntry: RecentSearch = {
                id: currentSearchId.current,
                prompt: initialPrompt.prompt,
                fileDataUrl: initialPrompt.fileDataUrl,
                chatState,
                title: itinerary?.title || currentItinerary?.title || initialPrompt.prompt,
                lastUpdated: new Date().toISOString()
            };
            
            if (existingIndex >= 0) {
                recentSearches[existingIndex] = searchEntry;
            } else {
                recentSearches.unshift(searchEntry);
            }
            
            localStorage.setItem('recentSearches', JSON.stringify(recentSearches.slice(0, 5)));
            
            // Save to Firestore if user is authenticated
            if (user) {
                try {
                    if (!firestoreTripId) {
                        // Create new trip in Firestore
                        const trip = await tripsService.createTrip({
                            userId: user.uid,
                            prompt: initialPrompt.prompt,
                            title: itinerary?.title || currentItinerary?.title,
                            chatState,
                            itinerary: itinerary || currentItinerary,
                            fileDataUrl: initialPrompt.fileDataUrl
                        });
                        setFirestoreTripId(trip.id);
                        console.log('✅ Trip saved to Firestore:', trip.id);
                    } else {
                        // Update existing trip
                        await tripsService.updateTrip(firestoreTripId, {
                            chatState,
                            itinerary: itinerary || currentItinerary,
                            status: isCompleted ? 'confirmed' : 'draft'
                        });
                        console.log('✅ Trip updated in Firestore:', firestoreTripId);
                    }
                } catch (error) {
                    console.error('Error saving to Firestore:', error);
                    // Don't fail the whole operation if Firestore save fails
                }
            }
        } catch (e) {
            logger.error('SYSTEM', 'Could not save chat state', e);
        }
    };

    const getConversationHistory = (currentMessages: Message[]): string => {
        return currentMessages.map(m => `${m.role}: ${m.content}`).join('\n');
    }

    const generateItinerary = async (currentMessages: Message[]) => {
        const thisGenerationId = `gen-${Date.now()}-${Math.random()}`;
        if (generationIdRef.current) {
            console.warn('🚫 Skipping duplicate call, generation already in progress');
            logger.warn('AI', 'Skipping duplicate call, generation already in progress');
            return;
        }
        generationIdRef.current = thisGenerationId;
        
        // Initialize draft management
        const draftManager = getDraftManager();
        const draftId = draftManager.startDraft(initialPrompt.prompt);
        
        console.group(`🎯 Starting Itinerary Generation [${thisGenerationId.substring(0, 10)}...]`);
        console.log('📝 User Prompt:', initialPrompt.prompt);
        console.log('🆔 Generation ID:', thisGenerationId);
        console.log('⏰ Started at:', new Date().toLocaleTimeString());
        console.groupEnd();
        
        logger.info('USER', 'Starting itinerary generation', { prompt: initialPrompt.prompt, id: thisGenerationId });
        
        setIsGenerating(true);
        generationStartTime.current = Date.now();
        
        // Reset progress
        setGenerationProgress({
            stage: 'understanding',
            percentage: 10,
            message: 'Understanding your request...',
            estimatedTimeRemaining: 15
        });
        
        const conversationHistory = getConversationHistory(currentMessages);

        console.log('💬 Conversation history length:', conversationHistory.length, 'characters');
        console.log('🤖 AI is thinking...');

        setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: "Great, I'm working on your itinerary now..." 
        }]);
        
        // Update draft stage
        draftManager.updateDraft('parsing');
        
        // Simulate progress stages
        const progressTimer = setInterval(() => {
            setGenerationProgress(prev => {
                const elapsed = (Date.now() - generationStartTime.current) / 1000;
                
                if (elapsed < 3) {
                    return {
                        stage: 'understanding',
                        percentage: Math.min(25, prev.percentage + 5),
                        message: 'Analyzing your travel requirements...',
                        estimatedTimeRemaining: Math.max(1, 15 - elapsed)
                    };
                } else if (elapsed < 7) {
                    return {
                        stage: 'planning',
                        percentage: Math.min(60, 25 + (elapsed - 3) * 10),
                        message: 'Planning your perfect itinerary...',
                        estimatedTimeRemaining: Math.max(1, 15 - elapsed)
                    };
                } else if (elapsed < 12) {
                    return {
                        stage: 'generating',
                        percentage: Math.min(85, 60 + (elapsed - 7) * 5),
                        message: 'Adding activities and recommendations...',
                        estimatedTimeRemaining: Math.max(1, 15 - elapsed)
                    };
                } else {
                    return {
                        stage: 'finalizing',
                        percentage: Math.min(95, 85 + (elapsed - 12) * 3),
                        message: 'Finalizing your itinerary...',
                        estimatedTimeRemaining: Math.max(1, 15 - elapsed)
                    };
                }
            });
        }, 500);
        
        const startTime = Date.now();
        const timerId = logger.apiCall('AI', 'generatePersonalizedItinerary');

        try {
            // Check for cached results first
            const cachedResult = await offlineStorage.getCachedSearch(initialPrompt.prompt);
            if (cachedResult && !initialPrompt.fileDataUrl) {
                console.log('💾 Using cached itinerary');
                logger.info('SYSTEM', 'Using cached itinerary', { prompt: initialPrompt.prompt });
                
                // Use cached result
                const itinerary = cachedResult.response;
                clearInterval(progressTimer);
                setGenerationProgress({
                    stage: 'finalizing',
                    percentage: 100,
                    message: 'Loaded from cache!',
                    estimatedTimeRemaining: 0
                });
                
                setCurrentItinerary(itinerary);
                saveChatStateToStorage(true, itinerary);
                draftManager.completeDraft(itinerary);
                
                setMessages(prev => [...prev, { 
                    role: 'assistant', 
                    content: "✨ Your personalized itinerary is ready! (loaded from cache)" 
                }]);
                
                if (window.innerWidth < 768) {
                    setMobileActiveTab('itinerary');
                }
                
                return;
            }
            
            console.log('🔄 Calling AI generation server action...');
            console.log('📊 Request details:', {
                promptLength: initialPrompt.prompt.length,
                hasFile: !!initialPrompt.fileDataUrl,
                hasHistory: !!conversationHistory,
            });
            
            logger.info('API', 'Calling generatePersonalizedItinerary', {
                promptLength: initialPrompt.prompt.length,
                hasFile: !!initialPrompt.fileDataUrl,
                hasHistory: !!conversationHistory,
            });
            
            // Update draft to generating stage
            draftManager.updateDraft('generating');
            
            // Wrap API call with retry logic
            const itinerary = await retryApiCall(
                () => generatePersonalizedItinerary({
                    prompt: initialPrompt.prompt,
                    attachedFile: initialPrompt.fileDataUrl,
                    conversationHistory: conversationHistory
                }),
                'generatePersonalizedItinerary',
                {
                    maxAttempts: 3,
                    onRetry: (attempt) => {
                        draftManager.updateDraft('generating', undefined, { 
                            retryCount: attempt 
                        });
                    }
                }
            );
            
            const duration = Date.now() - startTime;
            console.log(`✅ AI Response received in ${(duration / 1000).toFixed(1)}s`);
            
            logger.apiResponse(timerId, 'generatePersonalizedItinerary', { success: true });
            
            // Check if this is a validation error response
            if ((itinerary as any).validationError && (itinerary as any).errorMessage) {
                console.log('ℹ️ Input validation:', (itinerary as any).errorMessage);
                logger.info('AI', 'Input validation needed', { message: (itinerary as any).errorMessage });
                
                // Add validation message to conversation instead of showing error dialog
                const validationMessage = (itinerary as any).errorMessage;
                setMessages(prev => [...prev, { 
                    role: 'assistant', 
                    content: `I'd love to help you plan that trip! ${validationMessage}`
                }]);
                
                // Don't set itinerary, just return - waiting for user response
                return;
            }
            
            // Check if this is a clarifying question response
            if ((itinerary as any).needsMoreInfo && (itinerary as any).question) {
                console.log('ℹ️ AI needs more information');
                console.log('❓ Question:', (itinerary as any).question);
                
                setMessages(prev => [...prev, { 
                    role: 'assistant', 
                    content: (itinerary as any).question
                }]);
                
                // Don't set itinerary, just return - waiting for user response
                return;
            }
            
            console.group('📦 Itinerary Generated Successfully');
            console.log('🏷️ Title:', itinerary.title);
            console.log('📍 Destinations:', (itinerary as any).destinations?.map((d: any) => d.city).join(', ') || itinerary.destination);
            console.log('📅 Total Days:', (itinerary as any).destinations?.reduce((sum: number, d: any) => sum + d.days, 0) || itinerary.itinerary?.length);
            console.log('🎯 Activities:', (itinerary as any).destinations?.reduce((sum: number, d: any) => 
                sum + (d.dailyItineraries?.reduce((s: number, di: any) => s + (di.activities?.length || 0), 0) || 0), 0) || 
                itinerary.itinerary?.reduce((acc, day) => acc + day.activities.length, 0));
            console.groupEnd();
            
            logger.debug('AI', 'Full itinerary structure received', {
                destination: itinerary.destination,
                title: itinerary.title,
                totalDays: itinerary.itinerary.length,
            });
            
            if ((!itinerary.itinerary || itinerary.itinerary.length === 0) && 
                (!(itinerary as any).destinations || (itinerary as any).destinations.length === 0) &&
                !(itinerary as any).needsMoreInfo) {
                console.error('❌ Empty itinerary received');
                throw new Error('The AI returned an empty itinerary. Please try rephrasing your request.');
            }
            
            logger.info('AI', 'Generated Itinerary Summary', {
                destination: itinerary.destination,
                title: itinerary.title,
                days: itinerary.itinerary.length,
                activities: itinerary.itinerary.reduce((acc, day) => acc + day.activities.length, 0)
            });
            
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: "✨ Your personalized itinerary is ready! You can see it on the right." 
            }]);
            
            // Complete progress
            clearInterval(progressTimer);
            setGenerationProgress({
                stage: 'finalizing',
                percentage: 100,
                message: 'Your itinerary is ready!',
                estimatedTimeRemaining: 0
            });
            
            setCurrentItinerary(itinerary);
            saveChatStateToStorage(true, itinerary);
            
            // Cache the itinerary for offline access
            await offlineStorage.cacheItinerary(itinerary.destination, itinerary);
            await offlineStorage.cacheSearch(initialPrompt.prompt, itinerary);
            
            // Mark draft as complete
            draftManager.completeDraft(itinerary);
            
            // Auto-switch to itinerary tab on mobile when ready
            if (window.innerWidth < 768) {
                setMobileActiveTab('itinerary');
            }

        } catch (e: any) {
            clearInterval(progressTimer);
            const duration = logger.endTimer(timerId);
            const errorDuration = Date.now() - startTime;
            
            // Handle error with enhanced error handler
            const errorInfo = handleError(e, 'generateItinerary', {
                draftId,
                generationId: thisGenerationId
            });
            
            // Mark draft as failed
            draftManager.failDraft(errorInfo.userMessage);
            
            const isValidationError = e?.isValidationError === true || 
                                     errorInfo.category === ErrorCategory.VALIDATION;
            
            if (isValidationError) {
                // For validation errors, use info logging
                console.log('ℹ️ Input needs clarification:', e.message);
                logger.info('AI', 'User input needs clarification', { message: e.message });
            } else {
                // For real errors, use error logging
                console.group('❌ Itinerary Generation Failed');
                console.error('Error:', e);
                console.log('⏱️ Failed after:', (errorDuration / 1000).toFixed(1), 'seconds');
                console.log('🆔 Generation ID:', thisGenerationId);
                console.groupEnd();
                logger.error('AI', 'Itinerary generation failed', { error: e, id: thisGenerationId });
            }
            
            logger.apiResponse(timerId, 'generatePersonalizedItinerary', { success: false, duration });
            const errorMsg = e instanceof Error ? e.message : "An unknown error occurred.";
            
            // Check if this is a parser/complexity error or validation error
            if (isValidationError ||
                errorMsg.includes('validation failed') || 
                errorMsg.includes('too complex') || 
                errorMsg.includes('understand') ||
                errorMsg.includes('parse') ||
                errorMsg.includes('departure city') ||
                errorMsg.includes('Please tell me where') ||
                errorMsg.includes('Please provide more details') ||
                (errorMsg.includes('origin') && errorMsg.includes('required'))) {
                setErrorMessage(errorMsg);
                setErrorDialogOpen(true);
            } else {
                // For other errors, use the normal error flow
                onError(`I'm sorry, there was an error creating your itinerary. ${errorMsg}`);
                setMessages(prev => [...prev, { 
                    role: 'assistant', 
                    content: `I'm sorry, there was an error creating your itinerary. Please try again. \n\nDetails: ${errorMsg}`
                }]);
            }
        } finally {
            if (generationIdRef.current === thisGenerationId) {
                console.log('🏁 Generation completed, resetting state');
                setIsGenerating(false);
                generationIdRef.current = null;
            }
        }
    }


    useEffect(() => {
      if (savedChatState || generationIdRef.current) {
        return;
      }
      
      const userMessage: Message = { role: 'user', content: initialPrompt.prompt };
      setMessages([userMessage]);
      generateItinerary([userMessage]);
      
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleUserInputSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!userInput.trim() || isGenerating) return;

        logger.info('USER', 'New message submitted', { message: userInput });
        
        const newUserMessage: Message = { role: 'user', content: userInput };
        const newMessages = [...messages, newUserMessage];
        setMessages(newMessages);
        setUserInput('');

        // Always regenerate if we don't have a complete itinerary yet
        if (currentItinerary && currentItinerary.itinerary && currentItinerary.itinerary.length > 0) {
            await handleRefine(userInput, newMessages);
        } else {
            // This handles both initial generation and follow-up questions
            await generateItinerary(newMessages);
        }
    };
    
    const handleRefine = async (feedback: string, _currentMessages: Message[]) => {
        if (!currentItinerary) return;
        
        logger.info('USER', 'Refining itinerary', { feedback });
        const timerId = logger.apiCall('AI', 'refineItineraryBasedOnFeedback');
        
        setMessages(prev => [...prev, { role: 'assistant', content: "I understand. Refining the itinerary..." }]);
        setIsGenerating(true);

        try {
            const refinedItinerary = await refineItineraryBasedOnFeedback({
                originalItinerary: currentItinerary,
                userFeedback: feedback,
            });
            
            logger.apiResponse(timerId, 'refineItineraryBasedOnFeedback', { success: true });
            logger.info('AI', 'Refinement successful');
            setCurrentItinerary(refinedItinerary);
            saveChatStateToStorage(true, refinedItinerary);
            setMessages(prev => [...prev, { role: 'assistant', content: "✅ Itinerary updated!" }]);
        } catch (error) {
            logger.apiResponse(timerId, 'refineItineraryBasedOnFeedback', { success: false });
            logger.error('AI', 'Refinement failed', error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            onError(`I'm sorry, there was an error refining your itinerary. ${errorMessage}`);
            setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, I couldn't refine the itinerary. ${errorMessage}` }]);
        } finally {
            setIsGenerating(false);
        }
    };

    // Keyboard shortcuts
    useKeyboardShortcuts([
        {
            key: 'n',
            ctrl: true,
            action: () => onReturn(),
            description: 'Start new search'
        },
        {
            key: 'm',
            ctrl: true,
            action: () => setShowMapPanel(!showMapPanel),
            description: 'Toggle map view'
        },
        {
            key: '/',
            action: () => {
                const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                input?.focus();
            },
            description: 'Focus chat input'
        },
        {
            key: '?',
            shift: true,
            action: () => setShowShortcuts(!showShortcuts),
            description: 'Show keyboard shortcuts'
        },
        {
            key: 'Escape',
            action: () => setShowShortcuts(false),
            description: 'Close shortcuts'
        },
        {
            key: 'Enter',
            ctrl: true,
            action: () => {
                if (userInput.trim() && !isGenerating) {
                    handleUserInputSubmit();
                }
            },
            description: 'Send message'
        }
    ]);
    
    return (
        <>
            <ErrorDialog 
                open={errorDialogOpen}
                onClose={() => setErrorDialogOpen(false)}
                message={errorMessage || "This is a beta version, and some complex searches might be too advanced at the moment. Try simplifying your request!"}
                suggestions={[
                    "3 days in Paris from New York",
                    "One week exploring Tokyo, Kyoto, and Osaka from Los Angeles",
                    "5 day Barcelona trip from London with budget hotels",
                    "Weekend getaway to Amsterdam from Berlin"
                ]}
            />
            <main className="h-[100dvh] md:h-screen flex flex-col overflow-hidden">
                {/* Top Navigation Bar - Show on all screens */}
                <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 bg-background border-b-2 border-border">
                    <div className="flex items-center gap-2 sm:gap-4">
                        <Button 
                            variant="ghost" 
                            onClick={onReturn} 
                            size="sm"
                            className="text-foreground hover:bg-muted px-2 sm:px-3"
                        >
                            <ArrowLeft className="h-4 w-4" /> 
                            <span className="font-medium hidden sm:inline ml-2">New Search</span>
                        </Button>
                        
                        {currentItinerary && (
                            <div className="h-6 w-px bg-border" />
                        )}
                        
                        {currentItinerary && (
                            <span className="text-sm text-muted-foreground">
                                {currentItinerary.title || 'Your Itinerary'}
                            </span>
                        )}
                    </div>
                    
                    {/* Action Buttons - Always visible when there's an itinerary */}
                    <div className="flex items-center gap-2">
                        {currentItinerary && (
                            <>
                                <Button
                                    onClick={() => setShowShortcuts(true)}
                                    variant="ghost"
                                    size="sm"
                                    className="gap-2 text-muted-foreground hover:text-foreground hover:bg-muted"
                                >
                                    <Info className="h-4 w-4" />
                                    <span className="hidden lg:inline text-sm">Shortcuts</span>
                                </Button>
                                
                                {/* Desktop map toggle */}
                                <Button
                                    onClick={() => setShowMapPanel(!showMapPanel)}
                                    variant={showMapPanel ? "default" : "outline"}
                                    size="sm"
                                    className={cn(
                                        "hidden md:flex gap-1 sm:gap-2 font-medium px-2 sm:px-3",
                                        showMapPanel 
                                            ? "bg-orange-500 hover:bg-orange-600 text-white border-orange-500" 
                                            : "bg-background hover:bg-muted text-foreground border-border"
                                    )}
                                >
                                    <MapIcon className="h-4 w-4" />
                                    <span className="text-xs sm:text-sm">{showMapPanel ? 'Hide' : 'Show'}</span>
                                </Button>
                                
                                {/* Mobile map button - opens modal */}
                                <Button
                                    onClick={() => setShowMobileMapModal(true)}
                                    variant="outline"
                                    size="sm"
                                    className="md:hidden gap-1 font-medium px-2 bg-orange-500 hover:bg-orange-600 text-white border-orange-500"
                                >
                                    <MapIcon className="h-4 w-4" />
                                    <span className="text-xs">Map</span>
                                </Button>
                            </>
                        )}
                    </div>
                </div>
                
                {/* Mobile Tab Navigation - Optimized height */}
                <div className="md:hidden bg-background/95 backdrop-blur-sm border-b border-border sticky top-0 z-10">
                    <div className="flex p-2 gap-2">
                        
                        <motion.button
                            onClick={() => setMobileActiveTab('chat')}
                            className="flex-1 relative"
                            whileTap={{ scale: 0.98 }}
                        >
                            {mobileActiveTab === 'chat' && (
                                <motion.div
                                    layoutId="activePill"
                                    className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg"
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                />
                            )}
                            <div className={`relative flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg transition-colors ${
                                mobileActiveTab === 'chat'
                                    ? 'text-foreground font-semibold'
                                    : 'text-muted-foreground'
                            }`}>
                                <MessageSquare className="h-4 w-4" />
                                <span className="text-xs">Chat</span>
                                <AnimatePresence>
                                    {messages.length > 0 && (
                                        <motion.span 
                                            className="ml-0.5 text-[10px] bg-blue-500 text-white px-1.5 py-0.5 rounded-full min-w-[16px] h-[16px] flex items-center justify-center"
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0, opacity: 0 }}
                                            transition={{ type: "spring", stiffness: 400 }}
                                        >
                                            {messages.length}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.button>
                        
                        <motion.button
                            onClick={() => {
                                setMobileActiveTab('itinerary');
                                // Immediately scroll to top when clicking itinerary
                                setTimeout(() => {
                                    if (itineraryContainerRef.current) {
                                        itineraryContainerRef.current.scrollTop = 0;
                                    }
                                }, 0);
                            }}
                            className="flex-1 relative"
                            whileTap={{ scale: 0.98 }}
                        >
                            {mobileActiveTab === 'itinerary' && (
                                <motion.div
                                    layoutId="activePill"
                                    className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg"
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                />
                            )}
                            <div className={`relative flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg transition-colors ${
                                mobileActiveTab === 'itinerary'
                                    ? 'text-foreground font-semibold'
                                    : 'text-muted-foreground'
                            }`}>
                                <MapIcon className="h-4 w-4" />
                                <span className="text-xs">Itinerary</span>
                                <AnimatePresence>
                                    {currentItinerary && (
                                        <motion.div 
                                            className="ml-0.5 h-2 w-2 bg-emerald-500 rounded-full shadow-lg"
                                            initial={{ scale: 0, opacity: 0 }}
                                            animate={{ 
                                                scale: 1, 
                                                opacity: 1,
                                                boxShadow: [
                                                    "0 0 0 0 rgba(16, 185, 129, 0.7)",
                                                    "0 0 0 10px rgba(16, 185, 129, 0)",
                                                    "0 0 0 0 rgba(16, 185, 129, 0)"
                                                ]
                                            }}
                                            exit={{ scale: 0, opacity: 0 }}
                                            transition={{ 
                                                scale: { type: "spring", stiffness: 400 },
                                                boxShadow: { duration: 2, repeat: Infinity }
                                            }}
                                        />
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.button>
                    </div>
                    
                    {/* Swipe hint - Only show initially */}
                    {messages.length === 0 && (
                        <motion.div 
                            className="flex items-center justify-center py-0.5 text-xs text-muted-foreground"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 0.5 }}
                            transition={{ delay: 1 }}
                        >
                            <span className="text-[9px]">Swipe to switch • Tap for quick nav</span>
                        </motion.div>
                    )}
                </div>
                
                {/* Desktop Layout - Proportional panels */}
                <div className="hidden md:flex gap-0 flex-1 min-h-0 overflow-hidden">
                    {/* Desktop Chat Panel - 20% width */}
                    <div className="w-[20%] min-w-[280px] border-r border-border flex flex-col overflow-hidden">
                        <ChatPanel
                            messages={messages}
                            inputValue={userInput}
                            onInputChange={setUserInput}
                            onSendMessage={handleUserInputSubmit}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleUserInputSubmit(e as any);
                                }
                            }}
                            isGenerating={isGenerating}
                        />
                    </div>
                    
                    {/* Desktop Itinerary Panel - Flexible width */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {currentItinerary ? (
                            <ItineraryPanel 
                                itinerary={currentItinerary}
                                onRefine={(feedback) => handleRefine(feedback, messages)}
                                isRefining={isGenerating}
                                showMapToggle={false} // Hide internal map toggle when using panel
                            />
                        ) : (
                            isGenerating ? <ModernLoadingPanel progress={generationProgress} /> : (
                                <div className="h-full flex items-center justify-center bg-background">
                                    <div className="text-center p-8">
                                        <svg className="w-16 h-16 mx-auto mb-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <p className="text-muted-foreground text-sm">Your itinerary will appear here</p>
                                        <p className="text-muted-foreground text-xs mt-2">Start chatting to create your travel plan</p>
                                    </div>
                                </div>
                            )
                        )}
                    </div>
                    
                    {/* Desktop Map Panel - 30% width */}
                    {showMapPanel && currentItinerary && (
                        <div className="w-[30%] min-w-[400px] border-l border-border overflow-hidden">
                            <MapPanel 
                                itinerary={currentItinerary}
                            />
                        </div>
                    )}
                </div>
                
                {/* Mobile Layout - Fixed height to fit viewport with swipe support */}
                <div 
                    className="md:hidden flex-1 min-h-0 overflow-hidden relative"
                    {...swipeHandlers}
                >
                    <AnimatePresence mode="wait">
                        {mobileActiveTab === 'chat' ? (
                            <motion.div 
                                key="chat"
                                className="absolute inset-0 flex flex-col"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2, ease: "easeInOut" }}
                            >
                                <ChatPanel
                                    messages={messages}
                                    inputValue={userInput}
                                    onInputChange={setUserInput}
                                    onSendMessage={handleUserInputSubmit}
                                    onKeyPress={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleUserInputSubmit(e as any);
                                        }
                                    }}
                                    isGenerating={isGenerating}
                                />
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="itinerary"
                                ref={itineraryContainerRef}
                                className="absolute inset-0 overflow-y-auto overflow-x-hidden"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.2, ease: "easeInOut" }}
                                onAnimationComplete={() => {
                                    if (itineraryContainerRef.current) {
                                        itineraryContainerRef.current.scrollTop = 0;
                                    }
                                }}
                            >
                                {currentItinerary ? (
                                    <ItineraryPanel 
                                        itinerary={currentItinerary}
                                        onRefine={(feedback) => handleRefine(feedback, messages)}
                                        isRefining={isGenerating}
                                        showMapToggle={false} // Hide map toggle on mobile since we have it in top nav
                                    />
                                ) : (
                                    isGenerating ? <ModernLoadingPanel progress={generationProgress} /> : (
                                        <div className="h-full flex items-center justify-center bg-background">
                                            <div className="text-center p-8">
                                                <motion.svg 
                                                    className="w-16 h-16 mx-auto mb-4 text-muted-foreground" 
                                                    fill="none" 
                                                    stroke="currentColor" 
                                                    viewBox="0 0 24 24"
                                                    animate={{ rotate: [0, 5, 0, -5, 0] }}
                                                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </motion.svg>
                                                <p className="text-muted-foreground text-sm">Your itinerary will appear here</p>
                                                <p className="text-muted-foreground text-xs mt-2">Start chatting to create your travel plan</p>
                                            </div>
                                        </div>
                                    )
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Keyboard Shortcuts Modal */}
                <AnimatePresence>
                    {showShortcuts && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                            onClick={() => setShowShortcuts(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-card rounded-xl p-6 max-w-md w-full shadow-2xl border border-border"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <h2 className="text-xl font-semibold text-white mb-4">Keyboard Shortcuts</h2>
                                <div className="space-y-2">
                                    {[
                                        { keys: ['Ctrl', 'N'], description: 'New search' },
                                        { keys: ['Ctrl', 'M'], description: 'Toggle map' },
                                        { keys: ['Ctrl', 'E'], description: 'Export PDF' },
                                        { keys: ['/'], description: 'Focus chat' },
                                        { keys: ['Ctrl', 'Enter'], description: 'Send message' },
                                        { keys: ['Shift', '?'], description: 'Show shortcuts' },
                                        { keys: ['Esc'], description: 'Close dialogs' },
                                        { keys: ['←', '→'], description: 'Navigate days' }
                                    ].map((shortcut, index) => (
                                        <div key={index} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                                            <span className="text-slate-300 text-sm">{shortcut.description}</span>
                                            <div className="flex gap-1">
                                                {shortcut.keys.map((key, i) => (
                                                    <kbd
                                                        key={i}
                                                        className="px-2 py-1 bg-slate-700 text-slate-200 rounded text-xs font-mono border border-slate-600"
                                                    >
                                                        {key}
                                                    </kbd>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => setShowShortcuts(false)}
                                    className="mt-4 w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors text-sm"
                                >
                                    Close
                                </button>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>
                
                {/* Mobile Map Modal */}
                <MobileMapModal
                    isOpen={showMobileMapModal}
                    onClose={() => setShowMobileMapModal(false)}
                    itinerary={currentItinerary!}
                />
            </main>
        </>
    );
}
