/**
 * View renderer component - handles rendering different views with animations
 */

'use client';

import dynamic from 'next/dynamic';
import { useMotion } from '@/infrastructure/providers/motion';
import type { FormValues } from '@/components/home/TripPlanningForm';
export type View = 'auth' | 'start' | 'chat';

export interface ChatState {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  isCompleted: boolean;
  itinerary?: any;
}

export interface TripContext {
  mode: 'create' | 'view' | 'edit' | 'continue';
  tripId?: string;
  isModified: boolean;
}

// Lazy load heavy components
const StartItinerary = dynamic(() => import('@/pages/home/HomePage'), {
  loading: () => (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  ),
});

const ChatDisplay = dynamic(() => import('@/pages/itinerary/ItineraryPage'), {
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading chat...</p>
      </div>
    </div>
  ),
  ssr: false, // Disable SSR for chat component
});

interface ViewRendererProps {
  currentView: View;
  initialPrompt: FormValues | null;
  savedChatState?: ChatState;
  currentSearchId?: string;
  tripContext?: TripContext;
  onItineraryRequest: (values: FormValues, chatState?: ChatState, searchId?: string) => void;
  onChatError: (error: string) => void;
  onReturn: () => void;
}

export function ViewRenderer({
  currentView,
  initialPrompt,
  savedChatState,
  currentSearchId,
  tripContext,
  onItineraryRequest,
  onChatError,
  onReturn
}: ViewRendererProps) {
  const { motion, AnimatePresence, isLoaded } = useMotion();

  const renderMainContent = () => {
    const MotionDiv = isLoaded && motion ? motion.div : 'div';

    switch (currentView) {
      case 'chat':
        return (
          <MotionDiv
            key="chat"
            className="h-screen md:min-h-screen md:pt-16 overflow-hidden"
            {...(isLoaded ? {
              initial: { opacity: 0, x: 20 },
              animate: { opacity: 1, x: 0 },
              exit: { opacity: 0, x: -20 },
              transition: { duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }
            } : {})}
          >
            <ChatDisplay
              initialPrompt={initialPrompt!}
              savedChatState={savedChatState}
              searchId={currentSearchId}
              onError={onChatError}
              onReturn={onReturn}
              tripContext={tripContext}
            />
          </MotionDiv>
        );

      case 'start':
      default:
        return (
          <MotionDiv
            key="start"
            className="min-h-screen pt-12 md:pt-16 overflow-hidden flex items-center justify-center bg-background"
            {...(isLoaded ? {
              initial: { opacity: 0, scale: 0.95 },
              animate: { opacity: 1, scale: 1 },
              exit: { opacity: 0, scale: 1.05 },
              transition: { duration: 0.4, ease: [0.4, 0.0, 0.2, 1] }
            } : {})}
          >
            <StartItinerary onItineraryRequest={onItineraryRequest}/>
          </MotionDiv>
        );
    }
  };

  if (isLoaded && AnimatePresence) {
    return (
      <AnimatePresence mode="wait">
        {renderMainContent()}
      </AnimatePresence>
    );
  }

  return renderMainContent();
}