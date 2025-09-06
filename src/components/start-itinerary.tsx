
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
import type { RecentSearch } from '@/app/page';

type StartItineraryProps = {
    onItineraryRequest: (values: FormValues) => void;
};


export default function StartItinerary({ onItineraryRequest }: StartItineraryProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);

  useEffect(() => {
    try {
      const storedSearches = localStorage.getItem('recentSearches');
      if (storedSearches) {
        setRecentSearches(JSON.parse(storedSearches));
      }
    } catch (e) {
      console.error("Could not parse recent searches from localStorage", e);
    }
  }, []);

  const handleInitialPrompt = async (values: FormValues) => {
    setIsLoading(true);
    onItineraryRequest(values);
    // Note: We don't set isLoading(false) here because the parent component
    // will switch to the chat view, unmounting this component.
  };

  const handleRecentSearchClick = (search: RecentSearch) => {
    onItineraryRequest({ prompt: search.prompt, fileDataUrl: search.fileDataUrl });
  }

  const handleClearHistory = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
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
        />
        {recentSearches.length > 0 && (
          <div className="max-w-2xl mx-auto mt-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
               <History size={14} className="text-slate-400" />
               <h3 className="text-slate-400 text-sm font-medium">Recent Searches</h3>
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
                        This will permanently delete your recent search history. This action cannot be undone.
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
              {recentSearches.map((search) => (
                <Card
                  key={search.id}
                  onClick={() => handleRecentSearchClick(search)}
                  className="bg-slate-700/50 hover:bg-slate-700 border-slate-700 cursor-pointer text-left"
                >
                  <CardContent className="p-3">
                    <p className="font-semibold text-white truncate text-sm">{search.prompt}</p>
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
