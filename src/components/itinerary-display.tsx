'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, Share2, Wand2, Home, ArrowLeft } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/flows/generate-personalized-itinerary';
import ItineraryDailyView from './itinerary-daily-view';
import { refineItineraryBasedOnFeedback } from '@/ai/flows/refine-itinerary-based-on-feedback';
import { Textarea } from './ui/textarea';
import { Loader2 } from 'lucide-react';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from './ui/card';


type ItineraryDisplayProps = {
  itinerary: GeneratePersonalizedItineraryOutput['itinerary'] | null;
  error: string | null;
  setItinerary: (itinerary: GeneratePersonalizedItineraryOutput['itinerary'] | null) => void;
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
      setItinerary(refined.itinerary);
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
            <Home className="mr-2 h-4 w-4" /> Try Again
        </Button>
      </div>
    );
  }

  if (!itinerary) {
    // This case should ideally not be hit if loading is handled, but as a fallback.
    return (
        <div className="max-w-4xl mx-auto p-6 text-center">
        <p className="text-slate-400">Something went wrong. Please try starting over.</p>
         <Button variant="outline" size="sm" onClick={onReturn} className="mt-4 bg-slate-700 border-slate-600 hover:bg-slate-600">
            <Home className="mr-2 h-4 w-4" /> Start Over
        </Button>
      </div>
    );
  }

  const tripHeaderInfo = {
    destination: "Your Trip",
    dates: `${itinerary[0]?.date} - ${itinerary[itinerary.length - 1]?.date}`
  }

  return (
    <div className="px-6 pb-8 text-white">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
         <Button variant="ghost" onClick={onReturn} className="mb-4 text-slate-300 hover:text-white hover:bg-slate-700">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Search
        </Button>

        {/* Trip Header */}
        <div className="mb-8">
            <h1 className="text-3xl font-bold text-white">{tripHeaderInfo.destination}</h1>
            <p className="text-slate-400">{tripHeaderInfo.dates}</p>
        </div>

        {/* Action Buttons */}
         <div className="flex gap-2 mb-8">
            <Button variant="outline" size="sm" onClick={handleShare} className="bg-slate-700/80 border-slate-600 hover:bg-slate-700 text-white">
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
            {/* The refine feature is now a section below */}
          </div>

        {/* Refine Section */}
         <div className="space-y-4 rounded-2xl bg-slate-800/50 p-6 border border-slate-700 mb-8">
            <h3 className="text-lg font-medium text-white">Refine Your Itinerary</h3>
            <p className="text-sm text-slate-400">Want to make some changes? Tell the AI what you'd like to adjust.</p>
            <Textarea
              placeholder="e.g., 'Can you add more vegetarian restaurants?' or 'I'd prefer to work in the mornings.'"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              disabled={isRefining}
              className="bg-slate-700/80 border-slate-600 text-white placeholder:text-slate-400"
            />
            <Button onClick={handleRefine} disabled={isRefining || !feedback.trim()} className="bg-slate-700 hover:bg-slate-600 text-white">
              {isRefining ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Applying Changes...
                </>
              ) : (
                <>
                 <Wand2 className="mr-2 h-4 w-4" /> Refine with AI
                </>
              )}
            </Button>
          </div>

        {/* Itinerary Body */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-6">
            <h2 className="text-white font-medium mb-6 text-xl">Your Personalized Itinerary</h2>
             <ItineraryDailyView dailyPlans={itinerary} />
        </div>

      </div>
    </div>
  );
}
