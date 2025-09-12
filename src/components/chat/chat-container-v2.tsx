'use client';

import { useEffect, useRef, useCallback, memo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowLeft, Map, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import type { FormValues } from '@/components/forms/trip-details-form';

// Hooks
import { useChatState, type ChatState } from './hooks/use-chat-state';
import { useChatStorage } from './hooks/use-chat-storage';
import { useSwipeGestures } from '@/lib/animations';

// Components
import MessageList from './message-list';
import ChatInput from './chat-input';
import GenerationProgress from './generation-progress';

// Services
import { aiService } from './services/ai-service';

// Lazy load heavy components
const ItineraryPanel = dynamic(() => import('./itinerary-panel'), {
  loading: () => <div className="animate-pulse bg-muted h-full" />
});

const MapPanel = dynamic(() => import('./map-panel'), {
  loading: () => <div className="animate-pulse bg-muted h-full" />
});

const MobileBottomNav = dynamic(() => import('@/components/navigation/mobile-bottom-nav'), {
  ssr: false
});

interface ChatDisplayProps {
  initialPrompt: FormValues;
  savedChatState?: ChatState;
  searchId?: string;
  onError?: (error: string) => void;
  onReturn?: () => void;
}

export const ChatContainer = memo(function ChatContainer({
  initialPrompt,
  savedChatState,
  searchId,
  onError,
  onReturn
}: ChatDisplayProps) {
  const currentSearchId = useRef(searchId || new Date().toISOString());
  const abortControllerRef = useRef<AbortController | null>(null);

  // State management
  const {
    messages,
    userInput,
    isGenerating,
    currentItinerary,
    errorDialogOpen,
    errorMessage,
    generationProgress,
    setUserInput,
    setIsGenerating,
    setCurrentItinerary,
    setErrorDialogOpen,
    setGenerationProgress,
    addMessage,
    updateLastMessage,
    setError
  } = useChatState(savedChatState);

  // Storage management
  const { saveChatState } = useChatStorage(currentSearchId.current);

  // UI state
  const [mobileActiveTab, setMobileActiveTab] = useState<'chat' | 'itinerary'>('chat');
  const [showMapPanel, setShowMapPanel] = useState(true);
  const [showMobileMapModal, setShowMobileMapModal] = useState(false);

  // Swipe gestures for mobile
  const swipeHandlers = useSwipeGestures({
    onSwipeLeft: () => {
      if (currentItinerary && window.innerWidth < 768) {
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

  // Generate initial itinerary on mount
  useEffect(() => {
    if (!savedChatState && messages.length === 0) {
      generateInitialItinerary();
    }
  }, []);

  // Save state on changes
  useEffect(() => {
    if (messages.length > 0) {
      saveChatState(messages, false, currentItinerary || undefined);
    }
  }, [messages, currentItinerary]);

  const generateInitialItinerary = useCallback(async () => {
    // Add user message
    const userMessage = `${initialPrompt.description}. Duration: ${initialPrompt.duration} days in ${initialPrompt.destination}`;
    addMessage({ role: 'user', content: userMessage });

    setIsGenerating(true);
    abortControllerRef.current = new AbortController();

    try {
      // Add initial assistant message
      addMessage({ 
        role: 'assistant', 
        content: 'I\'ll create a personalized itinerary for you...', 
        isStreaming: true 
      });

      const itinerary = await aiService.generateItinerary(initialPrompt, {
        onProgress: setGenerationProgress,
        signal: abortControllerRef.current.signal
      });

      setCurrentItinerary(itinerary);
      updateLastMessage(`Here's your personalized ${itinerary.days.length}-day itinerary for ${itinerary.destination}!`);
      saveChatState(messages, true, itinerary);
    } catch (error: any) {
      const errorMsg = aiService.formatError(error);
      setError(errorMsg);
      onError?.(errorMsg);
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [initialPrompt, messages]);

  const handleSendMessage = useCallback(async () => {
    if (!userInput.trim() || isGenerating) return;

    const userMessage = userInput.trim();
    setUserInput('');
    addMessage({ role: 'user', content: userMessage });

    if (!currentItinerary) {
      setError('Please generate an itinerary first');
      return;
    }

    setIsGenerating(true);
    abortControllerRef.current = new AbortController();

    try {
      addMessage({ 
        role: 'assistant', 
        content: 'Updating your itinerary...', 
        isStreaming: true 
      });

      const refined = await aiService.refineItinerary(
        currentItinerary,
        userMessage,
        {
          onProgress: setGenerationProgress,
          signal: abortControllerRef.current.signal
        }
      );

      setCurrentItinerary(refined);
      updateLastMessage('I\'ve updated your itinerary based on your feedback!');
      saveChatState(messages, true, refined);
    } catch (error: any) {
      const errorMsg = aiService.formatError(error);
      setError(errorMsg);
      updateLastMessage(`Sorry, I couldn't update the itinerary: ${errorMsg}`);
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [userInput, currentItinerary, isGenerating, messages]);

  const handleCancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsGenerating(false);
    }
  }, []);

  // Render mobile view
  if (typeof window !== 'undefined' && window.innerWidth < 768) {
    return (
      <div className="h-screen flex flex-col bg-background" {...swipeHandlers}>
        {/* Mobile Header */}
        <div className="border-b bg-background/95 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={onReturn}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          {currentItinerary && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowMobileMapModal(true)}
            >
              <Map className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Mobile Content */}
        <div className="flex-1 overflow-hidden">
          {mobileActiveTab === 'chat' ? (
            <div className="h-full flex flex-col">
              <MessageList 
                messages={messages} 
                isGenerating={isGenerating}
                className="flex-1"
              />
              <ChatInput
                value={userInput}
                onChange={setUserInput}
                onSubmit={handleSendMessage}
                isGenerating={isGenerating}
              />
            </div>
          ) : currentItinerary ? (
            <ItineraryPanel itinerary={currentItinerary} />
          ) : null}
        </div>

        {/* Mobile Navigation */}
        {currentItinerary && (
          <MobileBottomNav
            activeTab={mobileActiveTab}
            onTabChange={setMobileActiveTab}
          />
        )}

        {/* Progress Indicator */}
        <GenerationProgress
          progress={generationProgress}
          isVisible={isGenerating}
        />

        {/* Mobile Map Modal */}
        {showMobileMapModal && currentItinerary && (
          <MapPanel
            itinerary={currentItinerary}
            isModal={true}
            onClose={() => setShowMobileMapModal(false)}
          />
        )}
      </div>
    );
  }

  // Render desktop view
  return (
    <div className="h-screen flex bg-background">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Desktop Header */}
        <div className="border-b bg-background/95 backdrop-blur-sm px-6 py-4 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={onReturn}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Search
          </Button>
          <div className="flex gap-2">
            <Button
              variant={showMapPanel ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowMapPanel(!showMapPanel)}
            >
              <Map className="h-4 w-4 mr-2" />
              {showMapPanel ? 'Hide' : 'Show'} Map
            </Button>
          </div>
        </div>

        {/* Chat Messages */}
        <MessageList 
          messages={messages} 
          isGenerating={isGenerating}
          className="flex-1"
        />

        {/* Chat Input */}
        <ChatInput
          value={userInput}
          onChange={setUserInput}
          onSubmit={handleSendMessage}
          isGenerating={isGenerating}
          showClearButton={true}
        />
      </div>

      {/* Side Panels */}
      {currentItinerary && (
        <>
          {/* Itinerary Panel */}
          <div className="w-[400px] border-l flex flex-col bg-card">
            <ItineraryPanel itinerary={currentItinerary} />
          </div>

          {/* Map Panel */}
          {showMapPanel && (
            <div className="w-[500px] border-l">
              <MapPanel itinerary={currentItinerary} />
            </div>
          )}
        </>
      )}

      {/* Progress Indicator */}
      <GenerationProgress
        progress={generationProgress}
        isVisible={isGenerating}
      />

      {/* Error Dialog */}
      {errorDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Alert className="max-w-md">
            <AlertDescription>{errorMessage}</AlertDescription>
            <Button
              size="sm"
              className="mt-4"
              onClick={() => setErrorDialogOpen(false)}
            >
              Dismiss
            </Button>
          </Alert>
        </div>
      )}
    </div>
  );
});

export default ChatContainer;