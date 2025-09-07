
'use client';

import { useState, useEffect, useRef } from 'react';
import { generatePersonalizedItinerary } from '@/ai/flows/generate-personalized-itinerary';
import { refineItineraryBasedOnFeedback } from '@/ai/flows/refine-itinerary-based-on-feedback';
import type { FormValues } from './itinerary-form';
import type { GeneratePersonalizedItineraryOutput } from '@/ai/schemas';
import ItineraryDisplay from './itinerary-display';
import { ArrowUp, Bot, User, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import type { RecentSearch, ChatState } from '@/app/page';

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

    const generateItinerary = async (currentMessages: Message[]) => {
        setIsGenerating(true);
        const conversationHistory = getConversationHistory(currentMessages);

        setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: "Great, I'm working on your itinerary now..." 
        }]);

        try {
            const itinerary = await generatePersonalizedItinerary({
                prompt: initialPrompt.prompt,
                attachedFile: initialPrompt.fileDataUrl,
                conversationHistory: conversationHistory
            });
            
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: "✨ Your personalized itinerary is ready! You can see it on the right." 
            }]);
            
            setCurrentItinerary(itinerary);
            saveChatStateToStorage(true, itinerary);

        } catch (e) {
            console.error('[ChatDisplay] Error generating itinerary:', e);
            const errorMessage = e instanceof Error ? e.message : "An unknown error occurred.";
            onError(`I'm sorry, there was an error creating your itinerary. ${errorMessage}`);
            setMessages(prev => [...prev, { 
                role: 'assistant', 
                content: `I'm sorry, there was an error creating your itinerary. Please try again. \n\nDetails: ${errorMessage}`
            }]);
        } finally {
            setIsGenerating(false);
        }
    }


    useEffect(() => {
        let isMounted = true;
        
        if (savedChatState) {
            // If resuming a saved chat, just load the state
            return;
        }

        const startConversation = async () => {
            if (isMounted) {
                const userMessage: Message = { role: 'user', content: initialPrompt.prompt };
                setMessages([userMessage]);
                await generateItinerary([userMessage]);
            }
        };

        startConversation();
        
        return () => {
            isMounted = false;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleUserInputSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput.trim() || isGenerating) return;

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
    
    const handleRefine = async (feedback: string, currentMessages: Message[]) => {
        if (!currentItinerary) return;
        
        setMessages(prev => [...prev, { role: 'assistant', content: "I understand. Refining the itinerary..." }]);
        setIsGenerating(true);

        try {
            const refinedItinerary = await refineItineraryBasedOnFeedback({
                originalItinerary: currentItinerary,
                userFeedback: feedback,
            });
            setCurrentItinerary(refinedItinerary);
            saveChatStateToStorage(true, refinedItinerary);
            setMessages(prev => [...prev, { role: 'assistant', content: "✅ Itinerary updated!" }]);
        } catch (error) {
            console.error('[ChatDisplay] Error refining itinerary:', error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
            onError(`I'm sorry, there was an error refining your itinerary. ${errorMessage}`);
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't refine the itinerary. Please try again." }]);
        } finally {
            setIsGenerating(false);
        }
    };
    
    return (
        <main className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 p-6 min-h-0">
            {/* LEFT SIDE - CHAT */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl p-6 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                    <h2 className="text-white font-medium text-lg">Chat</h2>
                    <Button variant="ghost" onClick={onReturn} className="text-slate-300 hover:text-white hover:bg-slate-700">
                        <ArrowLeft className="mr-2 h-4 w-4" /> New Search
                    </Button>
                </div>
                 <div ref={chatContainerRef} className="flex-1 space-y-4 overflow-y-auto pr-2 min-h-0">
                    {messages.map((msg, index) => (
                        <div key={index} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                             {msg.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                                    <Bot size={20} className="text-white" />
                                </div>
                            )}
                            <div className={`rounded-lg px-4 py-2 text-white max-w-[80%] whitespace-pre-line ${msg.role === 'user' ? 'bg-blue-600' : 'bg-slate-700'}`}>
                                <p className="text-sm">{msg.content}</p>
                            </div>
                            {msg.role === 'user' && (
                                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                                    <User size={20} className="text-white" />
                                </div>
                            )}
                        </div>
                    ))}
                    {isGenerating && (
                         <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                                <Bot size={20} className="text-white" />
                            </div>
                            <div className="rounded-lg px-4 py-2 text-white bg-slate-700">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.3s]"></div>
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse [animation-delay:-0.15s]"></div>
                                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-pulse"></div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                 <form onSubmit={handleUserInputSubmit} className="mt-4 flex items-center gap-2 flex-shrink-0">
                    <Input
                        value={userInput}
                        onChange={(e) => setUserInput(e.target.value)}
                        placeholder={isGenerating ? "Generating..." : "Refine your itinerary or ask a question..."}
                        className="bg-slate-700 border-slate-600 text-white placeholder-slate-400"
                        disabled={isGenerating}
                    />
                    <Button type="submit" size="icon" className="bg-slate-700 hover:bg-slate-600 text-white" disabled={isGenerating || !userInput.trim()}>
                         {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp size={20} />}
                    </Button>
                </form>
            </div>
            
            {/* RIGHT SIDE - ITINERARY OR PLACEHOLDER */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-xl flex flex-col overflow-hidden">
                {currentItinerary ? (
                    <div className="flex-1 overflow-y-auto min-h-0 max-h-full">
                        <ItineraryDisplay 
                            itinerary={currentItinerary}
                            onRefine={(feedback) => handleRefine(feedback, messages)}
                            isRefining={isGenerating}
                        />
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center p-8">
                             {isGenerating ? (
                                <>
                                    <Loader2 className="w-16 h-16 mx-auto mb-4 text-slate-600 animate-spin" />
                                    <p className="text-slate-400 text-sm">Generating your itinerary...</p>
                                    <p className="text-slate-500 text-xs mt-2">This may take a moment</p>
                                </>
                            ) : (
                                <>
                                    <svg className="w-16 h-16 mx-auto mb-4 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <p className="text-slate-400 text-sm">Your itinerary will appear here</p>
                                    <p className="text-slate-500 text-xs mt-2">The AI is waiting for your prompt.</p>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
