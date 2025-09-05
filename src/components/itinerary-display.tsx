
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, ArrowLeft, Info, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/schemas';
import ItineraryDailyView from './itinerary-daily-view';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import ItineraryRefinementForm from './itinerary-refinement-form';
import { refineItineraryBasedOnFeedback } from '@/ai/flows/refine-itinerary-based-on-feedback';

type ItineraryDisplayProps = {
  itinerary: GeneratePersonalizedItineraryOutput | null;
  error: string | null;
  setItinerary: (itinerary: GeneratePersonalizedItineraryOutput | null) => void;
  onReturn: () => void;
};

export default function ItineraryDisplay({
  itinerary,
  error,
  setItinerary,
  onReturn,
}: ItineraryDisplayProps) {
  const [isRefining, setIsRefining] = useState(false);
  const [refinementError, setRefinementError] = useState<string | null>(null);

  const handleRefinement = async (feedback: string) => {
    if (!itinerary) return;

    setIsRefining(true);
    setRefinementError(null);

    try {
      const refinedItinerary = await refineItineraryBasedOnFeedback({
        originalItinerary: itinerary,
        userFeedback: feedback,
      });
      setItinerary(refinedItinerary);
    } catch (e) {
      console.error(e);
      setRefinementError('There was an error refining your itinerary. Please try again.');
    } finally {
      setIsRefining(false);
    }
  };


  if (error) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <Alert variant="destructive" className="bg-red-900/50 border-red-500/50 text-red-300">
          <AlertCircle className="h-4 w-4 text-red-300" />
          <AlertTitle>Error Generating Itinerary</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button variant="outline" size="sm" onClick={onReturn} className="mt-4 bg-slate-700 border-slate-600 hover:bg-slate-600">
            <ArrowLeft className="mr-2 h-4 w-4" /> Try Again
        </Button>
      </div>
    );
  }

  if (!itinerary || !itinerary.itinerary) {
    return (
        <div className="max-w-2xl mx-auto p-4 text-center">
        <p className="text-slate-400">Something went wrong. Please try starting over.</p>
         <Button variant="outline" size="sm" onClick={onReturn} className="mt-4 bg-slate-700 border-slate-600 hover:bg-slate-600">
            <ArrowLeft className="mr-2 h-4 w-4" /> Start Over
        </Button>
      </div>
    );
  }
  
  const tripStartDate = itinerary.itinerary[0]?.date;
  const tripEndDate = itinerary.itinerary[itinerary.itinerary.length - 1]?.date;

  const formatDateRange = (start: string, end: string) => {
    if (!start || !end) return '';
    const startDate = new Date(start);
    const endDate = new Date(end);
    const userTimezoneOffset = startDate.getTimezoneOffset() * 60000;
    const adjustedStartDate = new Date(startDate.getTime() + userTimezoneOffset);
    const adjustedEndDate = new Date(endDate.getTime() + userTimezoneOffset);

    const startMonth = adjustedStartDate.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = adjustedEndDate.toLocaleDateString('en-US', { month: 'short' });
    
    if (startMonth === endMonth) {
      return `${startMonth} ${adjustedStartDate.getDate()} - ${adjustedEndDate.getDate()}, ${adjustedEndDate.getFullYear()}`;
    }
    return `${startMonth} ${adjustedStartDate.getDate()} - ${endMonth} ${adjustedEndDate.getDate()}, ${adjustedEndDate.getFullYear()}`;
  }


  return (
    <div className="px-4 pb-8 text-white">
      <div className="max-w-2xl mx-auto">
        <Button variant="ghost" onClick={onReturn} className="mb-4 text-slate-300 hover:text-white hover:bg-slate-700">
            <ArrowLeft className="mr-2 h-4 w-4" /> New Search
        </Button>

        {/* Trip Header */}
        <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">{itinerary.title}</h1>
            <p className="text-slate-400 text-sm">{itinerary.destination} • {formatDateRange(tripStartDate, tripEndDate)}</p>
        </div>
        
         {/* Action Buttons */}
        <div className="flex items-center gap-2 mb-4">
            {itinerary.quickTips && itinerary.quickTips.length > 0 && (
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" className="text-slate-300 hover:text-white hover:bg-slate-700/50">
                            <Info className="h-4 w-4 mr-2" />
                            <span>Tips</span>
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 text-sm bg-slate-800 border-slate-700 text-white">
                        <h3 className="font-medium text-white mb-2">Quick Tips</h3>
                        <ul className="space-y-1 text-slate-300 list-disc list-inside">
                            {itinerary.quickTips.map((tip, index) => <li key={index}>{tip}</li>)}
                        </ul>
                    </PopoverContent>
                </Popover>
            )}
        </div>


        {/* Itinerary Body */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-4">
             <h2 className="text-white font-medium text-lg mb-4">Your Personalized Itinerary</h2>
             {isRefining ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
                  <p className="ml-4 text-slate-400">Refining your itinerary...</p>
                </div>
              ) : (
                <ItineraryDailyView dailyPlans={itinerary.itinerary} />
              )}
        </div>
        
        {/* Refinement */}
        <div className="mt-6">
            <ItineraryRefinementForm
              onSubmit={handleRefinement}
              isSubmitting={isRefining}
            />
            {refinementError && (
              <p className="text-sm text-red-400 mt-2">{refinementError}</p>
            )}
        </div>
      </div>
    </div>
  );
}
