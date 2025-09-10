
'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, MessageSquare, Plus, Mic } from 'lucide-react';
import { AnimatedLogo } from '@/components/ui/animated-logo';
import { formatDistanceToNow } from 'date-fns';
import { fadeInUp, staggerContainer, hoverLift, tapScale } from '@/lib/animations';
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
            className="text-foreground text-2xl tracking-tight mb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            Hi, I'm Nomad Navigator
          </motion.h1>
          <motion.p 
            className="text-muted-foreground text-base"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            Can I help you with anything?
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
        
          {/* Quick Test Button */}
          <motion.div 
            className="max-w-2xl mx-auto mt-4 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          >
            <motion.div
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Button
                onClick={() => handleInitialPrompt({ 
                  prompt: "Plan one week in London from LA for one person in mid next month" 
                })}
                variant="outline"
                className="border-border hover:bg-muted/50 text-sm transition-all hover:shadow-md"
                disabled={isLoading}
              >
                Quick Test: London Trip
              </Button>
            </motion.div>
          </motion.div>
          
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
              <motion.div 
                className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                variants={staggerContainer}
                initial="initial"
                animate="animate"
              >
                <AnimatePresence>
                  {recentSearches.map((search, index) => (
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
                        className="bg-muted/50 hover:bg-muted border-border cursor-pointer text-left transition-all hover:shadow-lg h-full"
                      >
                        <CardContent className="p-4 flex flex-col h-full">
                           <motion.div
                             initial={{ rotate: -10 }}
                             animate={{ rotate: 0 }}
                             transition={{ delay: 0.8 + index * 0.1 }}
                           >
                             <MessageSquare size={20} className="text-muted-foreground mb-3" />
                           </motion.div>
                           <p className="font-medium text-foreground text-sm flex-1 leading-snug line-clamp-3">{search.title || search.prompt || 'New chat'}</p>
                           <p className="text-muted-foreground text-xs mt-3">{formatDistanceToNow(new Date(search.lastUpdated || search.id), { addSuffix: true })}</p>
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
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.5 }}
          >
            Nomad Navigator may contain errors. We recommend checking important information.
          </motion.p>
        </motion.div>
      </motion.div>
    </main>
  );
}
