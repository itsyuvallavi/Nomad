
'use client';

import { useState, useEffect } from 'react';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/schemas';
import StartItinerary from '@/components/forms/trip-search-form';
import type { FormValues } from '@/components/forms/trip-details-form';
import ChatDisplay from '@/components/chat/chat-container';
// import { AuthForm } from '@/components/auth/login-form'; // Not needed - skipping auth

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

export default function Home() {
  const [currentView, setCurrentView] = useState<View>('start'); // Skip auth, go straight to start
  const [error, setError] = useState<string | null>(null);
  const [initialPrompt, setInitialPrompt] = useState<FormValues | null>(null);
  const [savedChatState, setSavedChatState] = useState<ChatState | undefined>(undefined);
  const [currentSearchId, setCurrentSearchId] = useState<string | undefined>(undefined);
  
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
    setCurrentView('chat');
  };
  
  const handleReturnToStart = () => {
    setCurrentView('start');
    setError(null);
    setInitialPrompt(null);
    setSavedChatState(undefined);
    setCurrentSearchId(undefined);
  };
  
  const handleChatError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const renderMainContent = () => {
    switch (currentView) {
      case 'chat':
        return (
          <div className="h-screen overflow-hidden">
            <ChatDisplay
              initialPrompt={initialPrompt!}
              savedChatState={savedChatState}
              searchId={currentSearchId}
              onError={handleChatError}
              onReturn={handleReturnToStart}
            />
          </div>
        );
      case 'start':
        return (
          <div className="h-screen overflow-hidden flex items-center justify-center bg-background">
            <StartItinerary onItineraryRequest={handleItineraryRequest}/>
          </div>
        );
      default:
        // Default to start view if somehow we get here
        return (
          <div className="h-screen overflow-hidden flex items-center justify-center bg-background">
            <StartItinerary onItineraryRequest={handleItineraryRequest}/>
          </div>
        );
    }
  }

  return renderMainContent();
}
