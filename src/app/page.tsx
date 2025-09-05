'use client';

import { useState, useEffect } from 'react';
import type { z } from 'zod';
import { generatePersonalizedItinerary, type GeneratePersonalizedItineraryOutput } from '@/ai/flows/generate-personalized-itinerary';
import ItineraryForm from '@/components/itinerary-form';
import ItineraryDisplay from '@/components/itinerary-display';
import type { FormValues } from '@/components/itinerary-form';
import { Settings, History } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import ItineraryLoader from '@/components/itinerary-loader';
import { Button } from '@/components/ui/button';

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const [itinerary, setItinerary] = useState<GeneratePersonalizedItineraryOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [promptValue, setPromptValue] = useState('');

  useEffect(() => {
    try {
      const storedSearches = localStorage.getItem('recentSearches');
      if (storedSearches) {
        setRecentSearches(JSON.parse(storedSearches));
      }
    } catch (e) {
      console.error("Could not parse recent searches from localStorage", e);
    }
  }, []);

  const handleItineraryRequest = async (values: FormValues) => {
    setIsLoading(true);
    setError(null);
    setPromptValue(''); // Clear input after submission

    try {
      // Save recent search
      const newSearch = values.prompt;
      const updatedSearches = [newSearch, ...recentSearches.filter(s => s !== newSearch)].slice(0, 3);
      setRecentSearches(updatedSearches);
      localStorage.setItem('recentSearches', JSON.stringify(updatedSearches));
      
      let fileDataUrl: string | undefined = undefined;
      if (values.file) {
        fileDataUrl = await fileToDataURL(values.file);
      }

      const result = await generatePersonalizedItinerary({
        prompt: values.prompt,
        attachedFile: fileDataUrl,
      });

      if (result.itinerary && result.itinerary.length > 0) {
        setItinerary(result);
      } else {
        setError(
          'Failed to generate itinerary. The AI may be busy or the request could not be processed. Please try again.'
        );
      }
    } catch (e) {
      console.error(e);
      setError('An unexpected error occurred. Please check the console and try again later.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleRecentSearchClick = (search: string) => {
    setPromptValue(search);
    handleItineraryRequest({ prompt: search });
  }

  const handleReturn = () => {
    setItinerary(null);
    setError(null);
  };

  return (
    <div className="h-screen w-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6">
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
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {itinerary || isLoading || error ? (
           <div className="flex-1 flex justify-center items-start overflow-y-auto">
            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                 <ItineraryLoader />
              </div>
            ) : (
              <div className="w-full">
                <ItineraryDisplay
                  itinerary={itinerary}
                  error={error}
                  setItinerary={setItinerary}
                  onReturn={handleReturn}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6 -mt-20">
            {/* Welcome Section */}
            <div className="flex flex-col items-center text-center max-w-md">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-8 animate-float">
                <div className="w-8 h-8 bg-slate-800 rounded-md animate-rotate-and-breathe"></div>
              </div>
              <h1 className="text-white text-2xl mb-2">Hi, I'm Nomad Navigator</h1>
              <h2 className="text-white text-xl mb-6">Can I help you with anything?</h2>
            </div>
            
            {/* Input Area */}
            <div className="w-full mt-8">
              <ItineraryForm
                isSubmitting={isLoading}
                onSubmit={handleItineraryRequest}
                promptValue={promptValue}
                setPromptValue={setPromptValue}
              />
              {recentSearches.length > 0 && (
                <div className="max-w-2xl mx-auto mt-4 text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                     <History size={14} className="text-slate-400" />
                     <h3 className="text-slate-400 text-sm font-medium">Recent Searches</h3>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {recentSearches.map((search, index) => (
                      <Button
                        key={index}
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRecentSearchClick(search)}
                        className="bg-slate-700/50 hover:bg-slate-700 text-slate-300 hover:text-white text-xs h-auto px-3 py-1.5"
                      >
                        {search}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-slate-500 text-xs text-center mt-4">
                Nomad Navigator may contain errors. We recommend checking important information.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
