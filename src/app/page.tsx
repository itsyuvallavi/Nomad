
'use client';

import { useState, useEffect } from 'react';
import { generatePersonalizedItinerary } from '@/ai/flows/generate-personalized-itinerary';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/schemas';
import ItineraryForm from '@/components/itinerary-form';
import ItineraryDisplay from '@/components/itinerary-display';
import type { FormValues } from '@/components/itinerary-form';
import { Settings, History, Trash2 } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
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
import ItineraryLoader from '@/components/itinerary-loader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface RecentItinerary {
  id: string;
  title: string;
  destination: string;
  itinerary: GeneratePersonalizedItineraryOutput;
}

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Home() {
  const [itinerary, setItinerary] = useState<GeneratePersonalizedItineraryOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const handleItineraryRequest = async (values: FormValues) => {
    setIsLoading(true);
    setError(null);
    setPromptValue(''); // Clear input after submission

    try {
      let fileDataUrl: string | undefined = undefined;
      if (values.file) {
        fileDataUrl = await fileToDataURL(values.file);
      }

      const result = await generatePersonalizedItinerary({
        prompt: values.prompt,
        attachedFile: fileDataUrl,
      });

      if (result.itinerary && result.itinerary.length > 0) {
        setItinerary(result);
        
        // Save recent itinerary
        const newItinerary: RecentItinerary = {
          id: new Date().toISOString(), // Simple unique ID
          title: result.title,
          destination: result.destination,
          itinerary: result,
        };

        const updatedItineraries = [newItinerary, ...recentItineraries.filter(it => it.title !== newItinerary.title)].slice(0, 3);
        setRecentItineraries(updatedItineraries);
        localStorage.setItem('recentItineraries', JSON.stringify(updatedItineraries));

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
  
  const handleRecentItineraryClick = (recentItinerary: RecentItinerary) => {
    setItinerary(recentItinerary.itinerary);
  }

  const handleReturn = () => {
    setItinerary(null);
    setError(null);
  };

  const handleClearHistory = () => {
    setRecentItineraries([]);
    localStorage.removeItem('recentItineraries');
  };

  const renderMainContent = () => {
    if (isLoading) {
      return (
        <main className="flex-1 flex flex-col items-center justify-center">
          <ItineraryLoader />
        </main>
      );
    }

    if (error) {
      return (
        <main className="flex-1 flex flex-col items-center justify-center">
          <ItineraryDisplay
            itinerary={null}
            error={error}
            setItinerary={setItinerary}
            onReturn={handleReturn}
          />
        </main>
      );
    }

    if (itinerary) {
      return (
        <ItineraryDisplay
          itinerary={itinerary}
          error={null}
          setItinerary={setItinerary}
          onReturn={handleReturn}
        />
      );
    }

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
            onSubmit={handleItineraryRequest}
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


  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="flex items-center justify-between p-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center animate-float">
            <div className="w-4 h-4 bg-slate-800 rounded-sm animate-rotate-and-breathe"></div>
          </div>
          <span className="text-white font-medium">Nomad Navigator</span>
        </div>
        <Sheet>
          <SheetTrigger asChild>
            <button className="w-8 h-8 text-slate-400 hover:text-white transition-colors">
              <Settings size={20} />
            </button>
          </SheetTrigger>
          <SheetContent className="bg-slate-800 border-slate-700 text-white">
            <SheetHeader>
              <SheetTitle className="text-white">Settings</SheetTitle>
              <SheetDescription className="text-slate-400">
                Manage your application settings here.
              </SheetDescription>
            </SheetHeader>
            <div className="py-4">
              <p className="text-slate-300">More settings coming soon!</p>
            </div>
          </SheetContent>
        </Sheet>
      </header>
      
      {renderMainContent()}
    </div>
  );
}

    