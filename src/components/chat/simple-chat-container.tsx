'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Send, Mic, MapIcon, Layers } from 'lucide-react';
import { generatePersonalizedItinerary } from '@/ai/flows/generate-personalized-itinerary';
import { refineItineraryBasedOnFeedback } from '@/ai/flows/refine-itinerary-based-on-feedback';
import type { FormValues } from '../forms/trip-details-form';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/schemas';
import type { RecentSearch, ChatState } from '@/app/page';
import { Button } from '../ui/button';
import { AnimatedLogo } from '@/components/ui/animated-logo';
import { ItineraryPanel } from '../itinerary/itinerary-view';
import { MapPanel } from '../map/map-panel';
import { ModernLoadingPanel } from './modern-loading-panel';
import { ErrorDialog } from '../ui/error-dialog';
import { logger } from '@/lib/logger';
import { cn } from '@/lib/utils';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type ChatDisplayProps = {
  initialPrompt: FormValues;
  savedChatState?: ChatState;
  searchId?: string;
  onError: (error: string) => void;
  onReturn: () => void;
};

export default function SimpleChatContainer({
  initialPrompt,
  savedChatState,
  searchId,
  onError,
  onReturn,
}: ChatDisplayProps) {
  const [messages, setMessages] = useState<Message[]>(savedChatState?.messages || []);
  const [userInput, setUserInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentItinerary, setCurrentItinerary] = useState<GeneratePersonalizedItineraryOutput | null>(savedChatState?.itinerary || null);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showItinerary, setShowItinerary] = useState(false);
  const [showMap, setShowMap] = useState(false);
  
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const currentSearchId = useRef(searchId || new Date().toISOString());

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!savedChatState) {
      const userMessage: Message = { role: 'user', content: initialPrompt.prompt };
      setMessages([userMessage]);
      generateItinerary([userMessage]);
    }
  }, []);

  const generateItinerary = async (allMessages: Message[]) => {
    setIsGenerating(true);
    const assistantMessage = "I'm planning your perfect trip...";
    setMessages(prev => [...prev, { role: 'assistant', content: assistantMessage }]);

    try {
      const conversationHistory = allMessages.map(msg => `${msg.role}: ${msg.content}`).join('\n');
      const result = await generatePersonalizedItinerary({
        prompt: allMessages[allMessages.length - 1].content,
        conversationHistory,
        attachedFile: initialPrompt.fileDataUrl
      });

      if (result.validationError) {
        const errorMsg = result.errorMessage || "I couldn't generate an itinerary based on your request.";
        setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: errorMsg }]);
        setErrorMessage(errorMsg);
        setErrorDialogOpen(true);
      } else {
        setCurrentItinerary(result);
        setMessages(prev => [...prev.slice(0, -1), { 
          role: 'assistant', 
          content: `✨ Your ${result.title} is ready! Click "View Itinerary" to see the details.` 
        }]);
        
        // Auto-show itinerary after generation
        if (result.itinerary && result.itinerary.length > 0) {
          setTimeout(() => setShowItinerary(true), 500);
        }
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "An error occurred while generating your itinerary.";
      setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: errorMsg }]);
      onError(errorMsg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!userInput.trim() || isGenerating) return;

    const newUserMessage: Message = { role: 'user', content: userInput };
    const newMessages = [...messages, newUserMessage];
    setMessages(newMessages);
    setUserInput('');

    if (currentItinerary?.itinerary?.length) {
      // Refine existing itinerary
      setIsGenerating(true);
      setMessages(prev => [...prev, { role: 'assistant', content: "Updating your itinerary..." }]);
      
      try {
        const refined = await refineItineraryBasedOnFeedback({
          originalItinerary: currentItinerary,
          userFeedback: userInput,
        });
        setCurrentItinerary(refined);
        setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: "✅ Itinerary updated!" }]);
      } catch (error) {
        setMessages(prev => [...prev.slice(0, -1), { role: 'assistant', content: "Sorry, I couldn't update the itinerary." }]);
      } finally {
        setIsGenerating(false);
      }
    } else {
      await generateItinerary(newMessages);
    }
  };

  // Clean centered layout when no itinerary
  if (!currentItinerary || (!showItinerary && !showMap)) {
    return (
      <>
        <ErrorDialog 
          open={errorDialogOpen}
          onClose={() => setErrorDialogOpen(false)}
          message={errorMessage}
        />
        
        <main className="h-screen flex items-center justify-center bg-background relative">
          {/* Simple top bar - absolute positioned */}
          <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 py-4">
            <Button 
              variant="ghost" 
              onClick={onReturn} 
              size="sm"
              className="text-foreground hover:bg-muted"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> 
              New Search
            </Button>
            
            {currentItinerary && (
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowItinerary(true)}
                  variant="outline"
                  size="sm"
                >
                  <Layers className="mr-2 h-4 w-4" />
                  View Itinerary
                </Button>
                <Button
                  onClick={() => setShowMap(true)}
                  variant="outline"
                  size="sm"
                >
                  <MapIcon className="mr-2 h-4 w-4" />
                  View Map
                </Button>
              </div>
            )}
          </div>

          {/* Centered chat interface */}
          <div className="w-full max-w-2xl flex flex-col h-[600px] px-4">
              {/* Logo and title */}
              <motion.div 
                className="flex flex-col items-center mb-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <AnimatedLogo size="md" className="mb-4" />
                <h1 className="text-xl font-medium text-foreground">Nomad Navigator</h1>
                <p className="text-sm text-muted-foreground">Planning your trip...</p>
              </motion.div>

              {/* Messages */}
              <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto px-4 py-2 space-y-4 mb-4"
              >
                {messages.map((message, index) => (
                  <motion.div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className={`max-w-[80%] ${
                      message.role === 'user' 
                        ? 'bg-foreground text-background' 
                        : 'bg-muted text-foreground'
                    } rounded-lg px-4 py-2`}>
                      <p className="text-sm">{message.content}</p>
                    </div>
                  </motion.div>
                ))}
                
                {isGenerating && <ModernLoadingPanel />}
              </div>

              {/* Input */}
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="Ask me anything about your trip..."
                  className="flex-1 px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  disabled={isGenerating}
                />
                <Button type="submit" disabled={isGenerating || !userInput.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
        </main>
      </>
    );
  }

  // Show itinerary or map when requested
  if (showItinerary) {
    return (
      <main className="h-screen flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <Button 
            variant="ghost" 
            onClick={() => setShowItinerary(false)} 
            size="sm"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> 
            Back to Chat
          </Button>
          
          <Button
            onClick={() => {
              setShowItinerary(false);
              setShowMap(true);
            }}
            variant="outline"
            size="sm"
          >
            <MapIcon className="mr-2 h-4 w-4" />
            View Map
          </Button>
        </div>
        
        <div className="flex-1 overflow-auto">
          <ItineraryPanel 
            itinerary={currentItinerary}
            isGenerating={false}
          />
        </div>
      </main>
    );
  }

  if (showMap) {
    return (
      <main className="h-screen flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <Button 
            variant="ghost" 
            onClick={() => setShowMap(false)} 
            size="sm"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> 
            Back to Chat
          </Button>
          
          <Button
            onClick={() => {
              setShowMap(false);
              setShowItinerary(true);
            }}
            variant="outline"
            size="sm"
          >
            <Layers className="mr-2 h-4 w-4" />
            View Itinerary
          </Button>
        </div>
        
        <div className="flex-1">
          <MapPanel 
            itinerary={currentItinerary}
            isExpanded={true}
            onToggle={() => setShowMap(false)}
          />
        </div>
      </main>
    );
  }

  return null;
}