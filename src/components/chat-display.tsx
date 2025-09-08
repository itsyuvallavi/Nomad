
'use client';

import { useState, useEffect, useRef } from 'react';
import { generatePersonalizedItinerary } from '@/ai/flows/generate-personalized-itinerary';
import { refineItineraryBasedOnFeedback } from '@/ai/flows/refine-itinerary-based-on-feedback';
import type { FormValues } from './itinerary-form';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/schemas';
import { ArrowLeft } from 'lucide-react';
import { Button } from './ui/button';
import type { RecentSearch, ChatState } from '@/app/page';
import { ChatPanel } from './figma/ChatPanel';
import { ItineraryPanel } from './figma/ItineraryPanel';
import { ThinkingPanel } from './figma/ThinkingPanel';

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
            console.error('Could not save chat state:', e);
        }
    };

    const getConversationHistory = (currentMessages: Message[]): string => {
        return currentMessages.map(m => `${m.role}: ${m.content}`).join('\n');
    }

    const generateItinerary = async (currentMessages: Message[], generationId?: string) => {
        // Create a unique ID for this generation attempt
        const thisGenerationId = generationId || `gen-${Date.now()}-${Math.random()}`;
        
        // If there's already a generation in progress, skip this one
        if (generationIdRef.current && generationIdRef.current !== thisGenerationId) {
            console.log('[Itinerary] Skipping duplicate call, generation already in progress');
            return;
        }
        
        // Claim this generation
        if (!generationIdRef.current) {
            generationIdRef.current = thisGenerationId;
        } else if (generationIdRef.current !== thisGenerationId) {
            // Another generation claimed it first
            return;
        }
        
        console.log('[Itinerary] Starting generation for:', initialPrompt.prompt, 'ID:', thisGenerationId);
        console.time(`Generation time ${thisGenerationId}`);
        
        setIsGenerating(true);
        const conversationHistory = getConversationHistory(currentMessages);

        setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: "Great, I'm working on your itinerary now..." 
        }]);

        try {
            console.log('[API CALL START] Calling generatePersonalizedItinerary');
            console.log('[API Details]', {
                promptLength: initialPrompt.prompt.length,
                hasFile: !!initialPrompt.fileDataUrl,
                hasHistory: !!conversationHistory,
                provider: 'Will be determined server-side (OpenAI if configured, else Gemini)'
            });
            
            const itinerary = await generatePersonalizedItinerary({
                prompt: initialPrompt.prompt,
                attachedFile: initialPrompt.fileDataUrl,
                conversationHistory: conversationHistory
            });
            
            // Log the actual itinerary received
            console.log('[DEBUG] Full itinerary structure:', {
                destination: itinerary.destination,
                title: itinerary.title,
                totalDays: itinerary.itinerary.length,
                dayBreakdown: itinerary.itinerary.map(day => ({
                    day: day.day,
                    date: day.date,
                    title: day.title,
                    activities: day.activities.length
                }))
            });
            
            console.log('[API CALL END] Response received from server', 'ID:', thisGenerationId);
            
            // Check if this is an error response
            if (itinerary.title && itinerary.title.includes('Error:')) {
                console.error('[API ERROR] Generation failed:', itinerary.title);
            }
            
            console.log('[Generated Itinerary]', {
                destination: itinerary.destination,
                title: itinerary.title,
                days: itinerary.itinerary.length,
                activities: itinerary.itinerary.reduce((acc, day) => acc + day.activities.length, 0)
            });
            console.timeEnd(`Generation time ${thisGenerationId}`);
            
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: "✨ Your personalized itinerary is ready! You can see it on the right." 
            }]);
            
            setCurrentItinerary(itinerary);
            saveChatStateToStorage(true, itinerary);

        } catch (e) {
            console.error('[Itinerary] Generation failed:', e, 'ID:', thisGenerationId);
            console.timeEnd(`Generation time ${thisGenerationId}`);
            const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
            onError(`I'm sorry, there was an error creating your itinerary. ${errorMessage}`);
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: `I'm sorry, there was an error creating your itinerary. Please try again. \n\nDetails: ${errorMessage}`
            }]);
        } finally {
            // Only clear if this was the active generation
            if (generationIdRef.current === thisGenerationId) {
                setIsGenerating(false);
                generationIdRef.current = null;
            }
        }
    }


    useEffect(() => {
        if (savedChatState) {
            // If resuming a saved chat, just load the state
            return;
        }

        // Create a unique ID for this mount's generation
        const mountGenerationId = `mount-${Date.now()}-${Math.random()}`;
        
        const startConversation = async () => {
            const userMessage: Message = { role: 'user', content: initialPrompt.prompt };
            setMessages([userMessage]);
            await generateItinerary([userMessage], mountGenerationId);
        };

        // Start immediately - the generation function will handle deduplication
        startConversation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleUserInputSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!userInput.trim() || isGenerating) return;

        console.log('[User] New message:', userInput);
        
        const newUserMessage: Message = { role: 'user', content: userInput };
        const newMessages = [...messages, newUserMessage];
        setMessages(newMessages);
        setUserInput('');

        if (currentItinerary) {
            await handleRefine(userInput, newMessages);
        } else {
            await generateItinerary(newMessages);
        }
    };
    
    const handleRefine = async (feedback: string, _currentMessages: Message[]) => {
        if (!currentItinerary) return;
        
        console.log('[Refine] User feedback:', feedback);
        console.log('[API CALL START] Calling refineItineraryBasedOnFeedback API');
        console.time('API Call Duration');
        
        setMessages(prev => [...prev, { role: 'assistant', content: "I understand. Refining the itinerary..." }]);
        setIsGenerating(true);

        try {
            const refinedItinerary = await refineItineraryBasedOnFeedback({
                originalItinerary: currentItinerary,
                userFeedback: feedback,
            });
            
            console.log('[API CALL END] Response received from server');
            console.timeEnd('API Call Duration');
            console.log('[Refine Result] Success - itinerary updated');
            setCurrentItinerary(refinedItinerary);
            saveChatStateToStorage(true, refinedItinerary);
            setMessages(prev => [...prev, { role: 'assistant', content: "✅ Itinerary updated!" }]);
        } catch (error) {
            console.error('[Refine] Failed:', error);
            console.timeEnd('Refinement time');
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            onError(`I'm sorry, there was an error refining your itinerary. ${errorMessage}`);
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't refine the itinerary. Please try again." }]);
        } finally {
            setIsGenerating(false);
        }
    };
    
    return (
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
    );
}
