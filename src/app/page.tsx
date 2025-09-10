
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/schemas';
import StartItinerary from '@/components/forms/trip-search-form';
import type { FormValues } from '@/components/forms/trip-details-form';
import ChatDisplay from '@/components/chat/chat-container';
import { fadeInScale } from '@/lib/animations';
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
          <motion.div 
            key="chat"
            className="h-screen overflow-hidden"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3, ease: [0.4, 0.0, 0.2, 1] }}
          >
            <ChatDisplay
              initialPrompt={initialPrompt!}
              savedChatState={savedChatState}
              searchId={currentSearchId}
              onError={handleChatError}
              onReturn={handleReturnToStart}
            />
          </motion.div>
        );
      case 'start':
        return (
          <motion.div 
            key="start"
            className="h-screen overflow-hidden flex items-center justify-center bg-background"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4, ease: [0.4, 0.0, 0.2, 1] }}
          >
            <StartItinerary onItineraryRequest={handleItineraryRequest}/>
          </motion.div>
        );
      default:
        // Default to start view if somehow we get here
        return (
          <motion.div 
            key="default"
            className="h-screen overflow-hidden flex items-center justify-center bg-background"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <StartItinerary onItineraryRequest={handleItineraryRequest}/>
          </motion.div>
        );
    }
  }

  return (
    <AnimatePresence mode="wait">
      {renderMainContent()}
    </AnimatePresence>
  );
}
