
'use client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, MessageSquare, Plus, Mic } from 'lucide-react';
import { AnimatedLogo } from '@/components/common/AnimatedLogo';
import { formatDistanceToNow } from 'date-fns';
import { fadeInUp, staggerContainer, hoverLift, tapScale } from '@/lib/utils/animations';
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
import ItineraryForm from './components/TripPlanningForm';
import type { FormValues } from './components/TripPlanningForm';
import type { RecentSearch, ChatState } from '@/app/page';
import { tripsService } from '@/services/trips/trips-service';

// Conditional auth import to handle SSR
let useAuth: any;
if (typeof window !== 'undefined') {
  const authModule = require('@/infrastructure/contexts/AuthContext');
  useAuth = authModule.useAuth;
} else {
  useAuth = () => ({ user: null, logout: () => {} });
}

type StartItineraryProps = {
    onItineraryRequest: (values: FormValues, chatState?: ChatState, searchId?: string) => void;
};


export default function StartItinerary({ onItineraryRequest }: StartItineraryProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const loadRecentSearches = async () => {
      try {
        if (user) {
          // Load from Firestore for logged-in users
          const trips = await tripsService.getUserTrips(user.uid);
          
          // Convert Firestore trips to RecentSearch format
          const recentFromFirestore: RecentSearch[] = trips
            .slice(0, 5) // Only show 5 most recent
            .map(trip => ({
              id: trip.id,
              prompt: trip.prompt,
              title: trip.title,
              chatState: trip.chatState,
              lastUpdated: trip.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
            }));
          
          setRecentSearches(recentFromFirestore);
        } else {
          // Fall back to localStorage for non-authenticated users
          const storedSearches = localStorage.getItem('recentSearches');
          if (storedSearches) {
            setRecentSearches(JSON.parse(storedSearches));
          }
        }
      } catch (e) {
        console.error("Could not load recent searches", e);
      }
    };
    
    loadRecentSearches();
    
    // Reload when component becomes visible (e.g., returning from trips page)
    const handleFocus = () => {
      loadRecentSearches();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [user]);

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
    if (user) {
      // For logged-in users, just clear the view temporarily
      // The trips remain in Firestore and will reload on page refresh
      setRecentSearches([]);
    } else {
      // For non-logged-in users, clear localStorage
      setRecentSearches([]);
      localStorage.removeItem('recentSearches');
    }
  };

  return (
    <main className="w-full h-full flex items-center justify-center p-4 md:p-6 bg-background">
      <motion.div 
        className="w-full max-w-4xl flex flex-col items-center justify-center"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        {/* Welcome Section */}
        <motion.div 
          className="flex flex-col items-center text-center max-w-md mb-6 md:mb-8"
          variants={fadeInUp}
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ 
              duration: 0.6, 
              ease: [0.175, 0.885, 0.32, 1.275],
              delay: 0.1 
            }}
          >
            <AnimatedLogo size="lg" className="mb-6 md:mb-8" />
          </motion.div>
          <motion.h1 
            className="text-foreground text-3xl font-light tracking-tight mb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            Where to next?
          </motion.h1>
          <motion.p 
            className="text-muted-foreground text-sm"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            AI-powered travel planning
          </motion.p>
        </motion.div>
        
        {/* Input Area */}
        <motion.div 
          className="w-full max-w-2xl"
          variants={fadeInUp}
          transition={{ delay: 0.5 }}
        >
          <ItineraryForm
            isSubmitting={isLoading}
            onSubmit={handleInitialPrompt}
          />
          
          {recentSearches.length > 0 && (
            <motion.div 
              className="max-w-2xl mx-auto mt-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.5 }}
            >
              <div className="flex items-center justify-between mb-3 px-1">
                 <h3 className="text-foreground text-base font-medium">Recent Chats</h3>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                          <Trash2 size={16} />
                        </Button>
                      </motion.div>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Clear Recent Chats?</AlertDialogTitle>
                        <AlertDialogDescription>
                          {user 
                            ? "This will hide recent chats from this view. Your trips are still saved and accessible in the History page."
                            : "This will permanently delete your recent search history. This action cannot be undone."}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearHistory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          {user ? "Clear View" : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
              </div>
              <motion.div 
                className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                <AnimatePresence>
                  {recentSearches.slice(0, isMobile ? 4 : 3).map((search, index) => (
                    <motion.div
                      key={search.id}
                      variants={fadeInUp}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{ y: -5, transition: { duration: 0.2 } }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <Card
                        onClick={() => handleRecentSearchClick(search)}
                        className="bg-muted/70 hover:bg-muted/90 border-border/50 cursor-pointer text-left transition-all hover:shadow-lg h-full"
                      >
                        <CardContent className="p-3 sm:p-4 flex flex-col h-full">
                           <motion.div
                             initial={{ rotate: -10 }}
                             animate={{ rotate: 0 }}
                             transition={{ delay: 0.8 + index * 0.1 }}
                           >
                             <MessageSquare size={16} className="text-muted-foreground mb-2 sm:mb-3" />
                           </motion.div>
                           <p className="font-medium text-foreground text-xs sm:text-sm flex-1 leading-snug line-clamp-2 sm:line-clamp-3">{search.title || search.prompt || 'New chat'}</p>
                           <p className="text-muted-foreground text-[10px] sm:text-xs mt-2 sm:mt-3">
                            {(() => {
                              const dateString = search.lastUpdated;
                              const date = dateString ? new Date(dateString) : null;
                              const isValidDate = date && !isNaN(date.getTime());

                              if (isValidDate) {
                                return formatDistanceToNow(date, { addSuffix: true });
                              }
                              return 'Recently';
                            })()}
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            </motion.div>
          )}
          <motion.p 
            className="text-muted-foreground text-xs text-center mt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            AI-generated content. Verify important details.
          </motion.p>
        </motion.div>
      </motion.div>
    </main>
  );
}
