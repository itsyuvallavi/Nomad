
'use client';

import { useState, useEffect } from 'react';
import { History, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import ItineraryForm from '@/components/itinerary-form';
import type { FormValues } from '@/components/itinerary-form';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/schemas';
import { analyzeInitialPrompt } from '@/ai/flows/analyze-initial-prompt';

interface RecentItinerary {
  id: string;
  title: string;
  destination: string;
  itinerary: GeneratePersonalizedItineraryOutput;
}

type StartItineraryProps = {
    onItineraryRequest: (values: FormValues) => void;
};


export default function StartItinerary({ onItineraryRequest }: StartItineraryProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [recentItineraries, setRecentItineraries] = useState<RecentItinerary[]>([]);
  const [promptValue, setPromptValue] = useState('');

  useEffect(() => {
    try {
      const storedItineraries = localStorage.getItem('recentItineraries');
      if (storedItineraries) {
        setRecentItineraries(JSON.parse(storedItineraries));
      }
    } catch (e) {
      console.error("Could not parse recent itineraries from localStorage", e);
    }
  }, []);

  const handleInitialPrompt = async (values: FormValues) => {
    setIsLoading(true);
    setPromptValue(''); // Clear input after submission

    try {
      const result = await analyzeInitialPrompt({
        prompt: values.prompt,
        attachedFile: values.fileDataUrl,
      });

      console.log('AI needs more info, questions:', result.questions);
      // For now, we'll just log the questions.
      // In the next step, we will build the UI to ask these questions.
      
      // As a temporary measure, let's just call the old flow
      // to keep the app working.
      await onItineraryRequest(values);


    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecentItineraryClick = (recentItinerary: RecentItinerary) => {
    // This needs to be handled in the parent component now
    console.log("Recent itinerary clicked, but handler needs to be in parent", recentItinerary);
  }

  const handleClearHistory = () => {
    setRecentItineraries([]);
    localStorage.removeItem('recentItineraries');
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6">
      {/* Welcome Section */}
      <div className="flex flex-col items-center text-center max-w-md">
        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mb-8 animate-float">
          <div className="w-8 h-8 bg-slate-800 rounded-md animate-rotate-and-breathe"></div>
        </div>
        <h1 className="text-white text-2xl mb-2">Hi, I'm Nomad Navigator</h1>
        <h2 className="text-white text-xl mb-6">Can I help you with anything?</h2>
      </div>
      
      {/* Input Area */}
      <div className="w-full mt-8">
        <ItineraryForm
          isSubmitting={isLoading}
          onSubmit={handleInitialPrompt}
          promptValue={promptValue}
          setPromptValue={setPromptValue}
        />
        {recentItineraries.length > 0 && (
          <div className="max-w-2xl mx-auto mt-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
               <History size={14} className="text-slate-400" />
               <h3 className="text-slate-400 text-sm font-medium">Recent Trips</h3>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-500 hover:text-white">
                      <Trash2 size={14} />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-slate-800 border-slate-700 text-white">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription className="text-slate-400">
                        This will permanently delete your recent trip history. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-transparent text-white hover:bg-slate-700 hover:text-white">Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearHistory} className="bg-red-600 hover:bg-red-700 text-white">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {recentItineraries.map((trip) => (
                <Card
                  key={trip.id}
                  onClick={() => handleRecentItineraryClick(trip)}
                  className="bg-slate-700/50 hover:bg-slate-700 border-slate-700 cursor-pointer text-left"
                >
                  <CardContent className="p-3">
                    <p className="font-semibold text-white truncate text-sm">{trip.title}</p>
                    <p className="text-xs text-slate-300 truncate">{trip.destination}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
        <p className="text-slate-500 text-xs text-center mt-4">
          Nomad Navigator may contain errors. We recommend checking important information.
        </p>
      </div>
    </main>
  );
}
