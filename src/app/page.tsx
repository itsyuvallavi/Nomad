'use client';

import { useState } from 'react';
import type { z } from 'zod';
import { generatePersonalizedItinerary, type GeneratePersonalizedItineraryOutput } from '@/ai/flows/generate-personalized-itinerary';
import ItineraryForm from '@/components/itinerary-form';
import ItineraryDisplay from '@/components/itinerary-display';
import type { formSchema } from '@/components/itinerary-form';
import { Settings } from 'lucide-react';

export default function Home() {
  const [itinerary, setItinerary] = useState<GeneratePersonalizedItineraryOutput['itinerary'] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleItineraryRequest = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await generatePersonalizedItinerary(values);
      if (result.itinerary && result.itinerary.length > 0) {
        setItinerary(result.itinerary);
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

  const handleReturn = () => {
    setItinerary(null);
    setError(null);
  };

  return (
    <div className="h-screen w-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 bg-slate-800 rounded-sm transform rotate-12 animate-logo-pulse"></div>
          </div>
          <span className="text-white font-medium">Nomad Navigator</span>
        </div>
        <button className="w-8 h-8 text-slate-400 hover:text-white transition-colors">
          <Settings size={20} />
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        {itinerary || isLoading || error ? (
          <div className="container mx-auto p-4 sm:p-6 md:p-8 flex-1 flex justify-center items-center">
            <div className="w-full max-w-4xl">
              <ItineraryDisplay
                itinerary={itinerary}
                isLoading={isLoading}
                error={error}
                setItinerary={setItinerary}
                onReturn={handleReturn}
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            {/* Welcome Section */}
            <div className="flex flex-col items-center text-center max-w-md">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-8">
                <div className="w-8 h-8 bg-slate-800 rounded-md transform rotate-12 animate-logo-pulse"></div>
              </div>
              <h1 className="text-white text-2xl mb-2">Hi, I'm Nomad Navigator</h1>
              <h2 className="text-white text-xl mb-6">Can I help you with anything?</h2>
            </div>
            
            {/* Input Area */}
            <div className="w-full">
              <ItineraryForm
                isSubmitting={isLoading}
                onSubmit={handleItineraryRequest}
              />
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
