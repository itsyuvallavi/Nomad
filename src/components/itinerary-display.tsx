'use client';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Share2, Wand2, PartyPopper } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

type ItineraryDisplayProps = {
  itinerary: string | null;
  isLoading: boolean;
  error: string | null;
};

const parseItinerary = (text: string) => {
  const dayRegex = /Day\s+(\d+):\s*(.*)/g;
  const days = text.split(dayRegex);
  
  if (days.length <= 1) {
    // Fallback for non-standard format
    return [{ day: '1', title: 'Your Itinerary', details: text }];
  }

  const result = [];
  for (let i = 1; i < days.length; i += 3) {
    result.push({
      day: days[i],
      title: days[i+1]?.trim(),
      details: days[i+2]?.trim() || 'No details provided.',
    });
  }
  return result;
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
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2 mt-2" />
        </CardHeader>
        <CardContent className="space-y-4 pt-2">
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
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

  const parsedDays = parseItinerary(itinerary);

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
        <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
          {parsedDays.map((day, index) => (
            <AccordionItem value={`item-${index + 1}`} key={index}>
              <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                <span className="text-accent mr-2">Day {day.day}:</span>
                {day.title}
              </AccordionTrigger>
              <AccordionContent>
                <div className="whitespace-pre-line text-muted-foreground pl-2 border-l-2 border-accent ml-2">
                  {day.details}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
