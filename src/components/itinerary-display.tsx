'use client';
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

type ItineraryDisplayProps = {
  itinerary: GeneratePersonalizedItineraryOutput['itinerary'] | null;
  isLoading: boolean;
  error: string | null;
};

export default function ItineraryDisplay({
  itinerary,
  isLoading,
  error,
}: ItineraryDisplayProps) {
  const { toast } = useToast();

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    toast({
      title: 'Link Copied!',
      description: 'Itinerary link copied to your clipboard.',
    });
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
              Here&apos;s your day-by-day guide. You can refine it further if
              needed.
            </CardDescription>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" disabled>
              <Wand2 className="mr-2 h-4 w-4" /> Refine
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="mr-2 h-4 w-4" /> Share
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ItineraryCalendar dailyPlans={itinerary} />
      </CardContent>
    </Card>
  );
}
