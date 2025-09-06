
'use client';

import { useState } from 'react';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/schemas';
import ItineraryDisplay from '@/components/itinerary-display';
import { Settings } from 'lucide-react';
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


export interface RecentSearch {
  id: string;
  prompt: string;
  fileDataUrl?: string;
}

export default function Home() {
  const [itinerary, setItinerary] = useState<GeneratePersonalizedItineraryOutput | null>(null);
  const [isChatting, setIsChatting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialPrompt, setInitialPrompt] = useState<FormValues | null>(null);
  
  const handleItineraryRequest = (values: FormValues) => {
    setIsChatting(true);
    setInitialPrompt(values);
  };
  
  const handleReturn = () => {
    setItinerary(null);
    setError(null);
    setIsChatting(false);
    setInitialPrompt(null);
  };

  const renderMainContent = () => {
    if (isChatting) {
        return (
            <ChatDisplay
              initialPrompt={initialPrompt!}
              onItineraryGenerated={(itinerary) => {
                setItinerary(itinerary);
                setIsChatting(false);
              }}
              onError={(error) => {
                setError(error);
                setIsChatting(false);
              }}
              onReturn={handleReturn}
            />
        )
    }

    if (error) {
      return (
        <main className="flex-1 flex flex-col items-center justify-center">
          <ItineraryDisplay
            itinerary={null}
            error={error}
            setItinerary={setItinerary}
            onReturn={handleReturn}
          />
        </main>
      );
    }

    if (itinerary) {
      return (
        <ItineraryDisplay
          itinerary={itinerary}
          error={null}
          setItinerary={setItinerary}
          onReturn={handleReturn}
        />
      );
    }

    return (
      <StartItinerary onItineraryRequest={handleItineraryRequest}/>
    );
  }


  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center animate-float">
            <div className="w-4 h-4 bg-slate-800 rounded-sm animate-rotate-and-breathe"></div>
          </div>
          <span className="text-white font-medium">Nomad Navigator</span>
        </div>
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
              <p className="text-slate-300">More settings coming soon!</p>
            </div>
          </SheetContent>
        </Sheet>
      </header>
      
      {renderMainContent()}
    </div>
  );
}
