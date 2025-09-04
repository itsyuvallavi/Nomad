'use client';

import { useState } from 'react';
import type { z } from 'zod';
import { generatePersonalizedItinerary } from '@/ai/flows/generate-personalized-itinerary';

import Header from '@/components/header';
import ItineraryForm from '@/components/itinerary-form';
import ItineraryDisplay from '@/components/itinerary-display';
import DatabaseInfo from '@/components/database-info';
import MapPlaceholder from '@/components/map-placeholder';
import { Separator } from '@/components/ui/separator';
import type { formSchema } from '@/components/itinerary-form';

export default function Home() {
  const [itinerary, setItinerary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleItineraryRequest = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setError(null);
    setItinerary(null);
    try {
      const result = await generatePersonalizedItinerary(values);
      if (result.itinerary) {
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
      <main className="flex-1 container mx-auto p-4 sm:p-6 md:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-1 flex flex-col gap-8">
            <ItineraryForm
              isSubmitting={isLoading}
              onSubmit={handleItineraryRequest}
            />
          </div>
          <div className="lg:col-span-2 space-y-8">
            <ItineraryDisplay
              itinerary={itinerary}
              isLoading={isLoading}
              error={error}
            />
            <Separator />
            <div className="grid md:grid-cols-2 gap-8">
              <DatabaseInfo />
              <MapPlaceholder />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
