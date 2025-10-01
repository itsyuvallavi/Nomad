/**
 * SIMPLIFIED HOME PAGE - Reduced from 243 lines to under 150 lines
 * All logic extracted to reusable components and hooks
 */

'use client';

import { useState } from 'react';
import { useAuth } from '@/infrastructure/contexts/AuthContext';
import { Header } from '@/components/navigation/Header';
import { ViewRenderer } from '@/components/home/ViewRenderer';
import { useTripLoader } from '@/components/home/hooks/use-trip-loader';
import type { FormValues } from '@/components/home/TripPlanningForm';
import type { GeneratePersonalizedItineraryOutput } from '@/services/ai/types/core.types';

// Type definitions
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
  const { user } = useAuth();

  // State management
  const [currentView, setCurrentView] = useState<View>('start');
  const [error, setError] = useState<string | null>(null);
  const [initialPrompt, setInitialPrompt] = useState<FormValues | null>(null);
  const [savedChatState, setSavedChatState] = useState<ChatState | undefined>(undefined);
  const [currentSearchId, setCurrentSearchId] = useState<string | undefined>(undefined);
  const [tripContext, setTripContext] = useState<TripContext | undefined>(undefined);

  // Use trip loader hook for URL params and localStorage handling
  useTripLoader({
    user,
    setCurrentView,
    setInitialPrompt,
    setSavedChatState,
    setCurrentSearchId,
    setTripContext
  });

  // View handlers
  const handleLogin = () => setCurrentView('start');
  const handleSignUp = () => setCurrentView('start');

  const handleItineraryRequest = (values: FormValues, chatState?: ChatState, searchId?: string) => {
    setInitialPrompt(values);
    setSavedChatState(chatState);
    setCurrentSearchId(searchId);
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

  return (
    <>
      {/* Header logic - show on start page, conditional on chat page */}
      {currentView === 'start' && <Header />}
      {currentView !== 'start' && (
        <div className="hidden md:block">
          <Header />
        </div>
      )}

      {/* Main content rendered through ViewRenderer component */}
      <ViewRenderer
        currentView={currentView}
        initialPrompt={initialPrompt}
        savedChatState={savedChatState}
        currentSearchId={currentSearchId}
        tripContext={tripContext}
        onItineraryRequest={handleItineraryRequest}
        onChatError={handleChatError}
        onReturn={handleReturnToStart}
      />
    </>
  );
}