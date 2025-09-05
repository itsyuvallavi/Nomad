
'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Share2, Wand2, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/flows/generate-personalized-itinerary';
import ItineraryDailyView from './itinerary-daily-view';
import { refineItineraryBasedOnFeedback } from '@/ai/flows/refine-itinerary-based-on-feedback';
import { Textarea } from './ui/textarea';
import { Loader2 } from 'lucide-react';

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
  const { toast } = useToast();
  const [isRefining, setIsRefining] = useState(false);
  const [feedback, setFeedback] = useState('');

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: 'Link Copied!',
      description: 'Itinerary link copied to your clipboard.',
    });
  };

  const handleRefine = async () => {
    if (!feedback.trim() || !itinerary) return;

    setIsRefining(true);
    try {
      const result = await refineItineraryBasedOnFeedback({
        originalItinerary: JSON.stringify(itinerary, null, 2),
        userFeedback: feedback,
      });
      // The output from refine is a string, so we need to parse it.
      const refined = JSON.parse(result.refinedItinerary);
      setItinerary(refined);
      setFeedback('');
    } catch (e) {
      console.error(e);
      toast({
        variant: 'destructive',
        title: 'Error Refining Itinerary',
        description: 'Could not apply your changes. Please try again.',
      });
    } finally {
      setIsRefining(false);
    }
  };


  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
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
        <div className="max-w-4xl mx-auto p-6 text-center">
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
    const startDate = new Date(start);
    const endDate = new Date(end);
    const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
    
    if (startMonth === endMonth) {
      return `${startMonth} ${startDate.getDate()} - ${endDate.getDate()}, ${endDate.getFullYear()}`;
    }
    return `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}, ${endDate.getFullYear()}`;
  }


  return (
    <div className="px-6 pb-8 text-white">
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" onClick={onReturn} className="mb-4 text-slate-300 hover:text-white hover:bg-slate-700">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Search
        </Button>

        {/* Trip Header */}
        <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">{itinerary.title}</h1>
            <p className="text-slate-400">{itinerary.destination} • {formatDateRange(tripStartDate, tripEndDate)}</p>
        </div>

        {/* Actions & Tips */}
         <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6 mb-8">
            <div className="flex gap-2 mb-6">
                <Button onClick={handleRefine} disabled={isRefining || !feedback.trim()} className="bg-blue-600 hover:bg-blue-700 text-white flex-1 sm:flex-none">
                  {isRefining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                  Refine
                </Button>
                <Button variant="outline" size="sm" onClick={handleShare} className="bg-slate-700/80 border-slate-600 hover:bg-slate-700 text-white flex-1 sm:flex-none">
                  <Share2 className="mr-2 h-4 w-4" /> Share
                </Button>
            </div>
            <Textarea
              placeholder="Want to make changes? e.g., 'Add more vegetarian restaurants' or 'I prefer to work in the mornings.'"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              disabled={isRefining}
              className="bg-slate-700/80 border-slate-600 text-white placeholder:text-slate-400"
            />
            {itinerary.quickTips && itinerary.quickTips.length > 0 && (
                <div className="mt-6 p-4 bg-slate-700/30 rounded-lg">
                    <h3 className="text-white font-medium mb-2">Quick Tips for {itinerary.destination}</h3>
                    <ul className="space-y-1 text-sm text-slate-300 list-disc list-inside">
                        {itinerary.quickTips.map((tip, index) => <li key={index}>{tip}</li>)}
                    </ul>
                </div>
            )}
        </div>

        {/* Itinerary Body */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6">
            <h2 className="text-white font-medium mb-6 text-xl">Your Personalized Itinerary</h2>
             <ItineraryDailyView dailyPlans={itinerary.itinerary} />
        </div>
      </div>
    </div>
  );
}
