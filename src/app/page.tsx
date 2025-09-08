
'use client';

import { useState, useEffect } from 'react';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/schemas';
import { Settings, LogOut } from 'lucide-react';
import { useUser } from '@auth0/nextjs-auth0/client';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import StartItinerary from '@/components/start-itinerary';
import type { FormValues } from '@/components/itinerary-form';
import ChatDisplay from '@/components/chat-display';
import { Button } from '@/components/ui/button';
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

export type View = 'start' | 'chat' | 'auth';

export default function Home() {
  const { user, error: authError, isLoading: isAuthLoading } = useUser();
  const [currentView, setCurrentView] = useState<View>('start');
  const [error, setError] = useState<string | null>(null);
  const [initialPrompt, setInitialPrompt] = useState<FormValues | null>(null);
  const [savedChatState, setSavedChatState] = useState<ChatState | undefined>(undefined);
  const [currentSearchId, setCurrentSearchId] = useState<string | undefined>(undefined);
  
  // Log only once on component mount
  useEffect(() => {
    console.log('Nomad Navigator loaded');
    console.log('Browser console working - logs will appear here during itinerary generation');
  }, []);

  const handleLogin = () => {
    window.location.href = '/api/auth/login';
  };

  const handleSignUp = () => {
    window.location.href = '/api/auth/login?screen_hint=signup';
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
    if (isAuthLoading) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-slate-600 border-t-white rounded-full animate-spin"></div>
        </div>
      );
    }
    
    if (authError) {
      return (
        <div className="flex-1 flex items-center justify-center text-red-400">
          Error: {authError.message}
        </div>
      )
    }
    
    if (!user) {
      return <AuthForm onLogin={handleLogin} onSignUp={handleSignUp} />;
    }

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
      default:
        return (
          <StartItinerary onItineraryRequest={handleItineraryRequest}/>
        );
    }
  }


  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between p-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center animate-float">
            <div className="w-4 h-4 bg-slate-800 rounded-sm animate-rotate-and-breathe"></div>
          </div>
          <span className="text-white font-medium">Nomad Navigator</span>
        </div>
        
        {user && (
           <div className="flex items-center gap-4">
            <a href="/api/auth/logout" className="text-slate-400 hover:text-white transition-colors">
              <LogOut size={20} />
            </a>
            <Sheet>
              <SheetTrigger asChild>
                <button className="w-8 h-8 text-slate-400 hover:text-white transition-colors">
                  <Settings size={20} />
                </button>
              </SheetTrigger>
              <SheetContent className="bg-slate-800 border-slate-700 text-white">
                <SheetHeader>
                  <SheetTitle className="text-white">Settings</SheetTitle>
                  <SheetDescription className="text-slate-400">
                    Manage your application settings here.
                  </SheetDescription>
                </SheetHeader>
                <div className="py-4">
                  <p className="text-slate-300">Logged in as {user.name}</p>
                </div>
              </SheetContent>
            </Sheet>
           </div>
        )}
      </header>
      
      {error && (
        <div className="p-6 pt-0">
            <div className="bg-red-900/50 border border-red-500/50 text-red-300 p-4 rounded-lg flex justify-between items-center">
                <p><strong>Error:</strong> {error}</p>
                <Button onClick={() => setError(null)} variant="ghost" size="icon" className="text-white hover:bg-red-800/50">X</Button>
            </div>
        </div>
      )}
      
      {renderMainContent()}
    </div>
  );
}

