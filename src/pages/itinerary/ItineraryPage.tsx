'use client';

import { useState, useEffect, useRef } from 'react';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useSwipeGestures } from '@/hooks/use-swipe-gestures';
import { Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// Type imports only - no server-side code
type ConversationalItineraryOutput = {
    type: 'question' | 'confirmation' | 'itinerary' | 'error';
    message: string;
    awaitingInput?: string;
    suggestedOptions?: string[];
    itinerary?: any;
    requiresGeneration?: boolean;
    conversationContext?: string;
};
import type { FormValues } from '@/pages/home/components/TripPlanningForm';
import type { GeneratePersonalizedItineraryOutput } from '@/services/ai/schemas';
import { ArrowLeft, MessageSquare, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RecentSearch, ChatState } from '@/app/page';
import { ChatPanel } from './components/chat/ChatPanel';
import { ItineraryPanel } from './components/itinerary/ItineraryDisplay';
import { cn } from '@/lib/helpers/general';
import { ModernLoadingPanel } from './components/chat/LoadingProgress';
import { ErrorDialog } from '@/components/ui/error-dialog';
import { logger } from '@/lib/monitoring/logger';
import { getDraftManager } from '@/services/trips/draft-manager';
import { retryApiCall } from '@/lib/utils/retry';
import { handleError, ErrorCategory } from '@/lib/monitoring/error-handler';
import { offlineStorage } from '@/services/storage/offline-storage';
import { useAuth } from '@/infrastructure/contexts/AuthContext';
import { tripsService } from '@/services/trips/trips-service';

type Message = {
    role: 'user' | 'assistant';
    content: string;
    messageType?: 'question' | 'answer' | 'confirmation' | 'itinerary' | 'error' | 'initial';
    awaitingInput?: string;
    suggestedOptions?: string[];
};

import type { TripContext } from '@/app/page';

type ChatDisplayProps = {
    initialPrompt: FormValues;
    savedChatState?: ChatState;
    searchId?: string;
    onError: (error: string) => void;
    onReturn: () => void;
    tripContext?: TripContext;
};

type ProgressStage = 'understanding' | 'planning' | 'generating' | 'finalizing';

interface GenerationProgress {
    stage: ProgressStage;
    percentage: number;
    message: string;
    estimatedTimeRemaining?: number;
}

export default function ChatDisplayV2({
    initialPrompt,
    savedChatState,
    searchId,
    onError,
    onReturn,
    tripContext,
}: ChatDisplayProps) {
    const { user } = useAuth();
    const [messages, setMessages] = useState<Message[]>(savedChatState?.messages || []);
    const [userInput, setUserInput] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [currentItinerary, setCurrentItinerary] = useState<GeneratePersonalizedItineraryOutput | null>(savedChatState?.itinerary || null);
    const [firestoreTripId, setFirestoreTripId] = useState<string | null>(tripContext?.tripId || null);
    const [errorDialogOpen, setErrorDialogOpen] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [mobileActiveTab, setMobileActiveTab] = useState<'chat' | 'itinerary'>('chat');
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [generationProgress, setGenerationProgress] = useState<GenerationProgress>({
        stage: 'understanding',
        percentage: 0,
        message: 'Understanding your request...'
    });

    // NEW: Conversation context for maintaining state
    const [conversationContext, setConversationContext] = useState<string | undefined>(undefined);
    const [sessionId] = useState<string>(`session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`);
    const [awaitingInput, setAwaitingInput] = useState<string | undefined>(undefined);

    // Swipe gestures for mobile tab switching
    const swipeHandlers = useSwipeGestures({
        onSwipeLeft: () => {
            if (window.innerWidth < 768 && currentItinerary) {
                setMobileActiveTab('itinerary');
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

    const currentSearchId = useRef(
        tripContext?.tripId || searchId || `trip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    );
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

    // Initialize conversation with initial prompt if provided
    const initializedRef = useRef(false);
    useEffect(() => {
        if (initialPrompt.prompt && messages.length === 0 && !initializedRef.current) {
            initializedRef.current = true;
            // Start the conversation with the initial prompt
            handleUserMessage(initialPrompt.prompt, true);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const saveChatStateToStorage = (isCompleted: boolean = false, itinerary: GeneratePersonalizedItineraryOutput | null = null) => {
        try {
            const chatState: ChatState = {
                messages: messages,
                isCompleted: isCompleted,
                itinerary: (itinerary || currentItinerary) as any
            };

            const searchEntry: RecentSearch = {
                id: currentSearchId.current,
                prompt: initialPrompt.prompt,
                lastUpdated: new Date().toISOString(),
                chatState: chatState
            };

            const existingSearches = localStorage.getItem('recentSearches');
            const recentSearches: RecentSearch[] = existingSearches ? JSON.parse(existingSearches) : [];

            const existingIndex = recentSearches.findIndex(s => s.id === currentSearchId.current);
            if (existingIndex >= 0) {
                recentSearches[existingIndex] = searchEntry;
            } else {
                recentSearches.unshift(searchEntry);
            }

            localStorage.setItem('recentSearches', JSON.stringify(recentSearches.slice(0, 5)));

            // Save to Firestore if user is authenticated
            if (user && firestoreTripId) {
                tripsService.updateTrip(firestoreTripId, {
                    chatState,
                    itinerary: (itinerary || currentItinerary) as any,
                    status: isCompleted ? 'confirmed' : 'draft'
                }).catch(error => {
                    console.error('Error saving to Firestore:', error);
                });
            }
        } catch (e) {
            logger.error('SYSTEM', 'Could not save chat state', e);
        }
    };

    /**
     * Handle user messages in the conversational flow
     * This is the main difference from V1 - we process messages through conversation controller
     */
    const handleUserMessage = async (message: string, isInitial: boolean = false) => {
        const thisGenerationId = `gen-${Date.now()}-${Math.random()}`;

        // Prevent duplicate calls
        if (generationIdRef.current && !isInitial) {
            console.warn('🚫 Skipping duplicate call, generation already in progress');
            return;
        }
        generationIdRef.current = thisGenerationId;

        console.group(`💬 Processing User Message [${thisGenerationId.substring(0, 10)}...]`);
        console.log('📝 Message:', message);
        console.log('🆔 Session ID:', sessionId);
        console.log('📊 Has Context:', !!conversationContext);
        console.groupEnd();

        // Add user message to chat (always show what the user typed)
        setMessages(prev => [...prev, {
            role: 'user',
            content: message,
            messageType: isInitial ? 'initial' : 'answer'
        }]);

        setIsGenerating(true);
        generationStartTime.current = Date.now();

        // Update progress for questions vs generation
        if (awaitingInput && awaitingInput !== 'confirmation') {
            setGenerationProgress({
                stage: 'understanding',
                percentage: 50,
                message: 'Processing your response...',
                estimatedTimeRemaining: 2
            });
        } else {
            setGenerationProgress({
                stage: 'understanding',
                percentage: 10,
                message: 'Understanding your request...',
                estimatedTimeRemaining: 15
            });
        }

        try {
            // Call the conversational API endpoint
            const response: ConversationalItineraryOutput = await retryApiCall(
                async () => {
                    const res = await fetch('/api/ai', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            prompt: message,
                            attachedFile: initialPrompt.fileDataUrl,
                            conversationContext: conversationContext,
                            sessionId: sessionId
                        })
                    });

                    if (!res.ok) {
                        const error = await res.json();
                        throw new Error(error.error || 'Failed to generate itinerary');
                    }

                    const result = await res.json();
                    return result.data;
                },
                'generateItineraryV2API',
                {
                    maxAttempts: 2,
                    onRetry: (attempt) => {
                        logger.info('AI', `Retrying conversation (attempt ${attempt})`);
                    }
                }
            );

            console.log('🤖 AI Response:', {
                type: response.type,
                hasItinerary: !!response.itinerary,
                awaitingInput: response.awaitingInput
            });

            // Update conversation context
            if (response.conversationContext) {
                setConversationContext(response.conversationContext);
            }

            // Handle different response types
            switch (response.type) {
                case 'question':
                    // AI is asking for more information
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: response.message,
                        messageType: 'question',
                        awaitingInput: response.awaitingInput,
                        suggestedOptions: response.suggestedOptions
                    }]);
                    setAwaitingInput(response.awaitingInput);

                    // Clear progress for questions
                    setGenerationProgress({
                        stage: 'understanding',
                        percentage: 100,
                        message: 'Waiting for your response...',
                        estimatedTimeRemaining: 0
                    });
                    break;

                case 'confirmation':
                    // AI is asking for confirmation before generating
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
                    // AI has generated or is showing an itinerary
                    if (response.requiresGeneration) {
                        // Show generating message
                        setMessages(prev => [...prev, {
                            role: 'assistant',
                            content: response.message || "Creating your personalized itinerary...",
                            messageType: 'itinerary'
                        }]);

                        // Simulate generation progress
                        const progressInterval = setInterval(() => {
                            setGenerationProgress(prev => {
                                if (prev.percentage >= 95) {
                                    clearInterval(progressInterval);
                                    return prev;
                                }
                                return {
                                    ...prev,
                                    percentage: Math.min(95, prev.percentage + 10),
                                    stage: prev.percentage < 50 ? 'planning' : 'generating'
                                };
                            });
                        }, 500);
                    }

                    if (response.itinerary) {
                        // Complete progress
                        setGenerationProgress({
                            stage: 'finalizing',
                            percentage: 100,
                            message: 'Your itinerary is ready!',
                            estimatedTimeRemaining: 0
                        });

                        setCurrentItinerary(response.itinerary);
                        setAwaitingInput(undefined);

                        // Add success message
                        setMessages(prev => [...prev, {
                            role: 'assistant',
                            content: "✨ Your personalized itinerary is ready! You can see it on the right. Would you like to make any changes?",
                            messageType: 'itinerary'
                        }]);

                        // Save state
                        saveChatStateToStorage(true, response.itinerary);

                        // Cache for offline
                        await offlineStorage.cacheItinerary(response.itinerary.destination, response.itinerary);

                        // Switch to itinerary view on mobile
                        if (window.innerWidth < 768) {
                            setMobileActiveTab('itinerary');
                        }
                    }
                    break;

                case 'error':
                    // Handle errors gracefully
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
            logger.error('AI', 'Conversation failed', error);

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "I'm having trouble understanding. Could you please rephrase your request?",
                messageType: 'error'
            }]);

            setErrorMessage(error.message || 'Something went wrong. Please try again.');
            setErrorDialogOpen(true);

        } finally {
            setIsGenerating(false);
            generationIdRef.current = null;
        }
    };

    const handleSendMessage = async () => {
        if (!userInput.trim() || isGenerating) return;

        const message = userInput.trim();
        setUserInput('');

        await handleUserMessage(message);
    };

    // Note: Refinement is now handled through the conversational flow
    // The _handleRefineItinerary function was deprecated in favor of
    // sending feedback through the main chat interface

    // Keyboard shortcuts
    useKeyboardShortcuts([
        { key: 'i', action: () => window.innerWidth < 768 && setMobileActiveTab('itinerary') },
        { key: 'c', action: () => window.innerWidth < 768 && setMobileActiveTab('chat') },
        { key: '?', action: () => setShowShortcuts(prev => !prev) },
    ]);

    return (
        <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                <Button
                    onClick={onReturn}
                    variant="ghost"
                    size="sm"
                    className="gap-2"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                </Button>

                {/* Mobile Tab Switcher */}
                <div className="flex md:hidden gap-2">
                    <Button
                        variant={mobileActiveTab === 'chat' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setMobileActiveTab('chat')}
                        className="gap-2"
                    >
                        <MessageSquare className="w-4 h-4" />
                        Chat
                    </Button>
                    {currentItinerary && (
                        <Button
                            variant={mobileActiveTab === 'itinerary' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setMobileActiveTab('itinerary')}
                            className="gap-2"
                        >
                            <Layers className="w-4 h-4" />
                            Itinerary
                        </Button>
                    )}
                </div>

                {/* Desktop Shortcuts Button */}
                <div className="hidden md:flex gap-2">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowShortcuts(prev => !prev)}
                        className="gap-1"
                    >
                        <Info className="w-4 h-4" />
                        <span className="hidden sm:inline">Shortcuts</span>
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden" {...swipeHandlers}>
                {/* Mobile View */}
                <div className="flex md:hidden w-full">
                    <AnimatePresence mode="wait">
                        {mobileActiveTab === 'chat' ? (
                            <motion.div
                                key="chat"
                                initial={{ x: -100, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -100, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="w-full"
                            >
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
                            </motion.div>
                        ) : (
                            <motion.div
                                key="itinerary"
                                initial={{ x: 100, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: 100, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="w-full"
                                ref={itineraryContainerRef}
                            >
                                {currentItinerary && (
                                    <ItineraryPanel
                                        itinerary={currentItinerary}
                                    />
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Desktop View */}
                <div className="hidden md:flex w-full gap-4 p-4">
                    {/* Chat Panel */}
                    <div className="w-1/2">
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

                    {/* Itinerary Panel */}
                    {currentItinerary ? (
                        <div className="w-1/2">
                            <ItineraryPanel
                                itinerary={currentItinerary}
                            />
                        </div>
                    ) : (
                        <div className="w-1/2">
                            <ModernLoadingPanel
                                progress={generationProgress}
                            />
                        </div>
                    )}

                </div>
            </div>


            {/* Error Dialog */}
            <ErrorDialog
                open={errorDialogOpen}
                onClose={() => setErrorDialogOpen(false)}
                title="Generation Error"
                message={errorMessage}
            />

            {/* Shortcuts Help */}
            <AnimatePresence>
                {showShortcuts && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 z-50"
                    >
                        <h3 className="font-semibold mb-2">Keyboard Shortcuts</h3>
                        <div className="space-y-1 text-sm">
                            <div><kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">I</kbd> Show Itinerary</div>
                            <div><kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">C</kbd> Show Chat</div>
                            <div><kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">?</kbd> Toggle Help</div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}