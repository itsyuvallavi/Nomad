
'use client';

import { useState, useEffect, useRef } from 'react';
import { generatePersonalizedItinerary } from '@/ai/flows/generate-personalized-itinerary';
import { refineItineraryBasedOnFeedback } from '@/ai/flows/refine-itinerary-based-on-feedback';
import type { FormValues } from '../forms/trip-details-form';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/schemas';
import { ArrowLeft } from 'lucide-react';
import { Button } from '../ui/button';
import type { RecentSearch, ChatState } from '@/app/page';
import { ChatPanel } from './chat-interface';
import { ItineraryPanel } from '../itinerary/itinerary-view';
import { ThinkingPanel } from './ai-thinking';
import { ErrorDialog } from '../ui/error-dialog';
import { logger } from '@/lib/logger';

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

export default function ChatDisplay({
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
    const currentSearchId = useRef(searchId || new Date().toISOString());
    const generationIdRef = useRef<string | null>(null);

    const chatContainerRef = useRef<HTMLDivElement>(null);

     useEffect(() => {
        if (chatContainerRef.current) {
            chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
        }
        
        if (messages.length > 0 && !savedChatState?.isCompleted) {
            saveChatStateToStorage();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [messages]);
    
    const saveChatStateToStorage = (isCompleted = false, itinerary?: GeneratePersonalizedItineraryOutput) => {
        try {
            const storedSearches = localStorage.getItem('recentSearches');
            const recentSearches: RecentSearch[] = storedSearches ? JSON.parse(storedSearches) : [];
            
            const existingIndex = recentSearches.findIndex(s => s.id === currentSearchId.current);
            
            const chatState: ChatState = {
                messages,
                isCompleted, 
                itinerary: itinerary || currentItinerary || undefined,
            };
            
            const searchEntry: RecentSearch = {
                id: currentSearchId.current,
                prompt: initialPrompt.prompt,
                fileDataUrl: initialPrompt.fileDataUrl,
                chatState,
                title: itinerary?.title || currentItinerary?.title || initialPrompt.prompt,
                lastUpdated: new Date().toISOString()
            };
            
            if (existingIndex >= 0) {
                recentSearches[existingIndex] = searchEntry;
            } else {
                recentSearches.unshift(searchEntry);
            }
            
            localStorage.setItem('recentSearches', JSON.stringify(recentSearches.slice(0, 5)));
        } catch (e) {
            logger.error('SYSTEM', 'Could not save chat state', e);
        }
    };

    const getConversationHistory = (currentMessages: Message[]): string => {
        return currentMessages.map(m => `${m.role}: ${m.content}`).join('\n');
    }

    const generateItinerary = async (currentMessages: Message[]) => {
        const thisGenerationId = `gen-${Date.now()}-${Math.random()}`;
        if (generationIdRef.current) {
            console.warn('🚫 Skipping duplicate call, generation already in progress');
            logger.warn('AI', 'Skipping duplicate call, generation already in progress');
            return;
        }
        generationIdRef.current = thisGenerationId;
        
        console.group(`🎯 Starting Itinerary Generation [${thisGenerationId.substring(0, 10)}...]`);
        console.log('📝 User Prompt:', initialPrompt.prompt);
        console.log('🆔 Generation ID:', thisGenerationId);
        console.log('⏰ Started at:', new Date().toLocaleTimeString());
        console.groupEnd();
        
        logger.info('USER', 'Starting itinerary generation', { prompt: initialPrompt.prompt, id: thisGenerationId });
        
        setIsGenerating(true);
        const conversationHistory = getConversationHistory(currentMessages);

        console.log('💬 Conversation history length:', conversationHistory.length, 'characters');
        console.log('🤖 AI is thinking...');

        setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: "Great, I'm working on your itinerary now..." 
        }]);
        
        const startTime = Date.now();
        const timerId = logger.apiCall('AI', 'generatePersonalizedItinerary');

        try {
            console.log('🔄 Calling AI generation server action...');
            console.log('📊 Request details:', {
                promptLength: initialPrompt.prompt.length,
                hasFile: !!initialPrompt.fileDataUrl,
                hasHistory: !!conversationHistory,
            });
            
            logger.info('API', 'Calling generatePersonalizedItinerary', {
                promptLength: initialPrompt.prompt.length,
                hasFile: !!initialPrompt.fileDataUrl,
                hasHistory: !!conversationHistory,
            });
            
            const itinerary = await generatePersonalizedItinerary({
                prompt: initialPrompt.prompt,
                attachedFile: initialPrompt.fileDataUrl,
                conversationHistory: conversationHistory
            });
            
            const duration = Date.now() - startTime;
            console.log(`✅ AI Response received in ${(duration / 1000).toFixed(1)}s`);
            
            logger.apiResponse(timerId, 'generatePersonalizedItinerary', { success: true });
            
            // Check if this is a validation error response
            if (itinerary.validationError && itinerary.errorMessage) {
                console.log('ℹ️ Input validation:', itinerary.errorMessage);
                logger.info('AI', 'Input validation needed', { message: itinerary.errorMessage });
                
                // Show the error dialog for validation issues
                setErrorMessage(itinerary.errorMessage);
                setErrorDialogOpen(true);
                return;
            }
            
            // Check if this is a clarifying question response
            if (itinerary.needsMoreInfo && itinerary.question) {
                console.log('ℹ️ AI needs more information');
                console.log('❓ Question:', itinerary.question);
                
                setMessages(prev => [...prev, { 
                    role: 'assistant', 
                    content: itinerary.question
                }]);
                
                // Don't set itinerary, just return - waiting for user response
                return;
            }
            
            console.group('📦 Itinerary Generated Successfully');
            console.log('🏷️ Title:', itinerary.title);
            console.log('📍 Destinations:', itinerary.destinations?.map(d => d.city).join(', ') || itinerary.destination);
            console.log('📅 Total Days:', itinerary.destinations?.reduce((sum, d) => sum + d.days, 0) || itinerary.itinerary?.length);
            console.log('🎯 Activities:', itinerary.destinations?.reduce((sum, d) => 
                sum + (d.dailyItineraries?.reduce((s, di) => s + (di.activities?.length || 0), 0) || 0), 0) || 
                itinerary.itinerary?.reduce((acc, day) => acc + day.activities.length, 0));
            console.groupEnd();
            
            logger.debug('AI', 'Full itinerary structure received', {
                destination: itinerary.destination,
                title: itinerary.title,
                totalDays: itinerary.itinerary.length,
            });
            
            if ((!itinerary.itinerary || itinerary.itinerary.length === 0) && 
                (!itinerary.destinations || itinerary.destinations.length === 0) &&
                !itinerary.needsMoreInfo) {
                console.error('❌ Empty itinerary received');
                throw new Error('The AI returned an empty itinerary. Please try rephrasing your request.');
            }
            
            logger.info('AI', 'Generated Itinerary Summary', {
                destination: itinerary.destination,
                title: itinerary.title,
                days: itinerary.itinerary.length,
                activities: itinerary.itinerary.reduce((acc, day) => acc + day.activities.length, 0)
            });
            
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: "✨ Your personalized itinerary is ready! You can see it on the right." 
            }]);
            
            setCurrentItinerary(itinerary);
            saveChatStateToStorage(true, itinerary);

        } catch (e: any) {
            const duration = logger.endTimer(timerId);
            const errorDuration = Date.now() - startTime;
            
            const isValidationError = e?.isValidationError === true;
            
            if (isValidationError) {
                // For validation errors, use info logging
                console.log('ℹ️ Input needs clarification:', e.message);
                logger.info('AI', 'User input needs clarification', { message: e.message });
            } else {
                // For real errors, use error logging
                console.group('❌ Itinerary Generation Failed');
                console.error('Error:', e);
                console.log('⏱️ Failed after:', (errorDuration / 1000).toFixed(1), 'seconds');
                console.log('🆔 Generation ID:', thisGenerationId);
                console.groupEnd();
                logger.error('AI', 'Itinerary generation failed', { error: e, id: thisGenerationId });
            }
            
            logger.apiResponse(timerId, 'generatePersonalizedItinerary', { success: false, duration });
            const errorMsg = e instanceof Error ? e.message : "An unknown error occurred.";
            
            // Check if this is a parser/complexity error or validation error
            if (isValidationError ||
                errorMsg.includes('validation failed') || 
                errorMsg.includes('too complex') || 
                errorMsg.includes('understand') ||
                errorMsg.includes('parse') ||
                errorMsg.includes('departure city') ||
                errorMsg.includes('Please tell me where') ||
                errorMsg.includes('Please provide more details') ||
                (errorMsg.includes('origin') && errorMsg.includes('required'))) {
                setErrorMessage(errorMsg);
                setErrorDialogOpen(true);
            } else {
                // For other errors, use the normal error flow
                onError(`I'm sorry, there was an error creating your itinerary. ${errorMsg}`);
                setMessages(prev => [...prev, { 
                    role: 'assistant', 
                    content: `I'm sorry, there was an error creating your itinerary. Please try again. \n\nDetails: ${errorMsg}`
                }]);
            }
        } finally {
            if (generationIdRef.current === thisGenerationId) {
                console.log('🏁 Generation completed, resetting state');
                setIsGenerating(false);
                generationIdRef.current = null;
            }
        }
    }


    useEffect(() => {
      if (savedChatState || generationIdRef.current) {
        return;
      }
      
      const userMessage: Message = { role: 'user', content: initialPrompt.prompt };
      setMessages([userMessage]);
      generateItinerary([userMessage]);
      
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleUserInputSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!userInput.trim() || isGenerating) return;

        logger.info('USER', 'New message submitted', { message: userInput });
        
        const newUserMessage: Message = { role: 'user', content: userInput };
        const newMessages = [...messages, newUserMessage];
        setMessages(newMessages);
        setUserInput('');

        // Always regenerate if we don't have a complete itinerary yet
        if (currentItinerary && currentItinerary.itinerary && currentItinerary.itinerary.length > 0) {
            await handleRefine(userInput, newMessages);
        } else {
            // This handles both initial generation and follow-up questions
            await generateItinerary(newMessages);
        }
    };
    
    const handleRefine = async (feedback: string, _currentMessages: Message[]) => {
        if (!currentItinerary) return;
        
        logger.info('USER', 'Refining itinerary', { feedback });
        const timerId = logger.apiCall('AI', 'refineItineraryBasedOnFeedback');
        
        setMessages(prev => [...prev, { role: 'assistant', content: "I understand. Refining the itinerary..." }]);
        setIsGenerating(true);

        try {
            const refinedItinerary = await refineItineraryBasedOnFeedback({
                originalItinerary: currentItinerary,
                userFeedback: feedback,
            });
            
            logger.apiResponse(timerId, 'refineItineraryBasedOnFeedback', { success: true });
            logger.info('AI', 'Refinement successful');
            setCurrentItinerary(refinedItinerary);
            saveChatStateToStorage(true, refinedItinerary);
            setMessages(prev => [...prev, { role: 'assistant', content: "✅ Itinerary updated!" }]);
        } catch (error) {
            logger.apiResponse(timerId, 'refineItineraryBasedOnFeedback', { success: false });
            logger.error('AI', 'Refinement failed', { error });
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            onError(`I'm sorry, there was an error refining your itinerary. ${errorMessage}`);
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't refine the itinerary. Please try again." }]);
        } finally {
            setIsGenerating(false);
        }
    };
    
    return (
        <>
            <ErrorDialog 
                open={errorDialogOpen}
                onClose={() => setErrorDialogOpen(false)}
                message={errorMessage || "This is a beta version, and some complex searches might be too advanced at the moment. Try simplifying your request!"}
                suggestions={[
                    "3 days in Paris from New York",
                    "One week exploring Tokyo, Kyoto, and Osaka from Los Angeles",
                    "5 day Barcelona trip from London with budget hotels",
                    "Weekend getaway to Amsterdam from Berlin"
                ]}
            />
            <main className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 min-h-0">
            {/* Return Button - Positioned absolutely */}
            <div className="col-span-full">
                <Button 
                    variant="ghost" 
                    onClick={onReturn} 
                    className="text-slate-300 hover:text-white hover:bg-slate-700 mb-2"
                >
                    <ArrowLeft className="mr-2 h-4 w-4" /> New Search
                </Button>
            </div>
            
            {/* LEFT SIDE - CHAT */}
            <div className="rounded-xl overflow-hidden h-[calc(100vh-120px)]">
                <ChatPanel
                    messages={messages}
                    inputValue={userInput}
                    onInputChange={setUserInput}
                    onSendMessage={handleUserInputSubmit}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleUserInputSubmit(e as any);
                        }
                    }}
                    isGenerating={isGenerating}
                />
            </div>
            
            {/* RIGHT SIDE - ITINERARY OR THINKING PANEL */}
            <div className="rounded-xl overflow-hidden h-[calc(100vh-120px)]">
                {currentItinerary ? (
                    <ItineraryPanel 
                        itinerary={currentItinerary}
                        onRefine={(feedback) => handleRefine(feedback, messages)}
                        isRefining={isGenerating}
                    />
                ) : (
                    isGenerating ? <ThinkingPanel /> : (
                        <div className="h-full flex items-center justify-center bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900">
                            <div className="text-center p-8">
                                <svg className="w-16 h-16 mx-auto mb-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                                <p className="text-slate-400 text-sm">Your itinerary will appear here</p>
                                <p className="text-slate-500 text-xs mt-2">Start chatting to create your travel plan</p>
                            </div>
                        </div>
                    )
                )}
            </div>
        </main>
        </>
    );
}
