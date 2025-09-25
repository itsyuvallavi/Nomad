/**
 * SIMPLIFIED VERSION - Reduced from 863 lines to under 200 lines!
 * All logic extracted to reusable components and hooks
 */

'use client';

import { useState, useEffect, useRef } from 'react';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { useSwipeGestures } from '@/hooks/use-swipe-gestures';
import type { FormValues } from '@/components/home/TripPlanningForm';
import type { GeneratePersonalizedItineraryOutput } from '@/services/ai/types/core.types';
import type { ChatState, TripContext } from '@/app/page';
import { ErrorDialog } from '@/components/ui/error-dialog';

// Layout components
import { Header } from '@/components/itinerary-components/layout/Header';
import { MobileView } from '@/components/itinerary-components/layout/MobileView';
import { DesktopView } from '@/components/itinerary-components/layout/DesktopView';
import { ShortcutsModal } from '@/components/itinerary-components/layout/ShortcutsModal';

// Hooks
import { useMessageHandler } from '@/components/itinerary-components/hooks/use-message-handler';

// Conditional auth import for SSR
let useAuth: any;
if (typeof window !== 'undefined') {
    const authModule = require('@/infrastructure/contexts/AuthContext');
    useAuth = authModule.useAuth;
} else {
    useAuth = () => ({ user: null });
}

type ChatDisplayProps = {
    initialPrompt: FormValues;
    savedChatState?: ChatState;
    searchId?: string;
    onError: (error: string) => void;
    onReturn: () => void;
    tripContext?: TripContext;
};

export default function ChatDisplayV2({
    initialPrompt,
    savedChatState,
    searchId,
    onReturn,
    tripContext,
}: ChatDisplayProps) {
    const { user } = useAuth();

    // UI State
    const [userInput, setUserInput] = useState('');
    const [currentItinerary, setCurrentItinerary] = useState<GeneratePersonalizedItineraryOutput | null>(
        savedChatState?.itinerary || null
    );
    const [mobileActiveTab, setMobileActiveTab] = useState<'chat' | 'itinerary'>('chat');
    const [showShortcuts, setShowShortcuts] = useState(false);
    const [generationProgress, setGenerationProgress] = useState({
        stage: 'understanding',
        percentage: 0,
        message: 'Understanding your request...',
        estimatedTimeRemaining: 30
    });
    const [partialItinerary, setPartialItinerary] = useState<any>(null);
    const [generationMetadata, setGenerationMetadata] = useState<any>(null);

    // Session management
    const [conversationContext, setConversationContext] = useState<string | undefined>(() => {
        if (typeof window !== 'undefined' && searchId) {
            const storedContext = localStorage.getItem(`conversation-context-${searchId}`);
            return storedContext || undefined;
        }
        return undefined;
    });

    const [sessionId] = useState<string>(() => {
        if (typeof window !== 'undefined' && searchId) {
            const storedSessionId = localStorage.getItem(`session-id-${searchId}`);
            return storedSessionId || `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
        }
        return `session-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    });

    const firestoreTripId = tripContext?.tripId || null;
    const currentSearchId = useRef(
        tripContext?.tripId || searchId || `trip-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`
    );
    const hasStartedRef = useRef(false);

    // Use message handler hook for all message logic
    const {
        messages,
        isGenerating,
        errorMessage,
        errorDialogOpen,
        setErrorDialogOpen,
        handleUserMessage,
        saveChatStateToStorage
    } = useMessageHandler({
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
        setGenerationMetadata
    });

    // Swipe gestures
    const swipeHandlers = useSwipeGestures({
        onSwipeLeft: () => {
            if (window.innerWidth < 768 && currentItinerary) {
                setMobileActiveTab('itinerary');
            }
        },
        onSwipeRight: () => {
            if (window.innerWidth < 768) {
                setMobileActiveTab('chat');
            }
        },
        threshold: 50
    });

    // Keyboard shortcuts
    useKeyboardShortcuts([
        { key: 'i', action: () => window.innerWidth < 768 && setMobileActiveTab('itinerary') },
        { key: 'c', action: () => window.innerWidth < 768 && setMobileActiveTab('chat') },
        { key: '?', action: () => setShowShortcuts(prev => !prev) },
    ]);

    // Handle sending messages
    const handleSendMessage = async () => {
        if (!userInput.trim() || isGenerating) return;
        const message = userInput.trim();
        setUserInput('');
        await handleUserMessage(message);
    };

    // Initialize on mount
    useEffect(() => {
        if (hasStartedRef.current) return;
        hasStartedRef.current = true;

        if (!savedChatState) {
            // Always use the prompt field since that's what the form provides
            const initialMessage = initialPrompt.prompt;
            console.log('📝 Message:', initialMessage);
            console.log('🆔 Session ID:', sessionId);
            console.log('📊 Has Context:', !!conversationContext);
            if (initialMessage) {
                handleUserMessage(initialMessage, true);
            }
        }
    }, []);

    // Save state periodically
    useEffect(() => {
        if (currentItinerary || messages.length > 0) {
            saveChatStateToStorage(false, currentItinerary, initialPrompt, user, firestoreTripId);
        }
    }, [currentItinerary, messages.length]);

    return (
        <div className="flex flex-col h-full bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
            <Header
                onReturn={onReturn}
                mobileActiveTab={mobileActiveTab}
                setMobileActiveTab={setMobileActiveTab}
                currentItinerary={currentItinerary}
                showShortcuts={showShortcuts}
                setShowShortcuts={setShowShortcuts}
            />

            <div className="flex-1 flex overflow-hidden">
                <MobileView
                    mobileActiveTab={mobileActiveTab}
                    messages={messages}
                    userInput={userInput}
                    setUserInput={setUserInput}
                    handleSendMessage={handleSendMessage}
                    isGenerating={isGenerating}
                    currentItinerary={currentItinerary}
                    swipeHandlers={swipeHandlers}
                />

                <DesktopView
                    messages={messages}
                    userInput={userInput}
                    setUserInput={setUserInput}
                    handleSendMessage={handleSendMessage}
                    isGenerating={isGenerating}
                    currentItinerary={currentItinerary}
                    generationProgress={generationProgress}
                />
            </div>

            <ErrorDialog
                open={errorDialogOpen}
                onClose={() => setErrorDialogOpen(false)}
                title="Generation Error"
                message={errorMessage}
            />

            <ShortcutsModal show={showShortcuts} />
        </div>
    );
}