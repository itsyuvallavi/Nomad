
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useMotion } from '@/infrastructure/providers/motion';
import type { GeneratePersonalizedItineraryOutput } from '@/services/ai/schemas';
import type { FormValues } from '@/pages/home/components/TripPlanningForm';
import { Header } from '@/components/navigation/Header';
import { tripsService } from '@/services/trips/trips-service';
import { useAuth } from '@/infrastructure/contexts/AuthContext';

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
  ssr: false, // Disable SSR for chat component since it uses client-side features
});

export interface ChatState {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  isCompleted: boolean;
  itinerary?: GeneratePersonalizedItineraryOutput;
}

export interface RecentSearch {
  id: string;
  prompt: string;
  fileDataUrl?: string;
  chatState?: ChatState;
  title?: string;
  lastUpdated: string;
}

export type View = 'auth' | 'start' | 'chat';

export type TripMode = 'create' | 'view' | 'edit' | 'continue';

export interface TripContext {
  mode: TripMode;
  tripId?: string;
  isModified: boolean;
}

export default function Home() {
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<View>('start'); // Skip auth, go straight to start
  const [error, setError] = useState<string | null>(null);
  const [initialPrompt, setInitialPrompt] = useState<FormValues | null>(null);
  const [savedChatState, setSavedChatState] = useState<ChatState | undefined>(undefined);
  const [currentSearchId, setCurrentSearchId] = useState<string | undefined>(undefined);
  const [tripContext, setTripContext] = useState<TripContext | undefined>(undefined);

  // Check URL parameters for trip viewing
  useEffect(() => {
    const tripId = searchParams?.get('tripId');
    const mode = searchParams?.get('mode') as TripMode;
    
    if (tripId && mode) {
      // Load trip from Firestore
      loadTripFromFirestore(tripId, mode);
    } else {
      // Fallback to old localStorage method for backward compatibility
      const viewingTrip = localStorage.getItem('viewingTrip');
      if (viewingTrip) {
        try {
          const tripData = JSON.parse(viewingTrip);
          setInitialPrompt({ prompt: tripData.prompt });
          setSavedChatState(tripData.chatState);
          setCurrentSearchId(tripData.id);
          setTripContext({
            mode: 'view',
            tripId: tripData.id,
            isModified: false
          });
          setCurrentView('chat');
          localStorage.removeItem('viewingTrip'); // Clean up
        } catch (error) {
          console.error('Error loading trip data:', error);
        }
      }
    }
  }, [searchParams]);

  const loadTripFromFirestore = async (tripId: string, mode: TripMode) => {
    if (!user) {
      console.error('User not authenticated');
      return;
    }

    try {
      const trip = await tripsService.getTrip(tripId);
      if (trip && trip.chatState) {
        setInitialPrompt({ prompt: trip.prompt });
        setSavedChatState(trip.chatState);
        setCurrentSearchId(tripId);
        setTripContext({
          mode,
          tripId,
          isModified: false
        });
        setCurrentView('chat');
      }
    } catch (error) {
      console.error('Error loading trip from Firestore:', error);
    }
  };
  
  // This function now just switches the view to the app
  const handleLogin = () => {
    setCurrentView('start');
  };

  // This function also just switches the view to the app
  const handleSignUp = () => {
    setCurrentView('start');
  };

  const handleItineraryRequest = (values: FormValues, chatState?: ChatState, searchId?: string) => {
    setInitialPrompt(values);
    setSavedChatState(chatState);
    setCurrentSearchId(searchId);
    // Set trip context for new trips
    setTripContext({
      mode: 'create',
      tripId: undefined,
      isModified: false
    });
    setCurrentView('chat');
  };
  
  const handleReturnToStart = () => {
    setCurrentView('start');
    setError(null);
    setInitialPrompt(null);
    setSavedChatState(undefined);
    setCurrentSearchId(undefined);
    setTripContext(undefined);
    // Clear URL parameters
    window.history.replaceState({}, '', '/');
  };
  
  const handleChatError = (errorMessage: string) => {
    setError(errorMessage);
  };

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
              onError={handleChatError}
              onReturn={handleReturnToStart}
              tripContext={tripContext}
            />
          </MotionDiv>
        );
      case 'start':
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
            <StartItinerary onItineraryRequest={handleItineraryRequest}/>
          </MotionDiv>
        );
      default:
        // Default to start view if somehow we get here
        return (
          <MotionDiv 
            key="default"
            className="min-h-screen pt-12 md:pt-16 overflow-hidden flex items-center justify-center bg-background"
            {...(isLoaded ? {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              transition: { duration: 0.3 }
            } : {})}
          >
            <StartItinerary onItineraryRequest={handleItineraryRequest}/>
          </MotionDiv>
        );
    }
  }

  return (
    <>
      {/* Only show header on start page, hide on chat/itinerary page on mobile */}
      {currentView === 'start' && <Header />}
      {/* On desktop, always show header */}
      {currentView !== 'start' && (
        <div className="hidden md:block">
          <Header />
        </div>
      )}
      {isLoaded && AnimatePresence ? (
        <AnimatePresence mode="wait">
          {renderMainContent()}
        </AnimatePresence>
      ) : (
        renderMainContent()
      )}
    </>
  );
}
