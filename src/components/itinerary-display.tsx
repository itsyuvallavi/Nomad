
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Info, Loader2 } from 'lucide-react';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/schemas';
import ItineraryDailyView from './itinerary-daily-view';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import ItineraryRefinementForm from './itinerary-refinement-form';

type ItineraryDisplayProps = {
  itinerary: GeneratePersonalizedItineraryOutput;
  onRefine: (feedback: string) => void;
  isRefining: boolean;
};

export default function ItineraryDisplay({
  itinerary,
  onRefine,
  isRefining,
}: ItineraryDisplayProps) {
  const [refinementError, setRefinementError] = useState<string | null>(null);

  const handleRefinement = async (feedback: string) => {
    setRefinementError(null);
    onRefine(feedback);
  };

  const tripStartDate = itinerary.itinerary[0]?.date;
  const tripEndDate = itinerary.itinerary[itinerary.itinerary.length - 1]?.date;

  const formatDateRange = (start: string, end: string) => {
    if (!start || !end) return '';
    try {
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
    } catch(e) {
        console.error("Error formatting date range", e);
        return "Date range unavailable";
    }
  }


  return (
    <div className="flex-1 p-6 text-white overflow-y-auto">
        <div className="flex items-start justify-between mb-6">
            <div>
                <h1 className="text-2xl font-bold text-white">{itinerary.title}</h1>
                <p className="text-slate-400">{itinerary.destination} • {formatDateRange(tripStartDate, tripEndDate)}</p>
            </div>
        </div>
        
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

        <div className="mb-6 max-w-2xl sticky top-0 bg-slate-800/50 backdrop-blur-sm py-4 z-10">
            <ItineraryRefinementForm
              onSubmit={handleRefinement}
              isSubmitting={isRefining}
            />
            {refinementError && (
              <p className="text-sm text-red-400 mt-2">{refinementError}</p>
            )}
        </div>

        <div className="mt-4">
             <h2 className="text-white font-medium text-lg mb-4">Your Personalized Itinerary</h2>
             {isRefining && itinerary.itinerary.length > 1 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 text-slate-400 animate-spin" />
                  <p className="ml-4 text-slate-400">Refining your itinerary...</p>
                </div>
              ) : (
                <ItineraryDailyView dailyPlans={itinerary.itinerary} />
              )}
        </div>
    </div>
  );
}
