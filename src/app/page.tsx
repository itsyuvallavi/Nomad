'use client';

import { useState } from 'react';
import type { z } from 'zod';
import { generatePersonalizedItinerary, type GeneratePersonalizedItineraryOutput } from '@/ai/flows/generate-personalized-itinerary';

import Header from '@/components/header';
import ItineraryForm from '@/components/itinerary-form';
import ItineraryDisplay from '@/components/itinerary-display';
import { Card, CardContent } from '@/components/ui/card';
import type { formSchema } from '@/components/itinerary-form';

export default function Home() {
  const [itinerary, setItinerary] = useState<GeneratePersonalizedItineraryOutput['itinerary'] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleItineraryRequest = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setError(null);
    setItinerary(null);
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

  return (
    <div className="flex flex-col min-h-screen bg-secondary">
      <Header />
      <main className="flex-1 container mx-auto p-4 sm:p-6 md:p-8 flex justify-center items-start">
        <div className="w-full max-w-4xl">
            {itinerary || isLoading || error ? (
              <ItineraryDisplay
                itinerary={itinerary}
                isLoading={isLoading}
                error={error}
                setItinerary={setItinerary}
              />
            ) : (
               <Card className="shadow-lg">
                <CardContent className="p-0">
                    <ItineraryForm
                      isSubmitting={isLoading}
                      onSubmit={handleItineraryRequest}
                    />
                 </CardContent>
              </Card>
            )}
        </div>
      </main>
    </div>
  );
}
