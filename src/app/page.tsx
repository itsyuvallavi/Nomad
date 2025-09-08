
'use client';

import { useState, useEffect } from 'react';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/schemas';
import StartItinerary from '@/components/start-itinerary';
import type { FormValues } from '@/components/itinerary-form';
import ChatDisplay from '@/components/chat-display';
import { AuthForm } from '@/components/auth-form';

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
  const [currentView, setCurrentView] = useState<View>('auth');
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
          <ChatDisplay
            initialPrompt={initialPrompt!}
            savedChatState={savedChatState}
            searchId={currentSearchId}
            onError={handleChatError}
            onReturn={handleReturnToStart}
          />
        );
      case 'start':
        return (
          <StartItinerary onItineraryRequest={handleItineraryRequest}/>
        );
      case 'auth':
      default:
        return (
            <div className="flex items-center justify-center min-h-full p-6">
                <AuthForm onLogin={handleLogin} onSignUp={handleSignUp} />
            </div>
        );
    }
  }

  return (
    <div className="h-screen overflow-hidden">
        {renderMainContent()}
    </div>
  );
}
