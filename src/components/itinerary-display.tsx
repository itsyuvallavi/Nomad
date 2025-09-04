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
import { AlertCircle, Share2, Wand2, PartyPopper } from 'lucide-react';
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
};

export default function ItineraryDisplay({
  itinerary,
  isLoading,
  error,
  setItinerary,
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
      <Alert variant="destructive" className="shadow-lg">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Generating Itinerary</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!itinerary) {
    return (
      <Card className="shadow-lg flex flex-col items-center justify-center text-center p-8 min-h-[400px]">
        <PartyPopper className="h-16 w-16 text-accent" strokeWidth={1.5} />
        <CardHeader className="p-2">
          <CardTitle className="font-headline text-2xl mt-4">
            Your Personalized Itinerary Awaits
          </CardTitle>
          <CardDescription className="mt-2">
            Fill out the form to generate your travel plan. Your next adventure
            is just a click away!
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
          <div>
            <CardTitle className="font-headline text-2xl">
              Your Trip Plan Is Ready!
            </CardTitle>
            <CardDescription>
              Here&apos;s your day-by-day guide. You can refine it further below.
            </CardDescription>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="daily" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
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
          <div className="space-y-4">
            <h3 className="font-headline text-lg">Refine Your Itinerary</h3>
            <Textarea
              placeholder="e.g., 'Can you add more vegetarian restaurants?' or 'I'd prefer to work in the mornings.'"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              disabled={isRefining}
            />
            <Button onClick={handleRefine} disabled={isRefining || !feedback.trim()}>
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
