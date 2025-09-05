'use client';
import { useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Share2, Wand2, PartyPopper, Home } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import ItineraryLoader from './itinerary-loader';
import ItineraryCalendar from './itinerary-calendar';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/flows/generate-personalized-itinerary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ItineraryDailyView from './itinerary-daily-view';
import ItineraryWeeklyView from './itinerary-weekly-view';
import { refineItineraryBasedOnFeedback } from '@/ai/flows/refine-itinerary-based-on-feedback';
import { Textarea } from './ui/textarea';
import { Loader2 } from 'lucide-react';


type ItineraryDisplayProps = {
  itinerary: GeneratePersonalizedItineraryOutput['itinerary'] | null;
  isLoading: boolean;
  error: string | null;
  setItinerary: (itinerary: GeneratePersonalizedItineraryOutput['itinerary'] | null) => void;
  onReturn: () => void;
};

export default function ItineraryDisplay({
  itinerary,
  isLoading,
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


  if (isLoading) {
    return <ItineraryLoader />;
  }

  if (error) {
    return (
      <Card className="w-full max-w-4xl mx-auto bg-slate-800/50 border-slate-700">
        <CardHeader>
          <Alert variant="destructive" className="bg-red-900/50 border-red-500/50 text-red-300">
            <AlertCircle className="h-4 w-4 text-red-300" />
            <AlertTitle>Error Generating Itinerary</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={onReturn} className="bg-slate-700 border-slate-600 hover:bg-slate-600">
              <Home className="mr-2 h-4 w-4" /> Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!itinerary) {
    return (
        <Card className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center text-center p-8 min-h-[400px] bg-slate-800/50 border-slate-700">
        <PartyPopper className="h-16 w-16 text-slate-400" strokeWidth={1.5} />
        <CardHeader className="p-2">
          <CardTitle className="text-2xl mt-4 text-white">
            Let's Plan an Adventure!
          </CardTitle>
          <CardDescription className="mt-2 text-slate-400">
            Something went wrong, but don't worry. Let's try again.
          </CardDescription>
        </CardHeader>
        <Button variant="outline" size="sm" onClick={onReturn} className="mt-4 bg-slate-700 border-slate-600 hover:bg-slate-600">
            <Home className="mr-2 h-4 w-4" /> Start Over
        </Button>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto bg-slate-800/50 border-slate-700 text-white">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
          <div>
            <CardTitle className="text-2xl text-white">
              Your Trip Plan Is Ready!
            </CardTitle>
            <CardDescription className="text-slate-400">
              Here&apos;s your day-by-day guide. You can refine it further below.
            </CardDescription>
          </div>
          <div className="flex gap-2 shrink-0">
             <Button variant="outline" size="sm" onClick={onReturn} className="bg-slate-700 border-slate-600 hover:bg-slate-600 text-white">
              <Home className="mr-2 h-4 w-4" /> New Search
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare} className="bg-slate-700 border-slate-600 hover:bg-slate-600 text-white">
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-slate-700/80 text-slate-400">
            <TabsTrigger value="daily" className="data-[state=active]:bg-slate-600/50 data-[state=active]:text-white">Daily</TabsTrigger>
            <TabsTrigger value="weekly" className="data-[state=active]:bg-slate-600/50 data-[state=active]:text-white">Weekly</TabsTrigger>
            <TabsTrigger value="calendar" className="data-[state=active]:bg-slate-600/50 data-[state=active]:text-white">Calendar</TabsTrigger>
          </TabsList>
          <TabsContent value="daily">
            <ItineraryDailyView dailyPlans={itinerary} />
          </TabsContent>
          <TabsContent value="weekly">
            <ItineraryWeeklyView dailyPlans={itinerary} />
          </TabsContent>
          <TabsContent value="calendar">
            <ItineraryCalendar dailyPlans={itinerary} />
          </TabsContent>
        </Tabs>
      </CardContent>
       <CardContent>
          <div className="space-y-4 rounded-lg bg-slate-900/50 p-6 border border-slate-700">
            <h3 className="text-lg text-white">Refine Your Itinerary</h3>
            <Textarea
              placeholder="e.g., 'Can you add more vegetarian restaurants?' or 'I'd prefer to work in the mornings.'"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              disabled={isRefining}
              className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-400"
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
        </CardContent>
    </Card>
  );
}
