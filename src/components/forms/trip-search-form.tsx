
'use client';

import { useState, useEffect } from 'react';
import { Trash2, MessageSquare, Plus, Mic } from 'lucide-react';
import { AnimatedLogo } from '@/components/ui/animated-logo';
import { formatDistanceToNow } from 'date-fns';
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
import ItineraryForm from './trip-details-form';
import type { FormValues } from './trip-details-form';
import type { RecentSearch, ChatState } from '@/app/page';

type StartItineraryProps = {
    onItineraryRequest: (values: FormValues, chatState?: ChatState, searchId?: string) => void;
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
    onItineraryRequest(
      { prompt: search.prompt, fileDataUrl: search.fileDataUrl },
      search.chatState,
      search.id
    );
  }

  const handleClearHistory = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  return (
    <main className="w-full h-full flex items-center justify-center p-4 md:p-6 bg-background">
      <div className="w-full max-w-4xl flex flex-col items-center justify-center">
        {/* Welcome Section */}
        <div className="flex flex-col items-center text-center max-w-md mb-6 md:mb-8">
          <AnimatedLogo size="lg" className="mb-6 md:mb-8" />
          <h1 className="text-foreground text-2xl tracking-tight mb-2">Hi, I'm Nomad Navigator</h1>
          <p className="text-muted-foreground text-base">Can I help you with anything?</p>
        </div>
        
        {/* Input Area */}
        <div className="w-full max-w-2xl">
          <ItineraryForm
            isSubmitting={isLoading}
            onSubmit={handleInitialPrompt}
          />
        
        {/* Quick Test Button */}
        <div className="max-w-2xl mx-auto mt-4 text-center">
          <Button
            onClick={() => handleInitialPrompt({ 
              prompt: "Plan one week in London from LA for one person in mid next month" 
            })}
            variant="outline"
            className="border-border hover:bg-muted/50 text-sm"
            disabled={isLoading}
          >
            Quick Test: London Trip
          </Button>
        </div>
        
        {recentSearches.length > 0 && (
          <div className="max-w-2xl mx-auto mt-6">
            <div className="flex items-center justify-between mb-3 px-1">
               <h3 className="text-foreground text-base font-medium">Recent Chats</h3>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                      <Trash2 size={16} />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete your recent search history. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearHistory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {recentSearches.map((search) => (
                <Card
                  key={search.id}
                  onClick={() => handleRecentSearchClick(search)}
                  className="bg-muted/50 hover:bg-muted border-border cursor-pointer text-left transition-colors"
                >
                  <CardContent className="p-4 flex flex-col h-full">
                     <MessageSquare size={20} className="text-muted-foreground mb-3" />
                     <p className="font-medium text-foreground text-sm flex-1 leading-snug line-clamp-3">{search.title || search.prompt || 'New chat'}</p>
                     <p className="text-muted-foreground text-xs mt-3">{formatDistanceToNow(new Date(search.lastUpdated || search.id), { addSuffix: true })}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
        <p className="text-muted-foreground text-xs text-center mt-8">
          Nomad Navigator may contain errors. We recommend checking important information.
        </p>
        </div>
      </div>
    </main>
  );
}
